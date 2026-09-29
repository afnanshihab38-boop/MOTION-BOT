/**
 * MOTION-BOT — Creative Brain Intelligence Service
 * Phase 7.3: MotionBot Creative Brain
 *
 * Converts natural-language user requests into structured, validated creative briefs.
 * Coordinates system prompts, schema validation, normalization, and contradiction detection.
 */

import {
  CreativeBrainRequest,
  CreativeBrainResult,
} from "./types";
import { CREATIVE_BRAIN_SYSTEM_PROMPT, buildCreativeBrainPrompt } from "./prompts";
import { validateAndNormalizeCreativeBrief } from "./validator";
import { getLLMService, LLMService } from "../llm-service";
import { LLMError } from "../llm-error";
import { LLMLogger } from "../logger";

export class CreativeBrainService {
  private readonly llmService: LLMService;

  constructor(llmService?: LLMService) {
    this.llmService = llmService || getLLMService();
  }

  /**
   * Translates a natural language user request into a validated CreativeBrief.
   */
  public async analyzeRequest(
    request: CreativeBrainRequest,
    providerId?: string
  ): Promise<CreativeBrainResult> {
    const startTime = Date.now();

    if (!request || typeof request !== "object") {
      throw new LLMError({
        code: "INVALID_CONFIG",
        message: "Creative brain request must be a valid object.",
        provider: "creative-brain",
      });
    }

    const trimmedPrompt = (request.prompt || "").trim();

    // Guard against completely empty requests
    if (trimmedPrompt.length === 0) {
      const validation = validateAndNormalizeCreativeBrief({}, "");
      return {
        brief: validation.brief,
        analysis: {
          ...validation.analysis,
          needsClarification: true,
          clarificationRequest: {
            issue: "Creative prompt was empty.",
            question: "What kind of video or motion ad would you like to create?",
            suggestedOptions: [
              "10-second energetic sneaker commercial for Instagram Reels",
              "15-second product launch teaser with bold typography",
              "30-second SaaS explainer video for LinkedIn",
            ],
          },
        },
        processingTimeMs: Date.now() - startTime,
        model: "creative-brain-guard",
      };
    }

    let effectiveRequest = { ...request };
    if (request.projectId && (!request.relevantMemories || request.relevantMemories.length === 0)) {
      try {
        const { getProjectMemoryService } = await import("../memory/memory-service");
        const memService = getProjectMemoryService();
        const memories = await memService.getRelevantMemories(request.projectId, trimmedPrompt);
        if (memories.length > 0) {
          effectiveRequest = {
            ...effectiveRequest,
            relevantMemories: memories.map((m) => `[${m.category.toUpperCase()}] ${m.content}`),
          };
        }
      } catch {
        // Fallback silently if memory retrieval fails
      }
    }

    const promptText = buildCreativeBrainPrompt(effectiveRequest);

    LLMLogger.info("Synthesizing creative brief from user request", {
      provider: providerId || this.llmService.getActiveProviderId(),
      model: "creative-brain",
    });

    try {
      const { data, response } = await this.llmService.generateStructured<Record<string, unknown>>(
        {
          systemInstruction: CREATIVE_BRAIN_SYSTEM_PROMPT,
          prompt: promptText,
          temperature: 0.4, // Controlled temperature for structured fidelity
          responseFormat: { type: "json_object" },
        },
        providerId
      );

      // Validate & normalize the raw output against the strict schema
      const validation = validateAndNormalizeCreativeBrief(data, trimmedPrompt);

      const processingTimeMs = Date.now() - startTime;

      LLMLogger.info("Creative brief synthesized and validated successfully", {
        provider: response.provider,
        model: response.model,
        durationMs: processingTimeMs,
      });

      return {
        brief: validation.brief,
        analysis: validation.analysis,
        processingTimeMs,
        model: response.model,
      };
    } catch (err: unknown) {
      if (err instanceof LLMError) {
        // If structured JSON parse failed, try to recover with safe defaults rather than crashing
        if (err.code === "JSON_PARSE_ERROR") {
          LLMLogger.warn("LLM returned non-JSON creative brief. Falling back to normalized brief.", {
            provider: err.provider,
            model: "creative-brain",
            errorCode: err.code,
          });

          const validation = validateAndNormalizeCreativeBrief(
            { brief: { subject: trimmedPrompt } },
            trimmedPrompt
          );

          return {
            brief: validation.brief,
            analysis: validation.analysis,
            processingTimeMs: Date.now() - startTime,
            model: "fallback-normalizer",
          };
        }
        throw err;
      }

      const message = err instanceof Error ? err.message : String(err);
      throw new LLMError({
        code: "PROVIDER_ERROR",
        message: `Creative brain failed to synthesize brief: ${message}`,
        provider: "creative-brain",
        cause: err,
      });
    }
  }
}

let defaultCreativeBrainInstance: CreativeBrainService | null = null;

export function getCreativeBrainService(llmService?: LLMService): CreativeBrainService {
  if (!defaultCreativeBrainInstance || llmService) {
    defaultCreativeBrainInstance = new CreativeBrainService(llmService);
  }
  return defaultCreativeBrainInstance;
}

export function createCreativeBrainService(llmService?: LLMService): CreativeBrainService {
  return new CreativeBrainService(llmService);
}

export function resetCreativeBrainService(): void {
  defaultCreativeBrainInstance = null;
}
