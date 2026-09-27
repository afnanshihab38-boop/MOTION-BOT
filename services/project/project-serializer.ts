/**
 * MOTION-BOT — Concrete Project Model Serializer & Deserializer
 * Handles safe serialization and deserialization of the typed Project source-of-truth.
 * Part of Phase 3.5: Validation, Serialization & Architecture Lock.
 */

import { Project } from "@/types/project";
import { validateProjectDeep, formatValidationErrors } from "./project-validator";

/**
 * Result of a deserialization attempt.
 */
export type DeserializationResult =
  | { success: true; project: Project }
  | { success: false; errors: string[] };

/**
 * Serializes a typed Project object into a portable JSON string.
 * Validates the project first to ensure corrupt state is never serialized.
 */
export function serializeProject(project: Project, pretty = false): string {
  const validation = validateProjectDeep(project);
  if (!validation.valid) {
    const formatted = formatValidationErrors(validation.errors);
    throw new Error(`Cannot serialize invalid project: \n${formatted.join("\n")}`);
  }

  return pretty
    ? JSON.stringify(project, null, 2)
    : JSON.stringify(project);
}

/**
 * Deserializes and validates a JSON string into a strongly typed Project model.
 * Guarantees invalid or malformed data is rejected before entering the application.
 */
export function deserializeProject(jsonString: string): DeserializationResult {
  if (typeof jsonString !== "string" || jsonString.trim() === "") {
    return {
      success: false,
      errors: ["Cannot deserialize empty or non-string input"],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      errors: [`JSON syntax parse error: ${message}`],
    };
  }

  const validation = validateProjectDeep(parsed);
  if (!validation.valid) {
    return {
      success: false,
      errors: formatValidationErrors(validation.errors),
    };
  }

  return {
    success: true,
    project: parsed as Project,
  };
}

/**
 * Deep clones a Project object cleanly using structuredClone or JSON roundtrip.
 */
export function cloneProject(project: Project): Project {
  if (typeof structuredClone === "function") {
    return structuredClone(project);
  }
  return JSON.parse(JSON.stringify(project)) as Project;
}

