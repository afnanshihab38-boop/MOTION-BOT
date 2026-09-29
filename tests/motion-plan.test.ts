/**
 * MOTION-BOT — Structured Motion Plan Test Suite
 * Phase 7.4: Structured Motion Plan Generator
 *
 * Verifies Motion Plan generation, temporal correctness enforcement,
 * controlled animation vocabulary validation, creative brief fidelity preservation,
 * malformed output recovery, mock provider execution, and API route integration.
 */

import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  MotionPlanService,
  createMotionPlanService,
  validateAndNormalizeMotionPlan,
  getMotionPlanService,
  CONTROLLED_ANIMATION_SET,
  CONTROLLED_TRANSITION_SET,
  CONTROLLED_CAMERA_MOTION_SET,
  CreativeBrief,
  createCreativeBrainService,
  createLLMService,
  MockLLMProvider,
  LLMError,
} from "../ai";
import { NextRequest } from "next/server";
import { GET, POST } from "../app/api/ai/motion-plan/route";

// Sample valid CreativeBrief for testing
function createTestBrief(overrides: Partial<CreativeBrief> = {}): CreativeBrief {
  return {
    id: "brief_test_123",
    version: "1.0.0",
    title: "AeroGlide Performance Sneaker — 10s INSTAGRAM Ad",
    projectType: "ad",
    platform: "instagram",
    duration: 10,
    aspectRatio: "9:16",
    style: "bold-kinetic",
    tone: "energetic",
    subject: "AeroGlide Performance Sneaker",
    visualDirection: {
      palette: ["#FF3B30", "#000000", "#FFFFFF"],
      theme: "high-energy kinetic motion",
      imagery: "hero product angles with fast cuts",
      typography: "bold condensed kinetic sans-serif",
    },
    textContent: {
      headline: "UNLEASH SPEED",
      subheadline: "Engineered for pure velocity",
      bodyLines: ["Ultra-responsive cushioning", "Instant momentum"],
    },
    cta: {
      text: "Shop Now",
      urlOrHandle: "@aeroglide",
    },
    colorDirection: {
      primary: "#FF3B30",
      secondary: "#1A1A1A",
      background: "#000000",
      accent: "#FFD60A",
    },
    musicDirection: {
      tempo: "fast",
      genre: "hybrid electronic trap",
      mood: "punchy, driving rhythm",
    },
    animationDirection: {
      pacing: "explosive",
      transitionStyle: "dynamic snap whip-pan",
      kineticTypography: true,
      motionIntensity: "dynamic",
    },
    assets: [
      { type: "image", description: "Product hero photography transparent cutout" },
      { type: "logo", description: "Brand vector mark" },
    ],
    constraints: {
      maxDurationSeconds: 60,
      safeZoneAdvisory: "Center focus 80% to clear social UI buttons",
    },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("MotionBot Structured Motion Plan Generator — Phase 7.4", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ---------------------------------------------------------------------------
  // 1. VALID MOTION PLAN GENERATION
  // ---------------------------------------------------------------------------
  describe("1. Valid Motion Plan Generation", () => {
    it("generates a complete, temporally valid Motion Plan from a Creative Brief", async () => {
      const llmService = createLLMService({ mockMode: true });
      const service = createMotionPlanService(llmService);
      const brief = createTestBrief();

      const result = await service.generateMotionPlan(brief);

      assert.ok(result.plan, "Plan should be generated");
      assert.equal(result.plan.version, "1.0.0");
      assert.equal(result.plan.project.title, brief.title);
      assert.equal(result.plan.project.sourceBriefId, brief.id);
      assert.equal(result.plan.duration, 10);
      assert.equal(result.plan.canvas.aspect_ratio, "9:16");
      assert.equal(result.plan.canvas.width, 1080);
      assert.equal(result.plan.canvas.height, 1920);
      assert.ok(result.plan.scenes.length >= 2, "Should have multiple scenes");

      // Verify scenes are temporally valid
      let previousEndTime = 0;
      for (const scene of result.plan.scenes) {
        assert.ok(scene.start_time >= 0, "start_time must be >= 0");
        assert.ok(scene.end_time > scene.start_time, "end_time must be > start_time");
        assert.equal(
          Number((scene.end_time - scene.start_time).toFixed(2)),
          scene.duration,
          "duration must equal end_time - start_time"
        );
        assert.ok(scene.end_time <= result.plan.duration + 0.05, "scene fits in project");
        previousEndTime = scene.end_time;
      }
      assert.equal(previousEndTime, 10, "Final scene must terminate at project duration");
    });

    it("preserves typography and copywriting elements from Creative Brief", async () => {
      const llmService = createLLMService({ mockMode: true });
      const service = createMotionPlanService(llmService);
      const brief = createTestBrief();

      const result = await service.generateMotionPlan(brief);

      const allTexts = result.plan.scenes.flatMap((s) => s.text_elements);
      const headlineElement = allTexts.find((t) => t.role === "headline");
      const ctaElement = allTexts.find((t) => t.role === "cta");

      assert.ok(headlineElement, "Headline text element must exist");
      assert.equal(headlineElement?.text, "UNLEASH SPEED");
      assert.ok(ctaElement, "CTA text element must exist");
      assert.equal(ctaElement?.text, "Shop Now");
    });

    it("respects landscape 16:9 canvas dimensions when brief requests YouTube", async () => {
      const llmService = createLLMService({ mockMode: true });
      const service = createMotionPlanService(llmService);
      const brief = createTestBrief({
        aspectRatio: "16:9",
        platform: "youtube",
        duration: 15,
      });

      const result = await service.generateMotionPlan(brief);

      assert.equal(result.plan.canvas.aspect_ratio, "16:9");
      assert.equal(result.plan.canvas.width, 1920);
      assert.equal(result.plan.canvas.height, 1080);
      assert.equal(result.plan.duration, 15);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. TEMPORAL CORRECTNESS & TIMESTAMP VALIDATION
  // ---------------------------------------------------------------------------
  describe("2. Temporal Correctness Enforcement", () => {
    it("flags error when scene start_time is negative", () => {
      const brief = createTestBrief();
      const rawInvalid = {
        canvas: { width: 1080, height: 1920, aspect_ratio: "9:16", fps: 30 },
        duration: 10,
        scenes: [
          {
            scene_id: "scene_1",
            start_time: -2,
            end_time: 3,
            duration: 5,
          },
        ],
      };

      const result = validateAndNormalizeMotionPlan(rawInvalid, brief, { strict: true });
      assert.equal(result.valid, false, "Must be invalid when start_time < 0");
      assert.ok(result.errors.some((e) => e.field.includes("start_time")));
    });

    it("flags error when scene end_time <= start_time", () => {
      const brief = createTestBrief();
      const rawInvalid = {
        canvas: { width: 1080, height: 1920, aspect_ratio: "9:16", fps: 30 },
        duration: 10,
        scenes: [
          {
            scene_id: "scene_1",
            start_time: 5,
            end_time: 4, // end_time < start_time
            duration: -1,
          },
        ],
      };

      const result = validateAndNormalizeMotionPlan(rawInvalid, brief, { strict: true });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.field.includes("end_time")));
    });

    it("flags error when scene start_time exceeds project duration", () => {
      const brief = createTestBrief();
      const rawInvalid = {
        canvas: { width: 1080, height: 1920, aspect_ratio: "9:16", fps: 30 },
        duration: 10,
        scenes: [
          {
            scene_id: "scene_impossible",
            start_time: 15, // exceeds 10s duration
            end_time: 20,
            duration: 5,
          },
        ],
      };

      const result = validateAndNormalizeMotionPlan(rawInvalid, brief, { strict: true });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.message.includes("exceeds project duration")));
    });

    it("flags error when total scenes duration mismatches project duration in strict mode", () => {
      const brief = createTestBrief();
      const rawMismatch = {
        canvas: { width: 1080, height: 1920, aspect_ratio: "9:16", fps: 30 },
        duration: 10,
        scenes: [
          {
            scene_id: "scene_1",
            start_time: 0,
            end_time: 4,
            duration: 4,
          },
          // Stops at 4s instead of 10s
        ],
      };

      const result = validateAndNormalizeMotionPlan(rawMismatch, brief, { strict: true });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.message.includes("does not match project duration")));
    });
  });

  // ---------------------------------------------------------------------------
  // 3. CONTROLLED ANIMATION VOCABULARY ENFORCEMENT
  // ---------------------------------------------------------------------------
  describe("3. Controlled Animation Vocabulary Enforcement", () => {
    it("accepts valid vocabulary tokens (fade, slide, scale, zoom, rotate, bounce, parallax)", () => {
      const brief = createTestBrief();
      const validTokens = ["fade", "slide", "scale", "zoom", "rotate", "bounce", "parallax", "reveal", "typewriter"];

      for (const token of validTokens) {
        assert.ok(CONTROLLED_ANIMATION_SET.has(token), `Token ${token} must be in controlled vocabulary`);
      }
    });

    it("rejects unauthorized arbitrary strings or executable scripts in strict mode", () => {
      const brief = createTestBrief();
      const rawArbitrary = {
        canvas: { width: 1080, height: 1920, aspect_ratio: "9:16", fps: 30 },
        duration: 10,
        scenes: [
          {
            scene_id: "scene_1",
            start_time: 0,
            end_time: 10,
            duration: 10,
            entrance_animation: {
              type: "eval('maliciousCode()')", // Arbitrary executable attack
              duration: 0.5,
            },
            text_elements: [
              {
                id: "txt_1",
                text: "Hello",
                role: "headline",
                animation: {
                  type: "customGlitchShaderScript",
                  duration: 0.5,
                },
              },
            ],
          },
        ],
      };

      const result = validateAndNormalizeMotionPlan(rawArbitrary, brief, { strict: true });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.message.includes("Invalid animation type")));
    });

    it("safely normalizes unknown animation tokens to fallback 'fade' or 'none' in standard mode", () => {
      const brief = createTestBrief();
      const rawUnknown = {
        canvas: { width: 1080, height: 1920, aspect_ratio: "9:16", fps: 30 },
        duration: 10,
        scenes: [
          {
            scene_id: "scene_1",
            start_time: 0,
            end_time: 10,
            duration: 10,
            entrance_animation: {
              type: "super_funky_wobble",
              duration: 0.5,
            },
          },
        ],
      };

      const result = validateAndNormalizeMotionPlan(rawUnknown, brief, { strict: false });
      assert.equal(result.valid, true);
      assert.equal(result.plan.scenes[0].entrance_animation.type, "fade");
      assert.ok(result.warnings.some((w) => w.message.toLowerCase().includes("clamped")));
    });
  });

  // ---------------------------------------------------------------------------
  // 4. MISSING REQUIRED FIELDS HANDLING
  // ---------------------------------------------------------------------------
  describe("4. Missing Required Fields Handling", () => {
    it("flags error when required fields are missing in strict mode", () => {
      const brief = createTestBrief();
      const rawEmpty = {};

      const result = validateAndNormalizeMotionPlan(rawEmpty, brief, { strict: true });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some((e) => e.field === "canvas"));
      assert.ok(result.errors.some((e) => e.field === "scenes"));
    });

    it("synthesizes valid fallback scenes and canvas when raw output is completely empty in non-strict mode", () => {
      const brief = createTestBrief();
      const rawEmpty = {};

      const result = validateAndNormalizeMotionPlan(rawEmpty, brief, { strict: false });
      assert.equal(result.valid, true);
      assert.equal(result.plan.canvas.aspect_ratio, "9:16");
      assert.equal(result.plan.duration, 10);
      assert.ok(result.plan.scenes.length >= 2);
      assert.equal(result.plan.scenes[0].text_elements[0].text, brief.textContent.headline);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. MALFORMED LLM OUTPUT RECOVERY
  // ---------------------------------------------------------------------------
  describe("5. Malformed LLM Output Recovery", () => {
    it("recovers gracefully and synthesizes normalized motion plan when provider emits non-JSON", async () => {
      const mockProvider = new MockLLMProvider({
        customTextResponse: "Sorry, I cannot generate the JSON right now. Here is a description instead.",
      });
      const llmService = createLLMService();
      llmService.registerProvider(mockProvider);
      llmService.setActiveProvider("mock");

      const service = createMotionPlanService(llmService);
      const brief = createTestBrief();

      const result = await service.generateMotionPlan(brief);

      assert.ok(result.plan);
      assert.equal(result.model, "fallback-recovery");
      assert.equal(result.plan.duration, 10);
      assert.ok(result.plan.scenes.length >= 2);
    });

    it("throws clean LLMError when strict mode is active and output is malformed", async () => {
      const mockProvider = new MockLLMProvider({
        customTextResponse: "Non-JSON gibberish",
      });
      const llmService = createLLMService();
      llmService.registerProvider(mockProvider);
      llmService.setActiveProvider("mock");

      const service = createMotionPlanService(llmService);
      const brief = createTestBrief();

      await assert.rejects(
        async () => {
          await service.generateMotionPlan(brief, { strict: true });
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
  // 6. PROVIDER FAILURE HANDLING
  // ---------------------------------------------------------------------------
  describe("6. Provider Failure Handling", () => {
    it("propagates clean LLMError when underlying provider times out", async () => {
      const mockProvider = new MockLLMProvider({
        simulateError: new LLMError({
          code: "TIMEOUT",
          message: "Request timed out after 30000ms",
          provider: "openrouter",
          statusCode: 504,
        }),
      });
      const llmService = createLLMService();
      llmService.registerProvider(mockProvider);
      llmService.setActiveProvider("mock");

      const service = createMotionPlanService(llmService);
      const brief = createTestBrief();

      await assert.rejects(
        async () => {
          await service.generateMotionPlan(brief);
        },
        (err: unknown) => {
          assert.ok(err instanceof LLMError);
          assert.equal(err.code, "TIMEOUT");
          assert.equal(err.statusCode, 504);
          return true;
        }
      );
    });

    it("propagates clean LLMError when provider rate limit is hit", async () => {
      const mockProvider = new MockLLMProvider({
        simulateError: new LLMError({
          code: "RATE_LIMIT_EXCEEDED",
          message: "Rate limit exceeded. Please retry later.",
          provider: "openrouter",
          statusCode: 429,
          retryAfterMs: 15000,
        }),
      });
      const llmService = createLLMService();
      llmService.registerProvider(mockProvider);
      llmService.setActiveProvider("mock");

      const service = createMotionPlanService(llmService);
      const brief = createTestBrief();

      await assert.rejects(
        async () => {
          await service.generateMotionPlan(brief);
        },
        (err: unknown) => {
          assert.ok(err instanceof LLMError);
          assert.equal(err.code, "RATE_LIMIT_EXCEEDED");
          assert.equal(err.retryAfterMs, 15000);
          return true;
        }
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 7. END-TO-END PIPELINE: NATURAL LANGUAGE → BRIEF → MOTION PLAN
  // ---------------------------------------------------------------------------
  describe("7. End-to-End Pipeline Integration", () => {
    it("successfully transforms user request through Creative Brain into a validated Motion Plan", async () => {
      const llmService = createLLMService({ mockMode: true });
      const creativeBrain = createCreativeBrainService(llmService);
      const motionPlanner = createMotionPlanService(llmService);

      // Step 1: User Request -> Creative Brain -> Creative Brief
      const userPrompt = "Make a 10-second energetic Instagram ad for a new sneaker.";
      const brainResult = await creativeBrain.analyzeRequest({ prompt: userPrompt });

      assert.ok(brainResult.brief, "Brief synthesized");
      assert.equal(brainResult.brief.platform, "instagram");
      assert.equal(brainResult.brief.duration, 10);
      assert.equal(brainResult.brief.aspectRatio, "9:16");

      // Step 2: Creative Brief -> Motion Plan Generator -> Validated Motion Plan
      const planResult = await motionPlanner.generateMotionPlan(brainResult.brief);

      assert.ok(planResult.plan, "Plan synthesized");
      assert.equal(planResult.plan.canvas.aspect_ratio, "9:16");
      assert.equal(planResult.plan.duration, 10);
      assert.equal(planResult.plan.scenes[0].text_elements[0].text, brainResult.brief.textContent.headline);
      assert.ok(planResult.validation.valid);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. API ROUTE INTEGRATION (/api/ai/motion-plan)
  // ---------------------------------------------------------------------------
  describe("8. API Route Integration (/api/ai/motion-plan)", () => {
    it("handles GET status requests", async () => {
      const res = await GET();
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.service, "motionbot-motion-plan");
      assert.equal(json.status, "ready");
    });

    it("rejects request missing brief or prompt on POST with HTTP 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/ai/motion-plan", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, "INVALID_CONFIG");
    });

    it("successfully generates Motion Plan over POST using a Creative Brief", async () => {
      const brief = createTestBrief();
      const req = new NextRequest("http://localhost:3000/api/ai/motion-plan", {
        method: "POST",
        body: JSON.stringify({ brief }),
      });

      const res = await POST(req);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.plan);
      assert.equal(json.data.plan.duration, 10);
      assert.equal(json.data.plan.canvas.aspect_ratio, "9:16");
    });

    it("supports end-to-end chained generation when natural language prompt is passed to POST", async () => {
      const req = new NextRequest("http://localhost:3000/api/ai/motion-plan", {
        method: "POST",
        body: JSON.stringify({
          prompt: "Make a 10-second energetic Instagram ad for a new sneaker.",
        }),
      });

      const res = await POST(req);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.plan);
      assert.equal(json.data.plan.duration, 10);
      assert.equal(json.data.plan.canvas.aspect_ratio, "9:16");
    });
  });
});
