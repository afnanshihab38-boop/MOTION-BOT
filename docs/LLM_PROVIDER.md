# MOTION-BOT — LLM Provider Foundation Specification
**Phase 7.2 Architecture & Integration Guide**

---

## 1. Overview & Core Philosophy

The **LLM Provider Foundation** establishes a provider-agnostic, decoupled language model execution layer for MOTION-BOT. MotionBot creative planning agents, script generators, and storyboard analyzers interact exclusively with the `LLMService` abstraction, ensuring that underlying model providers and model families can be updated, swapped, or operated in offline mock mode without rewriting any higher-level agent logic.

Initial Target Provider: **OpenRouter**
Initial Target Model: **Llama 4 Scout Free Endpoint** (`meta-llama/llama-4-scout:free`)

---

## 2. Architecture & Data Flow

```text
┌────────────────────────────────────────────────────────┐
│             MotionBot Agents & Pipelines               │
│          (Creative Director, Script-to-Scene)          │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            LLMService Coordinator (`ai/`)              │
│  - Active provider routing                             │
│  - Input sanitization & normalization                  │
│  - Structured JSON parsing & error classification      │
└───────────────────────────┬────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│  OpenRouterProvider   │       │    MockLLMProvider    │
│  - Multi-part message │       │  - Zero API key req   │
│  - Image input prep   │       │  - Deterministic test │
│  - 429/401/timeout    │       │  - Offline validation │
└───────────┬───────────┘       └───────────────────────┘
            │
            ▼
┌───────────────────────┐
│ OpenRouter API Engine │
│  (Llama 4 Scout Free) │
└───────────────────────┘
```

---

## 3. Configuration & Security

Configuration is read securely on the server via `ai/config.ts`.

### Environment Variables
* `OPENROUTER_API_KEY`: API authentication key. Must remain on the server side; **never** prefix with `NEXT_PUBLIC_`.
* `OPENROUTER_MODEL`: Model identifier (defaults to `meta-llama/llama-4-scout:free`).
* `OPENROUTER_BASE_URL`: API endpoint (defaults to `https://openrouter.ai/api/v1`).
* `LLM_MOCK_MODE`: Explicit toggle (`true`/`false`) for mock mode.
* `LLM_TIMEOUT_MS`: Request timeout threshold in milliseconds (default: `30000`).

### Security Guarantees
1. **Zero Secret Leakage**: `LLMLogger` automatically strips Bearer tokens and API keys matching `sk-...`.
2. **Sanitized User Errors**: Client-facing errors (`toClientSafeObject()`) contain non-sensitive, human-friendly messages and never expose raw stack traces or authorization headers.
3. **Server-Side Isolation**: AI generation requests are handled via the Next.js backend endpoint `/api/ai/generate`.

---

## 4. Multimodal & Structured Output Readiness

1. **Multimodal Input**: `LLMMessage` supports both string content and arrays of `LLMContentPart` (`LLMTextPart` and `LLMImagePart`). The `OpenRouterProvider` formats image parts to OpenRouter's `image_url` structure.
2. **Safe Structured Output**: `safeParseJson` parses both raw JSON and markdown code blocks (` ```json ... ``` `), locating outermost object/array boundaries to recover structured data gracefully.

---

## 5. Mock Mode for Testing & Local Development

When `LLM_MOCK_MODE=true` (or when `OPENROUTER_API_KEY` is not present in development), `MockLLMProvider` is automatically activated:
* Does not require a network connection or paid API key.
* Produces realistic, deterministic motion design scene graphs for structured requests.
* Produces clear studio confirmation text for standard prompts.

---

## 6. Phase 7.3: MotionBot Creative Brain

The Creative Brain (`ai/creative-brain/`) translates unstructured natural-language user requests into structured, validated creative briefs (`CreativeBrief`) without generating final animations prematurely.

### Architecture Flow
```text
Frontend User Input
       │
       ▼
POST /api/ai/creative-brief
       │
       ▼
CreativeBrainService (`ai/creative-brain/creative-brain-service.ts`)
       │
       ▼
LLMService (`generateStructured`)
       │
       ▼
Validator & Normalizer (`ai/creative-brain/validator.ts`)
       │
       ▼
CreativeBrief & Analysis (Explicit vs Defaults vs Contradictions)
```

### Analysis & Ambiguity Handling
* **Explicit Parameters**: Tracked in `analysis.explicitlyProvided`.
* **Reasonable Defaults**: Non-critical omissions (such as missing platform or duration) are assigned sensible defaults (`duration: 10s`, `platform: general`, `aspectRatio: 16:9` or `9:16`) and logged in `analysis.defaultsApplied` without badgering the user.
* **Contradiction Detection**: Conflicting constraints (e.g. 60s Reels ad with 5s timing, or 16:9 TikTok video) are cataloged in `analysis.contradictionsDetected`.
* **Clarification Requests**: For completely empty or incomprehensible requests, returns `analysis.needsClarification: true` with a structured `clarificationRequest` offering suggested options.

---

## 7. Testing & Non-Regression

Run the LLM and Creative Brain test suites:
```bash
npx tsx --test tests/llm-provider.test.ts
npx tsx --test tests/creative-brain.test.ts
```

Run the complete test suite across all phases:
```bash
npx tsx --test tests/*.test.ts
```

