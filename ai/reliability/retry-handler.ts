/**
 * MOTION-BOT — Bounded Retry & Backoff Handler
 * Phase 7.7: AI Output Validation + Reliability Layer
 *
 * Implements exponential backoff with jitter for transient provider failures.
 * Strictly prevents retrying deterministic errors (400, 401, 403, validation faults).
 */

import { RetryPolicy } from "./types";
import { LLMError } from "../llm-error";
import { LLMLogger } from "../logger";

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 2,
  initialDelayMs: 200,
  maxDelayMs: 2000,
  backoffFactor: 2,
  retryableStatuses: [429, 500, 502, 503, 504],
};

/**
 * Checks whether an error is transient and eligible for retry.
 */
export function isRetryableError(error: unknown, policy: RetryPolicy = DEFAULT_RETRY_POLICY): boolean {
  if (!error) return false;

  if (error instanceof LLMError) {
    // Explicitly non-retryable errors
    if (error.isAuthError || error.statusCode === 401 || error.statusCode === 403) return false;
    if (error.code === "INVALID_CONFIG" || error.code === "JSON_PARSE_ERROR") return false;

    // Retryable errors
    if (error.isRateLimit || error.statusCode === 429) return true;
    if (error.code === "TIMEOUT" || error.code === "NETWORK_ERROR") return true;
    if (error.statusCode && policy.retryableStatuses?.includes(error.statusCode)) return true;
    if (error.code === "PROVIDER_ERROR") return true;
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Transient network errors
    if (
      msg.includes("econnreset") ||
      msg.includes("etimedout") ||
      msg.includes("fetch failed") ||
      msg.includes("network error") ||
      msg.includes("socket hang up") ||
      msg.includes("timeout") ||
      msg.includes("rate limit") ||
      msg.includes("too many requests")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Calculates exponential backoff delay with safe jitter.
 */
export function calculateBackoffDelay(
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): number {
  const base = policy.initialDelayMs * Math.pow(policy.backoffFactor, attempt);
  const capped = Math.min(base, policy.maxDelayMs);
  // Add 10-25% random jitter to prevent thundering herd
  const jitter = capped * (0.1 + Math.random() * 0.15);
  return Math.floor(capped + jitter);
}

/**
 * Executes an async operation with bounded retries for transient failures.
 */
export async function executeWithRetry<T>(
  operation: (attempt: number) => Promise<T>,
  policy: Partial<RetryPolicy> = {}
): Promise<T> {
  const fullPolicy: RetryPolicy = {
    ...DEFAULT_RETRY_POLICY,
    ...policy,
    // Hard ceiling: max 3 retries
    maxRetries: Math.min(3, policy.maxRetries ?? DEFAULT_RETRY_POLICY.maxRetries),
  };

  let lastError: unknown;

  for (let attempt = 0; attempt <= fullPolicy.maxRetries; attempt++) {
    try {
      return await operation(attempt);
    } catch (err) {
      lastError = err;

      const isLastAttempt = attempt >= fullPolicy.maxRetries;
      const retryable = isRetryableError(err, fullPolicy);

      if (isLastAttempt || !retryable) {
        throw err;
      }

      const delayMs = calculateBackoffDelay(attempt, fullPolicy);

      LLMLogger.warn(
        `Transient AI failure on attempt ${attempt + 1}. Retrying in ${delayMs}ms...`,
        {
          provider: "retry-handler",
          model: "bounded-retry",
          errorCode: "TRANSIENT_RETRY",
          durationMs: delayMs,
        }
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
