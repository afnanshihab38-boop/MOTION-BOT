/**
 * MOTION-BOT — Tool Execution Pipeline
 * Phase 7.5: Agent Tool / Action Layer
 *
 * Coordinates:
 * Request → Validator → Permission Layer → Execution → Sanitization → Structured Result
 * Treats all tool inputs and outputs as untrusted data and prevents secret leakage.
 */

import {
  ToolRequest,
  ToolResult,
  ToolExecutionContext,
  ToolErrorDetails,
} from "./types";
import { ToolRegistry, getToolRegistry } from "./registry";
import { validateToolRequest } from "./validator";
import { PermissionLayer, getPermissionLayer } from "./permissions";
import { LLMLogger } from "../logger";

export class ToolExecutor {
  private readonly registry: ToolRegistry;
  private readonly permissionLayer: PermissionLayer;

  constructor(registry?: ToolRegistry, permissionLayer?: PermissionLayer) {
    this.registry = registry || getToolRegistry();
    this.permissionLayer = permissionLayer || getPermissionLayer();
  }

  /**
   * Executes a structured tool request through validation, permission checks,
   * safe execution, and output sanitization.
   */
  public async execute(
    request: ToolRequest,
    context: ToolExecutionContext = {}
  ): Promise<ToolResult> {
    const startTime = Date.now();
    const toolName = request && typeof request === "object" ? String(request.tool || "") : "unknown";

    LLMLogger.info(`Processing tool request for '${toolName}'`, {
      provider: "tool-executor",
      model: toolName,
    });

    // 1. Validation Layer
    const validation = validateToolRequest(request, this.registry);
    if (!validation.valid || !validation.tool || !validation.sanitizedArgs) {
      const error: ToolErrorDetails = validation.error || {
        code: "VALIDATION_ERROR",
        message: "Tool request validation failed.",
      };

      LLMLogger.warn(`Tool request validation failed for '${toolName}': ${error.message}`, {
        provider: "tool-executor",
        model: toolName,
        errorCode: error.code,
      });

      return {
        success: false,
        tool: toolName,
        data: null,
        error,
        executionTimeMs: Date.now() - startTime,
      };
    }

    const tool = validation.tool;
    const sanitizedArgs = validation.sanitizedArgs;

    // 2. Permission Layer
    // Check if user confirmed the action via context or request token
    const effectiveContext: ToolExecutionContext = {
      ...context,
      userConfirmed: context.userConfirmed || Boolean(request.confirmationToken),
    };

    const permission = this.permissionLayer.evaluate(tool, effectiveContext);
    if (!permission.allowed || permission.error) {
      const error = permission.error!;
      LLMLogger.warn(`Permission denied for tool '${tool.name}': ${error.message}`, {
        provider: "tool-executor",
        model: tool.name,
        errorCode: error.code,
      });

      return {
        success: false,
        tool: tool.name,
        data: null,
        error,
        executionTimeMs: Date.now() - startTime,
      };
    }

    // 3. Execution Layer
    try {
      const rawResult = await tool.execute(sanitizedArgs, effectiveContext);
      const executionTimeMs = Date.now() - startTime;

      // 4. Untrusted Output Sanitization
      const sanitizedData = sanitizeToolOutput(rawResult);

      LLMLogger.info(`Tool '${tool.name}' executed successfully in ${executionTimeMs}ms`, {
        provider: "tool-executor",
        model: tool.name,
        durationMs: executionTimeMs,
      });

      return {
        success: true,
        tool: tool.name,
        data: sanitizedData,
        error: null,
        executionTimeMs,
      };
    } catch (err: unknown) {
      const executionTimeMs = Date.now() - startTime;
      const rawMessage = err instanceof Error ? err.message : String(err);
      const sanitizedMessage = LLMLogger.sanitize(rawMessage);

      LLMLogger.error(`Tool '${tool.name}' execution threw an exception: ${sanitizedMessage}`, {
        provider: "tool-executor",
        model: tool.name,
        errorCode: "EXECUTION_ERROR",
        durationMs: executionTimeMs,
      });

      return {
        success: false,
        tool: tool.name,
        data: null,
        error: {
          code: "EXECUTION_ERROR",
          message: `Execution failed: ${sanitizedMessage}`,
        },
        executionTimeMs,
      };
    }
  }
}

/**
 * Sanitizes tool output recursively: removes potential secret tokens or circular references.
 */
function sanitizeToolOutput(val: unknown, depth = 0): unknown {
  if (depth > 6) return "[Truncated: maximum object depth reached]";
  if (val === null || val === undefined) return val;

  if (typeof val === "string") {
    return LLMLogger.sanitize(val);
  }

  if (Array.isArray(val)) {
    return val.map((item) => sanitizeToolOutput(item, depth + 1));
  }

  if (typeof val === "object") {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(val as Record<string, unknown>)) {
      // Exclude any internal keys that look like credentials
      if (/password|secret|apikey|token|auth/i.test(key)) {
        sanitizedObj[key] = "[REDACTED]";
      } else {
        sanitizedObj[key] = sanitizeToolOutput(value, depth + 1);
      }
    }
    return sanitizedObj;
  }

  return val;
}

let defaultToolExecutor: ToolExecutor | null = null;

export function getToolExecutor(): ToolExecutor {
  if (!defaultToolExecutor) {
    defaultToolExecutor = new ToolExecutor();
  }
  return defaultToolExecutor;
}
