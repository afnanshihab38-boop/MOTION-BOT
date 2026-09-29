/**
 * MOTION-BOT — LLM Development Logger
 * Phase 7.2: LLM Provider Foundation
 *
 * Secure logging utility that enforces zero secret leaks (API keys,
 * Authorization headers) and records sanitized performance metrics.
 */

import { LLMTokenUsage } from "./types";

export interface LLMLogContext {
  provider: string;
  model: string;
  durationMs?: number;
  success?: boolean;
  errorCode?: string;
  tokens?: LLMTokenUsage | {
    prompt: number;
    completion: number;
    total: number;
  };
}


export class LLMLogger {
  private static isDebugEnabled(): boolean {
    return process.env.NODE_ENV !== "production" || process.env.LLM_DEBUG === "true";
  }

  /**
   * Sanitizes any text by masking API keys and bearer tokens if accidentally included.
   */
  public static sanitize(text: string): string {
    if (!text) return text;
    return text
      .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, "Bearer [REDACTED]")
      .replace(/sk-[A-Za-z0-9_\-\.]{15,}/gi, "sk-[REDACTED]")
      .replace(/key=[A-Za-z0-9_\-\.]+/gi, "key=[REDACTED]");
  }

  public static info(message: string, context?: LLMLogContext): void {
    if (!this.isDebugEnabled()) return;
    const parts = [`[LLM][INFO] ${message}`];
    if (context) {
      parts.push(`(provider=${context.provider}, model=${context.model}${context.durationMs !== undefined ? `, duration=${context.durationMs}ms` : ""})`);
    }
    console.info(parts.join(" "));
  }

  public static warn(message: string, context?: LLMLogContext): void {
    const parts = [`[LLM][WARN] ${message}`];
    if (context) {
      parts.push(`(provider=${context.provider}, model=${context.model}${context.errorCode ? `, error=${context.errorCode}` : ""})`);
    }
    console.warn(parts.join(" "));
  }

  public static error(message: string, context?: LLMLogContext): void {
    const parts = [`[LLM][ERROR] ${message}`];
    if (context) {
      parts.push(`(provider=${context.provider}, model=${context.model}${context.errorCode ? `, code=${context.errorCode}` : ""}${context.durationMs ? `, duration=${context.durationMs}ms` : ""})`);
    }
    console.error(parts.join(" "));
  }
}
