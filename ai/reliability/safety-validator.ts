/**
 * MOTION-BOT — Safety & Permission Validator
 * Phase 7.7: AI Output Validation + Reliability Layer
 *
 * Enforces project scoping, session permissions, confirmation checks,
 * and secret redaction before any AI output can be applied.
 */

import { ValidationIssue, ReliabilityContext, ValidationTargetType } from "./types";
import { getToolRegistry } from "../tools/registry";
import { scrubObject } from "../context/secret-scrubber";

export interface SafetyValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

/**
 * Validates safety, project boundaries, and permissions for AI operations.
 */
export function validateSafetyAndPermissions(
  data: unknown,
  targetType: ValidationTargetType,
  context?: ReliabilityContext
): SafetyValidationResult {
  const issues: ValidationIssue[] = [];
  if (!data || typeof data !== "object") return { valid: true, issues: [] };

  const obj = data as Record<string, unknown>;

  // 1. Secret Scanning
  const { redactedCount } = scrubObject(obj);
  if (redactedCount > 0) {
    issues.push({
      stage: "safety_permission",
      code: "SECRETS_DETECTED_AND_SCRUBBED",
      message: `Detected and redacted ${redactedCount} sensitive secret(s) in AI output payload.`,
      severity: "warning",
      fatal: false,
    });
  }

  // 2. Project Boundary & Scope Isolation
  if (context?.projectId) {
    // If the data payload specifies a projectId, it must match
    const payloadProjectId = typeof obj.projectId === "string" ? obj.projectId : undefined;
    if (payloadProjectId && payloadProjectId !== context.projectId) {
      issues.push({
        stage: "safety_permission",
        code: "CROSS_PROJECT_VIOLATION",
        message: `Security violation: Operation targets project '${payloadProjectId}', but current session is locked to '${context.projectId}'.`,
        path: "projectId",
        severity: "error",
        fatal: true,
      });
    }

    // If it's a tool call, inspect tool arguments for target projectId
    if (targetType === "tool_call" && obj.arguments && typeof obj.arguments === "object") {
      const toolArgs = obj.arguments as Record<string, unknown>;
      if (typeof toolArgs.projectId === "string" && toolArgs.projectId !== context.projectId) {
        issues.push({
          stage: "safety_permission",
          code: "CROSS_PROJECT_TOOL_VIOLATION",
          message: `Security violation: Tool argument specifies projectId '${toolArgs.projectId}', but session is locked to '${context.projectId}'.`,
          path: "arguments.projectId",
          severity: "error",
          fatal: true,
        });
      }
    }
  }

  // 3. Tool Permissions & Confirmation Checks
  if (targetType === "tool_call") {
    const toolName = typeof obj.tool === "string" ? obj.tool.trim() : "";
    const registry = getToolRegistry();
    const tool = registry.get(toolName);

    if (tool) {
      // Read-only session enforcement
      if (context?.sessionPermission === "read" && tool.classification === "write") {
        issues.push({
          stage: "safety_permission",
          code: "WRITE_PERMISSION_DENIED",
          message: `Tool '${toolName}' is a write action, but current context is restricted to read-only operations.`,
          path: "tool",
          severity: "error",
          fatal: true,
        });
      }

      // Destructive confirmation enforcement
      if (tool.requiresConfirmation && context?.allowDestructive !== true) {
        issues.push({
          stage: "safety_permission",
          code: "CONFIRMATION_REQUIRED",
          message: `Tool '${toolName}' is a destructive or high-impact state-modifying action requiring explicit user confirmation.`,
          path: "tool",
          severity: "error",
          fatal: true,
        });
      }
    }
  }

  return {
    valid: issues.filter((i) => i.fatal).length === 0,
    issues,
  };
}
