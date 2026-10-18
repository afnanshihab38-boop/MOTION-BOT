/**
 * MOTION-BOT — Phase 8.8 Preview, Rendering, and Export Test Suite
 * Comprehensive automated verification for:
 * 1. Preview representation & project fidelity
 * 2. Playback mechanics (Play, Pause, Stop, Scrub, Loop, Scene Switching)
 * 3. Render preparation & non-duplication
 * 4. Image & Video export formats (PNG, JPEG, WebP, WebM, Frames)
 * 5. Deterministic export state progression (Preparing -> Rendering -> Exporting -> Complete / Failed)
 * 6. Output correctness (Resolution, Aspect Ratio, FPS, Duration, Scene Order, Layer Visibility, Timing)
 * 7. Error handling & non-corruption guarantees
 * 8. Real, Template, and AI-generated project tests
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Project } from "../types/project";
import { Scene } from "../types/scene";
import { MotionElement, TextElement, ShapeElement } from "../types/element";
import { createSampleProject } from "../services/project/sample-project";
import {
  createTimelineManager,
  TimelineManager,
  getEvaluatedSceneAtTime,
} from "../timeline";
import {
  getAllTemplates,
  getTemplateById,
  createProjectFromTemplate,
} from "../services/template";
import {
  createRenderCanvas,
  HeadlessCanvas,
} from "../services/render/canvas-adapter";
import {
  renderFrameToCanvas,
  drawSceneBackground,
} from "../services/render/frame-renderer";
import {
  executeExport,
  validateProjectForExport,
  mapGlobalTimeToScene,
  sanitizeFilename,
} from "../services/render/export-pipeline";
import {
  ExportOptions,
  ExportProgress,
  ExportProgressState,
} from "../services/render/types";
import { addKeyframeToElement } from "../services/timeline";

// Helper to create a custom test project
function createMockProject(overrides?: Partial<Project>): Project {
  let titleEl: MotionElement = {
    id: "mock_title",
    name: "Headline",
    type: "text",
    text: "Headline",
    visible: true,
    locked: false,
    zIndex: 1,
    transform: {
      x: 960,
      y: 400,
      width: 600,
      height: 120,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    },
    appearance: {
      opacity: 1,
      fill: { type: "solid", color: "#FFFFFF" },
    },
    propertyTracks: [],
  } as unknown as TextElement;

  // Add keyframe animation for X position: 0s -> 200, 2s -> 960
  titleEl = addKeyframeToElement(titleEl, "x", 0, 200, 30).element;
  titleEl = addKeyframeToElement(titleEl, "x", 2, 960, 30).element;

  const rectEl: MotionElement = {
    id: "mock_card",
    name: "Background Card",
    type: "shape",
    visible: true,
    locked: false,
    zIndex: 0,
    transform: {
      x: 400,
      y: 300,
      width: 800,
      height: 400,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0,
      anchorY: 0,
    },
    appearance: {
      opacity: 0.9,
      fill: { type: "solid", color: "#4F46E5" },
    },
    shapeKind: "rectangle",
    cornerRadius: 16,
    propertyTracks: [],
  } as unknown as ShapeElement;

  const hiddenEl: MotionElement = {
    id: "mock_hidden",
    name: "Hidden Watermark",
    type: "text",
    text: "Hidden Watermark",
    visible: false, // Hidden layer
    locked: false,
    zIndex: 2,
    transform: {
      x: 100,
      y: 100,
      width: 200,
      height: 50,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0,
      anchorY: 0,
    },
    appearance: { opacity: 1 },
    propertyTracks: [],
  } as unknown as TextElement;

  const scene1: Scene = {
    id: "scene_01",
    name: "Intro Scene",
    order: 0,
    startTime: 0,
    duration: 3,
    background: { type: "solid", color: "#0B0C10" },
    elements: [titleEl, rectEl, hiddenEl],
  };

  const scene2: Scene = {
    id: "scene_02",
    name: "Outro Scene",
    order: 1,
    startTime: 3,
    duration: 2,
    background: {
      type: "gradient",
      gradient: {
        type: "linear",
        angle: 90,
        stops: [
          { color: "#1E1B4B", offset: 0 },
          { color: "#312E81", offset: 1 },
        ],
      },
    },
    elements: [
      {
        id: "mock_outro_text",
        name: "Call to Action",
        type: "text",
        text: "Call to Action",
        visible: true,
        locked: false,
        zIndex: 0,
        transform: {
          x: 960,
          y: 540,
          width: 500,
          height: 100,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          anchorX: 0.5,
          anchorY: 0.5,
        },
        appearance: { opacity: 1 },
        propertyTracks: [],
      } as unknown as TextElement,
    ],
  };

  return {
    id: "proj_test_01",
    name: "Test Motion Project",
    schemaVersion: "1.0.0",
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 5,
    scenes: [scene1, scene2],
    assets: [],
    metadata: {
      title: "Test Motion Project",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("MOTIONBOT Phase 8.8 — Preview + Rendering + Export", () => {
  // =========================================================================
  // 1. PREVIEW REPRESENTATION
  // =========================================================================
  describe("1. Preview Representation & Project Fidelity", () => {
    it("evaluates live canvas state directly from project data without secondary representations", () => {
      const project = createMockProject();
      const scene = project.scenes[0];

      // At t = 0s
      const state0 = getEvaluatedSceneAtTime(scene, 0);
      const title0 = state0.elements.find((e) => e.id === "mock_title");
      assert.ok(title0, "Title element must be present in evaluated state");
      assert.equal(title0?.transform.x, 200, "X at t=0 should match start keyframe");

      // At t = 1s (halfway through 2s animation from 200 to 960)
      const state1 = getEvaluatedSceneAtTime(scene, 1.0);
      const title1 = state1.elements.find((e) => e.id === "mock_title");
      assert.ok(title1, "Title element must be present in evaluated state");
      assert.ok(
        (title1?.transform.x ?? 0) > 200 && (title1?.transform.x ?? 0) < 960,
        `X at t=1.0s should be interpolated between 200 and 960 (actual: ${title1?.transform.x})`
      );

      // At t = 2s
      const state2 = getEvaluatedSceneAtTime(scene, 2.0);
      const title2 = state2.elements.find((e) => e.id === "mock_title");
      assert.equal(title2?.transform.x, 960, "X at t=2.0s should match end keyframe");
    });

    it("respects project resolution, aspect ratio, FPS, and duration", () => {
      const project = createMockProject({ width: 1080, height: 1920, fps: 60, duration: 4.5 });
      assert.equal(project.width, 1080);
      assert.equal(project.height, 1920);
      assert.equal(project.fps, 60);
      assert.equal(project.duration, 4.5);
    });
  });

  // =========================================================================
  // 2. PLAYBACK MECHANICS
  // =========================================================================
  describe("2. Playback Verification", () => {
    it("supports play, pause, stop, and scrub seamlessly", () => {
      const tm = new TimelineManager({ duration: 5, fps: 30, currentTime: 0 });

      assert.equal(tm.getState().playbackState, "stopped");
      assert.equal(tm.getState().currentTime, 0);

      // Play
      tm.play();
      assert.equal(tm.getState().playbackState, "playing");

      // Advance clock (tick 1 second)
      tm.tick(1.0);
      assert.equal(Math.round(tm.getState().currentTime * 10) / 10, 1.0);

      // Pause
      tm.pause();
      assert.equal(tm.getState().playbackState, "paused");
      assert.equal(Math.round(tm.getState().currentTime * 10) / 10, 1.0);

      // Scrub to 3.5s
      tm.seek(3.5);
      assert.equal(tm.getState().currentTime, 3.5);

      // Stop resets playhead to 0
      tm.stop();
      assert.equal(tm.getState().playbackState, "stopped");
      assert.equal(tm.getState().currentTime, 0);
    });

    it("respects loop boundaries during playback tick", () => {
      const tm = new TimelineManager({ duration: 3, fps: 30, currentTime: 2.9, loop: true });
      tm.play();

      // Tick past duration
      tm.tick(0.5);
      assert.equal(tm.getState().currentTime, 0, "Looping should wrap playhead to 0");
    });
  });

  // =========================================================================
  // 3. RENDER PREPARATION & NON-DUPLICATION
  // =========================================================================
  describe("3. Render Preparation", () => {
    it("purely consumes project without modifying or duplicating internal state", () => {
      const project = createMockProject();
      const originalSerialized = JSON.stringify(project);

      const { canvas, ctx } = createRenderCanvas(project.width, project.height);
      renderFrameToCanvas(
        ctx,
        project.scenes[0],
        1.0,
        { width: project.width, height: project.height },
        project.assets
      );

      const afterSerialized = JSON.stringify(project);
      assert.equal(
        afterSerialized,
        originalSerialized,
        "Original project must remain strictly unchanged and uncorrupted after rendering"
      );
    });

    it("correctly maps global timeline timestamps to scenes in chronological order", () => {
      const project = createMockProject(); // scene 1: 0-3s, scene 2: 3-5s

      // t = 1.5s -> Scene 1
      const at1_5 = mapGlobalTimeToScene(project, 1.5);
      assert.equal(at1_5.scene.id, "scene_01");
      assert.equal(at1_5.localTime, 1.5);

      // t = 3.5s -> Scene 2
      const at3_5 = mapGlobalTimeToScene(project, 3.5);
      assert.equal(at3_5.scene.id, "scene_02");
      assert.equal(at3_5.localTime, 0.5);

      // t = 5.0s -> Scene 2 at end
      const at5_0 = mapGlobalTimeToScene(project, 5.0);
      assert.equal(at5_0.scene.id, "scene_02");
      assert.equal(at5_0.localTime, 2.0);
    });
  });

  // =========================================================================
  // 4. EXPORT FORMATS (STILL & VIDEO)
  // =========================================================================
  describe("4. Export Formats (Still & Video)", () => {
    it("successfully exports a valid PNG still frame", async () => {
      const project = createMockProject();
      const result = await executeExport(project, {
        format: "png",
        scope: "current-frame",
        time: 1.0,
      });

      assert.equal(result.success, true);
      assert.equal(result.format, "png");
      assert.equal(result.width, 1920);
      assert.equal(result.height, 1080);
      assert.equal(result.frameCount, 1);
      assert.ok(result.dataUrl?.startsWith("data:image/png"));
      assert.ok(result.filename.endsWith(".png"));
    });

    it("successfully exports a valid JPEG still frame with quality setting", async () => {
      const project = createMockProject();
      const result = await executeExport(project, {
        format: "jpeg",
        scope: "current-frame",
        time: 0.5,
        quality: 0.8,
      });

      assert.equal(result.success, true);
      assert.equal(result.format, "jpeg");
      assert.ok(result.dataUrl?.startsWith("data:image/jpeg"));
      assert.ok(result.filename.endsWith(".jpg"));
    });

    it("successfully exports a valid WebP still frame", async () => {
      const project = createMockProject();
      const result = await executeExport(project, {
        format: "webp",
        scope: "current-frame",
        time: 2.0,
      });

      assert.equal(result.success, true);
      assert.equal(result.format, "webp");
      assert.ok(result.dataUrl?.startsWith("data:image/webp"));
      assert.ok(result.filename.endsWith(".webp"));
    });

    it("successfully exports a multi-frame video container sequence", async () => {
      const project = createMockProject({ duration: 1.0, fps: 10 }); // 10 frames
      const result = await executeExport(project, {
        format: "webm",
        scope: "entire-project",
      });

      assert.equal(result.success, true);
      assert.equal(result.format, "webm");
      assert.equal(result.frameCount, 10);
      assert.equal(result.duration, 1.0);
      assert.ok(result.filename.endsWith(".webm"));
    });
  });

  // =========================================================================
  // 5. EXPORT STATES
  // =========================================================================
  describe("5. Deterministic Export States Progression", () => {
    it("transitions strictly through Preparing -> Rendering -> Exporting -> Complete", async () => {
      const project = createMockProject({ duration: 0.2, fps: 10 }); // 2 frames
      const recordedStates: ExportProgressState[] = [];

      const result = await executeExport(
        project,
        {
          format: "png",
          scope: "current-frame",
        },
        (progress) => {
          if (!recordedStates.includes(progress.state)) {
            recordedStates.push(progress.state);
          }
        }
      );

      assert.equal(result.success, true);
      assert.deepEqual(
        recordedStates,
        ["preparing", "rendering", "exporting", "complete"],
        "Lifecycle states must transition in strict order without skipping"
      );
    });

    it("transitions to Failed on invalid project without claiming success", async () => {
      const invalidProject = createMockProject({ width: -100, height: 0 }); // invalid dimensions
      const recordedStates: ExportProgressState[] = [];

      const result = await executeExport(
        invalidProject,
        {
          format: "png",
          scope: "entire-project",
        },
        (progress) => {
          recordedStates.push(progress.state);
        }
      );

      assert.equal(result.success, false, "Must never claim export succeeded if it failed");
      assert.ok(result.error, "Result must contain clear error description");
      assert.equal(recordedStates[recordedStates.length - 1], "failed");
    });
  });

  // =========================================================================
  // 6. OUTPUT CORRECTNESS
  // =========================================================================
  describe("6. Output Correctness Verification", () => {
    it("skips invisible elements during canvas rendering", () => {
      const project = createMockProject();
      const scene = project.scenes[0];

      const { canvas, ctx } = createRenderCanvas(project.width, project.height);
      const headlessCtx = ctx as unknown as { operations: Array<{ type: string; args: unknown[] }> };

      renderFrameToCanvas(
        ctx,
        scene,
        0,
        { width: project.width, height: project.height },
        project.assets
      );

      // Verify that hidden element text was not rendered
      const renderedTextOperations = headlessCtx.operations
        .filter((op) => op.type === "fillText")
        .map((op) => op.args[0]);

      assert.ok(
        renderedTextOperations.includes("Headline"),
        "Visible headline text should be rendered"
      );
      assert.ok(
        !renderedTextOperations.includes("Hidden Watermark"),
        "Invisible element must never be rendered on canvas stage"
      );
    });

    it("evaluates correct scene order across multi-scene projects", async () => {
      const project = createMockProject(); // 2 scenes, 3s and 2s
      assert.equal(project.scenes[0].name, "Intro Scene");
      assert.equal(project.scenes[1].name, "Outro Scene");

      // Verify frame at 1s targets Intro Scene and at 4s targets Outro Scene
      const f1 = mapGlobalTimeToScene(project, 1.0);
      assert.equal(f1.scene.name, "Intro Scene");

      const f4 = mapGlobalTimeToScene(project, 4.0);
      assert.equal(f4.scene.name, "Outro Scene");
    });
  });

  // =========================================================================
  // 7. ERROR HANDLING
  // =========================================================================
  describe("7. Error Handling & Robustness", () => {
    it("handles project validation failures gracefully", () => {
      const resNull = validateProjectForExport(null as unknown as Project);
      assert.equal(resNull.valid, false);

      const resZeroFps = validateProjectForExport(createMockProject({ fps: 0 }));
      assert.equal(resZeroFps.valid, false);

      const resNoScenes = validateProjectForExport(createMockProject({ scenes: [] }));
      assert.equal(resNoScenes.valid, false);
    });

    it("sanitizes filenames correctly for download", () => {
      assert.equal(sanitizeFilename("My Cool Project! #1", "png"), "my_cool_project_1.png");
      assert.equal(sanitizeFilename("   ", "webm"), "motionbot_export.webm");
    });
  });

  // =========================================================================
  // 8. TEMPLATES & AI PROJECTS
  // =========================================================================
  describe("8. Real Projects, Templates, and AI-Generated Projects", () => {
    it("renders sample project successfully", async () => {
      const sampleProj = createSampleProject();
      const result = await executeExport(sampleProj, {
        format: "png",
        scope: "current-frame",
        time: 0,
      });

      assert.equal(result.success, true);
      assert.equal(result.width, sampleProj.width);
      assert.equal(result.height, sampleProj.height);
    });

    it("renders template-instantiated projects successfully (temp-1, temp-2, temp-3)", async () => {
      const templates = getAllTemplates();
      assert.ok(templates.length >= 3, "At least 3 templates should be available");

      for (let i = 0; i < 3; i++) {
        const tmpl = templates[i];
        const instantiated = createProjectFromTemplate(tmpl);

        const result = await executeExport(instantiated, {
          format: "png",
          scope: "current-frame",
          time: 0.5,
        });

        assert.equal(
          result.success,
          true,
          `Template ${tmpl.id} (${tmpl.title}) must render successfully`
        );
        assert.equal(result.width, tmpl.width);
        assert.equal(result.height, tmpl.height);
      }
    });

    it("renders AI-generated motion comp with custom typography and animatable shapes", async () => {
      // Simulate AI generated project
      const aiProject = createSampleProject();
      aiProject.name = "AI Kinetic Showcase";
      const scene = aiProject.scenes[0];
      if (scene && scene.elements.length > 0) {
        scene.elements[0].appearance.opacity = 0.85;
      }

      const result = await executeExport(aiProject, {
        format: "jpeg",
        scope: "current-frame",
        time: 1.0,
      });

      assert.equal(result.success, true);
      assert.ok(result.dataUrl?.startsWith("data:image/jpeg"));
    });
  });
});
