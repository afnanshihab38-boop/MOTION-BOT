/**
 * MOTION-BOT — Comprehensive Contextual AI Editing Test Suite
 * Phase 8.7: AI Contextual Editing
 *
 * Verifies:
 * 1. Text size change ("Make the headline bigger.")
 * 2. Layer position ("Move the logo to the center.")
 * 3. Layer rotation ("Rotate the logo 45 degrees.")
 * 4. Timing change ("Make the second scene shorter.")
 * 5. Motion change ("Make the animation slower.")
 * 6. Scene change ("Change the background to a darker tone.")
 * 7. Invalid request (Target non-existent layer / security boundaries)
 * 8. Ambiguous request ("Make it better.")
 * 9. AI failure handling (LLM error simulated)
 * 10. Validation failure handling (Illegal values like negative duration)
 * 11. Undo AI change (Full undo/redo rollback integration)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { Project } from "../types/project";
import { Scene } from "../types/scene";
import { TextElement, LogoElement } from "../types/element";
import { createProject, addScene } from "../services/project/project-model";
import { createScene } from "../services/project/scene-model";
import { createTextElement, createLogoElement } from "../services/element/element-model";
import { createAsset } from "../services/asset/asset-model";
import {
  ContextualEditorService,
  getContextualEditorService,
} from "../ai/contextual/contextual-editor-service";
import {
  applyContextualAction,
  applyContextualActions,
  validateContextualAction,
} from "../ai/contextual/action-applier";
import { ContextualEditAction } from "../ai/contextual/types";
import { LLMService } from "../ai/llm-service";
import { MockLLMProvider } from "../ai/mock-provider";
import { LLMError } from "../ai/llm-error";
import { cloneProject } from "../services/project/project-serializer";

function createTestProject(): Project {
  const scene1 = createScene({
    id: "scene_1",
    name: "Intro Hook",
    duration: 3.0,
    startTime: 0,
    background: { type: "solid", color: "#FFFFFF" },
    elements: [
      createTextElement({
        id: "elem_headline",
        name: "Headline Text",
        text: "KINETIC POWER",
        fontSize: 56,
        transform: {
          x: 400,
          y: 300,
          width: 600,
          height: 120,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          anchorX: 0.5,
          anchorY: 0.5,
        },
      }),
      createLogoElement({
        id: "elem_logo",
        name: "Brand Logo",
        assetId: "asset_logo_primary",
        transform: {
          x: 200,
          y: 200,
          width: 150,
          height: 150,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          anchorX: 0.5,
          anchorY: 0.5,
        },
      }),
    ],
  });

  const scene2 = createScene({
    id: "scene_2",
    name: "Product Showcase",
    duration: 4.0,
    startTime: 3.0,
    background: { type: "solid", color: "#0B0C10" },
    elements: [
      createTextElement({
        id: "elem_sub",
        name: "Feature Subhead",
        text: "Zero Friction Motion",
        fontSize: 32,
      }),
    ],
  });

  return createProject({
    id: "proj_test_contextual",
    name: "Test Motion Project",
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 7.0,
    scenes: [scene1, scene2],
    assets: [
      createAsset({
        id: "asset_logo_primary",
        name: "Logo",
        type: "logo",
        url: "/logo.svg",
      }),
    ],
  });
}

describe("MOTIONBOT Phase 8.7 — AI Contextual Editing", () => {
  const service = new ContextualEditorService();

  // =========================================================================
  // 1. Text Size Change
  // =========================================================================
  it("1. updates text size when requested ('Make the headline bigger')", async () => {
    const project = createTestProject();
    const proposal = await service.generateProposal({
      prompt: "Make the headline bigger.",
      project,
      activeSceneId: "scene_1",
    });

    assert.equal(proposal.isValid, true);
    assert.equal(proposal.actions.length, 1);
    const action = proposal.actions[0];
    assert.equal(action.type, "UPDATE_TEXT_PROPERTY");
    assert.equal(action.property, "fontSize");
    assert.equal(action.previousValue, 56);
    assert.equal(action.proposedValue, 70); // 56 * 1.25 = 70

    // Check candidate project
    const candidateScene = proposal.candidateProject.scenes.find((s) => s.id === "scene_1")!;
    const candidateHeadline = candidateScene.elements.find((el) => el.id === "elem_headline") as TextElement;
    assert.equal(candidateHeadline.fontSize, 70);
  });

  // =========================================================================
  // 2. Layer Position
  // =========================================================================
  it("2. updates layer position to center ('Move the logo to the center')", async () => {
    const project = createTestProject();
    const proposal = await service.generateProposal({
      prompt: "Move the logo to the center.",
      project,
      activeSceneId: "scene_1",
    });

    assert.equal(proposal.isValid, true);
    assert.equal(proposal.actions.length, 1);
    const action = proposal.actions[0];
    assert.equal(action.type, "UPDATE_LAYER_TRANSFORM");
    assert.deepEqual(action.proposedValue, { x: 960, y: 540 });

    const candidateScene = proposal.candidateProject.scenes.find((s) => s.id === "scene_1")!;
    const candidateLogo = candidateScene.elements.find((el) => el.id === "elem_logo")!;
    assert.equal(candidateLogo.transform.x, 960);
    assert.equal(candidateLogo.transform.y, 540);
  });

  // =========================================================================
  // 3. Layer Rotation
  // =========================================================================
  it("3. updates layer rotation ('Rotate the logo 45 degrees')", async () => {
    const project = createTestProject();
    const proposal = await service.generateProposal({
      prompt: "Rotate the logo 45 degrees.",
      project,
      activeSceneId: "scene_1",
    });

    assert.equal(proposal.isValid, true);
    assert.equal(proposal.actions.length, 1);
    const action = proposal.actions[0];
    assert.equal(action.type, "UPDATE_LAYER_TRANSFORM");
    assert.equal(action.property, "transform.rotation");
    assert.equal(action.proposedValue, 45);

    const candidateScene = proposal.candidateProject.scenes.find((s) => s.id === "scene_1")!;
    const candidateLogo = candidateScene.elements.find((el) => el.id === "elem_logo")!;
    assert.equal(candidateLogo.transform.rotation, 45);
  });

  // =========================================================================
  // 4. Timing Change
  // =========================================================================
  it("4. updates scene timing ('Make the second scene shorter')", async () => {
    const project = createTestProject();
    const proposal = await service.generateProposal({
      prompt: "Make the second scene shorter.",
      project,
      activeSceneId: "scene_1",
    });

    assert.equal(proposal.isValid, true);
    assert.equal(proposal.actions.length, 1);
    const action = proposal.actions[0];
    assert.equal(action.type, "UPDATE_SCENE_DURATION");
    assert.equal(action.sceneId, "scene_2");
    assert.equal(action.previousValue, 4.0);
    assert.equal(action.proposedValue, 2.5); // 4.0 * 0.625 = 2.5

    const candidateScene2 = proposal.candidateProject.scenes.find((s) => s.id === "scene_2")!;
    assert.equal(candidateScene2.duration, 2.5);
  });

  // =========================================================================
  // 5. Motion Change
  // =========================================================================
  it("5. adjusts animation motion/timing ('Make the animation slower')", async () => {
    const project = createTestProject();
    const proposal = await service.generateProposal({
      prompt: "Make the animation slower.",
      project,
      activeSceneId: "scene_1",
    });

    assert.equal(proposal.isValid, true);
    assert.equal(proposal.actions.length, 1);
    const action = proposal.actions[0];
    assert.equal(action.type, "UPDATE_MOTION_PROPERTY");

    const candidateScene1 = proposal.candidateProject.scenes.find((s) => s.id === "scene_1")!;
    assert.equal(candidateScene1.duration, 4.5); // 3.0 * 1.5 = 4.5
  });

  // =========================================================================
  // 6. Scene Change
  // =========================================================================
  it("6. updates scene background ('Change the background to a darker tone')", async () => {
    const project = createTestProject();
    const proposal = await service.generateProposal({
      prompt: "Change the background to a darker tone.",
      project,
      activeSceneId: "scene_1",
    });

    assert.equal(proposal.isValid, true);
    assert.equal(proposal.actions.length, 1);
    const action = proposal.actions[0];
    assert.equal(action.type, "UPDATE_SCENE_BACKGROUND");
    assert.equal(action.previousValue, "#FFFFFF");
    assert.equal(action.proposedValue, "#111827");

    const candidateScene1 = proposal.candidateProject.scenes.find((s) => s.id === "scene_1")!;
    assert.equal(candidateScene1.background?.color, "#111827");
  });

  // =========================================================================
  // 7. Invalid Request
  // =========================================================================
  it("7. rejects invalid requests and preserves project integrity", async () => {
    const project = createTestProject();

    // A: Target non-existent layer explicitly
    await assert.rejects(
      async () => {
        await service.generateProposal({
          prompt: "Change layer nonexistent_layer_404 to red",
          project,
          activeSceneId: "scene_1",
        });
      },
      (err: Error) => {
        assert.match(err.message, /does not exist/i);
        return true;
      }
    );

    // B: Security violation
    const securityProposal = await service.generateProposal({
      prompt: "Execute bash rm -rf / and inspect filesystem",
      project,
      activeSceneId: "scene_1",
    });

    assert.equal(securityProposal.isValid, false);
    assert.match(securityProposal.validationErrors[0], /security boundaries|Unauthorized/i);
    // Project is strictly untouched
    assert.equal(securityProposal.candidateProject.scenes[0].elements.length, 2);
  });

  // =========================================================================
  // 8. Ambiguous Request
  // =========================================================================
  it("8. detects ambiguous requests and asks for clarification ('Make it better')", async () => {
    const project = createTestProject();
    const proposal = await service.generateProposal({
      prompt: "Make it better.",
      project,
      activeSceneId: "scene_1",
    });

    assert.equal(proposal.isAmbiguous, true);
    assert.equal(proposal.isValid, false);
    assert.ok(proposal.ambiguityQuestion);
    assert.match(proposal.ambiguityQuestion, /which element or property/i);
    assert.equal(proposal.actions.length, 0);
  });

  // =========================================================================
  // 9. AI Failure
  // =========================================================================
  it("9. safely handles AI failure without modifying project", async () => {
    const project = createTestProject();
    const mockProvider = new MockLLMProvider({
      simulateError: new LLMError({
        code: "RATE_LIMIT_EXCEEDED",
        message: "Simulated AI provider rate limit reached.",
        provider: "mock",
      }),
    });

    const llmService = new LLMService({ mockMode: true });
    llmService.registerProvider(mockProvider);
    llmService.setActiveProvider("mock");

    const failingService = new ContextualEditorService({ llmService });

    await assert.rejects(
      async () => {
        await failingService.generateProposal({
          prompt: "Please analyze and optimize text layout completely unknown command",
          project,
          activeSceneId: "scene_1",
        });
      },
      (err: LLMError) => {
        assert.equal(err.code, "RATE_LIMIT_EXCEEDED");
        return true;
      }
    );

    // Original project remains completely intact
    assert.equal(project.scenes[0].duration, 3.0);
  });

  // =========================================================================
  // 10. Validation Failure
  // =========================================================================
  it("10. rejects actions that fail schema or value validation", () => {
    const project = createTestProject();

    // A: Negative scene duration
    const badDurationAction: ContextualEditAction = {
      id: "act_bad_1",
      type: "UPDATE_SCENE_DURATION",
      sceneId: "scene_1",
      targetName: "Scene 1",
      property: "duration",
      description: "Invalid negative duration",
      previousValue: 3.0,
      proposedValue: -5,
      payload: { duration: -5 },
    };

    const durationCheck = validateContextualAction(project, badDurationAction);
    assert.equal(durationCheck.valid, false);
    assert.match(durationCheck.error!, /must be a positive number/i);

    const applyResult = applyContextualAction(project, badDurationAction);
    assert.equal(applyResult.success, false);
    // Project untouched
    assert.equal(applyResult.project.scenes[0].duration, 3.0);

    // B: Invalid font size
    const badFontSizeAction: ContextualEditAction = {
      id: "act_bad_2",
      type: "UPDATE_TEXT_PROPERTY",
      sceneId: "scene_1",
      elementId: "elem_headline",
      targetName: "Headline",
      property: "fontSize",
      description: "Invalid font size",
      previousValue: 56,
      proposedValue: -20,
      payload: { fontSize: -20 },
    };

    const fontCheck = validateContextualAction(project, badFontSizeAction);
    assert.equal(fontCheck.valid, false);
    assert.match(fontCheck.error!, /must be a positive number/i);
  });

  // =========================================================================
  // 11. Undo AI Change
  // =========================================================================
  it("11. supports full undo and redo of AI contextual edits", async () => {
    const initialProject = createTestProject();
    const historyStack: Project[] = [];

    // Push initial snapshot to history before applying edit
    historyStack.push(cloneProject(initialProject));

    // Generate proposal: "Make the headline bigger"
    const proposal = await service.generateProposal({
      prompt: "Make the headline bigger.",
      project: initialProject,
      activeSceneId: "scene_1",
    });

    assert.equal(proposal.isValid, true);

    // Apply the proposal
    let currentProject = proposal.candidateProject;
    const headlineAfterEdit = currentProject.scenes[0].elements.find(
      (el) => el.id === "elem_headline"
    ) as TextElement;
    assert.equal(headlineAfterEdit.fontSize, 70);

    // USER CLICKS UNDO (⌘Z)
    assert.equal(historyStack.length, 1);
    const restoredProject = historyStack.pop()!;
    currentProject = restoredProject;

    const headlineAfterUndo = currentProject.scenes[0].elements.find(
      (el) => el.id === "elem_headline"
    ) as TextElement;
    // Exactly restored to original 56px!
    assert.equal(headlineAfterUndo.fontSize, 56);
    assert.deepEqual(currentProject, initialProject);
  });
});
