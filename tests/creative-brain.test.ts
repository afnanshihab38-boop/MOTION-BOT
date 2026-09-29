/**
 * MOTION-BOT — Creative Brain Test Suite
 * Phase 7.3: MotionBot Creative Brain
 *
 * Verifies natural language creative brief synthesis, schema validation,
 * platform & duration normalization, contradiction detection, missing info handling,
 * malformed output recovery, mock mode execution, and API route integration.
 */

import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  CreativeBrainService,
  createCreativeBrainService,
  validateAndNormalizeCreativeBrief,
  getLLMService,
  createLLMService,
  MockLLMProvider,
  LLMError,
  CreativeBrief,
} from "../ai";

describe("MotionBot Creative Brain — Phase 7.3", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ---------------------------------------------------------------------------
  // 1. SIMPLE AD REQUEST
  // ---------------------------------------------------------------------------
  describe("1. Simple Ad Request Understanding", () => {
    it("converts simple sneaker ad request into structured creative brief", async () => {
      const service = createCreativeBrainService(createLLMService({ mockMode: true }));
      const result = await service.analyzeRequest({
        prompt: "Make a 10-second energetic Instagram ad for a new sneaker.",
      });

      assert.ok(result.brief);
      assert.equal(result.brief.version, "1.0.0");
      assert.equal(result.brief.duration, 10);
      assert.equal(result.brief.platform, "instagram");
      assert.equal(result.brief.aspectRatio, "9:16");
      assert.equal(result.brief.tone, "energetic");
      assert.ok(result.brief.subject.toLowerCase().includes("sneaker"));
      assert.ok(result.brief.textContent.headline.length > 0);
      assert.ok(result.brief.cta && result.brief.cta.text.length > 0);
      assert.ok(result.brief.animationDirection.pacing);
      assert.equal(result.analysis.needsClarification, false);

      // Verify explicit vs default categorization
      assert.ok(result.analysis.explicitlyProvided.some((e) => e.includes("instagram")));
      assert.ok(result.analysis.explicitlyProvided.some((e) => e.includes("10s")));
      assert.ok(result.analysis.explicitlyProvided.some((e) => e.includes("sneaker")));
    });
  });

  // ---------------------------------------------------------------------------
  // 2. SOCIAL MEDIA REQUEST (TIKTOK / VERTICAL)
  // ---------------------------------------------------------------------------
  describe("2. Social Media Specific Request", () => {
    it("understands TikTok vertical requirements and assigns safe zones", async () => {
      const service = createCreativeBrainService(createLLMService({ mockMode: true }));
      const result = await service.analyzeRequest({
        prompt: "Make a 15-second TikTok video showing off our summer apparel collection.",
      });

      assert.equal(result.brief.platform, "tiktok");
      assert.equal(result.brief.duration, 15);
      assert.equal(result.brief.aspectRatio, "9:16");
      assert.ok(result.brief.constraints?.safeZoneAdvisory?.includes("80%"));
      assert.equal(result.analysis.needsClarification, false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. MISSING DURATION (REASONABLE DEFAULTS)
  // ---------------------------------------------------------------------------
  describe("3. Missing Duration Handling", () => {
    it("applies sensible 10s default when duration is omitted and records assumption", async () => {
      const validation = validateAndNormalizeCreativeBrief(
        {
          brief: {
            subject: "Artisan Coffee Beans",
            platform: "instagram",
          },
        },
        "Create an Instagram reel promoting coffee beans."
      );

      assert.equal(validation.isValid, true);
      assert.equal(validation.brief.duration, 10);
      assert.equal(validation.analysis.defaultsApplied["duration"], 10);
      assert.ok(validation.analysis.assumptionsMade.some((a) => a.includes("10 seconds")));
      assert.equal(validation.analysis.needsClarification, false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. MISSING PLATFORM (REASONABLE DEFAULTS)
  // ---------------------------------------------------------------------------
  describe("4. Missing Platform Handling", () => {
    it("applies general/16:9 default when platform is omitted without nagging user", async () => {
      const validation = validateAndNormalizeCreativeBrief(
        {
          brief: {
            subject: "Luxury Mechanical Chronograph",
            duration: 30,
          },
        },
        "Make a 30-second product launch video for a luxury mechanical watch."
      );

      assert.equal(validation.isValid, true);
      assert.equal(validation.brief.platform, "general");
      assert.equal(validation.brief.aspectRatio, "16:9");
      assert.equal(validation.brief.duration, 30);
      assert.equal(validation.analysis.defaultsApplied["platform"], "general");
      assert.equal(validation.analysis.needsClarification, false);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. CONTRADICTORY INSTRUCTIONS
  // ---------------------------------------------------------------------------
  describe("5. Contradictory Instructions Detection", () => {
    it("detects and catalogs conflicting timing constraints", async () => {
      const service = createCreativeBrainService(createLLMService({ mockMode: true }));
      const result = await service.analyzeRequest({
        prompt: "Make a 60-second Instagram reel that is only 5-seconds long with contradictory timings.",
      });

      assert.ok(result.analysis.contradictionsDetected);
      assert.ok(result.analysis.contradictionsDetected.length > 0);
      // Valid brief is still safely produced with clamped duration
      assert.ok(result.brief.duration > 0 && result.brief.duration <= 60);
    });

    it("detects platform and aspect ratio contradictions (e.g. TikTok with 16:9)", () => {
      const validation = validateAndNormalizeCreativeBrief(
        {
          brief: {
            subject: "Mobile App Teaser",
            platform: "tiktok",
            aspectRatio: "16:9",
          },
        },
        "Make a TikTok video in 16:9 horizontal."
      );

      assert.ok(validation.analysis.contradictionsDetected);
      assert.ok(validation.analysis.contradictionsDetected.some((c) => c.includes("vertical-first")));
    });
  });

  // ---------------------------------------------------------------------------
  // 6. EMPTY / GIBBERISH REQUESTS
  // ---------------------------------------------------------------------------
  describe("6. Empty & Incomprehensible Requests", () => {
    it("returns structured clarification request for empty or whitespace prompts", async () => {
      const service = createCreativeBrainService(createLLMService({ mockMode: true }));
      const result = await service.analyzeRequest({ prompt: "   " });

      assert.equal(result.analysis.needsClarification, true);
      assert.ok(result.analysis.clarificationRequest);
      assert.ok(result.analysis.clarificationRequest.issue.includes("empty"));
      assert.ok(result.analysis.clarificationRequest.question);
      assert.ok(result.analysis.clarificationRequest.suggestedOptions!.length >= 2);
    });

    it("flags clarification for non-alphabetic gibberish input", async () => {
      const service = createCreativeBrainService(createLLMService({ mockMode: true }));
      const result = await service.analyzeRequest({ prompt: "123 !@#$%" });

      assert.equal(result.analysis.needsClarification, true);
      assert.ok(result.analysis.clarificationRequest);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. MALFORMED LLM OUTPUT RECOVERY
  // ---------------------------------------------------------------------------
  describe("7. Malformed LLM Output Recovery", () => {
    it("recovers gracefully and synthesizes normalized brief when LLM outputs non-JSON", async () => {
      const mockLLM = new MockLLMProvider();
      mockLLM.setOptions({
        customTextResponse: "Here is your video concept: energetic Nike shoes ad, high speed, 10s.",
      });

      const llmService = createLLMService({ mockMode: false });
      llmService.registerProvider(mockLLM);
      llmService.setActiveProvider("mock");

      const service = createCreativeBrainService(llmService);
      const result = await service.analyzeRequest({
        prompt: "Energetic Nike running shoe commercial",
      });

      assert.ok(result.brief);
      assert.ok(result.brief.subject.includes("Nike"));
      assert.equal(result.brief.duration, 10);
      assert.equal(result.model, "fallback-normalizer");
    });
  });

  // ---------------------------------------------------------------------------
  // 8. PROVIDER FAILURE HANDLING
  // ---------------------------------------------------------------------------
  describe("8. Provider Failure Handling", () => {
    it("propagates clean LLMError when underlying provider rejects", async () => {
      const mockLLM = new MockLLMProvider();
      mockLLM.setOptions({
        simulateError: new LLMError({
          code: "RATE_LIMIT_EXCEEDED",
          message: "Rate limit exceeded",
          provider: "openrouter",
          statusCode: 429,
        }),
      });

      const llmService = createLLMService({ mockMode: false });
      llmService.registerProvider(mockLLM);
      llmService.setActiveProvider("mock");

      const service = createCreativeBrainService(llmService);

      await assert.rejects(
        async () => {
          await service.analyzeRequest({ prompt: "Generate sneaker ad" });
        },
        (err: unknown) => {
          assert.ok(err instanceof LLMError);
          assert.equal(err.code, "RATE_LIMIT_EXCEEDED");
          assert.equal(err.isRateLimit, true);
          return true;
        }
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 9. MOCK MODE EXECUTION
  // ---------------------------------------------------------------------------
  describe("9. Mock Mode Determinism", () => {
    it("runs reliably offline without external network or API key", async () => {
      const service = createCreativeBrainService(createLLMService({ mockMode: true }));
      const result = await service.analyzeRequest({
        prompt: "Create an energetic 15s YouTube ad for cyber gaming headset",
      });

      assert.ok(result.brief);
      assert.equal(result.brief.duration, 15);
      assert.equal(result.brief.platform, "youtube");
      assert.equal(result.brief.aspectRatio, "16:9");
      assert.ok(result.processingTimeMs >= 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. API ROUTE INTEGRATION (/api/ai/creative-brief)
  // ---------------------------------------------------------------------------
  describe("10. API Route Integration (/api/ai/creative-brief)", () => {
    it("handles GET status requests", async () => {
      const { GET } = await import("../app/api/ai/creative-brief/route");
      const res = await GET();
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.service, "motionbot-creative-brain");
      assert.equal(json.status, "ready");
    });

    it("rejects missing prompt in POST request with HTTP 400", async () => {
      const { POST } = await import("../app/api/ai/creative-brief/route");
      const { NextRequest } = await import("next/server");

      const req = new NextRequest("http://localhost:3000/api/ai/creative-brief", {
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

    it("processes valid creative brief generation over POST", async () => {
      const { POST } = await import("../app/api/ai/creative-brief/route");
      const { NextRequest } = await import("next/server");

      const req = new NextRequest("http://localhost:3000/api/ai/creative-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Make a 10-second energetic Instagram ad for a new sneaker.",
          provider: "mock",
        }),
      });

      const res = await POST(req);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.brief);
      assert.equal(json.data.brief.duration, 10);
      assert.equal(json.data.brief.platform, "instagram");
    });
  });
});
