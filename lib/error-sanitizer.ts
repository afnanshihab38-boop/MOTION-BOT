/**
 * MOTION-BOT — User-Facing Error Sanitizer
 * Transforms technical exceptions, network faults, and API responses into
 * safe, clear, actionable user messages without leaking API keys, secrets, or stack traces.
 * Part of Phase 8.9: UX + Performance + Error Handling.
 */

/**
 * Redacts sensitive tokens, API keys, authorization headers, and absolute file paths.
 */
export function redactSensitiveInfo(text: string): string {
  if (!text) return "";
  return text
    // Redact OpenAI / OpenRouter / AI keys
    .replace(/sk-[a-zA-Z0-9_-]{8,}/gi, "[REDACTED_KEY]")
    // Redact Bearer tokens
    .replace(/bearer\s+[a-zA-Z0-9_.-]{12,}/gi, "Bearer [REDACTED_TOKEN]")
    // Redact Windows absolute filesystem paths
    .replace(/[a-zA-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*/g, "[REDACTED_PATH]")
    // Redact Unix absolute filesystem paths (/Users/... or /home/...)
    .replace(/\/(?:Users|home|root)\/[^\s:;,]+/g, "[REDACTED_PATH]");
}

/**
 * Sanitizes any error or exception message for safe presentation to end users.
 */
export function sanitizeUserError(
  error: unknown,
  fallbackMessage = "An unexpected error occurred. Your project data has not been modified."
): string {
  if (!error) return fallbackMessage;

  let rawMessage = "";
  if (typeof error === "string") {
    rawMessage = error;
  } else if (error instanceof Error) {
    rawMessage = error.message;
  } else if (typeof error === "object" && error !== null) {
    const errObj = error as { message?: string; error?: string; userFriendlyError?: string };
    rawMessage = errObj.userFriendlyError || errObj.message || errObj.error || "";
  }

  if (!rawMessage || rawMessage.trim().length === 0) {
    return fallbackMessage;
  }

  // Redact all sensitive tokens first
  const sanitized = redactSensitiveInfo(rawMessage);
  const lower = sanitized.toLowerCase();

  // Network / Connection Failures
  if (
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("networkerror") ||
    lower.includes("network error") ||
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("offline")
  ) {
    return "Network connection issue. Please check your internet connection and try again.";
  }

  // Rate Limiting
  if (
    lower.includes("rate limit") ||
    lower.includes("rate_limit") ||
    lower.includes("429") ||
    lower.includes("too many requests")
  ) {
    return "AI rate limit reached. Please wait a few seconds before trying again.";
  }

  // Quota & Credits
  if (
    lower.includes("quota exceeded") ||
    lower.includes("insufficient credit") ||
    lower.includes("insufficient credits") ||
    lower.includes("balance has been exceeded")
  ) {
    return "AI service quota exceeded or insufficient credits. Please verify your provider account.";
  }

  // Request Timeouts
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("aborterror")) {
    return "Request timed out. Please try again with a shorter prompt or simpler motion command.";
  }

  // Model / Service Availability
  if (lower.includes("service unavailable") || lower.includes("503") || lower.includes("bad gateway")) {
    return "AI service is temporarily unavailable. Please try again in a few moments.";
  }

  // Local Storage / Persistence Quota
  if (
    lower.includes("quotaexceedederror") ||
    lower.includes("storage quota") ||
    lower.includes("indexeddb") ||
    lower.includes("localstorage")
  ) {
    return "Browser storage limit reached. Please remove unused projects or export your current work.";
  }

  // Canvas / WebGL / Rendering Limits
  if (lower.includes("webgl") || lower.includes("out of memory") || lower.includes("canvas")) {
    return "Rendering resource limitation encountered. Try lowering the export resolution or duration.";
  }

  // Validation Failure
  if (lower.includes("validation failed") || lower.includes("invalid project")) {
    return "Project validation check failed. Please verify that layer dimensions and timing are positive.";
  }

  // If sensitive keys were redacted, return clean guidance or redacted message
  if (sanitized.includes("[REDACTED_KEY]") || sanitized.includes("[REDACTED_TOKEN]")) {
    return sanitized.split("\n")[0].trim();
  }

  // Remove multi-line stack traces (lines starting with 'at ' or paths)
  const cleaned = sanitized
    .split("\n")[0]
    .replace(/^Error:\s*/i, "")
    .trim();

  // Cap message length for clean display
  if (cleaned.length > 200) {
    return cleaned.slice(0, 197) + "...";
  }

  return cleaned || fallbackMessage;
}
