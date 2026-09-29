/**
 * MOTION-BOT — OpenRouter LLM Provider
 * Phase 7.2: LLM Provider Foundation
 *
 * Implements the OpenRouter API provider supporting NVIDIA Nemotron 3 Ultra,
 * multimodal image input format, structured JSON responses, and resilient
 * error handling (timeouts, rate limits, network errors).
 */

import { BaseLLMProvider, NormalizedLLMRequest, RawProviderExecutionResult } from "./provider";
import { OpenRouterConfig } from "./types";
import { LLMError } from "./llm-error";
import { LLMLogger } from "./logger";
import { DEFAULT_OPENROUTER_MODEL, DEFAULT_OPENROUTER_BASE_URL } from "./config";

interface OpenRouterChatChoice {
  message?: {
    role?: string;
    content?: string;
  };
  finish_reason?: string;
}

interface OpenRouterChatResponse {
  id?: string;
  model?: string;
  choices?: OpenRouterChatChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface FormattedOpenRouterMessage {
  role: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export class OpenRouterProvider extends BaseLLMProvider {
  public readonly id = "openrouter";
  public readonly name = "OpenRouter";
  public readonly defaultModel: string;

  private readonly config: OpenRouterConfig;
  private readonly baseUrl: string;

  constructor(config: OpenRouterConfig = {}) {
    super();
    this.config = config;
    this.defaultModel = config.model || DEFAULT_OPENROUTER_MODEL;
    this.baseUrl = (config.baseUrl || DEFAULT_OPENROUTER_BASE_URL).replace(/\/+$/, "");
  }

  public isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.apiKey.trim().length > 0);
  }

  public async executeGeneration(
    normalized: NormalizedLLMRequest
  ): Promise<RawProviderExecutionResult> {
    if (!this.isConfigured()) {
      throw new LLMError({
        code: "MISSING_API_KEY",
        message: "OpenRouter API key is missing. Set OPENROUTER_API_KEY or activate mock mode.",
        provider: this.id,
      });
    }

    const apiKey = this.config.apiKey!.trim();
    const endpoint = `${this.baseUrl}/chat/completions`;
    const formattedMessages = this.formatMessages(normalized.messages);

    const payload: Record<string, unknown> = {
      model: normalized.model,
      messages: formattedMessages,
      temperature: normalized.temperature,
    };

    if (normalized.maxTokens !== undefined) {
      payload.max_tokens = normalized.maxTokens;
    }

    if (normalized.stopSequences && normalized.stopSequences.length > 0) {
      payload.stop = normalized.stopSequences;
    }

    if (normalized.responseFormat?.type === "json_object") {
      payload.response_format = { type: "json_object" };
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": this.config.appUrl || "https://motionbot.app",
      "X-Title": this.config.appName || "MOTION-BOT",
    };

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => {
      controller.abort();
    }, normalized.timeoutMs);

    const startTime = Date.now();

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutHandle);

      if (!response.ok) {
        let rawBody = "";
        try {
          rawBody = await response.text();
        } catch {
          // Ignore read error
        }

        const retryAfter = response.headers.get("retry-after");
        const httpError = LLMError.fromHttpStatus(response.status, this.id, rawBody, retryAfter);

        LLMLogger.error(`OpenRouter HTTP ${response.status}`, {
          provider: this.id,
          model: normalized.model,
          errorCode: httpError.code,
          durationMs: Date.now() - startTime,
        });

        throw httpError;
      }

      let data: OpenRouterChatResponse;
      try {
        data = (await response.json()) as OpenRouterChatResponse;
      } catch (err: unknown) {
        throw new LLMError({
          code: "MALFORMED_RESPONSE",
          message: `Failed to parse OpenRouter JSON response: ${err instanceof Error ? err.message : String(err)}`,
          provider: this.id,
        });
      }

      const choice = data?.choices?.[0];
      if (!choice) {
        throw new LLMError({
          code: "MALFORMED_RESPONSE",
          message: "OpenRouter response choices array is missing or empty",
          provider: this.id,
        });
      }

      const text = choice.message?.content ?? "";
      const finishReasonRaw = choice.finish_reason;
      let finishReason: RawProviderExecutionResult["finishReason"] = "stop";

      if (finishReasonRaw === "length") finishReason = "length";
      else if (finishReasonRaw === "content_filter") finishReason = "content_filter";
      else if (finishReasonRaw === "error") finishReason = "error";
      else if (finishReasonRaw === "stop") finishReason = "stop";
      else finishReason = "unknown";

      const usage = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens ?? 0,
            completionTokens: data.usage.completion_tokens ?? 0,
            totalTokens: data.usage.total_tokens ?? 0,
          }
        : undefined;

      const durationMs = Date.now() - startTime;
      LLMLogger.info("OpenRouter generation completed successfully", {
        provider: this.id,
        model: data.model || normalized.model,
        durationMs,
        tokens: usage,
      });

      return {
        text,
        model: data.model || normalized.model,
        finishReason,
        usage,
        raw: data,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutHandle);

      if (err instanceof LLMError) {
        throw err;
      }

      if (controller.signal.aborted) {
        throw new LLMError({
          code: "TIMEOUT",
          message: `OpenRouter request timed out after ${normalized.timeoutMs}ms`,
          provider: this.id,
        });
      }

      const msg = err instanceof Error ? err.message : String(err);
      throw new LLMError({
        code: "NETWORK_ERROR",
        message: `Network communication failure with OpenRouter: ${msg}`,
        provider: this.id,
        cause: err,
      });
    }
  }

  /**
   * Transforms normalized messages into OpenAI/OpenRouter chat completions schema,
   * converting multimodal parts (images, text) where present.
   */
  private formatMessages(messages: NormalizedLLMRequest["messages"]): FormattedOpenRouterMessage[] {
    return messages.map((msg) => {
      if (typeof msg.content === "string") {
        return {
          role: msg.role,
          content: msg.content,
        };
      }

      if (Array.isArray(msg.content)) {
        const parts = msg.content.map((part) => {
          if (part.type === "text") {
            return {
              type: "text",
              text: part.text,
            };
          }
          if (part.type === "image") {
            return {
              type: "image_url",
              image_url: {
                url: part.image.url,
              },
            };
          }
          return {
            type: "text",
            text: "",
          };
        });

        return {
          role: msg.role,
          content: parts,
        };
      }

      return {
        role: msg.role,
        content: String(msg.content),
      };
    });
  }
}
