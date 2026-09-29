/**
 * MOTION-BOT — Resilient JSON Parser & Deterministic Repair
 * Phase 7.7: AI Output Validation + Reliability Layer
 *
 * Extracts, sanitizes, and deterministically normalizes structured JSON
 * from raw LLM outputs (markdown fences, conversational text, trailing commas, comments).
 */

import { ValidationIssue } from "./types";

export interface RobustParseResult<T = unknown> {
  success: boolean;
  data?: T;
  issues: ValidationIssue[];
  repaired: boolean;
  rawText: string;
}

/**
 * Deterministically cleans common LLM syntax anomalies without guessing semantics.
 */
export function cleanJsonSyntax(input: string): string {
  let cleaned = input.trim();

  // 1. Strip JavaScript single-line (//) and multi-line (/* */) comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");
  cleaned = cleaned.replace(/(^|[^\\:])\/\/.*$/gm, "$1");

  // 2. Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  // 3. Convert single-quoted string properties or values to standard double quotes
  // Handles key: 'value' -> key: "value" and 'key': -> "key":
  cleaned = cleaned.replace(/(\{|\,)\s*'([^'\\]*(?:\\.[^'\\]*)*)'\s*:/g, '$1 "$2":');
  cleaned = cleaned.replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'(\s*[,}\]])/g, ': "$1"$2');

  return cleaned.trim();
}

/**
 * Extracts and parses JSON from raw LLM outputs with multi-stage fallback and repair.
 */
export function robustParseJson<T = unknown>(input: unknown): RobustParseResult<T> {
  const issues: ValidationIssue[] = [];

  // 1. If input is already a non-null object, return directly
  if (input !== null && typeof input === "object") {
    return {
      success: true,
      data: input as T,
      issues: [],
      repaired: false,
      rawText: JSON.stringify(input),
    };
  }

  if (typeof input !== "string" || !input.trim()) {
    issues.push({
      stage: "parse",
      code: "EMPTY_INPUT",
      message: "LLM output is empty or not a string.",
      severity: "error",
      fatal: true,
    });
    return {
      success: false,
      issues,
      repaired: false,
      rawText: String(input || ""),
    };
  }

  const rawText = input.trim();

  // 2. Direct JSON.parse
  try {
    const data = JSON.parse(rawText) as T;
    return {
      success: true,
      data,
      issues: [],
      repaired: false,
      rawText,
    };
  } catch {
    // Proceed to extraction and repairs
  }

  // 3. Extract from markdown code fences (```json ... ``` or ``` ...)
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const fenceMatch = rawText.match(fenceRegex);
  let candidate = fenceMatch && fenceMatch[1] ? fenceMatch[1].trim() : "";

  // 4. If no code fence, use outermost brace/bracket boundaries
  if (!candidate) {
    const firstBrace = rawText.indexOf("{");
    const lastBrace = rawText.lastIndexOf("}");
    const firstBracket = rawText.indexOf("[");
    const lastBracket = rawText.lastIndexOf("]");

    const hasObject = firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace;
    const hasArray = firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket;

    if (hasObject && (!hasArray || firstBrace < firstBracket)) {
      candidate = rawText.substring(firstBrace, lastBrace + 1);
    } else if (hasArray) {
      candidate = rawText.substring(firstBracket, lastBracket + 1);
    }
  }

  if (!candidate) {
    const hasOpening = rawText.includes("{") || rawText.includes("[");
    issues.push({
      stage: "parse",
      code: hasOpening ? "TRUNCATED_JSON" : "NO_JSON_FOUND",
      message: hasOpening
        ? "LLM response contains opening JSON structure but was truncated before closure."
        : "No valid JSON structure ({...} or [...]) found in LLM response.",
      severity: "error",
      fatal: true,
    });
    return {
      success: false,
      issues,
      repaired: false,
      rawText,
    };
  }

  // 5. Try parsing extracted candidate directly
  try {
    const data = JSON.parse(candidate) as T;
    issues.push({
      stage: "parse",
      code: "EXTRACTED_FROM_WRAPPER",
      message: "JSON was successfully extracted from surrounding markdown/prose.",
      severity: "warning",
      fatal: false,
    });
    return {
      success: true,
      data,
      issues,
      repaired: true,
      rawText,
    };
  } catch {
    // Proceed to syntax cleaning
  }

  // 6. Clean common LLM syntax defects (trailing commas, comments, single quotes)
  const cleaned = cleanJsonSyntax(candidate);
  try {
    const data = JSON.parse(cleaned) as T;
    issues.push({
      stage: "parse",
      code: "REPAIRED_SYNTAX_DEFECTS",
      message: "Recovered JSON by deterministically stripping comments and trailing commas.",
      severity: "warning",
      fatal: false,
    });
    return {
      success: true,
      data,
      issues,
      repaired: true,
      rawText,
    };
  } catch (err) {
    // 7. Check if unclosed/truncated JSON
    const openBraces = (cleaned.match(/\{/g) || []).length;
    const closeBraces = (cleaned.match(/\}/g) || []).length;
    const openBrackets = (cleaned.match(/\[/g) || []).length;
    const closeBrackets = (cleaned.match(/\]/g) || []).length;

    const isTruncated = openBraces > closeBraces || openBrackets > closeBrackets;

    issues.push({
      stage: "parse",
      code: isTruncated ? "TRUNCATED_JSON" : "MALFORMED_JSON",
      message: isTruncated
        ? "LLM response appears truncated before JSON closure."
        : `JSON syntax error: ${err instanceof Error ? err.message : String(err)}`,
      severity: "error",
      fatal: true,
    });

    return {
      success: false,
      issues,
      repaired: false,
      rawText,
    };
  }
}
