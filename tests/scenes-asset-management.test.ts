/**
 * MOTION-BOT — Phase 8.4: Scenes + Asset Management Comprehensive Test Suite
 *
 * Verifies:
 * 1. Scene CRUD (Create, Select, Rename, Duplicate, Delete, Reorder)
 * 2. Scene timing & sequential alignment
 * 3. Scene switching & state isolation (clearing selection, no stale data)
 * 4. Scene safety constraints (prevent deleting last remaining scene)
 * 5. Project-scoped asset system (Images, SVGs, Logos, Videos)
 * 6. Asset -> Layer instantiation (ImageElement, LogoElement, VideoElement)
 * 7. Asset reuse (multiple layers referencing single asset)
 * 8. Manipulation & keyframing on asset layers
 * 9. Multi-scene timeline and canvas synchronization
 * 10. AI-generated multi-scene and asset plan compatibility
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createProject,
  addScene,
  removeScene,
  updateScene,
  duplicateScene,
  reorderScenes,
  addAsset,
  removeAsset,
  updateAsset,
} from "../services/project/project-model";
import {
  createScene,
  alignScenesSequentially,
  calculateScenesDuration,
} from "../services/project/scene-model";
import {
  createAsset,
  createImageAsset,
  createLogoAsset,
  createVideoAsset,
  resolveAssetForElement,
  isAssetReferenced,
  getReferencedAssets,
} from "../services/asset/asset-model";
import {
  createInitialEditorState,
  getActiveScene,
  selectSceneInEditor,
  addSceneToEditor,
  renameSceneInEditor,
  duplicateSceneInEditor,
  deleteSceneInEditor,
  reorderScenesInEditor,
  addAssetToEditor,
  removeAssetFromEditor,
  addAssetElementToActiveScene,
  updateElementInActiveScene,
} from "../services/editor/editor-state";
import {
  createTextElement,
  createImageElement,
  createLogoElement,
  DEFAULT_TRANSFORM,
} from "../services/element/element-model";
import { addKeyframeToElement } from "../services/timeline";
import { TimelineManager, getEvaluatedSceneAtTime } from "../timeline";
import { Project } from "../types/project";
import { Scene } from "../types/scene";
import { Asset } from "../types/asset";
import { ImageElement, LogoElement, VideoElement } from "../types/element";

describe("Phase 8.4: Scenes + Asset Management", () => {
  // Helper to create a clean base project with 1 scene and 1 asset
  function createTestProject(): Project {
    const logoAsset = createLogoAsset({
      id: "asset_test_logo",
      name: "brand-logo.svg",
      url: "https://assets.motionbot.dev/logo.svg",
      width: 200,
      height: 200,
    });

    const scene1 = createScene({
      id: "scene_1",
      name: "Scene 1 - Intro",
      duration: 3.0,
      elements: [
        createTextElement({
          id: "el_title_1",
          name: "Intro Title",
          text: "Welcome",
        }),
      ],
    });

    return createProject({
      id: "proj_test_8_4",
      name: "Multi-Scene Asset Comp",
      width: 1920,
      height: 1080,
      fps: 30,
      scenes: [scene1],
      assets: [logoAsset],
    });
  }

  // =========================================================================
  // 1. SCENE CREATION & SEQUENTIAL TIMING
  // =========================================================================
  describe("1. Scene Creation & Sequential Timing", () => {
    it("creates and appends a scene, automatically calculating sequential timing", () => {
      let state = createInitialEditorState(createTestProject());
      assert.equal(state.project.scenes.length, 1);
      assert.equal(state.project.scenes[0].startTime, 0);
      assert.equal(state.project.scenes[0].duration, 3.0);

      // Add Scene 2
      state = addSceneToEditor(state, {
        name: "Scene 2 - Product",
        duration: 4.0,
      });

      assert.equal(state.project.scenes.length, 2);
      const scene2 = state.project.scenes[1];
      assert.equal(scene2.name, "Scene 2 - Product");
      assert.equal(scene2.startTime, 3.0); // Starts right after scene 1
      assert.equal(scene2.duration, 4.0);
      assert.equal(state.activeSceneId, scene2.id); // Automatically selected
      assert.equal(state.project.duration, 7.0); // 3.0 + 4.0
    });

    it("each scene maintains its own independent layer list and properties", () => {
      let state = createInitialEditorState(createTestProject());
      state = addSceneToEditor(state, { name: "Scene 2", duration: 5.0 });

      const scene1 = state.project.scenes[0];
      const scene2 = state.project.scenes[1];

      assert.equal(scene1.elements.length, 1);
      assert.equal(scene2.elements.length, 0);

      // Adding element to Scene 2 does not affect Scene 1
      state = addAssetElementToActiveScene(state, "asset_test_logo");
      const activeScene = getActiveScene(state);
      assert.equal(activeScene?.id, scene2.id);
      assert.equal(activeScene?.elements.length, 1);

      // Verify scene 1 elements remain untouched
      const refreshedScene1 = state.project.scenes[0];
      assert.equal(refreshedScene1.elements.length, 1);
      assert.equal(refreshedScene1.elements[0].id, "el_title_1");
    });
  });

  // =========================================================================
  // 2. SCENE SELECTION & ISOLATION (ZERO STALE DATA)
  // =========================================================================
  describe("2. Scene Switching & State Isolation", () => {
    it("switching scenes clears element selection and prevents stale references", () => {
      let state = createInitialEditorState(createTestProject());
      state = addSceneToEditor(state, { name: "Scene 2", duration: 4.0 });

      // Add element to Scene 2 and select it
      state = addAssetElementToActiveScene(state, "asset_test_logo");
      assert.equal(state.selectedElementIds.length, 1);
      const scene2ElementId = state.selectedElementIds[0];

      // Switch back to Scene 1
      state = selectSceneInEditor(state, "scene_1");
      assert.equal(state.activeSceneId, "scene_1");
      // Element from Scene 2 must NOT remain selected in Scene 1
      assert.equal(state.selectedElementIds.length, 0);
      assert.equal(state.hoveredElementId, null);

      const activeScene = getActiveScene(state);
      assert.equal(activeScene?.id, "scene_1");
      assert.ok(!activeScene?.elements.some((el) => el.id === scene2ElementId));
    });

    it("switching scenes synchronizes the timeline duration accurately", () => {
      const proj = createTestProject();
      const manager = new TimelineManager({ duration: 3.0, fps: 30 });
      let state = createInitialEditorState(proj);

      state = addSceneToEditor(state, { name: "Scene 2", duration: 6.5 });
      const scene2 = getActiveScene(state)!;

      manager.syncWithScene(scene2);
      assert.equal(manager.getState().duration, 6.5);

      // Switch back to Scene 1
      state = selectSceneInEditor(state, "scene_1");
      const scene1 = getActiveScene(state)!;
      manager.syncWithScene(scene1);
      assert.equal(manager.getState().duration, 3.0);
    });
  });

  // =========================================================================
  // 3. SCENE RENAMING, DUPLICATION, DELETION & REORDERING
  // =========================================================================
  describe("3. Scene Renaming, Duplication, Deletion & Reordering", () => {
    it("renames a scene immutably", () => {
      let state = createInitialEditorState(createTestProject());
      state = renameSceneInEditor(state, "scene_1", "Intro Hero Animation");

      const scene = getActiveScene(state);
      assert.equal(scene?.name, "Intro Hero Animation");
    });

    it("duplicates a scene, cloning all elements with unique IDs", () => {
      let state = createInitialEditorState(createTestProject());
      const originalScene = getActiveScene(state)!;
      assert.equal(originalScene.elements.length, 1);
      const originalElId = originalScene.elements[0].id;

      state = duplicateSceneInEditor(state, "scene_1");
      assert.equal(state.project.scenes.length, 2);

      const duplicatedScene = getActiveScene(state)!;
      assert.notEqual(duplicatedScene.id, originalScene.id);
      assert.equal(duplicatedScene.elements.length, 1);

      // Duplicated element must have a new unique ID
      const duplicatedElId = duplicatedScene.elements[0].id;
      assert.notEqual(duplicatedElId, originalElId);
      assert.ok(duplicatedElId.startsWith("el_title_1_copy_"));

      // Timing must be aligned sequentially
      assert.equal(duplicatedScene.startTime, 3.0);
      assert.equal(state.project.duration, 6.0);
    });

    it("deletes a scene safely and realigns remaining scene timings", () => {
      let state = createInitialEditorState(createTestProject());
      state = addSceneToEditor(state, { name: "Scene 2", duration: 4.0 });
      state = addSceneToEditor(state, { name: "Scene 3", duration: 5.0 });
      assert.equal(state.project.scenes.length, 3);

      const scene2Id = state.project.scenes[1].id;

      // Delete Scene 2
      state = deleteSceneInEditor(state, scene2Id);
      assert.equal(state.project.scenes.length, 2);

      // Scene 3 should now be the second scene and start at 3.0s
      const remainingScene2 = state.project.scenes[1];
      assert.equal(remainingScene2.name, "Scene 3");
      assert.equal(remainingScene2.startTime, 3.0);
      assert.equal(state.project.duration, 8.0); // 3.0 + 5.0
    });

    it("enforces safety constraint: cannot delete the only scene in the project", () => {
      let state = createInitialEditorState(createTestProject());
      assert.equal(state.project.scenes.length, 1);

      // Attempt to delete the single remaining scene
      const unchanged = deleteSceneInEditor(state, "scene_1");
      assert.equal(unchanged.project.scenes.length, 1);
      assert.equal(unchanged.activeSceneId, "scene_1");
    });

    it("reorders scenes and realigns timing sequentially", () => {
      let state = createInitialEditorState(createTestProject()); // Scene 1 (3.0s)
      state = addSceneToEditor(state, { name: "Scene 2", duration: 5.0 }); // Scene 2 (5.0s)

      // Reorder: Move Scene 2 to index 0, Scene 1 to index 1
      state = reorderScenesInEditor(state, 1, 0);

      assert.equal(state.project.scenes[0].name, "Scene 2");
      assert.equal(state.project.scenes[0].startTime, 0);
      assert.equal(state.project.scenes[0].duration, 5.0);

      assert.equal(state.project.scenes[1].name, "Scene 1 - Intro");
      assert.equal(state.project.scenes[1].startTime, 5.0);
      assert.equal(state.project.scenes[1].duration, 3.0);
    });
  });

  // =========================================================================
  // 4. PROJECT ASSET SYSTEM & CRUD
  // =========================================================================
  describe("4. Project Asset System (Images, SVGs, Logos, Videos)", () => {
    it("adds image, svg, logo, and video assets to project.assets", () => {
      let state = createInitialEditorState(createTestProject());
      assert.equal(state.project.assets.length, 1);

      const heroImage = createImageAsset({
        id: "asset_hero_banner",
        name: "hero-banner.png",
        url: "https://assets.motionbot.dev/banner.png",
        width: 1200,
        height: 600,
      });

      const videoAsset = createVideoAsset({
        id: "asset_background_video",
        name: "ambient-bg.mp4",
        url: "https://assets.motionbot.dev/ambient.mp4",
        width: 1920,
        height: 1080,
        durationSeconds: 10,
      });

      state = addAssetToEditor(state, heroImage);
      state = addAssetToEditor(state, videoAsset);

      assert.equal(state.project.assets.length, 3);
      const foundVideo = state.project.assets.find((a) => a.id === "asset_background_video");
      assert.ok(foundVideo);
      assert.equal(foundVideo?.type, "video");
      assert.equal(foundVideo?.metadata.durationSeconds, 10);
    });

    it("removes an asset from project.assets", () => {
      let state = createInitialEditorState(createTestProject());
      state = removeAssetFromEditor(state, "asset_test_logo");
      assert.equal(state.project.assets.length, 0);
    });
  });

  // =========================================================================
  // 5. ASSET → CANVAS LAYER INSTANTIATION & REUSE
  // =========================================================================
  describe("5. Asset → Canvas Layer Instantiation & Reuse", () => {
    it("creates a LogoElement from a logo asset and adds it to active scene", () => {
      let state = createInitialEditorState(createTestProject());
      state = addAssetElementToActiveScene(state, "asset_test_logo");

      const activeScene = getActiveScene(state)!;
      assert.equal(activeScene.elements.length, 2);

      const createdLogo = activeScene.elements[1] as LogoElement;
      assert.equal(createdLogo.type, "logo");
      assert.equal(createdLogo.assetId, "asset_test_logo");
      assert.equal(createdLogo.src, "https://assets.motionbot.dev/logo.svg");
      assert.equal(state.selectedElementIds[0], createdLogo.id);

      // Resolves to original asset
      const resolved = resolveAssetForElement(createdLogo, state.project.assets);
      assert.equal(resolved?.id, "asset_test_logo");
    });

    it("supports asset reuse: adding the same asset multiple times creates independent layers", () => {
      let state = createInitialEditorState(createTestProject());

      // Add asset first time
      state = addAssetElementToActiveScene(state, "asset_test_logo");
      const activeScene1 = getActiveScene(state)!;
      const logo1 = activeScene1.elements[1];

      // Add asset second time
      state = addAssetElementToActiveScene(state, "asset_test_logo");
      const activeScene2 = getActiveScene(state)!;
      const logo2 = activeScene2.elements[2];

      // Both layers exist independently
      assert.notEqual(logo1.id, logo2.id);
      assert.equal((logo1 as LogoElement).assetId, "asset_test_logo");
      assert.equal((logo2 as LogoElement).assetId, "asset_test_logo");

      // Verify asset reference lookup identifies both
      const referenced = getReferencedAssets(activeScene2.elements, state.project.assets);
      assert.equal(referenced.length, 1);
      assert.equal(referenced[0].id, "asset_test_logo");
    });

    it("creates ImageElement and VideoElement layers with correct types and dimensions", () => {
      let state = createInitialEditorState(createTestProject());

      const imageAsset = createImageAsset({
        id: "asset_sample_photo",
        name: "photo.jpg",
        url: "https://assets.motionbot.dev/photo.jpg",
        width: 800,
        height: 600,
      });

      const videoAsset = createVideoAsset({
        id: "asset_sample_video",
        name: "clip.mp4",
        url: "https://assets.motionbot.dev/clip.mp4",
        width: 1280,
        height: 720,
      });

      state = addAssetToEditor(state, imageAsset);
      state = addAssetToEditor(state, videoAsset);

      state = addAssetElementToActiveScene(state, "asset_sample_photo");
      let activeScene = getActiveScene(state)!;
      const imageLayer = activeScene.elements[activeScene.elements.length - 1] as ImageElement;
      assert.equal(imageLayer.type, "image");
      assert.equal(imageLayer.assetId, "asset_sample_photo");
      assert.equal(imageLayer.transform.width, 800);
      assert.equal(imageLayer.transform.height, 600);

      state = addAssetElementToActiveScene(state, "asset_sample_video");
      activeScene = getActiveScene(state)!;
      const videoLayer = activeScene.elements[activeScene.elements.length - 1] as VideoElement;
      assert.equal(videoLayer.type, "video");
      assert.equal(videoLayer.assetId, "asset_sample_video");
      assert.equal(videoLayer.transform.width, 1280);
      assert.equal(videoLayer.transform.height, 720);
    });
  });

  // =========================================================================
  // 6. LAYER MANIPULATION & KEYFRAMING ON ASSET LAYERS
  // =========================================================================
  describe("6. Transform & Keyframe Animation on Asset Layers", () => {
    it("asset layers can be moved, resized, and keyframed in the timeline", () => {
      let state = createInitialEditorState(createTestProject());
      state = addAssetElementToActiveScene(state, "asset_test_logo");
      const activeScene = getActiveScene(state)!;
      const logoLayer = activeScene.elements[1] as LogoElement;

      // Update position via layer manipulation
      state = updateElementInActiveScene(state, logoLayer.id, {
        transform: {
          ...logoLayer.transform,
          x: 500,
          y: 400,
        },
      });

      const movedLogo = getActiveScene(state)!.elements[1] as LogoElement;
      assert.equal(movedLogo.transform.x, 500);
      assert.equal(movedLogo.transform.y, 400);

      // Add keyframes for Position X: 500 at 0s, 1000 at 2.0s
      let animated = addKeyframeToElement(movedLogo, "x", 0, 500, 30).element;
      animated = addKeyframeToElement(animated, "x", 2.0, 1000, 30).element;

      const sceneWithAnim = createScene({
        elements: [animated],
        duration: 3.0,
      });

      // Canvas evaluation at midpoint (1.0s) should interpolate to approx 750
      const evaluated = getEvaluatedSceneAtTime(sceneWithAnim, 1.0);
      const evalLogo = evaluated.elements[0] as LogoElement;
      assert.ok(Math.abs(evalLogo.transform.x - 750) < 5);
      assert.equal(evalLogo.assetId, "asset_test_logo");
    });
  });

  // =========================================================================
  // 7. AI COMPATIBILITY: MULTI-SCENE & ASSET GENERATION
  // =========================================================================
  describe("7. AI Plan Compatibility with Multi-Scene and Assets", () => {
    it("seamlessly handles AI-generated projects with multiple scenes and linked assets", () => {
      // Simulate an AI-generated motion design project containing brand assets & multi-scene narrative
      const brandLogo = createLogoAsset({
        id: "ai_brand_logo",
        name: "tech-brand.svg",
        url: "https://assets.motionbot.dev/tech.svg",
        width: 180,
        height: 180,
      });

      const aiScene1 = createScene({
        id: "ai_scene_1",
        name: "Scene 1 - Logo Reveal",
        duration: 2.5,
        elements: [
          createLogoElement({
            id: "el_ai_logo",
            name: "Animated Logo",
            assetId: "ai_brand_logo",
            src: brandLogo.url,
            transform: { ...DEFAULT_TRANSFORM, x: 960, y: 540 },
          }),
        ],
      });

      const aiScene2 = createScene({
        id: "ai_scene_2",
        name: "Scene 2 - Product Value",
        duration: 3.5,
        elements: [
          createTextElement({
            id: "el_ai_headline",
            name: "Value Headline",
            text: "Create Motion in Seconds",
          }),
        ],
      });

      const aligned = alignScenesSequentially([aiScene1, aiScene2]);
      const aiProject = createProject({
        id: "proj_ai_generated",
        name: "AI Generated Showcase",
        scenes: aligned,
        assets: [brandLogo],
      });

      let state = createInitialEditorState(aiProject);
      assert.equal(state.project.scenes.length, 2);
      assert.equal(state.project.assets.length, 1);

      // Inspect Scene 1
      assert.equal(state.activeSceneId, "ai_scene_1");
      const s1 = getActiveScene(state)!;
      assert.equal(s1.elements.length, 1);
      assert.equal(s1.elements[0].type, "logo");

      // Switch to Scene 2
      state = selectSceneInEditor(state, "ai_scene_2");
      assert.equal(state.activeSceneId, "ai_scene_2");
      const s2 = getActiveScene(state)!;
      assert.equal(s2.elements.length, 1);
      assert.equal(s2.elements[0].type, "text");

      // Add project asset to Scene 2 as well
      state = addAssetElementToActiveScene(state, "ai_brand_logo");
      const s2Updated = getActiveScene(state)!;
      assert.equal(s2Updated.elements.length, 2);
      assert.equal(s2Updated.elements[1].type, "logo");
    });
  });
});
