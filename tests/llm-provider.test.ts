/**
 * MOTION-BOT — LLM Provider Foundation Test Suite
 * Phase 7.2: LLM Provider Foundation
 *
 * Verifies provider configuration, OpenRouter adapter, Mock provider,
 * error handling (401, 403, 429, timeout, network failure), safe JSON parsing,
 * multimodal payload formatting, and LLMService provider abstraction.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  OpenRouterProvider,
  MockLLMProvider,
  LLMService,
  LLMError,
  LLMLogger,
  safeParseJson,
  DEFAULT_OPENROUTER_MODEL,
  createLLMService,
  ILLMProvider,
  LLMGenerationRequest,
  LLMGenerationResponse,
} from "../ai";

describe("LLM Provider Foundation — Phase 7.2", () => {
  // Store original global fetch
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ---------------------------------------------------------------------------
  // 1. PROVIDER CONFIGURATION
  // ---------------------------------------------------------------------------
  describe("1. Provider Configuration", () => {
    it("defaults to NVIDIA Nemotron 3 Ultra free model if not specified", () => {
      const provider = new OpenRouterProvider({ apiKey: "test-key" });
      assert.equal(provider.defaultModel, "nvidia/nemotron-3-ultra-550b-a55b:free");
      assert.equal(provider.defaultModel, DEFAULT_OPENROUTER_MODEL);
    });

    it("respects custom model when configured", () => {
      const provider = new OpenRouterProvider({
        apiKey: "test-key",
        model: "meta-llama/llama-4-maverick",
      });
      assert.equal(provider.defaultModel, "meta-llama/llama-4-maverick");
    });

    it("correctly reports isConfigured status based on apiKey presence", () => {
      const unconfigured = new OpenRouterProvider({});
      assert.equal(unconfigured.isConfigured(), false);

      const whitespace = new OpenRouterProvider({ apiKey: "   " });
      assert.equal(whitespace.isConfigured(), false);

      const configured = new OpenRouterProvider({ apiKey: "sk-or-v1-valid-key" });
      assert.equal(configured.isConfigured(), true);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. MISSING API KEY HANDLING
  // ---------------------------------------------------------------------------
  describe("2. Missing API Key Handling", () => {
    it("throws clean LLMError with code MISSING_API_KEY when key is absent", async () => {
      const provider = new OpenRouterProvider({});

      await assert.rejects(
        async () => {
          await provider.generate({ prompt: "Generate a kinetic ad" });
        },
        (err: unknown) => {
          assert.ok(err instanceof LLMError);
          assert.equal(err.code, "MISSING_API_KEY");
          assert.equal(err.provider, "openrouter");
          assert.ok(err.userMessage.includes("API key is not configured"));
          return true;
        }
      );
    });

    it("sanitizes client-facing error objects to prevent leaking internal stack traces", () => {
      const error = new LLMError({
        code: "MISSING_API_KEY",
        message: "Internal config missing key: sk-secret-123",
        provider: "openrouter",
      });

      const clientSafe = error.toClientSafeObject();
      assert.equal(clientSafe.code, "MISSING_API_KEY");
      assert.equal(clientSafe.provider, "openrouter");
      assert.equal(clientSafe.isRateLimit, false);
      assert.ok(!clientSafe.message.includes("sk-secret-123"));
    });
  });

  // ---------------------------------------------------------------------------
  // 3. MOCK MODE BEHAVIOR
  // ---------------------------------------------------------------------------
  describe("3. Mock Mode Behavior", () => {
    it("MockLLMProvider runs deterministically without an API key", async () => {
      const mock = new MockLLMProvider();
      assert.equal(mock.isConfigured(), true);

      const res = await mock.generate({ prompt: "Hello MotionBot" });
      assert.equal(res.provider, "mock");
      assert.ok(res.text.includes("[MOCK MODE]"));
      assert.equal(res.finishReason, "stop");
      assert.ok(res.durationMs >= 0);
      assert.ok(res.usage && res.usage.totalTokens > 0);
    });

    it("MockLLMProvider outputs valid JSON structure when json_object format is requested", async () => {
      const mock = new MockLLMProvider();
      const res = await mock.generate({
        prompt: "Generate motion scenes",
        responseFormat: { type: "json_object" },
      });

      assert.ok(res.parsedJson);
      const data = res.parsedJson as Record<string, unknown>;
      assert.equal(data.title, "Kinetic Brand Introduction");
      assert.ok(Array.isArray(data.scenes));
    });

    it("LLMService activates Mock mode when configured", async () => {
      const service = createLLMService({ mockMode: true });
      assert.equal(service.isMockMode(), true);
      assert.equal(service.getActiveProviderId(), "mock");

      const response = await service.generate({ prompt: "Create 15s advertisement" });
      assert.equal(response.provider, "mock");
    });
  });

  // ---------------------------------------------------------------------------
  // 4. SUCCESSFUL LLM REQUEST (MOCKED FETCH)
  // ---------------------------------------------------------------------------
  describe("4. Successful OpenRouter Request", () => {
    it("formats payload correctly and returns normalized response", async () => {
      let interceptedUrl = "";
      let interceptedHeaders: any = {};
      let interceptedBody: any = {};

      global.fetch = async (url: any, init: any) => {
        interceptedUrl = String(url);
        interceptedHeaders = init.headers;
        interceptedBody = JSON.parse(String(init.body));

        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            id: "gen-12345",
            model: "nvidia/nemotron-3-ultra-550b-a55b:free",
            choices: [
              {
                message: {
                  role: "assistant",
                  content: "Here is your cinematic motion concept.",
                },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 15,
              completion_tokens: 25,
              total_tokens: 40,
            },
          }),
        } as any;
      };

      const provider = new OpenRouterProvider({
        apiKey: "sk-or-test-key-123",
        model: "nvidia/nemotron-3-ultra-550b-a55b:free",
      });

      const response = await provider.generate({
        systemInstruction: "You are an elite motion design director.",
        prompt: "Design a 5s product reveal",
        temperature: 0.5,
        maxTokens: 500,
      });

      // Verify request payload sent to OpenRouter
      assert.ok(interceptedUrl.includes("/chat/completions"));
      assert.equal(interceptedHeaders.Authorization, "Bearer sk-or-test-key-123");
      assert.equal(interceptedBody.model, "nvidia/nemotron-3-ultra-550b-a55b:free");
      assert.equal(interceptedBody.temperature, 0.5);
      assert.equal(interceptedBody.max_tokens, 500);
      assert.equal(interceptedBody.messages.length, 2);
      assert.equal(interceptedBody.messages[0].role, "system");
      assert.equal(interceptedBody.messages[1].role, "user");

      // Verify normalized response
      assert.equal(response.text, "Here is your cinematic motion concept.");
      assert.equal(response.model, "nvidia/nemotron-3-ultra-550b-a55b:free");
      assert.equal(response.provider, "openrouter");
      assert.equal(response.finishReason, "stop");
      assert.deepEqual(response.usage, {
        promptTokens: 15,
        completionTokens: 25,
        totalTokens: 40,
      });
      assert.ok(response.durationMs >= 0);
    });

    it("formats multimodal image parts cleanly for OpenRouter", async () => {
      let interceptedBody: any = {};

      global.fetch = async (_url: any, init: any) => {
        interceptedBody = JSON.parse(String(init.body));
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            choices: [{ message: { content: "Analyzed product image." }, finish_reason: "stop" }],
          }),
        } as any;
      };

      const provider = new OpenRouterProvider({ apiKey: "sk-or-key" });
      await provider.generate({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Look at this product screenshot:" },
              {
                type: "image",
                image: { url: "https://example.com/shoe.png", mimeType: "image/png" },
              },
            ],
          },
        ],
      });

      assert.equal(interceptedBody.messages[0].content.length, 2);
      assert.equal(interceptedBody.messages[0].content[0].type, "text");
      assert.equal(interceptedBody.messages[0].content[1].type, "image_url");
      assert.equal(interceptedBody.messages[0].content[1].image_url.url, "https://example.com/shoe.png");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. STRUCTURED JSON OUTPUT & SAFE PARSING
  // ---------------------------------------------------------------------------
  describe("5. Structured JSON Output & Safe Parsing", () => {
    it("safeParseJson parses clean raw JSON", () => {
      const res = safeParseJson<{ score: number }>('{"score": 98}');
      assert.equal(res.success, true);
      assert.equal(res.data?.score, 98);
    });

    it("safeParseJson successfully extracts JSON wrapped in markdown fences", () => {
      const wrapped = "Here is the response:\n```json\n{\n  \"scenes\": 3,\n  \"name\": \"Intro\"\n}\n```\nHope you like it!";
      const res = safeParseJson<{ scenes: number; name: string }>(wrapped);
      assert.equal(res.success, true);
      assert.equal(res.data?.scenes, 3);
      assert.equal(res.data?.name, "Intro");
    });

    it("safeParseJson extracts JSON bounded by outermost brackets", () => {
      const raw = "Preamble commentary...\n{\"status\": \"ok\", \"count\": 42}\nPostscript commentary.";
      const res = safeParseJson<{ status: string; count: number }>(raw);
      assert.equal(res.success, true);
      assert.equal(res.data?.status, "ok");
      assert.equal(res.data?.count, 42);
    });

    it("safeParseJson safely fails on non-JSON text without throwing uncaught exceptions", () => {
      const res = safeParseJson("Just regular conversational text without any braces");
      assert.equal(res.success, false);
      assert.ok(res.error);
    });

    it("provider throws JSON_PARSE_ERROR if json_object format is requested but response is invalid", async () => {
      global.fetch = async () => ({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          choices: [{ message: { content: "This is definitely not JSON." }, finish_reason: "stop" }],
        }),
      } as any);

      const provider = new OpenRouterProvider({ apiKey: "sk-test" });

      await assert.rejects(
        async () => {
          await provider.generate({
            prompt: "Return JSON",
            responseFormat: { type: "json_object" },
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof LLMError);
          assert.equal(err.code, "JSON_PARSE_ERROR");
          return true;
        }
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 6. HTTP 429 RATE LIMIT ERROR HANDLING
  // ---------------------------------------------------------------------------
  describe("6. HTTP 429 Rate Limit Handling", () => {
    it("maps HTTP 429 to RATE_LIMIT_EXCEEDED with retryAfter and safe user message", async () => {
      global.fetch = async () => {
        const headers = new Headers();
        headers.set("retry-after", "12");
        return {
          ok: false,
          status: 429,
          headers,
          text: async () => JSON.stringify({ error: { message: "Rate limit exceeded" } }),
        } as any;
      };

      const provider = new OpenRouterProvider({ apiKey: "sk-test" });

      await assert.rejects(
        async () => {
          await provider.generate({ prompt: "Test rate limit" });
        },
        (err: unknown) => {
          assert.ok(err instanceof LLMError);
          assert.equal(err.code, "RATE_LIMIT_EXCEEDED");
          assert.equal(err.statusCode, 429);
          assert.equal(err.isRateLimit, true);
          assert.equal(err.retryAfterMs, 12000);
          assert.ok(err.userMessage.includes("temporarily rate-limited"));
          return true;
        }
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 7. HTTP 401 & 403 AUTHENTICATION / PERMISSION ERRORS
  // ---------------------------------------------------------------------------
  describe("7. HTTP 401 & 403 Authentication Handling", () => {
    it("maps HTTP 401 to AUTHENTICATION_ERROR without leaking raw authorization header", async () => {
      global.fetch = async () => ({
        ok: false,
        status: 401,
        headers: new Headers(),
        text: async () => JSON.stringify({ error: "Invalid API key provided" }),
      } as any);

      const provider = new OpenRouterProvider({ apiKey: "sk-bad-key" });

      await assert.rejects(
        async () => {
          await provider.generate({ prompt: "Test auth" });
        },
        (err: unknown) => {
          assert.ok(err instanceof LLMError);
          assert.equal(err.code, "AUTHENTICATION_ERROR");
          assert.equal(err.statusCode, 401);
          assert.equal(err.isAuthError, true);
          assert.ok(!err.message.includes("sk-bad-key"));
          return true;
        }
      );
    });

    it("maps HTTP 403 to PERMISSION_DENIED", async () => {
      global.fetch = async () => ({
        ok: false,
        status: 403,
        headers: new Headers(),
        text: async () => "Forbidden",
      } as any);

      const provider = new OpenRouterProvider({ apiKey: "sk-restricted" });

      await assert.rejects(
        async () => {
          await provider.generate({ prompt: "Test permission" });
        },
        (err: unknown) => {
          assert.ok(err instanceof LLMError);
          assert.equal(err.code, "PERMISSION_DENIED");
          assert.equal(err.statusCode, 403);
          assert.equal(err.isAuthError, true);
          return true;
        }
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 8. TIMEOUT & NETWORK FAILURE HANDLING
  // ---------------------------------------------------------------------------
  describe("8. Timeout & Network Failure Handling", () => {
    it("handles timeout safely and maps to TIMEOUT error", async () => {
      global.fetch = async (_url: any, init: any) => {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            const abortError = new Error("The operation was aborted");
            abortError.name = "AbortError";
            reject(abortError);
          });
        });
      };

      const provider = new OpenRouterProvider({ apiKey: "sk-test" });

      await assert.rejects(
        async () => {
          await provider.generate({
            prompt: "Test timeout",
            timeoutMs: 20, // 20ms short timeout
          });
        },
        (err: unknown) => {
          assert.ok(err instanceof LLMError);
          assert.equal(err.code, "TIMEOUT");
          assert.ok(err.userMessage.includes("timed out"));
          return true;
        }
      );
    });

    it("handles network connection rejection and maps to NETWORK_ERROR", async () => {
      global.fetch = async () => {
        throw new Error("ENOTFOUND api.openrouter.ai");
      };

      const provider = new OpenRouterProvider({ apiKey: "sk-test" });

      await assert.rejects(
        async () => {
          await provider.generate({ prompt: "Test network error" });
        },
        (err: unknown) => {
          assert.ok(err instanceof LLMError);
          assert.equal(err.code, "NETWORK_ERROR");
          assert.ok(err.userMessage.includes("network connection"));
          return true;
        }
      );
    });

    it("handles empty model response and maps to EMPTY_RESPONSE", async () => {
      global.fetch = async () => ({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({
          choices: [{ message: { content: "   " }, finish_reason: "stop" }],
        }),
      } as any);

      const provider = new OpenRouterProvider({ apiKey: "sk-test" });

      await assert.rejects(
        async () => {
          await provider.generate({ prompt: "Test empty response" });
        },
        (err: unknown) => {
          assert.ok(err instanceof LLMError);
          assert.equal(err.code, "EMPTY_RESPONSE");
          return true;
        }
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 9. PROVIDER ABSTRACTION & COORDINATOR (LLMService)
  // ---------------------------------------------------------------------------
  describe("9. Provider Abstraction & LLMService Coordinator", () => {
    it("allows registering and dynamically switching providers", async () => {
      const service = createLLMService({ mockMode: true });

      class CustomTestProvider implements ILLMProvider {
        readonly id = "custom-test";
        readonly name = "Custom Test Provider";
        readonly defaultModel = "custom-v1";
        isConfigured(): boolean {
          return true;
        }
        async generate(req: LLMGenerationRequest): Promise<LLMGenerationResponse> {
          return {
            text: `Custom Echo: ${req.prompt}`,
            model: "custom-v1",
            provider: "custom-test",
            finishReason: "stop",
            durationMs: 5,
          };
        }
      }

      service.registerProvider(new CustomTestProvider());
      service.setActiveProvider("custom-test");
      assert.equal(service.getActiveProviderId(), "custom-test");

      const response = await service.generate({ prompt: "Test dynamic provider" });
      assert.equal(response.provider, "custom-test");
      assert.equal(response.text, "Custom Echo: Test dynamic provider");
    });

    it("generateText shortcut returns raw text directly", async () => {
      const service = createLLMService({ mockMode: true });
      const text = await service.generateText("Give me a slogan");
      assert.equal(typeof text, "string");
      assert.ok(text.length > 0);
    });

    it("generateStructured shortcut returns parsed data directly", async () => {
      const service = createLLMService({ mockMode: true });
      const result = await service.generateStructured<{ title: string; scenes: unknown[] }>({
        prompt: "Create structured plan",
      });

      assert.ok(result.data);
      assert.equal(result.data.title, "Kinetic Brand Introduction");
      assert.ok(result.response.durationMs >= 0);
    });

    it("getStatus returns non-sensitive status report", () => {
      const service = createLLMService({ mockMode: true });
      const status = service.getStatus();
      assert.equal(status.mockMode, true);
      assert.equal(status.activeProvider, "mock");
      assert.ok(status.registeredProviders.includes("openrouter"));
      assert.ok(status.registeredProviders.includes("mock"));
      // Ensure no apiKey field exists in status report
      assert.equal((status as any).apiKey, undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. SECURITY & SANITIZATION
  // ---------------------------------------------------------------------------
  describe("10. Security & Sanitization", () => {
    it("LLMLogger sanitizes Bearer tokens and API keys", () => {
      const sensitive = "Connecting with Bearer sk-or-v1-abcdef1234567890 and key=secret12345";
      const sanitized = LLMLogger.sanitize(sensitive);
      assert.ok(!sanitized.includes("sk-or-v1-abcdef1234567890"));
      assert.ok(sanitized.includes("Bearer [REDACTED]"));
    });
  });

  // ---------------------------------------------------------------------------
  // 11. API ROUTE INTEGRATION (/api/ai/generate)
  // ---------------------------------------------------------------------------
  describe("11. API Route Integration (/api/ai/generate)", () => {
    it("handles GET status requests safely", async () => {
      const { GET } = await import("../app/api/ai/generate/route");
      const res = await GET();
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.activeProvider);
      assert.equal(json.data.apiKey, undefined);
    });


    it("rejects invalid request bodies on POST with 400 status", async () => {
      const { POST } = await import("../app/api/ai/generate/route");
      const { NextRequest } = await import("next/server");

      const req = new NextRequest("http://localhost:3000/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      assert.equal(res.status, 400);

      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, "INVALID_CONFIG");
    });

    it("successfully processes generation request through API route in mock mode", async () => {
      const { POST } = await import("../app/api/ai/generate/route");
      const { NextRequest } = await import("next/server");

      const req = new NextRequest("http://localhost:3000/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Generate kinetic ad for summer shoe sale",
          provider: "mock",
        }),
      });

      const res = await POST(req);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.provider, "mock");
      assert.ok(json.data.text.includes("[MOCK MODE]"));
    });
  });
});

