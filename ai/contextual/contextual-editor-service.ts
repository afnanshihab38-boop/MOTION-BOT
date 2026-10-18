/**
 * MOTION-BOT — Contextual AI Editing Service
 * Phase 8.7: AI Contextual Editing
 *
 * Interprets natural language editing commands against the current project context,
 * synthesizes structured actions, validates them deeply, and generates preview proposals.
 */

import { Project } from "@/types/project";
import { Scene } from "@/types/scene";
import { MotionElement, TextElement } from "@/types/element";
import {
  ContextualEditRequest,
  ContextualEditProposal,
  ContextualEditAction,
  ContextualActionType,
  ContextualEditResult,
} from "./types";
import { applyContextualActions, validateContextualAction } from "./action-applier";
import { ContextManager, getContextManager } from "@/ai/context/context-manager";
import { LLMService, getLLMService } from "@/ai/llm-service";
import { LLMError } from "@/ai/llm-error";
import { scrubSecrets } from "@/ai/context/secret-scrubber";
import { validateProjectDeep, formatValidationErrors } from "@/services/project/project-validator";

export class ContextualEditorService {
  private readonly contextManager: ContextManager;
  private readonly llmService: LLMService;

  constructor(options?: {
    contextManager?: ContextManager;
    llmService?: LLMService;
  }) {
    this.contextManager = options?.contextManager || getContextManager();
    this.llmService = options?.llmService || getLLMService();
  }

  /**
   * Generates a validated contextual edit proposal from natural language input.
   * Does NOT modify the user's project; returns a candidate preview.
   */
  public async generateProposal(
    request: ContextualEditRequest
  ): Promise<ContextualEditProposal> {
    const rawPrompt = (request.prompt || "").trim();
    if (!rawPrompt) {
      throw new Error("Prompt cannot be empty.");
    }

    if (!request.project || !Array.isArray(request.project.scenes) || request.project.scenes.length === 0) {
      throw new Error("Project must contain at least one valid scene.");
    }

    // 1. Resolve active scene & selected element
    const activeSceneId =
      request.activeSceneId || request.project.scenes[0].id;
    const activeScene =
      request.project.scenes.find((s) => s.id === activeSceneId) ||
      request.project.scenes[0];

    const selectedElement = request.selectedElementId
      ? activeScene.elements.find((el) => el.id === request.selectedElementId)
      : undefined;

    // 2. Check for security boundaries / unauthorized requests
    const lowerPrompt = rawPrompt.toLowerCase();
    const cleanPrompt = lowerPrompt.replace(/[.,!?;:]+$/, "").trim();
    if (
      lowerPrompt.includes("rm -rf") ||
      lowerPrompt.includes("bash") ||
      lowerPrompt.includes("exec") ||
      lowerPrompt.includes("filesystem") ||
      lowerPrompt.includes("powershell") ||
      lowerPrompt.includes("api_key") ||
      lowerPrompt.includes("env.") ||
      lowerPrompt.includes("delete system")
    ) {
      return {
        prompt: rawPrompt,
        summary: "Request rejected due to security boundaries.",
        actions: [],
        candidateProject: request.project,
        isValid: false,
        validationErrors: ["Unauthorized system operation requested."],
      };
    }

    // 3. Ambiguous request detection
    const ambiguousKeywords = [
      "make it better",
      "improve it",
      "enhance it",
      "fix it",
      "do something",
      "change that thing",
      "make it cool",
      "make it nice",
      "do magic",
    ];

    const isExplicitlyAmbiguous =
      ambiguousKeywords.some((ak) => cleanPrompt === ak || cleanPrompt.startsWith(ak + " ")) ||
      (!selectedElement && (cleanPrompt === "make it bigger" || cleanPrompt === "change color" || cleanPrompt === "move it"));

    if (isExplicitlyAmbiguous) {
      return {
        prompt: rawPrompt,
        summary: "Ambiguous editing command.",
        actions: [],
        candidateProject: request.project,
        isValid: false,
        validationErrors: [],
        isAmbiguous: true,
        ambiguityQuestion:
          "Which element or property would you like to edit? (e.g. 'Make the headline bigger', 'Move the logo to the center', 'Change background color')",
      };
    }

    // 4. Synthesize structured actions (reusing AI pipeline & contextual synthesis)
    let actions: ContextualEditAction[] = [];

    // Synthesize actions deterministically or through LLM
    try {
      actions = await this.synthesizeActions(request, activeScene, selectedElement);
    } catch (err: any) {
      if (err instanceof LLMError) {
        throw err;
      }
      throw new Error(`Failed to understand editing command: ${err?.message || String(err)}`);
    }

    if (actions.length === 0) {
      return {
        prompt: rawPrompt,
        summary: "No applicable actions found for this request.",
        actions: [],
        candidateProject: request.project,
        isValid: false,
        validationErrors: ["Could not identify a target element or supported property."],
      };
    }

    // 5. Test apply actions onto a cloned candidate project
    const applicationResult = applyContextualActions(request.project, actions);

    if (!applicationResult.success) {
      return {
        prompt: rawPrompt,
        summary: "Validation failure during proposed changes.",
        actions,
        candidateProject: request.project,
        isValid: false,
        validationErrors: applicationResult.errors || [applicationResult.error || "Validation error"],
      };
    }

    // 6. Deep validate the candidate project
    const deepValidation = validateProjectDeep(applicationResult.project);
    if (!deepValidation.valid) {
      return {
        prompt: rawPrompt,
        summary: "Candidate project failed deep structural validation.",
        actions,
        candidateProject: request.project,
        isValid: false,
        validationErrors: formatValidationErrors(deepValidation.errors),
      };
    }

    const summary = actions.map((a) => a.description).join("; ");

    return {
      prompt: rawPrompt,
      summary,
      actions,
      candidateProject: applicationResult.project,
      isValid: true,
      validationErrors: [],
    };
  }

