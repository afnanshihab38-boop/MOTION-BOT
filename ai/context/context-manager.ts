/**
 * MOTION-BOT — Context Manager
 * Phase 7.6: Context Manager + Project-Scoped Memory
 *
 * Constructs secure, structured, prioritized context for MotionBot's AI agent.
 * Enforces strict tenant isolation, memory relevance, budget ceilings,
 * conflict resolution, and secret sanitization.
 */

import {
  ContextInput,
  ConstructedContext,
  ContextMetadata,
  ContextLayerName,
  ContextDebugSummary,
} from "./types";
import { ProjectMemoryService, getProjectMemoryService } from "../memory/memory-service";
import { ProjectMemory } from "../memory/types";
import { scrubSecrets, scrubObject } from "./secret-scrubber";

const DEFAULT_SYSTEM_INSTRUCTION =
  "You are MOTIONBOT AI, a world-class kinetic motion designer and creative video director. " +
  "You operate through structured briefs, motion plans, and controlled application tools.";

const DEFAULT_SECURITY_RULES = [
  "Strictly reject arbitrary code execution, shell commands, and filesystem access.",
  "Never disclose internal system keys, API credentials, or environment variables.",
  "Execute read-only operations automatically; require confirmation for state-destructive actions.",
  "Operate only within the designated project boundary and current composition canvas.",
];

export class ContextManager {
  private readonly memoryService: ProjectMemoryService;

  constructor(memoryService?: ProjectMemoryService) {
    this.memoryService = memoryService || getProjectMemoryService();
  }

