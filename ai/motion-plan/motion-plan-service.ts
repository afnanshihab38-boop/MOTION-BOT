/**
 * MOTION-BOT — Structured Motion Plan Service
 * Phase 7.4: Structured Motion Plan Generator
 *
 * Coordinates LLM generation, prompt synthesis, schema validation,
 * temporal correctness verification, and safe fallback recovery.
 */

import {
  MotionPlanGenerationRequest,
  MotionPlanGenerationResult,
  MotionPlan,
  MotionPlanValidationResult,
} from "./types";
import { MOTION_PLAN_SYSTEM_PROMPT, buildMotionPlanPrompt } from "./prompts";
import { validateAndNormalizeMotionPlan, ValidationOptions } from "./validator";
import { CreativeBrief } from "../creative-brain/types";
import { getLLMService, LLMService } from "../llm-service";
import { LLMError } from "../llm-error";
import { LLMLogger } from "../logger";

export interface MotionPlanServiceOptions extends ValidationOptions {
  providerId?: string;
}

export class MotionPlanService {
  private readonly llmService: LLMService;

  constructor(llmService?: LLMService) {
    this.llmService = llmService || getLLMService();
  }

  /**
   * Generates a fully validated MotionPlan from a CreativeBrief.
   */
  public async generateMotionPlan(
    input: MotionPlanGenerationRequest | CreativeBrief,
    options: MotionPlanServiceOptions = {}
  ): Promise<MotionPlanGenerationResult> {
    const startTime = Date.now();

    // Normalize input
    const request: MotionPlanGenerationRequest =
      "brief" in input
        ? (input as MotionPlanGenerationRequest)
        : { brief: input as CreativeBrief };

    if (!request.brief || typeof request.brief !== "object" || !request.brief.id) {
      throw new LLMError({
        code: "INVALID_CONFIG",
        message: "A valid CreativeBrief is required to generate a Motion Plan.",
        provider: "motion-plan",
      });
    }

    const providerId = options.providerId || this.llmService.getActiveProviderId();
    const promptText = buildMotionPlanPrompt(request);

    LLMLogger.info("Synthesizing structured motion plan from creative brief", {
      provider: providerId,
      model: "motion-plan",
    });

    try {
      const { data, response } = await this.llmService.generateStructured<Record<string, unknown>>(
        {
          systemInstruction: MOTION_PLAN_SYSTEM_PROMPT,
          prompt: promptText,
          temperature: 0.2, // Low temperature for high precision and schema adherence
          responseFormat: { type: "json_object" },
        },
        providerId
      );

      // Validate & normalize raw output against strict schema and temporal rules
      const validation = validateAndNormalizeMotionPlan(data, request.brief, {
        strict: options.strict,
      });

      // If strict mode requested and validation has errors, throw
      if (options.strict && !validation.valid) {
        throw new LLMError({
          code: "INVALID_CONFIG",
          message: `Motion Plan validation failed: ${validation.errors.map((e) => e.message).join("; ")}`,
          provider: "motion-plan",
          cause: { errors: validation.errors },
        });
      }

      const processingTimeMs = Date.now() - startTime;

      LLMLogger.info("Motion plan generated and temporally validated successfully", {
        provider: response.provider,
        model: response.model,
        durationMs: processingTimeMs,
      });

      return {
        plan: validation.plan,
        validation,
        processingTimeMs,
        model: response.model,
      };
    } catch (err: unknown) {
      if (err instanceof LLMError) {
        // If JSON parse failed and strict is not enabled, recover using normalized brief-derived plan
        if (err.code === "JSON_PARSE_ERROR" && !options.strict) {
          LLMLogger.warn(
            "LLM returned malformed JSON for motion plan. Recovering with normalized brief-derived plan.",
            {
              provider: err.provider,
              model: "motion-plan",
              errorCode: err.code,
            }
          );

          const fallbackValidation = validateAndNormalizeMotionPlan({}, request.brief);

          return {
            plan: fallbackValidation.plan,
            validation: fallbackValidation,
            processingTimeMs: Date.now() - startTime,
            model: "fallback-recovery",
          };
        }
        throw err;
      }

      const message = err instanceof Error ? err.message : String(err);
      throw new LLMError({
        code: "PROVIDER_ERROR",
        message: `Motion plan generator failed: ${message}`,
        provider: "motion-plan",
        cause: err,
      });
    }
  }

  /**
   * Helper to directly validate an existing or external MotionPlan.
   */
  public validatePlan(
    plan: unknown,
    sourceBrief: CreativeBrief,
    options?: ValidationOptions
  ): MotionPlanValidationResult {
    return validateAndNormalizeMotionPlan(plan, sourceBrief, options);
  }
}

let defaultMotionPlanInstance: MotionPlanService | null = null;

export function getMotionPlanService(llmService?: LLMService): MotionPlanService {
  if (!defaultMotionPlanInstance || llmService) {
    defaultMotionPlanInstance = new MotionPlanService(llmService);
  }
  return defaultMotionPlanInstance;
}

export function createMotionPlanService(llmService?: LLMService): MotionPlanService {
  return new MotionPlanService(llmService);
}

export function resetMotionPlanService(): void {
  defaultMotionPlanInstance = null;
}
