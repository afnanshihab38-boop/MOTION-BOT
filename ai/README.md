# AI Creative System — LLM Provider Foundation

This directory houses the provider-independent LLM layer for MOTION-BOT, introduced in **Phase 7.2: LLM Provider Foundation**.

## Architecture Overview

```text
MotionBot Agents / Features
           │
           ▼
    LLMService Coordinator (`ai/llm-service.ts`)
           │
    ┌──────┴──────────────────────┬──────────────────────┐
    ▼                             ▼                      ▼
OpenRouterProvider          MockLLMProvider       Future Providers
(`ai/openrouter-provider.ts`) (`ai/mock-provider.ts`) (Gemini / Anthropic / Local)
    │
    ▼
Llama 4 Scout (Free)
(`meta-llama/llama-4-scout:free`)
```

## Module Hierarchy

- `types.ts`: Provider-independent interfaces (`ILLMProvider`, `LLMGenerationRequest`, `LLMGenerationResponse`, `LLMMessage`, `LLMErrorCode`).
- `config.ts`: Server-side environment configuration resolution.
- `llm-error.ts`: Standardized error mapping and user-safe sanitization (401, 403, 429, timeouts).
- `logger.ts`: Development logging utility with zero secret leakage.
- `json-parser.ts`: Markdown fence stripping and robust JSON parsing for structured output readiness.
- `provider.ts`: `BaseLLMProvider` base class with normalization and timing calculation.
- `openrouter-provider.ts`: Concrete provider for OpenRouter API supporting Llama 4 Scout and multimodal image parts.
- `mock-provider.ts`: Deterministic mock provider for offline development and CI test suites.
- `llm-service.ts`: Central service coordinator, registry, and application singleton.
- `creative-brain/`: Phase 7.3 MotionBot Creative Brain intelligence layer:
  * `types.ts`: Domain schema for `CreativeBrief`, `CreativeBrainAnalysis`, `ClarificationRequest`.
  * `prompts.ts`: Modular system prompt, schema template, and user request builder.
  * `validator.ts`: Schema validator, normalizer, and contradiction detector.
  * `creative-brain-service.ts`: High-level service converting natural language prompts to briefs.
- `index.ts`: Barrel export for the entire AI module.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENROUTER_API_KEY` | Yes (for live API) | `undefined` | Server-side OpenRouter API key |
| `OPENROUTER_MODEL` | No | `meta-llama/llama-4-scout:free` | Target model identifier |
| `OPENROUTER_BASE_URL` | No | `https://openrouter.ai/api/v1` | OpenRouter API base URL |
| `LLM_MOCK_MODE` | No | `false` | Force deterministic mock provider |
| `LLM_TIMEOUT_MS` | No | `30000` | Request timeout in milliseconds |

> **SECURITY NOTE**: API keys are server-side only. Never prefix with `NEXT_PUBLIC_` and never pass keys to client bundles.

## Mock Mode

When `LLM_MOCK_MODE=true` or when running locally in development without an `OPENROUTER_API_KEY`, MOTION-BOT automatically uses `MockLLMProvider`.
- Text requests receive deterministic studio confirmation text.
- Structured JSON requests (`responseFormat: { type: "json_object" }`) receive valid sample motion design plans.

## Testing

Run the LLM test suite:
```bash
npx tsx --test tests/llm-provider.test.ts
```

Run all tests across the repository:
```bash
npx tsx --test tests/*.test.ts
```

## Adding Future Providers

To add a new provider (e.g. Anthropic, Gemini, or Ollama):
1. Implement the `ILLMProvider` interface from `./types.ts` (or extend `BaseLLMProvider` from `./provider.ts`).
2. Implement `isConfigured()` and `executeGeneration(normalizedRequest)`.
3. Register the provider in `LLMService` via `service.registerProvider(new MyProvider())`.