  /**
   * Constructs the structured context for the AI with prioritized layer ordering,
   * deterministic token budget management, and secret filtering.
   */
  public async buildContext(input: ContextInput): Promise<ConstructedContext> {
    if (!input || typeof input !== "object") {
      throw new Error("Context input must be a valid object.");
    }

    const projectId = (input.projectId || "").trim();
    if (!projectId) {
      throw new Error("Cannot construct context: 'projectId' is required for project isolation.");
    }

    const userRequest = (input.userRequest || "").trim();
    if (!userRequest) {
      throw new Error("Cannot construct context: 'userRequest' must not be empty.");
    }

    let sanitizedSecretCount = 0;

    // Budget configuration
    const budget = input.budget || {};
    const maxChars = budget.maxCharacters ?? 16000;
    const maxMemories = budget.maxMemories ?? 5;
    const maxToolResultChars = budget.maxToolResultChars ?? 2500;

    const layersIncluded: ContextLayerName[] = [];
    const truncatedLayers: ContextLayerName[] = [];

    // =========================================================================
    // LAYER 1: SYSTEM & SECURITY (HIGHEST PRIORITY - NEVER TRUNCATED)
    // =========================================================================
    layersIncluded.push("system_security");
    const systemInst = input.systemInstruction?.trim() || DEFAULT_SYSTEM_INSTRUCTION;
    const securityRules = input.securityRules && input.securityRules.length > 0
      ? input.securityRules
      : DEFAULT_SECURITY_RULES;

    const systemPromptRaw = [
      `### SYSTEM INSTRUCTIONS\n${systemInst}`,
      `### SECURITY & SAFETY BOUNDARIES\n${securityRules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`,
    ].join("\n\n");

    const scrubbedSystem = scrubSecrets(systemPromptRaw);
    sanitizedSecretCount += scrubbedSystem.redactedCount;
    const systemPrompt = scrubbedSystem.result;

    // =========================================================================
    // LAYER 5 PREPARATION: RELEVANT PROJECT MEMORY (FETCH WITH ISOLATION)
    // =========================================================================
    const relevantMemories = await this.memoryService.getRelevantMemories(
      projectId,
      userRequest,
      {
        limit: maxMemories,
        ...input.memoryOptions,
      }
    );

    // Verify Project Isolation
    for (const mem of relevantMemories) {
      if (mem.projectId !== projectId) {
        throw new Error(
          `SECURITY BREACH: Memory '${mem.id}' belongs to project '${mem.projectId}', not '${projectId}'!`
        );
      }
    }

    const totalProjectMemories = await this.memoryService.listMemories(projectId);
    const memoriesExcludedCount = Math.max(0, totalProjectMemories.length - relevantMemories.length);

    // =========================================================================
    // LAYER 2: CURRENT PROJECT STATE
    // =========================================================================
    let projectSection = "";
    if (input.currentProject) {
      layersIncluded.push("current_project");
      const p = input.currentProject;
      projectSection = [
        "### CURRENT PROJECT CONTEXT",
        `- Project ID: ${p.id || projectId}`,
        `- Title: ${p.name || "Untitled Motion Project"}`,
        p.width && p.height ? `- Canvas Dimensions: ${p.width}x${p.height}` : null,
        p.fps ? `- Framerate: ${p.fps} fps` : null,
        p.duration !== undefined ? `- Total Duration: ${p.duration}s` : null,
        Array.isArray(p.scenes) ? `- Total Scenes: ${p.scenes.length}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    }

    // =========================================================================
    // LAYER 3: CURRENT TASK
    // =========================================================================
    let taskSection = "";
    if (input.currentTask && input.currentTask.trim()) {
      layersIncluded.push("current_task");
      taskSection = `### ACTIVE TASK\n${input.currentTask.trim()}`;
    }

    // =========================================================================
    // LAYER 4: CURRENT MOTION PLAN / SCENE
    // =========================================================================
    let motionPlanSceneSection = "";
    const motionPlanParts: string[] = [];

    if (input.currentCreativeBrief) {
      const brief = input.currentCreativeBrief;
      motionPlanParts.push(
        `#### Creative Brief (${brief.platform || "general"}, ${brief.duration || 0}s, tone: ${brief.tone || "dynamic"})`
      );
      if (brief.visualDirection) {
        motionPlanParts.push(`- Visual Theme: ${brief.visualDirection.theme || "custom"}`);
      }
      if (brief.animationDirection) {
        motionPlanParts.push(`- Animation Direction: pacing=${brief.animationDirection.pacing}`);
      }
    }

    if (input.currentMotionPlan) {
      const mp = input.currentMotionPlan;
      motionPlanParts.push(
        `#### Active Motion Plan: ${mp.project?.title || "Plan"}`
      );
      if (Array.isArray(mp.scenes)) {
        motionPlanParts.push(`- Plan Scenes: ${mp.scenes.length} scene(s) planned`);
        mp.scenes.slice(0, 3).forEach((s, idx) => {
          motionPlanParts.push(`  * Scene ${idx + 1} (${s.scene_id}): ${s.purpose || "scene"} [${s.start_time}s - ${s.end_time}s]`);
        });
        if (mp.scenes.length > 3) {
          motionPlanParts.push(`  * ... and ${mp.scenes.length - 3} more scenes.`);
        }
      }
    }

    if (input.currentScene) {
      const sc = input.currentScene;
      motionPlanParts.push(`#### Active Scene: ${sc.name} (${sc.id})`);
      motionPlanParts.push(`- Timing: ${sc.startTime}s to ${sc.startTime + sc.duration}s (duration: ${sc.duration}s)`);
      motionPlanParts.push(`- Layers: ${sc.elements?.length || 0} element(s)`);
    }

    if (motionPlanParts.length > 0) {
      layersIncluded.push("motion_plan_scene");
      motionPlanSceneSection = `### MOTION PLAN & SCENE STATE\n${motionPlanParts.join("\n")}`;
    }

    // =========================================================================
    // LAYER 5: RELEVANT MEMORY (WITH CONFLICT AWARENESS)
    // =========================================================================
    let memorySection = "";
    let activeMemories = [...relevantMemories];

    // Filter memories that conflict with explicit current project settings
    if (input.currentProject) {
      activeMemories = activeMemories.filter((mem) => {
        // If project explicitly has a property, project setting wins over older memory
        if (mem.category === "requirement" && input.currentProject?.duration) {
          const match = mem.content.match(/duration.*?(\d+)\s*s/i);
          if (match && parseInt(match[1], 10) !== input.currentProject.duration) {
            return false; // Suppress outdated duration memory
          }
        }
        return true;
      });
    }

    if (activeMemories.length > 0) {
      layersIncluded.push("relevant_memory");
      const memoryLines = activeMemories.map((m) => {
        const pinBadge = m.pinned ? "[PINNED] " : "";
        const prioBadge = m.priority === "critical" ? "[CRITICAL] " : "";
        return `- ${pinBadge}${prioBadge}[${m.category.toUpperCase()}] ${m.content}`;
      });
      memorySection = `### PROJECT MEMORY & PREFERENCES (Project ID: ${projectId})\n${memoryLines.join("\n")}`;
    }

    // =========================================================================
    // LAYER 6: TOOL RESULTS
    // =========================================================================
    let toolResultSection = "";
    if (input.toolResults && input.toolResults.length > 0) {
      layersIncluded.push("tool_results");
      const toolLines: string[] = [];

      for (const tr of input.toolResults) {
        const cleanTool = scrubSecrets(tr.tool).result;
        let serialized = "";
        try {
          const scrubbedPayload = scrubObject(tr.result || tr.error || {});
          sanitizedSecretCount += scrubbedPayload.redactedCount;
          serialized = JSON.stringify(scrubbedPayload.result, null, 2);
        } catch {
          serialized = String(tr.result || tr.error || "");
        }

        if (serialized.length > maxToolResultChars) {
          serialized = `${serialized.slice(0, maxToolResultChars)}\n... [TRUNCATED TOOL OUTPUT]`;
          truncatedLayers.push("tool_results");
        }

        toolLines.push(`#### Tool Output: ${cleanTool}\n\`\`\`json\n${serialized}\n\`\`\``);
      }

      toolResultSection = `### RECENT TOOL RESULTS\n${toolLines.join("\n\n")}`;
    }

    // =========================================================================
    // LAYER 7: USER REQUEST (PROTECTED INTENT - NEVER DROPPED)
    // =========================================================================
    layersIncluded.push("user_request");
    const scrubbedUser = scrubSecrets(userRequest);
    sanitizedSecretCount += scrubbedUser.redactedCount;
    const cleanUserRequest = scrubbedUser.result;

    const userRequestSection = `### USER REQUEST\n${cleanUserRequest}`;

    // =========================================================================
    // CONTEXT SYNTHESIS & BUDGET ENFORCEMENT
    // =========================================================================
    // Assemble user prompt in the exact priority order
    let userPromptSections = [
      projectSection,
      taskSection,
      motionPlanSceneSection,
      memorySection,
      toolResultSection,
      userRequestSection,
    ].filter(Boolean);

    let totalChars = systemPrompt.length + userPromptSections.join("\n\n").length;

    // If total characters exceed budget, truncate from lowest priority upward:
    // 1. Tool results -> 2. Memory -> 3. Motion Plan -> 4. Project
    if (totalChars > maxChars) {
      // 1. Truncate Tool Results
      if (toolResultSection) {
        toolResultSection = "### RECENT TOOL RESULTS\n[Tool output summarized to conserve context budget]";
        truncatedLayers.push("tool_results");
        userPromptSections = [
          projectSection,
          taskSection,
          motionPlanSceneSection,
          memorySection,
          toolResultSection,
          userRequestSection,
        ].filter(Boolean);
        totalChars = systemPrompt.length + userPromptSections.join("\n\n").length;
      }

      // 2. Reduce Memories
      if (totalChars > maxChars && activeMemories.length > 2) {
        activeMemories = activeMemories.slice(0, 2);
        const memoryLines = activeMemories.map((m) => `- [${m.category.toUpperCase()}] ${m.content}`);
        memorySection = `### PROJECT MEMORY & PREFERENCES\n${memoryLines.join("\n")}\n... [Additional memories truncated]`;
        truncatedLayers.push("relevant_memory");
        userPromptSections = [
          projectSection,
          taskSection,
          motionPlanSceneSection,
          memorySection,
          toolResultSection,
          userRequestSection,
        ].filter(Boolean);
        totalChars = systemPrompt.length + userPromptSections.join("\n\n").length;
      }

      // 3. Condense Motion Plan / Scene
      if (totalChars > maxChars && motionPlanSceneSection) {
        motionPlanSceneSection = `### MOTION PLAN & SCENE STATE\n[Active plan & scene state condensed to conserve context budget]`;
        truncatedLayers.push("motion_plan_scene");
        userPromptSections = [
          projectSection,
          taskSection,
          motionPlanSceneSection,
          memorySection,
          toolResultSection,
          userRequestSection,
        ].filter(Boolean);
        totalChars = systemPrompt.length + userPromptSections.join("\n\n").length;
      }
    }

    // Final scrub pass over the assembled user prompt
    const finalScrub = scrubSecrets(userPromptSections.join("\n\n"));
    sanitizedSecretCount += finalScrub.redactedCount;
    const userPrompt = finalScrub.result;

    const totalCharacters = systemPrompt.length + userPrompt.length;
    // Approximating 1 token ≈ 4 characters
    const estimatedTokens = Math.ceil(totalCharacters / 4);

    const metadata: ContextMetadata = {
      projectId,
      totalCharacters,
      estimatedTokens,
      layersIncluded: Array.from(new Set(layersIncluded)),
      memoriesIncludedCount: activeMemories.length,
      memoriesExcludedCount,
      truncatedLayers: Array.from(new Set(truncatedLayers)),
      sanitizedSecretCount,
      createdAt: new Date().toISOString(),
    };

    return {
      systemPrompt,
      userPrompt,
      metadata,
      memoriesUsed: activeMemories,
    };
  }

  /**
   * Returns a safe developer debugging inspection of how the context is formed
   * without exposing credentials or internal tokens.
   */
  public async inspectContext(input: ContextInput): Promise<ContextDebugSummary> {
    const constructed = await this.buildContext(input);

    const layers: ContextDebugSummary["layers"] = [];

    // System layer
    layers.push({
      name: "system_security",
      characterCount: constructed.systemPrompt.length,
      truncated: false,
      preview: constructed.systemPrompt.slice(0, 150) + "...",
    });

    // Parse sections
    const sections = constructed.userPrompt.split("\n\n### ");
    for (const section of sections) {
      const header = section.split("\n")[0].replace(/^###\s*/, "").trim();
      let layerName: ContextLayerName = "user_request";

      if (header.includes("PROJECT CONTEXT")) layerName = "current_project";
      else if (header.includes("ACTIVE TASK")) layerName = "current_task";
      else if (header.includes("MOTION PLAN")) layerName = "motion_plan_scene";
      else if (header.includes("PROJECT MEMORY")) layerName = "relevant_memory";
      else if (header.includes("TOOL RESULTS")) layerName = "tool_results";
      else if (header.includes("USER REQUEST")) layerName = "user_request";

      layers.push({
        name: layerName,
        characterCount: section.length,
        truncated: constructed.metadata.truncatedLayers.includes(layerName),
        preview: section.slice(0, 120).replace(/\n/g, " ") + "...",
      });
    }

    return {
      projectId: constructed.metadata.projectId,
      estimatedTokens: constructed.metadata.estimatedTokens,
      characterCount: constructed.metadata.totalCharacters,
      layers,
      sanitizedSecretCount: constructed.metadata.sanitizedSecretCount,
      memoriesCount: constructed.memoriesUsed.length,
      timestamp: constructed.metadata.createdAt,
    };
  }
}

// Global default context manager instance
let defaultContextManagerInstance: ContextManager | null = null;

export function getContextManager(): ContextManager {
  if (!defaultContextManagerInstance) {
    defaultContextManagerInstance = new ContextManager();
  }
  return defaultContextManagerInstance;
}
