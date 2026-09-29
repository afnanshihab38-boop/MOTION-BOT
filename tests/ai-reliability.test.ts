/**
 * MOTION-BOT — AI Output Validation & Reliability Test Suite
 * Phase 7.7: AI Output Validation + Reliability Layer
 *
 * Tests the 4-stage validation pipeline:
 * Parse -> Schema -> Semantic -> Safety & Permissions.
 * Verifies robust parsing, semantic consistency, transient retries,
 * non-retryable error rejection, and atomic state preservation.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  robustParseJson,
  cleanJsonSyntax,
  validateSchema,
  validateSemantics,
  validateSafetyAndPermissions,
  AIReliabilityPipeline,
  isRetryableError,
  calculateBackoffDelay,
  executeWithRetry,
  StateGuardian,
  MOCK_RELIABILITY_SCENARIOS,
} from "../ai/reliability";
import { LLMError } from "../ai/llm-error";
import { SAMPLE_DEV_PROJECT } from "../services/project/sample-project";

describe("MotionBot AI Output Validation & Reliability — Phase 7.7", () => {
  // ===========================================================================
  // 1. ROBUST PARSING & REPAIR
  // ===========================================================================
  describe("1. Robust Parsing & Deterministic Syntax Repair", () => {
    it("parses valid JSON directly without modification", () => {
      const result = robustParseJson(MOCK_RELIABILITY_SCENARIOS.validCreativeBrief);
      assert.equal(result.success, true);
      assert.equal(result.repaired, false);
      assert.equal((result.data as { title: string }).title, "Energetic Sneaker Launch");
      assert.equal(result.issues.length, 0);
    });

    it("extracts and repairs markdown-wrapped JSON with comments and trailing commas", () => {
      const result = robustParseJson(MOCK_RELIABILITY_SCENARIOS.markdownWrappedWithComments);
      assert.equal(result.success, true);
      assert.equal(result.repaired, true);
      const data = result.data as { title: string; style: string };
      assert.equal(data.title, "Minimal Watch Teaser");
      assert.equal(data.style, "clean-luxury");
      assert.ok(result.issues.some((i) => i.code === "REPAIRED_SYNTAX_DEFECTS" || i.code === "EXTRACTED_FROM_WRAPPER"));
    });

    it("rejects truncated unclosed JSON cleanly", () => {
      const result = robustParseJson(MOCK_RELIABILITY_SCENARIOS.malformedJson);
      assert.equal(result.success, false);
      assert.equal(result.data, undefined);
      assert.ok(result.issues.some((i) => i.fatal && (i.code === "TRUNCATED_JSON" || i.code === "MALFORMED_JSON")));
    });

    it("rejects empty or whitespace-only inputs", () => {
      const result = robustParseJson("   \n\t  ");
      assert.equal(result.success, false);
      assert.equal(result.issues[0].code, "EMPTY_INPUT");
      assert.equal(result.issues[0].fatal, true);
    });

    it("rejects plain text lacking JSON structure", () => {
      const result = robustParseJson("Sorry, I cannot create that video because it violates safety guidelines.");
      assert.equal(result.success, false);
      assert.equal(result.issues[0].code, "NO_JSON_FOUND");
    });
  });

  // ===========================================================================
  // 2. SCHEMA VALIDATION
  // ===========================================================================
  describe("2. Schema Validation across AI Domains", () => {
    it("validates well-formed Creative Brief schema", () => {
      const parsed = JSON.parse(MOCK_RELIABILITY_SCENARIOS.validCreativeBrief);
      const result = validateSchema(parsed, "creative_brief");
      assert.equal(result.valid, true);
      assert.ok(result.data);
    });

    it("rejects Creative Brief missing required fields", () => {
      const parsed = JSON.parse(MOCK_RELIABILITY_SCENARIOS.missingRequiredSchemaFields);
      const result = validateSchema(parsed, "creative_brief");
      assert.equal(result.valid, false);
      assert.ok(result.issues.some((i) => i.code === "MISSING_REQUIRED_FIELDS"));
    });

    it("validates Motion Plan schema and rejects missing canvas or duration", () => {
      const invalidPlan = {
        id: "plan_bad",
        version: "1.0.0",
        duration: -5, // Invalid negative duration
      };
      const result = validateSchema(invalidPlan, "motion_plan");
      assert.equal(result.valid, false);
      assert.ok(result.issues.length >= 1);
    });

    it("validates Tool Call schema and rejects unknown tools", () => {
      const result = validateSchema(MOCK_RELIABILITY_SCENARIOS.unknownToolCall, "tool_call");
      assert.equal(result.valid, false);
      assert.ok(result.issues.some((i) => i.code === "UNKNOWN_TOOL"));
    });
  });

  // ===========================================================================
  // 3. SEMANTIC VALIDATION
  // ===========================================================================
  describe("3. Semantic Validation & Temporal Integrity", () => {
    it("catches scene duration arithmetic mismatch (end_time - start_time !== duration)", () => {
      const result = validateSemantics(
        MOCK_RELIABILITY_SCENARIOS.semanticTimingErrorPlan,
        "motion_plan"
      );
      assert.equal(result.valid, false);
      assert.ok(result.issues.some((i) => i.code === "SCENE_TIMING_ARITHMETIC_ERROR"));
    });

    it("catches chronological scene overlapping", () => {
      const overlappingPlan = {
        ...MOCK_RELIABILITY_SCENARIOS.semanticTimingErrorPlan,
        scenes: [
          {
            scene_id: "s1",
            start_time: 0,
            end_time: 4,
            duration: 4,
            visual_elements: [],
          },
          {
            scene_id: "s2",
            start_time: 2, // Starts at 2s before s1 ends at 4s!
            end_time: 6,
            duration: 4,
            visual_elements: [],
          },
        ],
      };

      const result = validateSemantics(overlappingPlan, "motion_plan");
      assert.equal(result.valid, false);
      assert.ok(result.issues.some((i) => i.code === "SCENE_CHRONOLOGY_OVERLAP"));
    });

    it("catches duplicate element IDs across scenes", () => {
      const duplicateElementPlan = {
        ...MOCK_RELIABILITY_SCENARIOS.semanticTimingErrorPlan,
        scenes: [
          {
            scene_id: "s1",
            start_time: 0,
            end_time: 4,
            duration: 4,
            visual_elements: [{ element_id: "duplicate_hero_logo" }],
          },
          {
            scene_id: "s2",
            start_time: 4,
            end_time: 8,
            duration: 4,
            visual_elements: [{ element_id: "duplicate_hero_logo" }], // Duplicate!
          },
        ],
      };

      const result = validateSemantics(duplicateElementPlan, "motion_plan");
      assert.equal(result.valid, false);
      assert.ok(result.issues.some((i) => i.code === "DUPLICATE_ELEMENT_ID"));
    });

    it("catches unlisted animation types outside controlled vocabulary", () => {
      const illegalAnimPlan = {
        ...MOCK_RELIABILITY_SCENARIOS.semanticTimingErrorPlan,
        scenes: [
          {
            scene_id: "s1",
            start_time: 0,
            end_time: 4,
            duration: 4,
            visual_elements: [],
            entrance_animation: { type: "arbitrary_custom_javascript_hack" }, // Not controlled!
          },
        ],
      };

      const result = validateSemantics(illegalAnimPlan, "motion_plan");
      assert.equal(result.valid, false);
      assert.ok(result.issues.some((i) => i.code === "UNSUPPORTED_ANIMATION_TYPE"));
    });
  });

  // ===========================================================================
  // 4. SAFETY & PERMISSION VALIDATION
  // ===========================================================================
  describe("4. Safety, Scoping & Permission Validation", () => {
    it("rejects cross-project tool calls targeting unauthorized projectId", () => {
      const result = validateSafetyAndPermissions(
        MOCK_RELIABILITY_SCENARIOS.crossProjectToolCall,
        "tool_call",
        { projectId: "legitimate_session_project_101" }
      );

      assert.equal(result.valid, false);
      assert.ok(result.issues.some((i) => i.code === "CROSS_PROJECT_TOOL_VIOLATION"));
    });

    it("blocks write tools when session is read-only", () => {
      const writeTool = {
        tool: "create_scene",
        arguments: { name: "New Scene", duration: 5 },
      };

      const result = validateSafetyAndPermissions(writeTool, "tool_call", {
        sessionPermission: "read",
      });

      assert.equal(result.valid, false);
      assert.ok(result.issues.some((i) => i.code === "WRITE_PERMISSION_DENIED"));
    });

    it("blocks destructive tools (delete_scene) when confirmation is not provided", () => {
      const destructiveTool = {
        tool: "delete_scene",
        arguments: { sceneId: "sc_1" },
      };

      const result = validateSafetyAndPermissions(destructiveTool, "tool_call", {
        allowDestructive: false,
      });

      assert.equal(result.valid, false);
      assert.ok(result.issues.some((i) => i.code === "CONFIRMATION_REQUIRED"));
    });

    it("approves destructive tools when confirmation is explicitly granted", () => {
      const destructiveTool = {
        tool: "delete_scene",
        arguments: { sceneId: "sc_1" },
      };

      const result = validateSafetyAndPermissions(destructiveTool, "tool_call", {
        allowDestructive: true,
      });

      assert.equal(result.valid, true);
    });
  });

  // ===========================================================================
  // 5. MASTER RELIABILITY PIPELINE INTEGRATION
  // ===========================================================================
  describe("5. Master AIReliabilityPipeline End-to-End", () => {
    it("validates end-to-end markdown-wrapped creative brief output", async () => {
      const pipelineResult = await AIReliabilityPipeline.validate(
        MOCK_RELIABILITY_SCENARIOS.markdownWrappedWithComments,
        "creative_brief"
      );

      assert.equal(pipelineResult.valid, true);
      assert.equal(pipelineResult.executionAllowed, true);
      assert.ok(pipelineResult.data);
    });

    it("HALTS execution if parsing fails", async () => {
      const pipelineResult = await AIReliabilityPipeline.validate(
        "Corrupted nonsense without JSON",
        "creative_brief"
      );

      assert.equal(pipelineResult.valid, false);
      assert.equal(pipelineResult.executionAllowed, false);
      assert.equal(pipelineResult.stageFailed, "parse");
    });

    it("HALTS execution if semantic validation fails", async () => {
      const pipelineResult = await AIReliabilityPipeline.validate(
        MOCK_RELIABILITY_SCENARIOS.semanticTimingErrorPlan,
        "motion_plan"
      );

      assert.equal(pipelineResult.valid, false);
      assert.equal(pipelineResult.executionAllowed, false);
      assert.equal(pipelineResult.stageFailed, "semantic");
    });
  });

  // ===========================================================================
  // 6. RETRY STRATEGY & TRANSIENT FAILURE HANDLING
  // ===========================================================================
  describe("6. Bounded Retries & Error Classification", () => {
    it("identifies 429 rate limits, 5xx server errors, and network timeouts as retryable", () => {
      const rateLimitErr = new LLMError({ code: "RATE_LIMIT_EXCEEDED", message: "Rate limit", statusCode: 429 });
      const serverErr = new LLMError({ code: "PROVIDER_ERROR", message: "Internal server error", statusCode: 500 });
      const timeoutErr = new LLMError({ code: "TIMEOUT", message: "Request timed out" });
      const networkErr = new Error("fetch failed: ECONNRESET");

      assert.equal(isRetryableError(rateLimitErr), true);
      assert.equal(isRetryableError(serverErr), true);
      assert.equal(isRetryableError(timeoutErr), true);
      assert.equal(isRetryableError(networkErr), true);
    });

    it("strictly rejects 401, 403, and configuration errors as non-retryable", () => {
      const authErr = new LLMError({ code: "AUTHENTICATION_ERROR", message: "Invalid API Key", statusCode: 401 });
      const permErr = new LLMError({ code: "PERMISSION_DENIED", message: "Forbidden", statusCode: 403 });
      const configErr = new LLMError({ code: "INVALID_CONFIG", message: "Model unavailable" });

      assert.equal(isRetryableError(authErr), false);
      assert.equal(isRetryableError(permErr), false);
      assert.equal(isRetryableError(configErr), false);
    });

    it("retries transient failure and succeeds on subsequent attempt", async () => {
      let callCount = 0;
      const result = await executeWithRetry(
        async (attempt) => {
          callCount++;
          if (attempt === 0) {
            throw new LLMError({ code: "RATE_LIMIT_EXCEEDED", message: "Rate limited", statusCode: 429 });
          }
          return "success_after_retry";
        },
        { initialDelayMs: 10, maxRetries: 2 }
      );

      assert.equal(result, "success_after_retry");
      assert.equal(callCount, 2);
    });

    it("stops after reaching maxRetries ceiling without infinite loop", async () => {
      let callCount = 0;
      await assert.rejects(
        () =>
          executeWithRetry(
            async () => {
              callCount++;
              throw new LLMError({ code: "TIMEOUT", message: "Persistent timeout" });
            },
            { initialDelayMs: 10, maxRetries: 2 }
          ),
        /Persistent timeout/
      );

      // Attempt 0 + 2 retries = 3 calls total
      assert.equal(callCount, 3);
    });

    it("fails immediately on non-retryable error without retrying", async () => {
      let callCount = 0;
      await assert.rejects(
        () =>
          executeWithRetry(
            async () => {
              callCount++;
              throw new LLMError({ code: "AUTHENTICATION_ERROR", message: "Unauthorized key", statusCode: 401 });
            },
            { initialDelayMs: 10, maxRetries: 3 }
          ),
        /Unauthorized key/
      );

      assert.equal(callCount, 1, "Non-retryable 401 error must not be retried");
    });
  });

  // ===========================================================================
  // 7. SAFE RECOVERY & ATOMIC STATE PRESERVATION
  // ===========================================================================
  describe("7. Safe Recovery & State Guardian", () => {
    it("preserves original project state and rolls back atomically on failure", async () => {
      const initialProject = SAMPLE_DEV_PROJECT;
      const initialSceneCount = initialProject.scenes.length;

      const recoveryResult = await StateGuardian.executeAtomic(initialProject, async (workingCopy) => {
        // Mutate working copy
        workingCopy.name = "Corrupted Project State";
        workingCopy.scenes = []; // Emptied scenes

        // Report fatal validation error
        return {
          result: null,
          updatedProject: workingCopy,
          issues: [
            {
              stage: "semantic",
              code: "FATAL_CORRUPTION",
              message: "Invalid scene composition",
              severity: "error",
              fatal: true,
            },
          ],
        };
      });

      assert.equal(recoveryResult.success, false);
      assert.equal(recoveryResult.rolledBack, true);
      assert.ok(recoveryResult.preservedState);
      assert.equal(recoveryResult.preservedState.name, initialProject.name);
      assert.equal(recoveryResult.preservedState.scenes.length, initialSceneCount);
    });

    it("commits state changes when operation succeeds without fatal issues", async () => {
      const initialProject = SAMPLE_DEV_PROJECT;

      const recoveryResult = await StateGuardian.executeAtomic(initialProject, async (workingCopy) => {
        workingCopy.name = "Updated Safe Project Title";
        return {
          result: { updated: true },
          updatedProject: workingCopy,
          issues: [],
        };
      });

      assert.equal(recoveryResult.success, true);
      assert.equal(recoveryResult.rolledBack, false);
      assert.equal(recoveryResult.preservedState?.name, "Updated Safe Project Title");
    });
  });
});
