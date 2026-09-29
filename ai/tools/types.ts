/**
 * MOTION-BOT — Agent Tool & Action Layer Type Definitions
 * Phase 7.5: Agent Tool / Action Layer
 *
 * Defines the core schemas, classifications, permissions, request/response models,
 * and execution context for MotionBot's safe AI tools.
 */

export type ToolClassification = "read" | "write";
export type ToolPermissionLevel = "read" | "write" | "admin";

export type ToolPropertyType = "string" | "number" | "boolean" | "object" | "array";

export interface ToolPropertySchema {
  type: ToolPropertyType;
  description: string;
  required?: boolean;
  enum?: (string | number)[];
  default?: unknown;
  items?: ToolPropertySchema;
  properties?: Record<string, ToolPropertySchema>;
}

export interface ToolInputSchema {
  type: "object";
  properties: Record<string, ToolPropertySchema>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolOutputSchema {
  type: "object";
  description?: string;
  properties?: Record<string, ToolPropertySchema>;
}

export interface ToolExecutionContext {
  projectId?: string;
  userId?: string;
  userConfirmed?: boolean;
  readOnly?: boolean;
  storageService?: unknown;
  sessionMetadata?: Record<string, unknown>;
}

export interface ToolDefinition<TArgs = Record<string, unknown>, TResult = unknown> {
  /** Unique tool identifier (e.g. 'get_project_info') */
  name: string;
  /** Clear human and LLM-readable description of what the action does */
  description: string;
  /** JSON schema defining accepted parameters */
  parameters: ToolInputSchema;
  /** Schema defining output structure */
  outputSchema?: ToolOutputSchema;
  /** Read or write categorization */
  classification: ToolClassification;
  /** Minimum authorization level needed */
  permissionLevel: ToolPermissionLevel;
  /** Whether destructive or state-changing action requires explicit human confirmation */
  requiresConfirmation: boolean;
  /** Handler executing the underlying motion design action */
  execute: (args: TArgs, context: ToolExecutionContext) => Promise<TResult>;
}

export interface ToolRequest {
  tool: string;
  arguments: Record<string, unknown>;
  confirmationToken?: string;
}

export type ToolErrorCode =
  | "UNKNOWN_TOOL"
  | "MALFORMED_ARGUMENTS"
  | "INVALID_ARGUMENTS"
  | "VALIDATION_ERROR"
  | "PERMISSION_DENIED"
  | "CONFIRMATION_REQUIRED"
  | "EXECUTION_ERROR"
  | "SECURITY_VIOLATION";

export interface ToolErrorDetails {
  code: ToolErrorCode;
  message: string;
  details?: unknown;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  tool: string;
  data: T | null;
  error: ToolErrorDetails | null;
  executionTimeMs?: number;
}

export interface OpenRouterFunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface OpenRouterToolSpecification {
  type: "function";
  function: OpenRouterFunctionDefinition;
}