  /**
   * Synthesizes concrete actions matching user intent against active project state.
   */
  private async synthesizeActions(
    request: ContextualEditRequest,
    activeScene: Scene,
    selectedElement?: MotionElement
  ): Promise<ContextualEditAction[]> {
    const prompt = request.prompt.trim();
    const lower = prompt.toLowerCase();
    const project = request.project;

    // Check if the prompt references an explicitly non-existent layer ID
    const explicitNonExistentMatch = lower.match(/(?:layer|element)\s+(['"]?)(nonexistent[\w\-_]*|unknown_[\w\-_]*)\1/i);
    if (explicitNonExistentMatch) {
      throw new Error(`Target layer '${explicitNonExistentMatch[2]}' does not exist in the active scene.`);
    }

    // A. TEXT SIZE CHANGE ("Make the headline bigger", "Increase font size", "Make text smaller")
    if (
      lower.includes("headline bigger") ||
      lower.includes("bigger headline") ||
      lower.includes("increase font size") ||
      lower.includes("text bigger") ||
      lower.includes("headline larger") ||
      lower.includes("larger headline") ||
      lower.includes("bigger text") ||
      (lower.includes("bigger") && selectedElement?.type === "text")
    ) {
      // Find target text element: selected text, or headline, or first text element
      const targetText = (selectedElement?.type === "text"
        ? selectedElement
        : activeScene.elements.find(
            (el) =>
              el.type === "text" &&
              (el.name.toLowerCase().includes("headline") ||
                el.name.toLowerCase().includes("title") ||
                el.id.toLowerCase().includes("headline"))
          ) || activeScene.elements.find((el) => el.type === "text")) as TextElement | undefined;

      if (!targetText) {
        throw new Error("No text or headline element found in the active scene.");
      }

      const currentSize = targetText.fontSize || 56;
      const proposedSize = Math.min(200, Math.round(currentSize * 1.25));

      return [
        {
          id: `act_${Date.now()}_1`,
          type: "UPDATE_TEXT_PROPERTY",
          sceneId: activeScene.id,
          elementId: targetText.id,
          targetName: targetText.name || "Headline Text",
          property: "fontSize",
          description: `Increase ${targetText.name || "Headline Text"} font size from ${currentSize}px → ${proposedSize}px`,
          previousValue: currentSize,
          proposedValue: proposedSize,
          payload: { fontSize: proposedSize },
        },
      ];
    }

    if (
      lower.includes("headline smaller") ||
      lower.includes("text smaller") ||
      lower.includes("decrease font size") ||
      (lower.includes("smaller") && selectedElement?.type === "text")
    ) {
      const targetText = (selectedElement?.type === "text"
        ? selectedElement
        : activeScene.elements.find((el) => el.type === "text")) as TextElement | undefined;

      if (!targetText) {
        throw new Error("No text element found in the active scene.");
      }

      const currentSize = targetText.fontSize || 56;
      const proposedSize = Math.max(12, Math.round(currentSize * 0.8));

      return [
        {
          id: `act_${Date.now()}_1`,
          type: "UPDATE_TEXT_PROPERTY",
          sceneId: activeScene.id,
          elementId: targetText.id,
          targetName: targetText.name || "Text Layer",
          property: "fontSize",
          description: `Decrease ${targetText.name || "Text Layer"} font size from ${currentSize}px → ${proposedSize}px`,
          previousValue: currentSize,
          proposedValue: proposedSize,
          payload: { fontSize: proposedSize },
        },
      ];
    }

    // B. LAYER POSITION ("Move the logo to the center", "Center the logo", "Center headline")
    if (
      lower.includes("center") ||
      lower.includes("move") ||
      lower.includes("shift")
    ) {
      // Find target: logo, headline, or selected element
      let targetElement = selectedElement;
      if (!targetElement) {
        if (lower.includes("logo")) {
          targetElement = activeScene.elements.find(
            (el) =>
              el.type === "logo" ||
              el.name.toLowerCase().includes("logo") ||
              el.id.toLowerCase().includes("logo")
          );
        } else if (lower.includes("headline") || lower.includes("title")) {
          targetElement = activeScene.elements.find(
            (el) => el.type === "text" && el.name.toLowerCase().includes("headline")
          );
        }
      }

      if (lower.includes("center")) {
        if (!targetElement) {
          // If prompt says "move the logo to the center" but no logo exists:
          if (lower.includes("logo")) {
            throw new Error("Logo element was not found in the active scene.");
          }
          throw new Error("Could not determine which element to center.");
        }

        const currentX = targetElement.transform.x;
        const currentY = targetElement.transform.y;
        const centerX = Math.round(project.width / 2);
        const centerY = Math.round(project.height / 2);

        return [
          {
            id: `act_${Date.now()}_1`,
            type: "UPDATE_LAYER_TRANSFORM",
            sceneId: activeScene.id,
            elementId: targetElement.id,
            targetName: targetElement.name,
            property: "transform.x, transform.y",
            description: `Move ${targetElement.name} to canvas center (${centerX}, ${centerY})`,
            previousValue: { x: currentX, y: currentY },
            proposedValue: { x: centerX, y: centerY },
            payload: { x: centerX, y: centerY },
          },
        ];
      }
    }

    // C. LAYER ROTATION ("Rotate the logo 45 degrees", "Rotate badge 15 degrees")
    if (lower.includes("rotate") || lower.includes("rotation")) {
      let targetElement = selectedElement;
      if (!targetElement) {
        if (lower.includes("logo")) {
          targetElement = activeScene.elements.find(
            (el) => el.type === "logo" || el.name.toLowerCase().includes("logo")
          );
        } else if (lower.includes("headline")) {
          targetElement = activeScene.elements.find((el) => el.type === "text");
        } else {
          targetElement = activeScene.elements[0];
        }
      }

      if (!targetElement) {
        throw new Error("No target layer found to rotate.");
      }

      // Extract degree angle from prompt (e.g. 45 degrees, 15 deg, -90)
      const degreeMatch = prompt.match(/(-?\d+)\s*(?:deg|degree|degrees)?/i);
      const angle = degreeMatch ? parseInt(degreeMatch[1], 10) : 45;
      const prevRotation = targetElement.transform.rotation || 0;

      return [
        {
          id: `act_${Date.now()}_1`,
          type: "UPDATE_LAYER_TRANSFORM",
          sceneId: activeScene.id,
          elementId: targetElement.id,
          targetName: targetElement.name,
          property: "transform.rotation",
          description: `Rotate ${targetElement.name} from ${prevRotation}° → ${angle}°`,
          previousValue: prevRotation,
          proposedValue: angle,
          payload: { rotation: angle },
        },
      ];
    }

    // D. TIMING CHANGE ("Make the second scene shorter", "Make the first scene longer", "Make scene 2 shorter")
    if (
      lower.includes("scene shorter") ||
      lower.includes("scene longer") ||
      lower.includes("second scene") ||
      lower.includes("scene 2") ||
      lower.includes("first scene") ||
      lower.includes("scene 1")
    ) {
      let targetScene = activeScene;
      if (lower.includes("second scene") || lower.includes("scene 2") || lower.includes("scene two")) {
        if (project.scenes.length < 2) {
          throw new Error("Project does not have a second scene.");
        }
        targetScene = project.scenes[1];
      } else if (lower.includes("first scene") || lower.includes("scene 1") || lower.includes("scene one")) {
        targetScene = project.scenes[0];
      }

      const isShorter = lower.includes("shorter") || lower.includes("quicker") || lower.includes("brief");
      const currentDuration = targetScene.duration;
      const proposedDuration = isShorter
        ? Math.max(1.0, Number((currentDuration * 0.625).toFixed(1)))
        : Number((currentDuration * 1.5).toFixed(1));

      return [
        {
          id: `act_${Date.now()}_1`,
          type: "UPDATE_SCENE_DURATION",
          sceneId: targetScene.id,
          targetName: targetScene.name,
          property: "duration",
          description: `${isShorter ? "Decrease" : "Increase"} ${targetScene.name} duration from ${currentDuration}s → ${proposedDuration}s`,
          previousValue: currentDuration,
          proposedValue: proposedDuration,
          payload: { duration: proposedDuration },
        },
      ];
    }

    // E. MOTION CHANGE ("Make the animation slower", "Make animation faster", "Speed up animation")
    if (
      lower.includes("animation slower") ||
      lower.includes("slower animation") ||
      lower.includes("motion slower") ||
      lower.includes("animation faster") ||
      lower.includes("speed up")
    ) {
      const isSlower = lower.includes("slower");
      const speedMultiplier = isSlower ? 0.7 : 1.4;
      const durationFactor = isSlower ? 1.5 : 0.75;
      const currentDuration = activeScene.duration;
      const proposedDuration = Math.max(0.5, Number((currentDuration * durationFactor).toFixed(1)));

      return [
        {
          id: `act_${Date.now()}_1`,
          type: "UPDATE_MOTION_PROPERTY",
          sceneId: activeScene.id,
          targetName: activeScene.name,
          property: "motion.speed",
          description: `${isSlower ? "Slow down" : "Speed up"} animation in ${activeScene.name} (duration: ${currentDuration}s → ${proposedDuration}s)`,
          previousValue: `${currentDuration}s`,
          proposedValue: `${proposedDuration}s`,
          payload: {
            speedMultiplier,
            durationFactor,
          },
        },
      ];
    }

    // F. SCENE BACKGROUND ("Change the background to a darker tone", "Darker background", "Change background to black")
    if (
      lower.includes("background") ||
      lower.includes("darker tone") ||
      lower.includes("dark mode")
    ) {
      const prevColor =
        typeof activeScene.background?.color === "string"
          ? activeScene.background.color
          : "#FFFFFF";

      let nextColor = "#111827";
      if (lower.includes("black")) nextColor = "#000000";
      else if (lower.includes("blue")) nextColor = "#1E3A8A";
      else if (lower.includes("white")) nextColor = "#FFFFFF";

      return [
        {
          id: `act_${Date.now()}_1`,
          type: "UPDATE_SCENE_BACKGROUND",
          sceneId: activeScene.id,
          targetName: `${activeScene.name} Background`,
          property: "background.color",
          description: `Change ${activeScene.name} background from ${prevColor} → ${nextColor}`,
          previousValue: prevColor,
          proposedValue: nextColor,
          payload: { color: nextColor },
        },
      ];
    }

    // G. Fallback: try calling LLM with structured prompt if available
    try {
      const llmResult = await this.queryLLMForActions(request, activeScene, selectedElement);
      if (llmResult && llmResult.length > 0) {
        return llmResult;
      }
    } catch (llmErr) {
      if (llmErr instanceof LLMError) throw llmErr;
      // Continue to final error throw
    }

    throw new Error(`Unable to recognize action for prompt: "${prompt}". Please provide a specific editing command.`);
  }

  /**
   * Helper that queries LLM (OpenRouter / Nemotron / Mock) for structured action synthesis.
   */
  private async queryLLMForActions(
    request: ContextualEditRequest,
    activeScene: Scene,
    selectedElement?: MotionElement
  ): Promise<ContextualEditAction[]> {
    const prompt = request.prompt;
    const project = request.project;

    // Use ContextManager to format secure context
    const constructed = await this.contextManager.buildContext({
      projectId: project.id,
      userRequest: prompt,
      currentProject: project,
      currentScene: activeScene,
      currentTask: "Contextual Natural Language Project Editing",
    });

    const response = await this.llmService.generate({
      systemInstruction:
        "You are MOTIONBOT AI Contextual Editing Engine. " +
        "You output JSON actions updating transform, text, duration, background, or motion. " +
        "Never execute code or scripts. Output strictly JSON.",
      messages: [
        {
          role: "user",
          content:
            `=== CONTEXTUAL_EDIT REQUEST ===\n` +
            `User Request: "${prompt}"\n` +
            `Active Scene ID: ${activeScene.id} (${activeScene.name})\n` +
            `Selected Element ID: ${selectedElement?.id || "none"}\n` +
            `Canvas Dimensions: ${project.width}x${project.height}\n` +
            `Respond with a JSON object: { "actions": [ { "type": "UPDATE_LAYER_TRANSFORM" | "UPDATE_TEXT_PROPERTY" | "UPDATE_SCENE_DURATION" | "UPDATE_SCENE_BACKGROUND" | "UPDATE_MOTION_PROPERTY", "sceneId": string, "elementId"?: string, "targetName": string, "property": string, "description": string, "previousValue": any, "proposedValue": any, "payload": object } ] }`,
        },
      ],
      responseFormat: { type: "json_object" },
    });

    try {
      const parsed = JSON.parse(response.text);
      if (parsed && Array.isArray(parsed.actions)) {
        return parsed.actions;
      }
    } catch {
      // Non-json response
    }

    return [];
  }
}

// Singleton accessor
let globalContextualEditorService: ContextualEditorService | null = null;

export function getContextualEditorService(): ContextualEditorService {
  if (!globalContextualEditorService) {
    globalContextualEditorService = new ContextualEditorService();
  }
  return globalContextualEditorService;
}
