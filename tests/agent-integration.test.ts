/**
 * MOTION-BOT — Master End-to-End AI Agent Integration Test Suite
 * Phase 7.8: End-to-End AI Agent Integration
 *
 * Verifies the complete AI agent pipeline connecting:
 * Context Manager -> Project Memory -> Creative Brain -> Motion Plan Generator
 * -> AI Validation Layer -> Tool Registry -> Scene Engine & State Guardian.
 *
 * Covers all 12 required test scenarios:
 * 1. Simple request
 * 2. Complex request
 * 3. Request with project memory
 * 4. Invalid request
 * 5. Malformed AI response
 * 6. Provider failure
 * 7. Validation failure
 * 8. Invalid tool request
 * 9. Successful tool execution
 * 10. Mock mode
 * 11. Real model path where safe
 * 12. Existing project preservation
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  MotionBotAgent,
  AgentProgressEvent,
  AgentProgressState,
} from "../ai/agent";
import { MockLLMProvider } from "../ai/mock-provider";
import { LLMService } from "../ai/llm-service";
import { OpenRouterProvider } from "../ai/openrouter-provider";
import { LLMError } from "../ai/llm-error";
import { ContextManager } from "../ai/context/context-manager";
import { ProjectMemoryService } from "../ai/memory/memory-service";
import { CreativeBrainService } from "../ai/creative-brain/creative-brain-service";
import { MotionPlanService } from "../ai/motion-plan/motion-plan-service";
import { ToolService } from "../ai/tools/tool-service";
import { createSampleProject } from "../services/project/sample-project";
import { createProject } from "../services/project/project-model";
import { createScene } from "../services/project/scene-model";
import { Project } from "@/types/project";

describe("MotionBot End-to-End AI Agent Integration — Phase 7.8", () => {
  let mockProvider: MockLLMProvider;
  let llmService: LLMService;
  let agent: MotionBotAgent;
  let memoryService: ProjectMemoryService;
  let contextManager: ContextManager;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    llmService = new LLMService({
      defaultProvider: "mock",
      mockMode: true,
    });
    llmService.registerProvider(mockProvider);
    llmService.setActiveProvider("mock");

    memoryService = new ProjectMemoryService();
    contextManager = new ContextManager(memoryService);

    agent = new MotionBotAgent({
      llmService,
      contextManager,
      memoryService,
      creativeBrain: new CreativeBrainService(llmService),
      motionPlanService: new MotionPlanService(llmService),
      toolService: new ToolService(undefined, undefined, undefined, llmService),
    });
  });

  // ===========================================================================
  // 1. SIMPLE REQUEST
  // ===========================================================================
  it("Scenario 1: simple request — processes through all progress states to completion", async () => {
    const recordedEvents: AgentProgressEvent[] = [];
    const prompt = "Create a 5-second product teaser with dark background";

    const result = await agent.execute({
      prompt,
      projectId: "proj_simple_test",
      onProgress: (event) => {
        recordedEvents.push(event);
      },
    });

    assert.equal(result.success, true);
    assert.equal(result.prompt, prompt);
    assert.equal(result.projectId, "proj_simple_test");
    assert.ok(result.brief, "Brief must be returned");
    assert.ok(result.motionPlan, "Motion Plan must be returned");
    assert.ok(result.finalProject, "Final project must be returned");
    assert.ok(result.durationMs > 0, "Execution duration must be positive");
    assert.equal(result.preservedPreviousState, false);

    // Verify all 7 progression states were visited in order
    const visitedStates = recordedEvents.map((e) => e.state);
    const expectedStates: AgentProgressState[] = [
      "understanding_request",
      "preparing_context",
      "generating_creative_brief",
      "generating_motion_plan",
      "validating",
      "applying_changes",
      "completed",
    ];

    for (const expected of expectedStates) {
      assert.ok(
        visitedStates.includes(expected),
        `Pipeline should visit state '${expected}'. Visited: ${visitedStates.join(", ")}`
      );
    }

    // Verify project has scenes generated from motion plan
    assert.ok(result.finalProject.scenes.length >= 1, "Project should contain scenes");
  });

  // ===========================================================================
  // 2. COMPLEX REQUEST
  // ===========================================================================
  it("Scenario 2: complex request — handles multi-aspect specifications with full choreography", async () => {
    const prompt =
      "Create a 10-second modern product advertisement with a dark background, bold typography, smooth entrance animation, and a final logo reveal.";

    const result = await agent.execute({
      prompt,
      projectId: "proj_complex_ad",
    });

    assert.equal(result.success, true);
    assert.ok(result.brief);
    assert.ok(result.motionPlan);
    assert.equal(result.brief.duration, 10);
    assert.equal(result.motionPlan.duration, 10);

    // Check scenes and visual elements
    const scenes = result.finalProject.scenes;
    assert.ok(scenes.length >= 2, "Complex ad should synthesize multiple scenes");

    // Check text and visual layers
    const allElements = scenes.flatMap((s) => s.elements);
    const hasText = allElements.some((el) => el.type === "text");
    assert.ok(hasText, "Scenes should contain text layers from motion plan");
  });

  // ===========================================================================
  // 3. REQUEST WITH PROJECT MEMORY
  // ===========================================================================
  it("Scenario 3: request with project memory — integrates pre-existing memories and persists new decision", async () => {
    const projectId = "proj_memory_context";

    // Seed prior memory into project
    await memoryService.createMemory({
      projectId,
      category: "brand",
      content: "Brand primary color is #FF0055 and brand typography is Montserrat Black",
      priority: "high",
      tags: ["branding", "colors"],
    });

    const prompt = "Generate a summer sale motion promo";
    const result = await agent.execute({
      prompt,
      projectId,
    });

    assert.equal(result.success, true);

    // Verify a new memory record was saved for this project
    const memories = await memoryService.listMemories(projectId);
    assert.ok(
      memories.length >= 2,
      `Should have at least 2 memories (initial + newly saved). Found: ${memories.length}`
    );
    const decisionMemory = memories.find((m) => m.category === "creative_decision");
    assert.ok(decisionMemory, "Agent should record creative_decision memory");
  });

  // ===========================================================================
  // 4. INVALID REQUEST
  // ===========================================================================
  it("Scenario 4: invalid request — safely rejects empty prompt at stage 1 without corrupting project", async () => {
    const initial = createSampleProject();
    const originalTitle = initial.name;

    const result = await agent.execute({
      prompt: "   ",
      initialProject: initial,
    });

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.equal(result.error.stage, "understanding_request");
    assert.equal(result.preservedPreviousState, true);
    assert.equal(result.finalProject.name, originalTitle);
  });

  // ===========================================================================
  // 5. MALFORMED AI RESPONSE
  // ===========================================================================
  it("Scenario 5: malformed AI response — recovers gracefully using normalized fallbacks without crashing", async () => {
    mockProvider.setOptions({
      customTextResponse: "This is invalid non-json unformatted text from LLM",
    });

    const result = await agent.execute({
      prompt: "Create a minimal 5-second video",
      projectId: "proj_malformed_test",
    });

    // CreativeBrain recovers via fallback normalizer, MotionPlan recovers via fallback normalizer
    assert.equal(result.success, true);
    assert.ok(result.brief);
    assert.ok(result.motionPlan);
    assert.ok(result.finalProject.scenes.length >= 1);
  });

  // ===========================================================================
  // 6. PROVIDER FAILURE
  // ===========================================================================
  it("Scenario 6: provider failure — handles simulated provider outage with state preservation and zero secrets", async () => {
    const initial = createSampleProject();
    mockProvider.setOptions({
      simulateError: new LLMError({
        code: "NETWORK_ERROR",
        message: "Failed to connect to LLM upstream API key=sk-or-v1-secret1234567890",
        provider: "openrouter",
      }),
    });

    const result = await agent.execute({
      prompt: "Make a high energy sneaker clip",
      initialProject: initial,
    });

    assert.equal(result.success, false);
    assert.equal(result.preservedPreviousState, true);
    assert.ok(result.error);
    // Verify no secret leak in sanitized error message
    assert.ok(!result.error.message.includes("sk-or-v1-secret1234567890"));
    assert.equal(result.finalProject.id, initial.id);
  });

  // ===========================================================================
  // 7. VALIDATION FAILURE
  // ===========================================================================
  it("Scenario 7: validation failure — halts execution and preserves state when motion plan is invalid", async () => {
    const initial = createSampleProject();
    // Simulate mock returning malformed scene duration violating arithmetic
    mockProvider.setOptions({
      customJsonResponse: {
        project: { title: "Bad Plan", version: "1.0.0", projectType: "ad", sourceBriefId: "b1" },
        canvas: { width: 1920, height: 1080, aspect_ratio: "16:9", fps: 30 },
        duration: -5, // Invalid negative duration
        scenes: [
          {
            scene_id: "scene_1",
            start_time: 0,
            end_time: 3,
            duration: 3,
            purpose: "hook",
            background: { type: "solid", value: "#000" },
            visual_elements: [
              {
                id: "dup_elem_id",
                element_id: "dup_elem_id",
                type: "shape",
                description: "Shape 1",
                position: { x: 50, y: 50 },
                animation: { type: "fade", duration: 0.5 },
                layer_order: 1,
              },
              {
                id: "dup_elem_id",
                element_id: "dup_elem_id",
                type: "shape",
                description: "Shape 2",
                position: { x: 50, y: 50 },
                animation: { type: "fade", duration: 0.5 },
                layer_order: 2,
              },
            ],
            text_elements: [],
            entrance_animation: { type: "fade", duration: 0.5 },
            exit_animation: { type: "fade", duration: 0.5 },
            transition: { type: "none", duration: 0 },
            camera_motion: { type: "static" },
            audio_cues: [],
          },
        ],
        global_style: { palette: ["#000"], typography: "Inter", theme: "dark", motion_pacing: "fast" },
        audio_direction: { music_mood: "upbeat", tempo: "120", genre: "pop", sound_effects_enabled: true },
        export_settings: { format: "mp4", resolution: "1080p", fps: 30, quality: "high" },
      },
    });

    const result = await agent.execute({
      prompt: "Generate a video",
      initialProject: initial,
    });

    assert.equal(result.success, false);
    assert.equal(result.preservedPreviousState, true);
    assert.equal(result.error?.stage, "validating");
  });

  // ===========================================================================
  // 8. INVALID TOOL REQUEST
  // ===========================================================================
  it("Scenario 8: invalid tool request — rejects unauthorized or forbidden tool without modifying project", async () => {
    const initial = createSampleProject();

    const result = await agent.execute({
      prompt: "Execute dangerous shell tool",
      initialProject: initial,
      toolRequests: [
        {
          tool: "delete_scene", // requires confirmation
          arguments: { sceneId: initial.scenes[0].id },
        },
      ],
      userConfirmed: false, // NOT confirmed
    });

    assert.equal(result.success, false);
    assert.equal(result.preservedPreviousState, true);
    assert.equal(result.finalProject.scenes.length, initial.scenes.length);
  });

  // ===========================================================================
  // 9. SUCCESSFUL TOOL EXECUTION
  // ===========================================================================
  it("Scenario 9: successful tool execution — executes approved tool in tandem with pipeline", async () => {
    const initial = createSampleProject();

    const result = await agent.execute({
      prompt: "Create a 5-second bumper and inspect project info",
      initialProject: initial,
      toolRequests: [
        {
          tool: "get_project_info",
          arguments: { projectId: initial.id },
        },
      ],
    });

    assert.equal(result.success, true);
    assert.equal(result.executedTools.length, 1);
    assert.equal(result.executedTools[0].tool, "get_project_info");
    assert.equal(result.executedTools[0].success, true);
  });

  // ===========================================================================
  // 10. MOCK MODE
  // ===========================================================================
  it("Scenario 10: mock mode — operates deterministically offline without API key", async () => {
    const result = await agent.execute({
      prompt: "Create an offline motion animation",
      providerId: "mock",
    });

    assert.equal(result.success, true);
    assert.ok(result.brief);
    assert.ok(result.motionPlan);
    assert.ok(result.finalProject);
  });

  // ===========================================================================
  // 11. REAL MODEL PATH WHERE SAFE
  // ===========================================================================
  it("Scenario 11: real model path — verifies OpenRouter configuration with NVIDIA Nemotron 3 Ultra", () => {
    const openRouterProvider = new OpenRouterProvider({
      apiKey: "sk-or-v1-test-check-only",
      model: "nvidia/nemotron-3-ultra-550b-a55b:free",
    });

    assert.equal(openRouterProvider.id, "openrouter");
    assert.equal(openRouterProvider.defaultModel, "nvidia/nemotron-3-ultra-550b-a55b:free");
    assert.equal(openRouterProvider.isConfigured(), true);
  });

  // ===========================================================================
  // 12. EXISTING PROJECT PRESERVATION
  // ===========================================================================
  it("Scenario 12: existing project preservation — guarantees intact project preservation on failure", async () => {
    const customProject: Project = createProject({
      id: "proj_custom_keep_me",
      name: "Critical Client Project",
      width: 1080,
      height: 1920,
      fps: 60,
      duration: 12,
      scenes: [
        createScene({ id: "scene_keep_1", name: "Keep Me 1", duration: 6 }),
        createScene({ id: "scene_keep_2", name: "Keep Me 2", duration: 6 }),
      ],
    });

    // Force failure during pipeline by requesting empty prompt
    const result = await agent.execute({
      prompt: "",
      initialProject: customProject,
    });

    assert.equal(result.success, false);
    assert.equal(result.preservedPreviousState, true);
    assert.equal(result.finalProject.id, "proj_custom_keep_me");
    assert.equal(result.finalProject.name, "Critical Client Project");
    assert.equal(result.finalProject.scenes.length, 2);
    assert.equal(result.finalProject.scenes[0].id, "scene_keep_1");
    assert.equal(result.finalProject.scenes[1].id, "scene_keep_2");
    assert.equal(result.finalProject.fps, 60);
  });

  // ===========================================================================
  // 13. REST API ROUTE INTEGRATION (/api/ai/agent)
  // ===========================================================================
  describe("13. REST API Route Integration (/api/ai/agent)", () => {
    it("handles GET /api/ai/agent with service status and progress states", async () => {
      const { GET } = await import("../app/api/ai/agent/route");
      const res = await GET();
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.service, "motionbot-agent");
      assert.equal(json.status, "ready");
      assert.ok(Array.isArray(json.supportedProgressStates));
      assert.ok(json.supportedProgressStates.includes("understanding_request"));
      assert.ok(json.supportedProgressStates.includes("completed"));
    });

    it("handles POST /api/ai/agent and returns 400 when prompt is missing", async () => {
      const { NextRequest } = await import("next/server");
      const { POST } = await import("../app/api/ai/agent/route");

      const req = new NextRequest("http://localhost:3000/api/ai/agent", {
        method: "POST",
        body: JSON.stringify({ prompt: "" }),
      });

      const res = await POST(req);
      assert.equal(res.status, 400);

      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, "INVALID_CONFIG");
    });

    it("handles POST /api/ai/agent to run end-to-end request successfully", async () => {
      const { NextRequest } = await import("next/server");
      const { POST } = await import("../app/api/ai/agent/route");

      const req = new NextRequest("http://localhost:3000/api/ai/agent", {
        method: "POST",
        body: JSON.stringify({
          prompt: "Create an energetic 5-second teaser",
          provider: "mock",
        }),
      });

      const res = await POST(req);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.brief);
      assert.ok(json.motionPlan);
      assert.ok(json.finalProject);
      assert.ok(Array.isArray(json.progressSteps));
    });
  });
});
