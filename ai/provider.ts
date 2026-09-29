/**
 * MOTION-BOT — Base LLM Provider Abstraction
 * Phase 7.2: LLM Provider Foundation
 *
 * Abstract base class providing common request normalization,
 * message formatting, and timing measurement across all providers.
 */

import {
  ILLMProvider,
  LLMGenerationRequest,
  LLMGenerationResponse,
  LLMMessage,
} from "./types";
import { LLMError } from "./llm-error";
import { safeParseJson } from "./json-parser";

export abstract class BaseLLMProvider implements ILLMProvider {
  public abstract readonly id: string;
  public abstract readonly name: string;
  public abstract readonly defaultModel: string;

  public abstract isConfigured(): boolean;
  public abstract executeGeneration(
    normalizedRequest: NormalizedLLMRequest
  ): Promise<RawProviderExecutionResult>;

  /**
   * Public entrypoint implementing common lifecycle, timeout, parsing, and normalization.
   */
  public async generate(request: LLMGenerationRequest): Promise<LLMGenerationResponse> {
    const startTime = Date.now();
    const normalized = this.normalizeRequest(request);

    try {
      const rawResult = await this.executeGeneration(normalized);
      const durationMs = Date.now() - startTime;

      if (!rawResult.text && rawResult.text !== "") {
        throw new LLMError({
          code: "MALFORMED_RESPONSE",
          message: `Provider ${this.id} returned null or undefined text`,
          provider: this.id,
        });
      }

      if (rawResult.text.trim().length === 0) {
        throw new LLMError({
          code: "EMPTY_RESPONSE",
          message: `Provider ${this.id} returned an empty completion`,
          provider: this.id,
        });
      }

      let parsedJson: unknown | undefined;
      if (normalized.responseFormat?.type === "json_object") {
        const jsonResult = safeParseJson(rawResult.text);
        if (jsonResult.success) {
          parsedJson = jsonResult.data;
        } else {
          throw new LLMError({
            code: "JSON_PARSE_ERROR",
            message: `Failed to parse structured JSON from ${this.id}: ${jsonResult.error}`,
            provider: this.id,
            userMessage: "The AI model response could not be parsed as valid structured JSON.",
          });
        }
      }

      return {
        text: rawResult.text,
        model: rawResult.model || normalized.model,
        provider: this.id,
        finishReason: rawResult.finishReason || "stop",
        usage: rawResult.usage,
        parsedJson,
        durationMs,
        raw: rawResult.raw,
      };
    } catch (err: unknown) {
      if (err instanceof LLMError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new LLMError({
        code: "PROVIDER_ERROR",
        message: `Unexpected error in provider ${this.id}: ${message}`,
        provider: this.id,
        cause: err,
      });
    }
  }

  /**
   * Normalizes convenience parameters (`prompt`, `systemInstruction`) into a standard message list.
   */
  protected normalizeRequest(request: LLMGenerationRequest): NormalizedLLMRequest {
    const messages: LLMMessage[] = [];

    // Prepend system instruction if provided
    if (request.systemInstruction?.trim()) {
      messages.push({
        role: "system",
        content: request.systemInstruction.trim(),
      });
    }

    // Append existing messages or convert single prompt
    if (request.messages && request.messages.length > 0) {
      messages.push(...request.messages);
    } else if (request.prompt !== undefined) {
      messages.push({
        role: "user",
        content: request.prompt,
      });
    }

    if (messages.length === 0) {
      throw new LLMError({
        code: "INVALID_CONFIG",
        message: "Generation request must contain at least one prompt or message.",
        provider: this.id,
      });
    }

    return {
      messages,
      model: request.model?.trim() || this.defaultModel,
      temperature: request.temperature !== undefined ? Math.max(0, Math.min(2, request.temperature)) : 0.7,
      maxTokens: request.maxTokens,
      stopSequences: request.stopSequences,
      responseFormat: request.responseFormat,
      timeoutMs: request.timeoutMs && request.timeoutMs > 0 ? request.timeoutMs : 30000,
      metadata: request.metadata,
    };
  }
}

export interface NormalizedLLMRequest {
  messages: LLMMessage[];
  model: string;
  temperature: number;
  maxTokens?: number;
  stopSequences?: string[];
  responseFormat?: LLMGenerationRequest["responseFormat"];
  timeoutMs: number;
  metadata?: Record<string, unknown>;
}

export interface RawProviderExecutionResult {
  text: string;
  model: string;
  finishReason?: LLMGenerationResponse["finishReason"];
  usage?: LLMGenerationResponse["usage"];
  raw?: unknown;
}
