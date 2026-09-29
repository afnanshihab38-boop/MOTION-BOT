/**
 * MOTION-BOT — Reusable LLM Service & Provider Coordinator
 * Phase 7.2: LLM Provider Foundation
 *
 * Central coordinator for all LLM operations in MotionBot.
 * Decouples creative planning agents and features from concrete model providers,
 * supporting OpenRouter, NVIDIA Nemotron 3 Ultra, Mock development mode, and future providers.
 */

import {
  ILLMProvider,
  LLMGenerationRequest,
  LLMGenerationResponse,
  LLMServiceConfig,
} from "./types";
import { LLMError } from "./llm-error";
import { getLLMEnvironmentConfig, getOpenRouterConfig } from "./config";
import { OpenRouterProvider } from "./openrouter-provider";
import { MockLLMProvider } from "./mock-provider";

export class LLMService {
  private readonly providers = new Map<string, ILLMProvider>();
  private activeProviderId: string;
  private readonly mockMode: boolean;

  constructor(config?: LLMServiceConfig) {
    const env = getLLMEnvironmentConfig();
    this.mockMode = config?.mockMode !== undefined ? config.mockMode : env.mockMode;

    // 1. Register default built-in providers
    const openRouterConfig = config?.openRouter || getOpenRouterConfig();
    const openRouterProvider = new OpenRouterProvider(openRouterConfig);
    const mockProvider = new MockLLMProvider();

    this.registerProvider(openRouterProvider);
    this.registerProvider(mockProvider);

    // 2. Select initial active provider
    if (config?.defaultProvider && this.providers.has(config.defaultProvider)) {
      this.activeProviderId = config.defaultProvider;
    } else if (this.mockMode) {
      this.activeProviderId = "mock";
    } else if (openRouterProvider.isConfigured()) {
      this.activeProviderId = "openrouter";
    } else {
      // In development, fall back gracefully to mock if no key exists
      this.activeProviderId = process.env.NODE_ENV === "production" ? "openrouter" : "mock";
    }
  }

  /**
   * Registers a new provider into the coordinator.
   */
  public registerProvider(provider: ILLMProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Retrieves a registered provider by its identifier, or the currently active provider.
   */
  public getProvider(id?: string): ILLMProvider {
    const targetId = id || this.activeProviderId;
    const provider = this.providers.get(targetId);

    if (!provider) {
      throw new LLMError({
        code: "INVALID_CONFIG",
        message: `LLM provider '${targetId}' is not registered. Available: ${Array.from(this.providers.keys()).join(", ")}`,
        provider: targetId,
      });
    }

    return provider;
  }

  /**
   * Sets the active provider ID.
   */
  public setActiveProvider(id: string): void {
    if (!this.providers.has(id)) {
      throw new LLMError({
        code: "INVALID_CONFIG",
        message: `Cannot set active provider to '${id}'. Provider not found.`,
        provider: id,
      });
    }
    this.activeProviderId = id;
  }

  public getActiveProviderId(): string {
    return this.activeProviderId;
  }

  public isMockMode(): boolean {
    return this.mockMode || this.activeProviderId === "mock";
  }

  /**
   * Primary entrypoint: generates a normalized LLM response through the active provider.
   */
  public async generate(
    request: LLMGenerationRequest,
    providerId?: string
  ): Promise<LLMGenerationResponse> {
    const provider = this.getProvider(providerId);
    return provider.generate(request);
  }

  /**
   * Convenience shortcut for simple single text prompt generation.
   */
  public async generateText(
    prompt: string,
    systemInstruction?: string,
    options?: Partial<LLMGenerationRequest>,
    providerId?: string
  ): Promise<string> {
    const response = await this.generate(
      {
        prompt,
        systemInstruction,
        ...options,
      },
      providerId
    );
    return response.text;
  }

  /**
   * Convenience shortcut for structured JSON generation with automatic parsing.
   */
  public async generateStructured<T = unknown>(
    request: LLMGenerationRequest,
    providerId?: string
  ): Promise<{ data: T; response: LLMGenerationResponse<T> }> {
    const response = await this.generate(
      {
        ...request,
        responseFormat: {
          type: "json_object",
          schema: request.responseFormat?.schema,
        },
      },
      providerId
    );

    if (response.parsedJson === undefined) {
      throw new LLMError({
        code: "JSON_PARSE_ERROR",
        message: "Model response was not successfully parsed into a structured object",
        provider: response.provider,
        userMessage: "The AI model response could not be parsed as valid structured JSON.",
      });
    }

    return {
      data: response.parsedJson as T,
      response: response as LLMGenerationResponse<T>,
    };
  }

  /**
   * Diagnostic status report without exposing secrets or keys.
   */
  public getStatus(): {
    activeProvider: string;
    model: string;
    isConfigured: boolean;
    mockMode: boolean;
    registeredProviders: string[];
  } {
    const activeProvider = this.getProvider();
    return {
      activeProvider: activeProvider.id,
      model: activeProvider.defaultModel,
      isConfigured: activeProvider.isConfigured(),
      mockMode: this.isMockMode(),
      registeredProviders: Array.from(this.providers.keys()),
    };
  }
}

let defaultServiceInstance: LLMService | null = null;

/**
 * Returns the application singleton LLMService instance.
 */
export function getLLMService(config?: LLMServiceConfig): LLMService {
  if (!defaultServiceInstance || config) {
    defaultServiceInstance = new LLMService(config);
  }
  return defaultServiceInstance;
}

/**
 * Factory for creating fresh, isolated LLMService instances (e.g. for testing).
 */
export function createLLMService(config?: LLMServiceConfig): LLMService {
  return new LLMService(config);
}

/**
 * Resets the cached singleton instance.
 */
export function resetLLMService(): void {
  defaultServiceInstance = null;
}
