/**
 * MOTION-BOT — Context Manager & Project-Scoped Memory Test Suite
 * Phase 7.6: Context Manager + Project-Scoped Memory
 *
 * Comprehensive validation across context construction, strict tenant memory
 * isolation, relevance scoring, conflict resolution, secret scrubbing,
 * oversized budget protection, and REST API route handling.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  ProjectMemoryService,
  InMemoryProjectMemoryStore,
  getProjectMemoryService,
  rankMemories,
  scoreMemory,
  resolveMemoryConflicts,
  extractKeywords,
} from "../ai/memory";
import {
  ContextManager,
  scrubSecrets,
  scrubObject,
  getContextManager,
} from "../ai/context";
import { SAMPLE_DEV_PROJECT } from "../services/project/sample-project";
import { GET as memoryGetHandler, POST as memoryPostHandler, PATCH as memoryPatchHandler, DELETE as memoryDeleteHandler } from "../app/api/ai/memory/route";
import { POST as contextPostHandler } from "../app/api/ai/context/route";
import { NextRequest } from "next/server";

describe("MotionBot Context Manager & Project Memory — Phase 7.6", () => {
  let memoryStore: InMemoryProjectMemoryStore;
  let memoryService: ProjectMemoryService;
  let contextManager: ContextManager;

  const PROJECT_A = "proj_alpha_101";
  const PROJECT_B = "proj_beta_202";

  beforeEach(() => {
    memoryStore = new InMemoryProjectMemoryStore();
    memoryService = new ProjectMemoryService(memoryStore);
    contextManager = new ContextManager(memoryService);
  });

  // ===========================================================================
  // 1. PROJECT-SCOPED MEMORY CRUD OPERATIONS
  // ===========================================================================
  describe("1. Project-Scoped Memory CRUD", () => {
    it("creates and retrieves a memory record with valid metadata", async () => {
      const memory = await memoryService.createMemory({
        projectId: PROJECT_A,
        content: "Brand uses vivid electric purple (#7928CA) and cyan (#00DFD8).",
        category: "brand",
        tags: ["colors", "palette", "electric"],
        priority: "high",
        pinned: true,
      });

      assert.ok(memory.id.startsWith("mem_"));
      assert.equal(memory.projectId, PROJECT_A);
      assert.equal(memory.category, "brand");
      assert.equal(memory.priority, "high");
      assert.equal(memory.pinned, true);
      assert.deepEqual(memory.tags, ["colors", "palette", "electric"]);

      const fetched = await memoryService.getMemory(memory.id, PROJECT_A);
      assert.ok(fetched);
      assert.equal(fetched.id, memory.id);
      assert.equal(fetched.content, memory.content);
    });

    it("updates existing memory content and metadata", async () => {
      const created = await memoryService.createMemory({
        projectId: PROJECT_A,
        content: "Default animation easing is ease-in-out.",
        category: "animation_style",
        priority: "medium",
      });

      const updated = await memoryService.updateMemory(created.id, PROJECT_A, {
        content: "Animation style updated to spring-bounce with 0.8 damping.",
        priority: "high",
        pinned: true,
      });

      assert.equal(updated.id, created.id);
      assert.equal(updated.content, "Animation style updated to spring-bounce with 0.8 damping.");
      assert.equal(updated.priority, "high");
      assert.equal(updated.pinned, true);
      assert.ok(new Date(updated.updatedAt).getTime() >= new Date(created.createdAt).getTime());
    });

    it("deletes a memory record cleanly", async () => {
      const created = await memoryService.createMemory({
        projectId: PROJECT_A,
        content: "Temporary placeholder note.",
        category: "general",
      });

      const deleted = await memoryService.deleteMemory(created.id, PROJECT_A);
      assert.equal(deleted, true);

      const fetched = await memoryService.getMemory(created.id, PROJECT_A);
      assert.equal(fetched, null);
    });

    it("rejects empty memory content and missing projectId", async () => {
      await assert.rejects(
        () => memoryService.createMemory({ projectId: "", content: "Valid content" }),
        /projectId.*required/i
      );

      await assert.rejects(
        () => memoryService.createMemory({ projectId: PROJECT_A, content: "   " }),
        /content.*not be empty/i
      );
    });
  });

  // ===========================================================================
  // 2. PROJECT ISOLATION (SECURITY BOUNDARY)
  // ===========================================================================
  describe("2. Project Isolation & Zero Cross-Contamination", () => {
    it("CRITICAL: Project A memory is completely invisible to Project B", async () => {
      // 1. Create sensitive memory in Project A
      const secretProjectAMemory = await memoryService.createMemory({
        projectId: PROJECT_A,
        content: "Project A confidential slogan: 'Beyond the Impossible'",
        category: "creative_decision",
        tags: ["slogan", "confidential"],
        priority: "critical",
        pinned: true,
      });

      // 2. Create ordinary memory in Project B
      await memoryService.createMemory({
        projectId: PROJECT_B,
        content: "Project B uses standard Helvetica typography.",
        category: "typography",
      });

      // 3. Attempt direct lookup of Project A memory using Project B's scope
      const directLeakAttempt = await memoryService.getMemory(secretProjectAMemory.id, PROJECT_B);
      assert.equal(directLeakAttempt, null, "Project B must never read Project A memory directly");

      // 4. Query Project B memories
      const projectBMemories = await memoryService.listMemories(PROJECT_B);
      assert.equal(projectBMemories.length, 1);
      assert.equal(projectBMemories[0].content, "Project B uses standard Helvetica typography.");

      // 5. Query relevant memories for Project B asking about 'slogan' or 'impossible'
      const searchB = await memoryService.getRelevantMemories(PROJECT_B, "Give me the confidential slogan beyond impossible");
      assert.equal(searchB.length, 0, "No Project A memory may appear in Project B relevant search");

      // 6. Build Context for Project B asking about Project A content
      const contextB = await contextManager.buildContext({
        projectId: PROJECT_B,
        userRequest: "What is our confidential slogan?",
      });

      assert.ok(!contextB.userPrompt.includes("Beyond the Impossible"), "Context B must not leak Project A memory");
      assert.equal(contextB.metadata.memoriesIncludedCount, 0);
    });

    it("handles multiple projects concurrently without interference", async () => {
      await Promise.all([
        memoryService.createMemory({ projectId: "proj_1", content: "Color Red", category: "brand" }),
        memoryService.createMemory({ projectId: "proj_2", content: "Color Green", category: "brand" }),
        memoryService.createMemory({ projectId: "proj_3", content: "Color Blue", category: "brand" }),
      ]);

      const [m1, m2, m3] = await Promise.all([
        memoryService.listMemories("proj_1"),
        memoryService.listMemories("proj_2"),
        memoryService.listMemories("proj_3"),
      ]);

      assert.equal(m1.length, 1);
      assert.equal(m1[0].content, "Color Red");

      assert.equal(m2.length, 1);
      assert.equal(m2[0].content, "Color Green");

      assert.equal(m3.length, 1);
      assert.equal(m3[0].content, "Color Blue");
    });
  });

  // ===========================================================================
  // 3. RELEVANCE SCORING & EXCLUSION
  // ===========================================================================
  describe("3. Relevance Scoring & Filtering", () => {
    it("selects relevant memories and excludes unrelated memories", async () => {
      await memoryService.createMemory({
        projectId: PROJECT_A,
        content: "Primary typography must be Outfit Bold for headlines.",
        category: "typography",
        tags: ["typography", "font", "outfit"],
      });

      await memoryService.createMemory({
        projectId: PROJECT_A,
        content: "Social media target is strictly TikTok 9:16 vertical video.",
        category: "requirement",
        tags: ["tiktok", "social", "vertical"],
      });

      await memoryService.createMemory({
        projectId: PROJECT_A,
        content: "Brand uses energetic neon green accent (#39FF14).",
        category: "brand",
        tags: ["brand", "color", "accent"],
      });

      // Query specifically asking about fonts/text
      const textRelevant = await memoryService.getRelevantMemories(
        PROJECT_A,
        "Change the headline typography and font weight"
      );

      assert.ok(textRelevant.length >= 1);
      assert.equal(textRelevant[0].category, "typography");
      assert.ok(textRelevant[0].content.includes("Outfit Bold"));

      // Unrelated memories should not dominate the result
      const excludedColors = textRelevant.some((m) => m.content.includes("neon green"));
      assert.equal(excludedColors, false);
    });

    it("pinned memories are prioritized and always included if enabled", async () => {
      await memoryService.createMemory({
        projectId: PROJECT_A,
        content: "Always include company logo watermark on the bottom right.",
        category: "constraint",
        pinned: true,
      });

      await memoryService.createMemory({
        projectId: PROJECT_A,
        content: "Random low priority note.",
        category: "general",
        priority: "low",
      });

      const results = await memoryService.getRelevantMemories(PROJECT_A, "Create a sports shoe animation");
      assert.ok(results.length >= 1);
      assert.equal(results[0].pinned, true);
      assert.ok(results[0].content.includes("watermark"));
    });
  });

  // ===========================================================================
  // 4. CONFLICT RESOLUTION
  // ===========================================================================
  describe("4. Conflict Resolution & Precedence", () => {
    it("resolves contradictory memories deterministically favoring newer/higher priority", () => {
      const oldMemory = {
        id: "mem_1",
        projectId: PROJECT_A,
        content: "Brand primary color is navy blue (#000080).",
        category: "brand" as const,
        tags: ["color"],
        priority: "medium" as const,
        pinned: false,
        source: "user" as const,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };

      const newMemory = {
        id: "mem_2",
        projectId: PROJECT_A,
        content: "Brand primary color is vibrant neon orange (#FF5722).",
        category: "brand" as const,
        tags: ["color"],
        priority: "high" as const,
        pinned: true,
        source: "user" as const,
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z",
      };

      const resolved = resolveMemoryConflicts([oldMemory, newMemory]);
      assert.equal(resolved.length, 1);
      assert.equal(resolved[0].id, "mem_2", "Newer/higher priority memory must supersede older conflict");
      assert.ok(resolved[0].content.includes("neon orange"));
    });
  });

  // ===========================================================================
  // 5. SECRET FILTERING & DEFENSIVE REDACTION
  // ===========================================================================
  describe("5. Secret Filtering & Defensive Redaction", () => {
    it("redacts OpenRouter API keys from raw prompt strings", () => {
      const rawPrompt = "Generate motion for key sk-or-v1-abcdef0123456789abcdef0123456789abcdef0123456789 and save.";
      const scrubbed = scrubSecrets(rawPrompt);

      assert.equal(scrubbed.redactedCount, 1);
      assert.ok(!scrubbed.result.includes("sk-or-v1-"));
      assert.ok(scrubbed.result.includes("[REDACTED_SECRET]"));
    });

    it("redacts Bearer tokens and generic API keys from objects", () => {
      const leakyObject = {
        tool: "fetch_data",
        headers: {
          Authorization: "Bearer ya29.a0AfH6SMD_sensitive_bearer_token_string",
          apiKey: "sk-test123456789012345678901234",
        },
        payload: {
          secret: "superSecretPassword123",
          description: "Safe public text",
        },
      };

      const scrubbed = scrubObject(leakyObject);
      assert.ok(scrubbed.redactedCount >= 2);
      assert.equal(scrubbed.result.headers.Authorization, "[REDACTED_SECRET]");
      assert.equal(scrubbed.result.headers.apiKey, "[REDACTED_SECRET]");
      assert.equal(scrubbed.result.payload.secret, "[REDACTED_SECRET]");
      assert.equal(scrubbed.result.payload.description, "Safe public text");
    });

    it("scrubs active environment OPENROUTER_API_KEY from context prompts", async () => {
      // Simulate presence of API key in environment
      const originalKey = process.env.OPENROUTER_API_KEY;
      const testSecretKey = "sk-or-v1-dummy-mock-secret-key-for-test-validation-999";
      process.env.OPENROUTER_API_KEY = testSecretKey;

      try {
        const constructed = await contextManager.buildContext({
          projectId: PROJECT_A,
          userRequest: `Please connect using ${testSecretKey} for rendering.`,
        });

        assert.ok(!constructed.userPrompt.includes(testSecretKey));
        assert.ok(constructed.userPrompt.includes("[REDACTED_SECRET]"));
        assert.ok(constructed.metadata.sanitizedSecretCount >= 1);
      } finally {
        process.env.OPENROUTER_API_KEY = originalKey;
      }
    });
  });

  // ===========================================================================
  // 6. CONTEXT CONSTRUCTION & PRIORITY ORDERING
  // ===========================================================================
  describe("6. Context Manager Construction & Budget Management", () => {
    it("constructs context adhering strictly to the 7-layer priority architecture", async () => {
      await memoryService.createMemory({
        projectId: PROJECT_A,
        content: "Use dark glassmorphic styling.",
        category: "visual_style",
        pinned: true,
      });

      const constructed = await contextManager.buildContext({
        projectId: PROJECT_A,
        userRequest: "Create a 5-second sneaker teaser for Instagram.",
        currentProject: SAMPLE_DEV_PROJECT,
        currentTask: "Synthesize introductory hook scene",
        currentScene: SAMPLE_DEV_PROJECT.scenes[0],
        toolResults: [
          { tool: "get_project_info", result: { width: 1920, height: 1080 } },
        ],
      });

      // Layer 1: System & Security
      assert.ok(constructed.systemPrompt.includes("SYSTEM INSTRUCTIONS"));
      assert.ok(constructed.systemPrompt.includes("SECURITY & SAFETY BOUNDARIES"));

      // User prompt layers in exact sequence:
      const p = constructed.userPrompt;
      const projectIdx = p.indexOf("### CURRENT PROJECT CONTEXT");
      const taskIdx = p.indexOf("### ACTIVE TASK");
      const motionPlanIdx = p.indexOf("### MOTION PLAN & SCENE STATE");
      const memoryIdx = p.indexOf("### PROJECT MEMORY & PREFERENCES");
      const toolIdx = p.indexOf("### RECENT TOOL RESULTS");
      const userReqIdx = p.indexOf("### USER REQUEST");

      assert.ok(projectIdx !== -1, "Layer 2 (Project Context) must be present");
      assert.ok(taskIdx !== -1, "Layer 3 (Active Task) must be present");
      assert.ok(motionPlanIdx !== -1, "Layer 4 (Motion Plan / Scene) must be present");
      assert.ok(memoryIdx !== -1, "Layer 5 (Relevant Memory) must be present");
      assert.ok(toolIdx !== -1, "Layer 6 (Tool Results) must be present");
      assert.ok(userReqIdx !== -1, "Layer 7 (User Request) must be present");

      // Verify sequence order
      assert.ok(projectIdx < taskIdx, "Project must precede Task");
      assert.ok(taskIdx < motionPlanIdx, "Task must precede Motion Plan/Scene");
      assert.ok(motionPlanIdx < memoryIdx, "Motion Plan/Scene must precede Memory");
      assert.ok(memoryIdx < toolIdx, "Memory must precede Tool Results");
      assert.ok(toolIdx < userReqIdx, "Tool Results must precede User Request");

      assert.equal(constructed.metadata.projectId, PROJECT_A);
      assert.equal(constructed.metadata.memoriesIncludedCount, 1);
    });

    it("truncates tool results and lower priority items when budget is constrained", async () => {
      const massiveToolOutput = {
        data: Array.from({ length: 200 }, (_, i) => ({ id: `item_${i}`, description: `Detailed description for asset ${i}` })),
      };

      const constructed = await contextManager.buildContext({
        projectId: PROJECT_A,
        userRequest: "Render composition",
        toolResults: [
          { tool: "list_assets", result: massiveToolOutput },
        ],
        budget: {
          maxCharacters: 1200,
          maxToolResultChars: 300,
        },
      });

      assert.ok(constructed.metadata.truncatedLayers.includes("tool_results"));
      assert.ok(constructed.metadata.totalCharacters <= 1600);
      // User request MUST never be dropped
      assert.ok(constructed.userPrompt.includes("### USER REQUEST\nRender composition"));
    });

    it("provides safe debugging inspection without leaking secrets", async () => {
      const inspection = await contextManager.inspectContext({
        projectId: PROJECT_A,
        userRequest: "Analyze motion parameters with key sk-test-99999999999999999999",
      });

      assert.equal(inspection.projectId, PROJECT_A);
      assert.ok(inspection.characterCount > 0);
      assert.ok(inspection.estimatedTokens > 0);
      assert.ok(inspection.layers.length >= 2);
      assert.ok(!JSON.stringify(inspection).includes("sk-test-99999999999999999999"));
      assert.ok(JSON.stringify(inspection).includes("[REDACTED_SECRET]"));
    });
  });

  // ===========================================================================
  // 7. REST API ROUTES (/api/ai/memory and /api/ai/context)
  // ===========================================================================
  describe("7. API Route Handlers", () => {
    it("handles POST /api/ai/memory to create a new project memory", async () => {
      const req = new NextRequest("http://localhost:3000/api/ai/memory", {
        method: "POST",
        body: JSON.stringify({
          projectId: PROJECT_A,
          content: "Always use uppercase headings for CTA buttons.",
          category: "typography",
          tags: ["cta", "uppercase"],
          priority: "high",
        }),
      });

      const res = await memoryPostHandler(req);
      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.memory.projectId, PROJECT_A);
      assert.equal(json.memory.category, "typography");
    });

    it("handles GET /api/ai/memory to list memories for a project", async () => {
      await getProjectMemoryService().createMemory({
        projectId: "api_test_project",
        content: "API test memory note.",
      });

      const req = new NextRequest("http://localhost:3000/api/ai/memory?projectId=api_test_project");
      const res = await memoryGetHandler(req);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.count, 1);
      assert.equal(json.memories[0].projectId, "api_test_project");
    });

    it("handles POST /api/ai/context to construct context payload", async () => {
      const req = new NextRequest("http://localhost:3000/api/ai/context", {
        method: "POST",
        body: JSON.stringify({
          projectId: PROJECT_A,
          userRequest: "Create a modern 10s teaser.",
          currentTask: "Context API Test",
        }),
      });

      const res = await contextPostHandler(req);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.context.systemPrompt);
      assert.ok(json.context.userPrompt);
      assert.equal(json.context.metadata.projectId, PROJECT_A);
    });

    it("handles PATCH and DELETE /api/ai/memory route handlers", async () => {
      const created = await getProjectMemoryService().createMemory({
        projectId: "crud_api_proj",
        content: "Initial note",
      });

      // PATCH
      const patchReq = new NextRequest("http://localhost:3000/api/ai/memory", {
        method: "PATCH",
        body: JSON.stringify({
          id: created.id,
          projectId: "crud_api_proj",
          content: "Updated note via PATCH",
        }),
      });
      const patchRes = await memoryPatchHandler(patchReq);
      assert.equal(patchRes.status, 200);
      const patchJson = await patchRes.json();
      assert.equal(patchJson.memory.content, "Updated note via PATCH");

      // DELETE
      const deleteReq = new NextRequest(`http://localhost:3000/api/ai/memory?projectId=crud_api_proj&id=${created.id}`, {
        method: "DELETE",
      });
      const deleteRes = await memoryDeleteHandler(deleteReq);
      assert.equal(deleteRes.status, 200);

      // Verify deletion
      const checkReq = new NextRequest("http://localhost:3000/api/ai/memory?projectId=crud_api_proj");
      const checkRes = await memoryGetHandler(checkReq);
      const checkJson = await checkRes.json();
      assert.equal(checkJson.count, 0);
    });
  });
});
