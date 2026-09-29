/**
 * MOTION-BOT — LLM Error Architecture
 * Phase 7.2: LLM Provider Foundation
 *
 * User-safe, sanitized, normalized errors for LLM operations.
 * Guarantees that internal API keys, tokens, and authorization headers
 * are NEVER leaked in error messages or client responses.
 */

import { LLMErrorCode } from "./types";

export class LLMError extends Error {
  public readonly code: LLMErrorCode;
  public readonly provider: string;
  public readonly statusCode?: number;
  public readonly userMessage: string;
  public readonly isRateLimit: boolean;
  public readonly isAuthError: boolean;
  public readonly retryAfterMs?: number;

  constructor(options: {
    code: LLMErrorCode;
    message: string;
    provider?: string;
    statusCode?: number;
    userMessage?: string;
    retryAfterMs?: number;
    cause?: unknown;
  }) {
    super(options.message);
    this.name = "LLMError";
    this.code = options.code;
    this.provider = options.provider || "unknown";
    this.statusCode = options.statusCode;
    this.retryAfterMs = options.retryAfterMs;
    this.isRateLimit = options.code === "RATE_LIMIT_EXCEEDED" || options.statusCode === 429;
    this.isAuthError =
      options.code === "AUTHENTICATION_ERROR" ||
      options.code === "PERMISSION_DENIED" ||
      options.statusCode === 401 ||
      options.statusCode === 403;

    // Ensure userMessage is clean, sanitized, and friendly for client UI
    this.userMessage = options.userMessage || LLMError.getDefaultUserMessage(options.code, options.provider);

    if (options.cause) {
      this.cause = options.cause;
    }
  }

  /**
   * Generates a safe, non-sensitive, human-readable user message.
   */
  public static getDefaultUserMessage(code: LLMErrorCode, provider?: string): string {
    const provName = provider ? ` (${provider})` : "";
    switch (code) {
      case "MISSING_API_KEY":
        return `AI provider API key is not configured${provName}. Set the environment variable or enable mock mode.`;
      case "AUTHENTICATION_ERROR":
        return `Authentication failed with AI provider${provName}. Please verify credentials.`;
      case "PERMISSION_DENIED":
        return `Permission denied by AI provider${provName}. Your account or key may lack required permissions.`;
      case "RATE_LIMIT_EXCEEDED":
        return `The AI provider is temporarily rate-limited. Please wait a moment and try again.`;
      case "TIMEOUT":
        return `The request to the AI provider timed out. Please try again.`;
      case "NETWORK_ERROR":
        return `Unable to connect to the AI service. Please check your network connection.`;
      case "PROVIDER_ERROR":
        return `The AI service encountered a temporary server error. Please try again later.`;
      case "MALFORMED_RESPONSE":
        return `Received an unexpected response format from the AI provider.`;
      case "EMPTY_RESPONSE":
        return `The AI model completed generation without producing any content.`;
      case "JSON_PARSE_ERROR":
        return `The AI model response could not be parsed as valid structured JSON.`;
      case "INVALID_MODEL":
        return `The requested AI model is unavailable or not supported.`;
      case "INVALID_CONFIG":
      default:
        return `An error occurred while communicating with the AI service.`;
    }
  }

  /**
   * Maps HTTP status codes to standardized LLM error codes and user messages.
   */
  public static fromHttpStatus(
    status: number,
    provider: string,
    rawResponseBody?: string,
    retryAfterHeader?: string | null
  ): LLMError {
    let retryAfterMs: number | undefined;
    if (retryAfterHeader) {
      const parsedSeconds = parseInt(retryAfterHeader, 10);
      if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
        retryAfterMs = parsedSeconds * 1000;
      }
    }

    if (status === 401) {
      return new LLMError({
        code: "AUTHENTICATION_ERROR",
        message: `HTTP 401 Unauthorized from ${provider}`,
        provider,
        statusCode: 401,
      });
    }

    if (status === 403) {
      return new LLMError({
        code: "PERMISSION_DENIED",
        message: `HTTP 403 Forbidden from ${provider}`,
        provider,
        statusCode: 403,
      });
    }

    if (status === 429) {
      return new LLMError({
        code: "RATE_LIMIT_EXCEEDED",
        message: `HTTP 429 Rate Limit Exceeded from ${provider}`,
        provider,
        statusCode: 429,
        retryAfterMs,
        userMessage: "The AI provider is temporarily rate-limited. Please retry shortly.",
      });
    }

    if (status >= 500 && status < 600) {
      return new LLMError({
        code: "PROVIDER_ERROR",
        message: `HTTP ${status} Server Error from ${provider}`,
        provider,
        statusCode: status,
      });
    }

    return new LLMError({
      code: "PROVIDER_ERROR",
      message: `HTTP ${status} Unexpected status from ${provider}`,
      provider,
      statusCode: status,
    });
  }

  /**
   * Sanitized payload for safe external responses.
   */
  public toClientSafeObject(): {
    code: LLMErrorCode;
    message: string;
    provider: string;
    isRateLimit: boolean;
    retryAfterMs?: number;
  } {
    return {
      code: this.code,
      message: this.userMessage,
      provider: this.provider,
      isRateLimit: this.isRateLimit,
      ...(this.retryAfterMs ? { retryAfterMs: this.retryAfterMs } : {}),
    };
  }
}
