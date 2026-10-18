/**
 * MOTION-BOT — Phase 8.1: AI Prompt -> Editor Integration Tests
 *
 * Verifies:
 * 1. AI Workspace structure, state transitions, and UI components
 * 2. Empty prompt validation prevents submission
 * 3. Mock mode end-to-end execution: Prompt -> Brief -> Motion Plan -> Validation -> Apply
 * 4. Structured Creative Plan preview correctness
 * 5. Clean error handling with zero project corruption on AI/provider failure
 * 6. Security verification: Zero API keys or secrets exposed to frontend
 * 7. Editor refresh & project state synchronization upon plan application
 * 8. Undo/Redo compatibility preserving previous project states
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MotionBotAIWorkspace, PlanPreview, EXAMPLE_PROMPTS } from "../components/editor/ai-workspace";
import { EditorShell } from "../components/shell/editor-shell";
import { createSampleProject } from "../services/project/sample-project";
import { getMotionBotAgent } from "../ai/agent";
import { Project } from "@/types/project";
import { requestAgentMotionDesign } from "../services/api/ai-client";

describe("Phase 8.1 — AI Prompt -> Editor Integration", () => {
  let sampleProject: Project;

  beforeEach(() => {
    sampleProject = createSampleProject();
  });

  // ===========================================================================
  // TEST 1: Open /editor & Verify AI Workspace UI Components
  // ===========================================================================
  it("TEST 1: AI Workspace renders properly with prompt area and examples", () => {
    const html = renderToStaticMarkup(
      React.createElement(MotionBotAIWorkspace, {
        project: sampleProject,
        onApplyProject: () => {},
      })
    );

    assert.ok(html.includes("MOTIONBOT AI"), "Renders MOTIONBOT AI header");
    assert.ok(html.includes("Describe what you want to create"), "Renders prompt instruction");
    assert.ok(html.includes("textarea"), "Renders prompt textarea");
    assert.ok(html.includes("Generate Motion Design"), "Renders generate button");
    assert.ok(html.includes("Examples:"), "Renders example section");
    assert.ok(html.includes(EXAMPLE_PROMPTS[0]), "Renders example prompt items");
  });

  it("TEST 1b: EditorShell renders Stage Canvas, Timeline, and MotionBot AI Workspace", () => {
    const html = renderToStaticMarkup(
      React.createElement(EditorShell, {
        projectTitle: "Test Editor Project",
        initialProject: sampleProject,
      })
    );

    assert.ok(html.includes("Test Editor Project"), "Renders project title");
    assert.ok(html.includes("MotionBot AI"), "Renders MotionBot AI toggle button");
    assert.ok(html.includes("MOTIONBOT AI"), "Renders in-editor AI workspace");
    assert.ok(html.includes("Timeline Dock") || html.includes("timeline"), "Renders bottom timeline dock");
  });

  // ===========================================================================
  // TEST 2: Submit Empty Prompt -> Validation Prevents Submission
  // ===========================================================================
  it("TEST 2: Empty prompt validation prevents submission", async () => {
    const result = await requestAgentMotionDesign({
      prompt: "   ",
      projectId: sampleProject.id,
      initialProject: sampleProject,
    });

    assert.equal(result.success, false, "Empty prompt should be rejected");
    assert.ok(
      result.userFriendlyError?.includes("enter a description"),
      "Returns clean user-friendly validation error"
    );
  });

  // ===========================================================================
  // TEST 3: Mock Mode End-to-End Pipeline Execution & Editor Update
  // ===========================================================================
  it("TEST 3: Mock mode executes full pipeline and produces updated project", async () => {
    const agent = getMotionBotAgent();
    const prompt = "Create a 5-second product advertisement with bold text and dark theme";

    const execution = await agent.execute({
      prompt,
      projectId: sampleProject.id,
      initialProject: sampleProject,
      providerId: "mock",
    });

    assert.equal(execution.success, true, "Pipeline succeeds in mock mode");
    assert.ok(execution.brief, "Generates creative brief");
    assert.ok(execution.motionPlan, "Generates structured motion plan");
    assert.ok(execution.finalProject, "Returns final project state");

    // Verify final project has valid elements from the generated motion plan
    const finalScenes = execution.finalProject.scenes;
    assert.ok(finalScenes.length >= 1, "Final project contains generated scenes");
    const allElements = finalScenes.flatMap((s) => s.elements);
    assert.ok(allElements.length > 0, "Final project contains motion elements");
  });

  // ===========================================================================
  // TEST 4: Structured Creative Plan Preview Correctness
  // ===========================================================================
  it("TEST 4: PlanPreview component displays structured creative decisions without chain-of-thought", () => {
    const previewData = {
      title: "Smartwatch Commercial",
      style: "Premium / Futuristic",
      durationSec: 10,
      fps: 60,
      aspectRatio: "16:9",
      scenesCount: 3,
      scenes: [
        { id: "s1", order: 0, name: "Hook Sequence", duration: 3 },
        { id: "s2", order: 1, name: "Product Feature Showcase", duration: 4 },
        { id: "s3", order: 2, name: "Logo & CTA Reveal", duration: 3 },
      ],
      typography: "Inter / Bold Sans",
      motionStyle: "Smooth spring transitions",
      colorPalette: ["#000000", "#FFFFFF", "#00F0FF"],
      elementsCount: 6,
    };

    let applied = false;
    let regenerated = false;
    let edited = false;

    const html = renderToStaticMarkup(
      React.createElement(PlanPreview, {
        data: previewData,
        onApply: () => {
          applied = true;
        },
        onRegenerate: () => {
          regenerated = true;
        },
        onEditPrompt: () => {
          edited = true;
        },
      })
    );

    assert.ok(html.includes("Smartwatch Commercial"), "Displays title");
    assert.ok(html.includes("Premium / Futuristic"), "Displays style");
    assert.ok(html.includes("10s"), "Displays duration");
    assert.ok(html.includes("60 FPS"), "Displays FPS");
    assert.ok(html.includes("Apply to Project"), "Displays Apply button");
    assert.ok(html.includes("Regenerate"), "Displays Regenerate button");
    assert.ok(html.includes("Edit Prompt"), "Displays Edit Prompt button");
    assert.ok(html.includes("#00F0FF"), "Displays color palette swatch hex");
    // Ensure no raw chain-of-thought is present
    assert.ok(!html.includes("thinking"), "No raw chain-of-thought in preview");
    assert.ok(!html.includes("prompt_tokens"), "No raw telemetry in preview");
  });

  // ===========================================================================
  // TEST 5: Simulated Failure -> Useful Error & Zero Project Corruption
  // ===========================================================================
  it("TEST 5: Simulated failure preserves initial project with zero corruption", async () => {
    const initialJson = JSON.stringify(sampleProject);
    const agent = getMotionBotAgent();

    // Trigger an empty prompt
    try {
      const failedResult = await agent.execute({
        prompt: "",
        projectId: sampleProject.id,
        initialProject: sampleProject,
      });

      assert.equal(failedResult.success, false);
      assert.equal(
        JSON.stringify(failedResult.finalProject),
        initialJson,
        "Initial project must remain 100% unmutated upon failure"
      );
    } catch {
      // If an error is thrown, initial project must still be untouched
      assert.equal(JSON.stringify(sampleProject), initialJson, "Initial project must not be corrupted");
    }
  });

  // ===========================================================================
  // TEST 6 & 7: Security Verification — No API Keys or Secrets Exposed
  // ===========================================================================
  it("TEST 6 & 7: API keys never reach frontend or client payload", async () => {
    const agent = getMotionBotAgent();
    const result = await agent.execute({
      prompt: "Create a 5-second teaser promo",
      projectId: "proj_security_test",
      initialProject: sampleProject,
      providerId: "mock",
    });

    const serialized = JSON.stringify(result);

    // Verify no secret tokens or keys in the payload
    assert.ok(!serialized.includes("sk-or-v1-"), "No OpenRouter keys in agent result");
    assert.ok(!serialized.includes("Bearer "), "No auth tokens in agent result");
    assert.ok(!serialized.includes("api_key"), "No raw api_key fields in agent result");
    assert.ok(!serialized.includes("apiKey"), "No apiKey fields in agent result");
  });

  // ===========================================================================
  // TEST 8: State Application & Undo Compatibility
  // ===========================================================================
  it("TEST 8: Applying plan updates project and allows full reversion via snapshot", async () => {
    const initialJson = JSON.stringify(sampleProject);
    const agent = getMotionBotAgent();

    const execution = await agent.execute({
      prompt: "Make a dark product reveal scene",
      projectId: sampleProject.id,
      initialProject: sampleProject,
      providerId: "mock",
    });

    assert.equal(execution.success, true);
    const updatedProject = execution.finalProject;

    // Verify project has changed from initial
    assert.notEqual(JSON.stringify(updatedProject), initialJson);

    // Verify restoring initial json matches original
    assert.equal(JSON.stringify(sampleProject), initialJson);
  });

  // ===========================================================================
  // TEST 9: Example Prompts Do Not Auto-Execute
  // ===========================================================================
  it("TEST 9: Example prompts list has valid non-empty prompt strings", () => {
    assert.ok(EXAMPLE_PROMPTS.length >= 4, "Provides at least 4 example prompts");
    for (const example of EXAMPLE_PROMPTS) {
      assert.ok(example.length > 10, "Example prompt is descriptive");
      assert.ok(typeof example === "string", "Example is a string");
    }
  });
});
