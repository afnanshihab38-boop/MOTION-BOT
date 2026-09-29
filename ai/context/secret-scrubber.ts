/**
 * MOTION-BOT — Secret Scrubber & Defensive Redaction
 * Phase 7.6: Context Manager + Project-Scoped Memory
 *
 * Scans text and objects before they reach the LLM or logs, stripping API keys,
 * authentication tokens, passwords, and private credentials.
 */

// Known sensitive environment keys to scan and sanitize explicitly
const SENSITIVE_ENV_KEYS = [
  "OPENROUTER_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_API_KEY",
  "DATABASE_URL",
  "POSTGRES_PASSWORD",
  "SECRET_KEY",
  "JWT_SECRET",
  "SESSION_SECRET",
];

// Regex patterns matching credentials and tokens
const SENSITIVE_PATTERNS: RegExp[] = [
  /sk-or-v1-[a-zA-Z0-9_-]{32,}/g, // OpenRouter API keys
  /sk-[a-zA-Z0-9_-]{24,}/g, // Generic OpenAI / API keys
  /Bearer\s+[a-zA-Z0-9_.-]{16,}/gi, // Bearer tokens
  /-----BEGIN\s+[A-Z\s]+PRIVATE\s+KEY-----[\s\S]*?-----END\s+[A-Z\s]+PRIVATE\s+KEY-----/gi, // RSA/EC Private keys
  /(password|passwd|secret|api_?key|token|auth_?token)\s*[:=]\s*["']([^"']{4,})["']/gi, // Key-value credential pairs
  /postgres(?:ql)?:\/\/[^:]+:([^@]+)@[a-zA-Z0-9_.-]+/gi, // DB connection credentials
];

export interface ScrubResult<T = string> {
  result: T;
  redactedCount: number;
}

/**
 * Sanitizes a string, replacing detected secrets with [REDACTED_SECRET].
 */
export function scrubSecrets(input: string): ScrubResult<string> {
  if (!input || typeof input !== "string") {
    return { result: "", redactedCount: 0 };
  }

  let text = input;
  let redactedCount = 0;

  // 1. Explicitly scrub known environment variable values
  for (const envKey of SENSITIVE_ENV_KEYS) {
    const secretVal = process.env[envKey]?.trim();
    if (secretVal && secretVal.length >= 8) {
      if (text.includes(secretVal)) {
        // Global replace of the actual secret
        const escaped = secretVal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "g");
        const matches = text.match(regex);
        if (matches) {
          redactedCount += matches.length;
          text = text.replace(regex, "[REDACTED_SECRET]");
        }
      }
    }
  }

  // 2. Pattern-based redaction for token formats
  for (const pattern of SENSITIVE_PATTERNS) {
    pattern.lastIndex = 0; // Reset stateful regex
    const matches = text.match(pattern);
    if (matches) {
      redactedCount += matches.length;
      text = text.replace(pattern, "[REDACTED_SECRET]");
    }
  }

  return { result: text, redactedCount };
}

/**
 * Recursively scrubs secrets across nested objects and arrays.
 */
export function scrubObject<T>(input: T): ScrubResult<T> {
  if (input === null || input === undefined) {
    return { result: input, redactedCount: 0 };
  }

  if (typeof input === "string") {
    const { result, redactedCount } = scrubSecrets(input);
    return { result: result as unknown as T, redactedCount };
  }

  if (typeof input !== "object") {
    return { result: input, redactedCount: 0 };
  }

  let totalRedacted = 0;

  if (Array.isArray(input)) {
    const cleanArray = input.map((item) => {
      const { result, redactedCount } = scrubObject(item);
      totalRedacted += redactedCount;
      return result;
    });
    return { result: cleanArray as unknown as T, redactedCount: totalRedacted };
  }

  const cleanObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    // Redact sensitive keys directly
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("password") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("apikey") ||
      lowerKey.includes("api_key") ||
      lowerKey.includes("auth_token")
    ) {
      cleanObj[key] = "[REDACTED_SECRET]";
      totalRedacted++;
    } else {
      const { result, redactedCount } = scrubObject(value);
      totalRedacted += redactedCount;
      cleanObj[key] = result;
    }
  }

  return { result: cleanObj as unknown as T, redactedCount: totalRedacted };
}
