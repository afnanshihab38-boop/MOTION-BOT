/**
 * MOTION-BOT — Master AI Output Validation Pipeline
 * Phase 7.7: AI Output Validation + Reliability Layer
 *
 * Implements the 4-stage validation pipeline:
 * Parse -> Schema -> Semantic -> Safety & Permissions.
 * Enforces that no unvalidated instruction is ever executed.
 */

import {
  ValidationPipelineResult,
  ValidationTargetType,
  ReliabilityContext,
  ValidationIssue,
} from "./types";
import { robustParseJson } from "./parser";
import { validateSchema } from "./schema-validator";
import { validateSemantics } from "./semantic-validator";
import { validateSafetyAndPermissions } from "./safety-validator";

export class AIReliabilityPipeline {
  /**
   * Runs the complete 4-stage validation pipeline on raw LLM output or structured object.
   */
  public static async validate<T = unknown>(
    rawInput: unknown,
    targetType: ValidationTargetType,
    context?: ReliabilityContext
  ): Promise<ValidationPipelineResult<T>> {
    const issues: ValidationIssue[] = [];

    // =========================================================================
    // STAGE 1: PARSE
    // =========================================================================
    const parseResult = robustParseJson(rawInput);
    issues.push(...parseResult.issues);

    if (!parseResult.success || parseResult.data === undefined) {
      return {
        valid: false,
        issues,
        rawInput,
        stageFailed: "parse",
        executionAllowed: false,
      };
    }

    const parsedData = parseResult.data;

    // =========================================================================
    // STAGE 2: SCHEMA VALIDATION
    // =========================================================================
    const schemaResult = validateSchema<T>(parsedData, targetType, context);
    issues.push(...schemaResult.issues);

    if (!schemaResult.valid) {
      return {
        valid: false,
        data: schemaResult.data,
        issues,
        rawInput,
        stageFailed: "schema",
        executionAllowed: false,
      };
    }

    // =========================================================================
    // STAGE 3: SEMANTIC VALIDATION
    // =========================================================================
    const semanticResult = validateSemantics(parsedData, targetType, context);
    issues.push(...semanticResult.issues);

    if (!semanticResult.valid) {
      return {
        valid: false,
        data: schemaResult.data ?? (parsedData as T),
        issues,
        rawInput,
        stageFailed: "semantic",
        executionAllowed: false,
      };
    }

    const validatedData = schemaResult.data ?? (parsedData as T);

    // =========================================================================
    // STAGE 4: SAFETY & PERMISSION VALIDATION
    // =========================================================================
    const safetyResult = validateSafetyAndPermissions(validatedData, targetType, context);
    issues.push(...safetyResult.issues);

    if (!safetyResult.valid) {
      return {
        valid: false,
        data: validatedData,
        issues,
        rawInput,
        stageFailed: "safety_permission",
        executionAllowed: false,
      };
    }

    const fatalIssues = issues.filter((i) => i.fatal);
    const isValid = fatalIssues.length === 0;

    return {
      valid: isValid,
      data: validatedData,
      issues,
      rawInput,
      stageFailed: isValid ? undefined : fatalIssues[0].stage,
      executionAllowed: isValid,
    };
  }
}
