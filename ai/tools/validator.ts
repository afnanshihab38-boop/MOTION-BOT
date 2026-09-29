/**
 * MOTION-BOT — Agent Tool Request Validator
 * Phase 7.5: Agent Tool / Action Layer
 *
 * Enforces strict input validation, argument type checking, required field enforcement,
 * and dangerous parameter / injection rejection before any tool handler can execute.
 */

import {
  ToolDefinition,
  ToolErrorDetails,
  ToolPropertySchema,
} from "./types";
import { ToolRegistry } from "./registry";

export interface ToolValidationResult {
  valid: boolean;
  tool?: ToolDefinition;
  sanitizedArgs?: Record<string, unknown>;
  error?: ToolErrorDetails;
}

// Blocklist of forbidden parameter keys that could attempt prototype pollution or internal manipulation
const FORBIDDEN_KEYS: Set<string> = new Set([
  "__proto__",
  "prototype",
  "constructor",
  "process",
  "global",
  "require",
  "import",
  "eval",
]);

// Suspicious string patterns indicative of command injection or path traversal attempts
const DANGEROUS_STRING_PATTERNS = [
  /(\.\.[\/\\])/, // Path traversal (../ or ..\)
  /(^|[\s;|&`$])(rm|sh|bash|cmd|powershell|curl|wget|python|node)[\s;|&`$]/i, // Shell commands
  /eval\s*\(/i, // Code execution
  /<script[\s>]/i, // XSS injection
];

/**
 * Validates an incoming tool request against the tool registry and parameter schemas.
 */
export function validateToolRequest(
  request: unknown,
  registry: ToolRegistry
): ToolValidationResult {
  // 1. Structure Check
  if (!request || typeof request !== "object") {
    return {
      valid: false,
      error: {
        code: "MALFORMED_ARGUMENTS",
        message: "Tool request must be a valid JSON object.",
      },
    };
  }

  const req = request as Record<string, unknown>;
  const toolName = typeof req.tool === "string" ? req.tool.trim() : "";

  if (!toolName) {
    return {
      valid: false,
      error: {
        code: "UNKNOWN_TOOL",
        message: "Tool request must specify a valid 'tool' name string.",
      },
    };
  }

  // 2. Registry Lookup
  const tool = registry.get(toolName);
  if (!tool) {
    return {
      valid: false,
      error: {
        code: "UNKNOWN_TOOL",
        message: `Tool '${toolName}' is not registered in the system. Available tools: ${registry.getNames().join(", ")}`,
      },
    };
  }

  // 3. Arguments Object Check
  const rawArgs = req.arguments;
  if (rawArgs !== undefined && (typeof rawArgs !== "object" || rawArgs === null || Array.isArray(rawArgs))) {
    return {
      valid: false,
      error: {
        code: "MALFORMED_ARGUMENTS",
        message: `Arguments for tool '${toolName}' must be an object. Received: ${typeof rawArgs}`,
      },
    };
  }

  const args = (rawArgs || {}) as Record<string, unknown>;

  // 4. Security Check — Dangerous Keys & Payload Inspection
  const securityViolation = scanForDangerousParameters(args);
  if (securityViolation) {
    return {
      valid: false,
      error: {
        code: "SECURITY_VIOLATION",
        message: `Security violation in tool arguments: ${securityViolation}`,
      },
    };
  }

  // 5. Schema Validation
  const schema = tool.parameters;
  const sanitizedArgs: Record<string, unknown> = {};

  // Check required fields
  if (schema.required) {
    for (const reqField of schema.required) {
      if (args[reqField] === undefined || args[reqField] === null) {
        return {
          valid: false,
          error: {
            code: "VALIDATION_ERROR",
            message: `Missing required argument '${reqField}' for tool '${toolName}'.`,
            details: { missingField: reqField },
          },
        };
      }
    }
  }

  // Check individual argument types and constraints
  for (const [key, value] of Object.entries(args)) {
    const propSchema = schema.properties[key];

    if (!propSchema) {
      // Reject unexpected parameters if additionalProperties is strictly false
      if (schema.additionalProperties === false) {
        return {
          valid: false,
          error: {
            code: "INVALID_ARGUMENTS",
            message: `Unexpected parameter '${key}' for tool '${toolName}'.`,
          },
        };
      }
      sanitizedArgs[key] = value;
      continue;
    }

    const typeError = validateArgumentType(key, value, propSchema);
    if (typeError) {
      return {
        valid: false,
        error: {
          code: "INVALID_ARGUMENTS",
          message: `Invalid type for '${key}' in tool '${toolName}': ${typeError}`,
          details: { field: key, expected: propSchema.type, actual: typeof value },
        },
      };
    }

    // Enum validation
    if (propSchema.enum && !propSchema.enum.includes(value as string | number)) {
      return {
        valid: false,
        error: {
          code: "INVALID_ARGUMENTS",
          message: `Value '${value}' for '${key}' is invalid. Allowed: ${propSchema.enum.join(", ")}`,
          details: { field: key, allowed: propSchema.enum, value },
        },
      };
    }

    sanitizedArgs[key] = value;
  }

  // Apply schema defaults if property was omitted
  for (const [key, propSchema] of Object.entries(schema.properties)) {
    if (sanitizedArgs[key] === undefined && propSchema.default !== undefined) {
      sanitizedArgs[key] = propSchema.default;
    }
  }

  return {
    valid: true,
    tool,
    sanitizedArgs,
  };
}

/**
 * Validates a single parameter's primitive or complex type.
 */
function validateArgumentType(
  key: string,
  value: unknown,
  schema: ToolPropertySchema
): string | null {
  if (value === undefined || value === null) {
    if (schema.required) return `Field '${key}' is required and cannot be null or undefined.`;
    return null;
  }

  switch (schema.type) {
    case "string":
      if (typeof value !== "string") return `Expected string, received ${typeof value}`;
      break;
    case "number":
      if (typeof value !== "number" || isNaN(value)) return `Expected valid number, received ${typeof value}`;
      break;
    case "boolean":
      if (typeof value !== "boolean") return `Expected boolean, received ${typeof value}`;
      break;
    case "array":
      if (!Array.isArray(value)) return `Expected array, received ${typeof value}`;
      break;
    case "object":
      if (typeof value !== "object" || Array.isArray(value)) return `Expected object, received ${typeof value}`;
      break;
  }

  return null;
}

/**
 * Scans arguments recursively for dangerous keys, prototype manipulation, or injection attacks.
 */
function scanForDangerousParameters(obj: Record<string, unknown>, depth = 0): string | null {
  if (depth > 5) return "Nested arguments exceeded maximum depth limit.";

  // Check prototype pollution attempt via modified or non-standard prototype
  const proto = Object.getPrototypeOf(obj);
  if (proto !== null && proto !== Object.prototype && !Array.isArray(obj)) {
    return "Forbidden prototype modification detected (__proto__).";
  }

  // Use Object.getOwnPropertyNames to catch non-enumerable or shadowed properties
  const ownKeys = Object.getOwnPropertyNames(obj);
  for (const key of ownKeys) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      return `Forbidden parameter key '${key}' detected.`;
    }
  }

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      for (const pattern of DANGEROUS_STRING_PATTERNS) {
        if (pattern.test(value)) {
          return `Potentially unsafe pattern matched in parameter '${key}'.`;
        }
      }
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      const nestedViolation = scanForDangerousParameters(value as Record<string, unknown>, depth + 1);
      if (nestedViolation) return nestedViolation;
    }
  }

  return null;
}
