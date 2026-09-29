/**
 * MOTION-BOT — Semantic Validator
 * Phase 7.7: AI Output Validation + Reliability Layer
 *
 * Enforces deep temporal, structural, and asset-referential integrity.
 * Catches negative durations, temporal drift, broken asset links, and unlisted animations.
 */

import { ValidationIssue, ReliabilityContext, ValidationTargetType } from "./types";
import { CONTROLLED_ANIMATION_SET } from "../motion-plan/types";

export interface SemanticValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/**
 * Performs semantic validation across temporal alignment, asset bindings, and animation choreography.
 */
export function validateSemantics(
  data: unknown,
  targetType: ValidationTargetType,
  context?: ReliabilityContext
): SemanticValidationResult {
  const issues: ValidationIssue[] = [];
  if (!data || typeof data !== "object") return { valid: true, issues: [] };

  const obj = data as Record<string, unknown>;

  // ---------------------------------------------------------------------------
  // 1. MOTION PLAN SEMANTIC CHECKS
  // ---------------------------------------------------------------------------
  if (targetType === "motion_plan") {
    const duration = typeof obj.duration === "number" ? obj.duration : 0;
    const scenes = Array.isArray(obj.scenes) ? (obj.scenes as Array<Record<string, unknown>>) : [];

    // Check project duration
    if (context?.expectedDuration && Math.abs(duration - context.expectedDuration) > 1.0) {
      issues.push({
        stage: "semantic",
        code: "DURATION_MISMATCH",
        message: `Motion Plan total duration (${duration}s) deviates from expected context duration (${context.expectedDuration}s).`,
        path: "duration",
        severity: "warning",
        fatal: false,
      });
    }

    // Check scenes temporal consistency
    let lastEndTime = 0;
    const seenElementIds = new Set<string>();

    scenes.forEach((scene, sIdx) => {
      const startTime = typeof scene.start_time === "number" ? scene.start_time : 0;
      const endTime = typeof scene.end_time === "number" ? scene.end_time : 0;
      const sceneDuration = typeof scene.duration === "number" ? scene.duration : 0;

      // 1. Scene arithmetic: end_time - start_time === duration
      if (Math.abs(endTime - startTime - sceneDuration) > 0.05) {
        issues.push({
          stage: "semantic",
          code: "SCENE_TIMING_ARITHMETIC_ERROR",
          message: `Scene '${scene.scene_id || sIdx}' timing error: end_time (${endTime}) - start_time (${startTime}) !== duration (${sceneDuration}).`,
          path: `scenes[${sIdx}]`,
          severity: "error",
          fatal: true,
        });
      }

      // 2. Timeline sequence: scenes should not start before previous scene ends
      if (sIdx > 0 && startTime < lastEndTime - 0.05) {
        issues.push({
          stage: "semantic",
          code: "SCENE_CHRONOLOGY_OVERLAP",
          message: `Scene '${scene.scene_id || sIdx}' start_time (${startTime}s) overlaps with previous scene ending at ${lastEndTime}s.`,
          path: `scenes[${sIdx}].start_time`,
          severity: "error",
          fatal: true,
        });
      }

      lastEndTime = Math.max(lastEndTime, endTime);

      // 3. Check visual elements
      if (Array.isArray(scene.visual_elements)) {
        scene.visual_elements.forEach((vel: Record<string, unknown>, eIdx: number) => {
          const elId = String(vel.element_id || `el_${sIdx}_${eIdx}`);
          if (seenElementIds.has(elId)) {
            issues.push({
              stage: "semantic",
              code: "DUPLICATE_ELEMENT_ID",
              message: `Duplicate element ID detected: '${elId}'. Element IDs must be unique across the composition.`,
              path: `scenes[${sIdx}].visual_elements[${eIdx}]`,
              severity: "error",
              fatal: true,
            });
          }
          seenElementIds.add(elId);

          // Check asset reference if provided
          if (vel.asset_id && context?.availableAssets && context.availableAssets.length > 0) {
            const assetId = String(vel.asset_id);
            if (!context.availableAssets.includes(assetId)) {
              issues.push({
                stage: "semantic",
                code: "BROKEN_ASSET_REFERENCE",
                message: `Element '${elId}' references missing asset ID: '${assetId}'.`,
                path: `scenes[${sIdx}].visual_elements[${eIdx}].asset_id`,
                severity: "error",
                fatal: true,
              });
            }
          }
        });
      }

      // 4. Validate animation vocabulary
      const checkAnimation = (anim: unknown, animPath: string) => {
        if (!anim || typeof anim !== "object") return;
        const animObj = anim as Record<string, unknown>;
        const type = typeof animObj.type === "string" ? animObj.type.toLowerCase() : "";
        if (type && !CONTROLLED_ANIMATION_SET.has(type)) {
          issues.push({
            stage: "semantic",
            code: "UNSUPPORTED_ANIMATION_TYPE",
            message: `Animation type '${type}' is not recognized in MotionBot controlled vocabulary.`,
            path: animPath,
            severity: "error",
            fatal: true,
          });
        }
      };

      checkAnimation(scene.entrance_animation, `scenes[${sIdx}].entrance_animation`);
      checkAnimation(scene.exit_animation, `scenes[${sIdx}].exit_animation`);
    });
  }

  // ---------------------------------------------------------------------------
  // 2. SCENE SEMANTIC CHECKS
  // ---------------------------------------------------------------------------
  if (targetType === "scene") {
    const duration = typeof obj.duration === "number" ? obj.duration : 0;
    const startTime = typeof obj.startTime === "number" ? obj.startTime : 0;

    if (duration > 600) {
      issues.push({
        stage: "semantic",
        code: "EXCESSIVE_SCENE_DURATION",
        message: `Scene duration (${duration}s) exceeds realistic single scene bounds (max 600s).`,
        path: "duration",
        severity: "error",
        fatal: true,
      });
    }

    if (startTime < 0) {
      issues.push({
        stage: "semantic",
        code: "NEGATIVE_START_TIME",
        message: "Scene cannot have a negative start timestamp.",
        path: "startTime",
        severity: "error",
        fatal: true,
      });
    }
  }

  return {
    valid: issues.filter((i) => i.fatal).length === 0,
    issues,
  };
}
