/**
 * MOTION-BOT — Multi-Domain Schema Validator
 * Phase 7.7: AI Output Validation + Reliability Layer
 *
 * Reuses existing domain validators for Creative Briefs, Motion Plans,
 * Tool Calls, and Scenes. Rejects missing fields, invalid types, and impossible parameters.
 */

import { ValidationIssue, ValidationTargetType, ReliabilityContext } from "./types";
import { validateAndNormalizeCreativeBrief } from "../creative-brain/validator";
import { validateAndNormalizeMotionPlan } from "../motion-plan/validator";
import { validateToolRequest } from "../tools/validator";
import { getToolRegistry } from "../tools/registry";

export interface SchemaValidationResult<T = unknown> {
  valid: boolean;
  data?: T;
  issues: ValidationIssue[];
}

/**
 * Validates parsed data against target schema contracts.
 */
export function validateSchema<T = unknown>(
  data: unknown,
  targetType: ValidationTargetType,
  context?: ReliabilityContext
): SchemaValidationResult<T> {
  const issues: ValidationIssue[] = [];

  if (data === null || data === undefined || typeof data !== "object") {
    issues.push({
      stage: "schema",
      code: "INVALID_ROOT_OBJECT",
      message: `Expected structured object for schema '${targetType}', received ${typeof data}.`,
      severity: "error",
      fatal: true,
    });
    return { valid: false, issues };
  }

  const obj = data as Record<string, unknown>;

  switch (targetType) {
    // -------------------------------------------------------------------------
    // 1. CREATIVE BRIEF
    // -------------------------------------------------------------------------
    case "creative_brief": {
      const userPrompt = typeof obj.prompt === "string" ? obj.prompt : (typeof obj.title === "string" ? obj.title : "");
      const { isValid, brief, analysis, errors } = validateAndNormalizeCreativeBrief(obj, userPrompt);

      if (!isValid || (errors && errors.length > 0)) {
        for (const err of errors || ["Creative Brief failed schema validation."]) {
          issues.push({
            stage: "schema",
            code: "MISSING_REQUIRED_FIELDS",
            message: err,
            path: "brief",
            severity: "error",
            fatal: true,
          });
        }
      }

      if (brief.duration <= 0 || isNaN(brief.duration)) {
        issues.push({
          stage: "schema",
          code: "INVALID_DURATION",
          message: "Creative Brief duration must be a positive number of seconds.",
          path: "brief.duration",
          severity: "error",
          fatal: true,
        });
      }

      if (analysis.contradictionsDetected && analysis.contradictionsDetected.length > 0) {
        for (const contradiction of analysis.contradictionsDetected) {
          issues.push({
            stage: "schema",
            code: "CONTRADICTION_DETECTED",
            message: contradiction,
            severity: "warning",
            fatal: false,
          });
        }
      }

      return {
        valid: issues.filter((i) => i.fatal).length === 0,
        data: brief as unknown as T,
        issues,
      };
    }

    // -------------------------------------------------------------------------
    // 2. MOTION PLAN
    // -------------------------------------------------------------------------
    case "motion_plan": {
      const projectMeta = (obj.project && typeof obj.project === "object" ? obj.project : {}) as Record<string, unknown>;
      const fallbackBrief = {
        id: "brief_inferred",
        version: "1.0.0" as const,
        title: typeof projectMeta.title === "string" ? projectMeta.title : "Motion Plan",
        projectType: "ad" as const,
        platform: "general" as const,
        duration: typeof obj.duration === "number" ? obj.duration : 10,
        aspectRatio: "16:9" as const,
        style: "modern",
        tone: "dynamic",
        subject: "Brand",
        visualDirection: {},
        textContent: { headline: "Headline" },
        animationDirection: { pacing: "smooth" as const },
        createdAt: new Date().toISOString(),
      };

      const planValidation = validateAndNormalizeMotionPlan(obj, fallbackBrief);
      if (!planValidation.valid) {
        for (const err of planValidation.errors) {
          issues.push({
            stage: "schema",
            code: "MOTION_PLAN_SCHEMA_ERROR",
            message: err.message,
            path: err.field,
            severity: "error",
            fatal: true,
          });
        }
        return { valid: false, issues };
      }

      return {
        valid: true,
        data: planValidation.plan as unknown as T,
        issues,
      };
    }

    // -------------------------------------------------------------------------
    // 3. TOOL CALL
    // -------------------------------------------------------------------------
    case "tool_call": {
      const registry = getToolRegistry();
      const toolValidation = validateToolRequest(obj, registry);

      if (!toolValidation.valid && toolValidation.error) {
        issues.push({
          stage: "schema",
          code: toolValidation.error.code,
          message: toolValidation.error.message,
          severity: "error",
          fatal: true,
        });
        return { valid: false, issues };
      }

      return {
        valid: true,
        data: obj as unknown as T,
        issues,
      };
    }

    // -------------------------------------------------------------------------
    // 4. SCENE
    // -------------------------------------------------------------------------
    case "scene": {
      if (typeof obj.name !== "string" || !obj.name.trim()) {
        issues.push({
          stage: "schema",
          code: "MISSING_SCENE_NAME",
          message: "Scene must specify a valid 'name' string.",
          path: "name",
          severity: "error",
          fatal: true,
        });
      }

      if (typeof obj.duration !== "number" || obj.duration <= 0 || isNaN(obj.duration)) {
        issues.push({
          stage: "schema",
          code: "INVALID_SCENE_DURATION",
          message: "Scene 'duration' must be a positive number.",
          path: "duration",
          severity: "error",
          fatal: true,
        });
      }

      if (obj.startTime !== undefined && (typeof obj.startTime !== "number" || obj.startTime < 0)) {
        issues.push({
          stage: "schema",
          code: "INVALID_START_TIME",
          message: "Scene 'startTime' cannot be negative.",
          path: "startTime",
          severity: "error",
          fatal: true,
        });
      }

      if (obj.elements !== undefined && !Array.isArray(obj.elements)) {
        issues.push({
          stage: "schema",
          code: "INVALID_ELEMENTS",
          message: "Scene 'elements' must be an array.",
          path: "elements",
          severity: "error",
          fatal: true,
        });
      }

      return {
        valid: issues.filter((i) => i.fatal).length === 0,
        data: obj as unknown as T,
        issues,
      };
    }

    // -------------------------------------------------------------------------
    // 5. GENERIC JSON
    // -------------------------------------------------------------------------
    case "generic_json":
    default: {
      return {
        valid: true,
        data: obj as unknown as T,
        issues: [],
      };
    }
  }
}
