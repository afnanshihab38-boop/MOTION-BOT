/**
 * MOTION-BOT — Tool Permission & Security Layer
 * Phase 7.5: Agent Tool / Action Layer
 *
 * Enforces strict separation between READ and WRITE operations,
 * validates user confirmation for destructive actions, and guarantees security boundaries.
 */

import {
  ToolDefinition,
  ToolExecutionContext,
  ToolErrorDetails,
} from "./types";

export interface PermissionEvaluationResult {
  allowed: boolean;
  error?: ToolErrorDetails;
}

export class PermissionLayer {
  /**
   * Evaluates if a tool invocation is authorized under the current execution context.
   */
  public evaluate(
    tool: ToolDefinition,
    context: ToolExecutionContext
  ): PermissionEvaluationResult {
    // 1. Enforce Read-Only Mode Restrictions
    if (context.readOnly && tool.classification === "write") {
      return {
        allowed: false,
        error: {
          code: "PERMISSION_DENIED",
          message: `Operation '${tool.name}' denied: The current session is restricted to read-only actions.`,
          details: { tool: tool.name, classification: tool.classification },
        },
      };
    }

    // 2. Destructive / Write Action Confirmation Check
    if (tool.requiresConfirmation && !context.userConfirmed) {
      return {
        allowed: false,
        error: {
          code: "CONFIRMATION_REQUIRED",
          message: `Tool '${tool.name}' is a destructive or high-impact state-modifying action requiring explicit user confirmation.`,
          details: {
            tool: tool.name,
            requiresConfirmation: true,
            hint: "Re-send request with 'userConfirmed: true' to approve execution.",
          },
        },
      };
    }

    // 3. Permission Level Enforcement
    if (tool.permissionLevel === "admin" && context.readOnly) {
      return {
        allowed: false,
        error: {
          code: "PERMISSION_DENIED",
          message: `Administrative tool '${tool.name}' cannot be invoked in the current session.`,
        },
      };
    }

    return { allowed: true };
  }

  /**
   * Security Boundary Guard:
   * Asserts that no prohibited tool domains (shell, eval, raw filesystem, env, credentials)
   * can ever be invoked or registered.
   */
  public assertSecurityBoundary(toolName: string): void {
    const PROHIBITED_NAMES = [
      "exec",
      "execute",
      "command",
      "shell",
      "bash",
      "terminal",
      "python",
      "eval",
      "fs",
      "read_file",
      "write_file",
      "delete_file",
      "env",
      "get_env",
      "sql",
      "db",
      "query",
    ];

    const lower = toolName.toLowerCase();
    for (const forbidden of PROHIBITED_NAMES) {
      if (lower === forbidden || lower.startsWith(`${forbidden}_`) || lower.endsWith(`_${forbidden}`)) {
        throw new Error(
          `Security violation: Registering or invoking system-level tool '${toolName}' is strictly forbidden.`
        );
      }
    }
  }
}

let defaultPermissionLayer: PermissionLayer | null = null;

export function getPermissionLayer(): PermissionLayer {
  if (!defaultPermissionLayer) {
    defaultPermissionLayer = new PermissionLayer();
  }
  return defaultPermissionLayer;
}
