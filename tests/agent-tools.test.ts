/**
 * MOTION-BOT — Agent Tool & Action Layer Test Suite
 * Phase 7.5: Agent Tool / Action Layer
 *
 * Verifies Central Tool Registry, Tool Validator, Permission Layer,
 * Read/Write operation separation, confirmation enforcement for destructive actions,
 * security boundaries, secret sanitization, and API route integration.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ToolRegistry,
  createToolRegistry,
  getToolRegistry,
  ToolExecutor,
  getToolExecutor,
  PermissionLayer,
  getPermissionLayer,
  ToolService,
  createToolService,
  getToolService,
  validateToolRequest,
  ToolDefinition,
  ALL_SAFE_MOTION_TOOLS,
} from "../ai";
import { NextRequest } from "next/server";
import { GET, POST } from "../app/api/ai/tools/route";

describe("MotionBot Agent Tool / Action Layer — Phase 7.5", () => {
  // ---------------------------------------------------------------------------
  // 1. CENTRAL TOOL REGISTRY
  // ---------------------------------------------------------------------------
  describe("1. Central Tool Registry", () => {
    it("registers and lists all safe MotionBot tools", () => {
      const registry = createToolRegistry();
      for (const tool of ALL_SAFE_MOTION_TOOLS) {
        registry.register(tool);
      }

      assert.ok(registry.list().length >= 8);
      assert.ok(registry.has("get_project_info"));
      assert.ok(registry.has("get_scene_info"));
      assert.ok(registry.has("get_motion_plan"));
      assert.ok(registry.has("validate_motion_plan"));
      assert.ok(registry.has("list_assets"));
      assert.ok(registry.has("search_assets"));
      assert.ok(registry.has("create_scene"));
      assert.ok(registry.has("update_scene"));
      assert.ok(registry.has("delete_scene"));
    });

    it("rejects duplicate tool registration with clear error", () => {
      const registry = createToolRegistry();
      const mockTool: ToolDefinition = {
        name: "test_duplicate",
        description: "Test",
        parameters: { type: "object", properties: {} },
        classification: "read",
        permissionLevel: "read",
        requiresConfirmation: false,
        execute: async () => ({}),
      };

      registry.register(mockTool);
      assert.throws(
        () => registry.register(mockTool),
        /already registered/
      );
    });

    it("generates valid OpenRouter / Nemotron tool specifications", () => {
      const registry = createToolRegistry();
      registry.register(ALL_SAFE_MOTION_TOOLS[0]); // get_project_info

      const openRouterSpecs = registry.getOpenRouterTools();
      assert.equal(openRouterSpecs.length, 1);
      assert.equal(openRouterSpecs[0].type, "function");
      assert.equal(openRouterSpecs[0].function.name, "get_project_info");
      assert.ok(openRouterSpecs[0].function.parameters.type === "object");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. TOOL REQUEST VALIDATION
  // ---------------------------------------------------------------------------
  describe("2. Tool Request Validation", () => {
    it("validates a well-formed tool request", () => {
      const registry = getToolRegistry();
      const req = {
        tool: "get_project_info",
        arguments: {},
      };

      const result = validateToolRequest(req, registry);
      assert.equal(result.valid, true);
      assert.ok(result.tool);
      assert.equal(result.tool?.name, "get_project_info");
    });

    it("rejects unknown tool requests with UNKNOWN_TOOL error", () => {
      const registry = getToolRegistry();
      const req = {
        tool: "non_existent_unregistered_tool",
        arguments: {},
      };

      const result = validateToolRequest(req, registry);
      assert.equal(result.valid, false);
      assert.equal(result.error?.code, "UNKNOWN_TOOL");
    });

    it("rejects malformed arguments (non-object or array)", () => {
      const registry = getToolRegistry();
      const req = {
        tool: "get_project_info",
        arguments: "malformed_string_args",
      };

      const result = validateToolRequest(req, registry);
      assert.equal(result.valid, false);
      assert.equal(result.error?.code, "MALFORMED_ARGUMENTS");
    });

    it("rejects requests missing required arguments", () => {
      const registry = getToolRegistry();
      const req = {
        tool: "get_scene_info",
        arguments: {}, // Missing sceneId
      };

      const result = validateToolRequest(req, registry);
      assert.equal(result.valid, false);
      assert.equal(result.error?.code, "VALIDATION_ERROR");
      assert.ok(result.error?.message.includes("sceneId"));
    });

    it("rejects invalid argument types (e.g. number for string parameter)", () => {
      const registry = getToolRegistry();
      const req = {
        tool: "get_scene_info",
        arguments: { sceneId: 12345 }, // Expected string
      };

      const result = validateToolRequest(req, registry);
      assert.equal(result.valid, false);
      assert.equal(result.error?.code, "INVALID_ARGUMENTS");
    });

    it("rejects invalid enum values for constrained properties", () => {
      const registry = getToolRegistry();
      const req = {
        tool: "list_assets",
        arguments: { type: "unsupported_media_type" },
      };

      const result = validateToolRequest(req, registry);
      assert.equal(result.valid, false);
      assert.equal(result.error?.code, "INVALID_ARGUMENTS");
      assert.ok(result.error?.message.includes("Allowed"));
    });

    it("rejects prototype pollution and dangerous parameter keys", () => {
      const registry = getToolRegistry();
      const req = {
        tool: "get_project_info",
        arguments: {
          __proto__: { polluted: true },
        },
      };

      const result = validateToolRequest(req, registry);
      assert.equal(result.valid, false);
      assert.equal(result.error?.code, "SECURITY_VIOLATION");
    });

    it("rejects command injection attempts inside string arguments", () => {
      const registry = getToolRegistry();
      const req = {
        tool: "search_assets",
        arguments: {
          query: "test; rm -rf / ;",
        },
      };

      const result = validateToolRequest(req, registry);
      assert.equal(result.valid, false);
      assert.equal(result.error?.code, "SECURITY_VIOLATION");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. PERMISSION LAYER & DESTRUCTIVE ACTION CONFIRMATION
  // ---------------------------------------------------------------------------
  describe("3. Permission Layer & Confirmation Checks", () => {
    it("allows READ operations automatically", async () => {
      const service = getToolService();
      const result = await service.executeTool({
        tool: "get_project_info",
        arguments: {},
      });

      assert.equal(result.success, true);
      assert.equal(result.tool, "get_project_info");
      assert.ok(result.data);
    });

    it("blocks WRITE operations when context is read-only", async () => {
      const service = getToolService();
      const result = await service.executeTool(
        {
          tool: "create_scene",
          arguments: { name: "Unauthorized Scene", duration: 4 },
        },
        { readOnly: true }
      );

      assert.equal(result.success, false);
      assert.equal(result.error?.code, "PERMISSION_DENIED");
      assert.ok(result.error?.message.includes("read-only"));
    });

    it("rejects destructive actions (delete_scene) when user confirmation is missing", async () => {
      const service = getToolService();
      const result = await service.executeTool(
        {
          tool: "delete_scene",
          arguments: { sceneId: "scene_1" },
        },
        { userConfirmed: false }
      );

      assert.equal(result.success, false);
      assert.equal(result.error?.code, "CONFIRMATION_REQUIRED");
      assert.ok(result.error?.message.includes("explicit user confirmation"));
    });

    it("approves destructive actions (delete_scene) when explicit user confirmation is provided", async () => {
      const service = getToolService();
      // First create a temporary scene to delete
      const createRes = await service.executeTool({
        tool: "create_scene",
        arguments: { name: "Scene to Delete", duration: 3 },
      });
      assert.equal(createRes.success, true);
      const sceneId = (createRes.data as { scene: { id: string } }).scene.id;

      // Delete with userConfirmed: true
      const deleteRes = await service.executeTool(
        {
          tool: "delete_scene",
          arguments: { sceneId },
        },
        { userConfirmed: true }
      );

      assert.equal(deleteRes.success, true);
      assert.ok(deleteRes.data);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. SAFE MOTIONBOT TOOLS EXECUTION
  // ---------------------------------------------------------------------------
  describe("4. Concrete Safe Motion Tools Execution", () => {
    it("get_project_info returns project canvas and timeline metadata", async () => {
      const service = getToolService();
      const result = await service.executeByName("get_project_info");

      assert.equal(result.success, true);
      const data = result.data as Record<string, unknown>;
      assert.ok(data.id);
      assert.ok(data.width);
      assert.ok(data.height);
      assert.ok(data.duration);
      assert.ok(Array.isArray(data.scenes));
    });

    it("list_assets filters assets by type", async () => {
      const service = getToolService();
      const result = await service.executeByName("list_assets", { type: "logo" });

      assert.equal(result.success, true);
      const data = result.data as { total: number; assets: { type: string }[] };
      assert.ok(data.assets.every((a) => a.type === "logo"));
    });

    it("search_assets finds assets matching keyword query", async () => {
      const service = getToolService();
      const result = await service.executeByName("search_assets", { query: "sneaker" });

      assert.equal(result.success, true);
      const data = result.data as { matchCount: number; matches: { name: string }[] };
      assert.ok(data.matchCount >= 1);
      assert.ok(data.matches[0].name.toLowerCase().includes("sneaker"));
    });

    it("validate_motion_plan returns comprehensive schema & temporal validation report", async () => {
      const service = getToolService();
      const validCandidatePlan = {
        canvas: { width: 1080, height: 1920, aspect_ratio: "9:16", fps: 30 },
        duration: 5,
        scenes: [
          {
            scene_id: "sc_1",
            start_time: 0,
            end_time: 5,
            duration: 5,
            purpose: "hook",
            background: { type: "solid", value: "#000000" },
            visual_elements: [],
            text_elements: [],
            entrance_animation: { type: "fade", duration: 0.4 },
            exit_animation: { type: "fade", duration: 0.4 },
            transition: { type: "none", duration: 0 },
            camera_motion: { type: "static" },
            audio_cues: [],
          },
        ],
      };

      const result = await service.executeByName("validate_motion_plan", {
        motionPlan: validCandidatePlan,
      });

      assert.equal(result.success, true);
      const data = result.data as { valid: boolean; errorCount: number };
      assert.equal(data.valid, true);
      assert.equal(data.errorCount, 0);
    });

    it("update_scene updates scene properties", async () => {
      const service = getToolService();
      // First get existing scenes
      const projInfo = await service.executeByName("get_project_info");
      const firstScene = (projInfo.data as { scenes: { id: string }[] }).scenes[0];

      const result = await service.executeByName("update_scene", {
        sceneId: firstScene.id,
        name: "Renamed Title Scene",
        duration: 4,
      });

      assert.equal(result.success, true);
      const data = result.data as { scene: { name: string; duration: number } };
      assert.equal(data.scene.name, "Renamed Title Scene");
      assert.equal(data.scene.duration, 4);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. SECURITY BOUNDARIES & SECRET PROTECTION
  // ---------------------------------------------------------------------------
  describe("5. Security Boundaries & Secret Protection", () => {
    it("strictly prohibits registering or invoking shell or command execution tools", () => {
      const permissionLayer = getPermissionLayer();
      const dangerousNames = ["exec", "shell", "run_command", "eval", "system_bash", "read_file"];

      for (const name of dangerousNames) {
        assert.throws(
          () => permissionLayer.assertSecurityBoundary(name),
          /Security violation/
        );
      }
    });

    it("sanitizes potential credentials or secret tokens from tool outputs", async () => {
      const registry = createToolRegistry();
      const mockLeakyTool: ToolDefinition = {
        name: "leaky_output_test_tool",
        description: "Test tool simulating sensitive internal field",
        parameters: { type: "object", properties: {} },
        classification: "read",
        permissionLevel: "read",
        requiresConfirmation: false,
        execute: async () => ({
          projectName: "Sample",
          apiKey: "sk-or-real-openrouter-key-123456789",
          secretToken: "Bearer test-auth-token-xyz",
        }),
      };

      registry.register(mockLeakyTool);
      const executor = new ToolExecutor(registry);

      const result = await executor.execute({
        tool: "leaky_output_test_tool",
        arguments: {},
      });

      assert.equal(result.success, true);
      const data = result.data as Record<string, unknown>;
      assert.equal(data.projectName, "Sample");
      assert.equal(data.apiKey, "[REDACTED]");
      assert.equal(data.secretToken, "[REDACTED]");
    });

    it("catches runtime exceptions and returns structured EXECUTION_ERROR without crashing", async () => {
      const registry = createToolRegistry();
      const brokenTool: ToolDefinition = {
        name: "broken_tool",
        description: "Throws an unhandled runtime error",
        parameters: { type: "object", properties: {} },
        classification: "read",
        permissionLevel: "read",
        requiresConfirmation: false,
        execute: async () => {
          throw new Error("Simulated database failure with key=secret_key_12345");
        },
      };

      registry.register(brokenTool);
      const executor = new ToolExecutor(registry);

      const result = await executor.execute({
        tool: "broken_tool",
        arguments: {},
      });

      assert.equal(result.success, false);
      assert.equal(result.error?.code, "EXECUTION_ERROR");
      assert.ok(result.error?.message.includes("Simulated database failure"));
      // Assert secret was sanitized
      assert.ok(!result.error?.message.includes("secret_key_12345"));
    });
  });

  // ---------------------------------------------------------------------------
  // 6. API ROUTE INTEGRATION (/api/ai/tools)
  // ---------------------------------------------------------------------------
  describe("6. API Route Integration (/api/ai/tools)", () => {
    it("handles GET requests listing available tools and schemas", async () => {
      const res = await GET();
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.service, "motionbot-agent-tools");
      assert.ok(json.count >= 8);
      assert.ok(Array.isArray(json.tools));
    });

    it("rejects POST request missing 'tool' with HTTP 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/ai/tools", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, "UNKNOWN_TOOL");
    });

    it("executes valid tool over POST and returns structured result", async () => {
      const req = new NextRequest("http://localhost:3000/api/ai/tools", {
        method: "POST",
        body: JSON.stringify({
          tool: "get_project_info",
          arguments: {},
        }),
      });

      const res = await POST(req);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.tool, "get_project_info");
      assert.ok(json.data);
    });

    it("returns HTTP 403 when unconfirmed destructive action is submitted over POST", async () => {
      const req = new NextRequest("http://localhost:3000/api/ai/tools", {
        method: "POST",
        body: JSON.stringify({
          tool: "delete_scene",
          arguments: { sceneId: "scene_1" },
          userConfirmed: false,
        }),
      });

      const res = await POST(req);
      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, "CONFIRMATION_REQUIRED");
    });
  });
});
