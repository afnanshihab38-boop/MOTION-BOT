/**
 * MOTION-BOT — Robust JSON Parser for LLM Outputs
 * Phase 7.2: LLM Provider Foundation
 *
 * Safely extracts and parses structured JSON from LLM responses,
 * stripping markdown code fences, leading text, and trailing commentary.
 */

export interface SafeJsonParseResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  rawText: string;
}

/**
 * Extracts and parses JSON from potentially unstructured or markdown-wrapped LLM text.
 */
export function safeParseJson<T = unknown>(rawText: string): SafeJsonParseResult<T> {
  if (!rawText || typeof rawText !== "string") {
    return {
      success: false,
      error: "Input text is empty or non-string",
      rawText: rawText || "",
    };
  }

  const trimmed = rawText.trim();

  // 1. Direct parse attempt
  try {
    const parsed = JSON.parse(trimmed) as T;
    return {
      success: true,
      data: parsed,
      rawText,
    };
  } catch {
    // Continue to markdown extraction and heuristic boundary extraction
  }

  // 2. Extract content from markdown code fences (```json ... ``` or ``` ...)
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const fenceMatch = trimmed.match(fenceRegex);
  if (fenceMatch && fenceMatch[1]) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim()) as T;
      return {
        success: true,
        data: parsed,
        rawText,
      };
    } catch {
      // Continue to bracket boundary extraction
    }
  }

  // 3. Heuristic: locate outermost matching braces `{ ... }` or `[ ... ]`
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");

  let candidate = "";

  // Prioritize whichever boundary pair occurs first and matches
  const hasObject = firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace;
  const hasArray = firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket;

  if (hasObject && (!hasArray || firstBrace < firstBracket)) {
    candidate = trimmed.substring(firstBrace, lastBrace + 1);
  } else if (hasArray) {
    candidate = trimmed.substring(firstBracket, lastBracket + 1);
  }

  if (candidate) {
    try {
      const parsed = JSON.parse(candidate) as T;
      return {
        success: true,
        data: parsed,
        rawText,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "JSON syntax error";
      return {
        success: false,
        error: `Failed to parse extracted JSON block: ${message}`,
        rawText,
      };
    }
  }

  return {
    success: false,
    error: "No valid JSON structure found in LLM output",
    rawText,
  };
}
