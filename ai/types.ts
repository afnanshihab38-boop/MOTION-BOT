/**
 * MOTION-BOT — LLM Provider & AI Creative System Type Definitions
 * Phase 7.2: LLM Provider Foundation
 *
 * Provider-independent contracts for LLM communication, message abstraction,
 * multimodal content preparation, and structured response handling.
 */

export type LLMMessageRole = "system" | "user" | "assistant";

export interface LLMTextPart {
  type: "text";
  text: string;
}

export interface LLMImagePart {
  type: "image";
  image: {
    /** HTTP(S) URL or base64 Data URL (data:image/...) */
    url: string;
    /** Optional MIME type, e.g. "image/png", "image/jpeg" */
    mimeType?: string;
  };
}

export type LLMContentPart = LLMTextPart | LLMImagePart;

export interface LLMMessage {
  role: LLMMessageRole;
  content: string | LLMContentPart[];
}

export type ResponseFormatType = "text" | "json_object";

export interface LLMResponseFormat {
  type: ResponseFormatType;
  /** Optional JSON schema for validation and future structured enforcement */
  schema?: Record<string, unknown>;
}

export interface LLMGenerationRequest {
  /** Convenience shortcut for simple single-prompt queries */
  prompt?: string;
  /** Full message history / conversation turns */
  messages?: LLMMessage[];
  /** Optional top-level system instruction */
  systemInstruction?: string;
  /** Override model ID (defaults to provider's default model) */
  model?: string;
  /** Sampling temperature [0.0 - 2.0] */
  temperature?: number;
  /** Maximum generation tokens */
  maxTokens?: number;
  /** Stop sequences */
  stopSequences?: string[];
  /** Request format: text or structured JSON */
  responseFormat?: LLMResponseFormat;
  /** Request timeout in milliseconds (defaults to 30000ms) */
  timeoutMs?: number;
  /** Optional metadata / tracking tags (never sent to external model API) */
  metadata?: Record<string, unknown>;
}

export interface LLMTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type LLMFinishReason = "stop" | "length" | "content_filter" | "error" | "unknown";

export interface LLMGenerationResponse<T = unknown> {
  /** Normalized plain text response from the model */
  text: string;
  /** Concrete model identifier that generated the response */
  model: string;
  /** Identifier of the provider that handled the request */
  provider: string;
  /** Reason why the model finished generating */
  finishReason: LLMFinishReason;
  /** Token usage statistics if reported by provider */
  usage?: LLMTokenUsage;
  /** Parsed JSON object if JSON format was requested or parse succeeded */
  parsedJson?: T;
  /** Round-trip request duration in milliseconds */
  durationMs: number;
  /** Optional raw provider payload for internal debugging (server-side only) */
  raw?: unknown;
}

export type LLMErrorCode =
  | "MISSING_API_KEY"
  | "INVALID_CONFIG"
  | "INVALID_MODEL"
  | "AUTHENTICATION_ERROR"
  | "PERMISSION_DENIED"
  | "RATE_LIMIT_EXCEEDED"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "PROVIDER_ERROR"
  | "MALFORMED_RESPONSE"
  | "EMPTY_RESPONSE"
  | "JSON_PARSE_ERROR";

export interface OpenRouterConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  appUrl?: string;
  appName?: string;
  timeoutMs?: number;
}

export interface LLMServiceConfig {
  defaultProvider?: string;
  mockMode?: boolean;
  openRouter?: OpenRouterConfig;
}

/**
 * Interface that all MotionBot LLM providers must implement.
 */
export interface ILLMProvider {
  /** Unique provider identifier (e.g. "openrouter", "mock") */
  readonly id: string;
  /** Human-readable provider name */
  readonly name: string;
  /** Default model identifier */
  readonly defaultModel: string;
  /** Check if the provider is properly configured to execute calls */
  isConfigured(): boolean;
  /** Execute generation request */
  generate(request: LLMGenerationRequest): Promise<LLMGenerationResponse>;
}
