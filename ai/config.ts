/**
 * MOTION-BOT — LLM Configuration Manager
 * Phase 7.2: LLM Provider Foundation
 *
 * Secure server-side configuration management for OpenRouter, models,
 * timeouts, and mock development mode.
 */

import { OpenRouterConfig } from "./types";

export const DEFAULT_OPENROUTER_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";
export const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

export interface LLMEnvironmentConfig {
  openRouterApiKey?: string;
  openRouterModel: string;
  openRouterBaseUrl: string;
  mockMode: boolean;
  timeoutMs: number;
  appName: string;
  appUrl: string;
}

/**
 * Loads and validates current LLM environment settings.
 * Enforces server-side isolation.
 */
export function getLLMEnvironmentConfig(): LLMEnvironmentConfig {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();
  const openRouterModel = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;
  const openRouterBaseUrl = process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_OPENROUTER_BASE_URL;

  // Mock mode is enabled if explicitly set OR if no OpenRouter API key is available in non-production
  const explicitMock = process.env.LLM_MOCK_MODE?.trim().toLowerCase();
  const mockMode = explicitMock === "true" || explicitMock === "1" || (!openRouterApiKey && process.env.NODE_ENV !== "production");

  let timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS;
  if (process.env.LLM_TIMEOUT_MS) {
    const parsed = parseInt(process.env.LLM_TIMEOUT_MS, 10);
    if (!isNaN(parsed) && parsed > 0) {
      timeoutMs = parsed;
    }
  }

  const appName = "MOTION-BOT";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://motionbot.app";

  return {
    openRouterApiKey,
    openRouterModel,
    openRouterBaseUrl,
    mockMode,
    timeoutMs,
    appName,
    appUrl,
  };
}

/**
 * Returns typed OpenRouter configuration options.
 */
export function getOpenRouterConfig(): OpenRouterConfig {
  const env = getLLMEnvironmentConfig();
  return {
    apiKey: env.openRouterApiKey,
    model: env.openRouterModel,
    baseUrl: env.openRouterBaseUrl,
    timeoutMs: env.timeoutMs,
    appName: env.appName,
    appUrl: env.appUrl,
  };
}
