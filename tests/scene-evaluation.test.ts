/**
 * MOTION-BOT — Scene-Level Motion Evaluation Unit Tests
 * Test suite verifying scene-level motion calculation, element animation resolution,
 * scene boundaries, z-order preservation, element visibility, and high-volume performance.
 * Part of Phase 6.5: Scene-Level Motion Evaluation System.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createSceneEvaluator,
  defaultMotionEngine,
  defaultSceneEvaluator,
  evaluateScene,
  SceneEvaluator,
} from "../engine";
import { createAnimation, createKeyframe } from "../services/animation/animation-model";
import {
  DEFAULT_APPEARANCE,
  DEFAULT_TRANSFORM,
  createImageElement,
  createShapeElement,
  createTextElement,
} from "../services/element/element-model";
import { createScene } from "../services/project/scene-model";
import { Scene } from "@/types/scene";

describe("Scene Motion Evaluation — Phase 6.5", () => {
  const evaluator = new SceneEvaluator();

  // ---------------------------------------------------------------------------
  // 1. EMPTY SCENE EVALUATION
  // ---------------------------------------------------------------------------
  describe("Empty Scene Evaluation", () => {
    it("evaluates an empty scene cleanly with valid defaults", () => {
      const scene = createScene({
        name: "Empty Scene",
        startTime: 1.0,
        duration: 4.0,
        elements: [],
      });

      const state = evaluator.evaluateScene(scene, 2.5);

      assert.equal(state.sceneId, scene.id);
      assert.equal(state.sceneName, "Empty Scene");
      assert.equal(state.globalTime, 2.5);
      assert.equal(state.localTime, 1.5);
      assert.equal(state.startTime, 1.0);
      assert.equal(state.duration, 4.0);
      assert.equal(state.isActive, true);
      assert.equal(state.isBeforeScene, false);
      assert.equal(state.isAfterScene, false);
      assert.equal(state.totalElements, 0);
      assert.equal(state.animatedCount, 0);
      assert.equal(state.staticCount, 0);
      assert.equal(state.elements.length, 0);
      assert.equal(state.sortedElements.length, 0);
      assert.equal(state.visibleElements.length, 0);
      assert.equal(state.elementMap.size, 0);
    });

    it("evaluates a scene with undefined or null elements array safely", () => {
      const scene = {
        ...createScene({ name: "Null Elements" }),
        elements: undefined as unknown as [],
      };

      const state = evaluateScene(scene as unknown as Scene, 0);
      assert.equal(state.totalElements, 0);
      assert.equal(state.elements.length, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. STATIC SCENE EVALUATION
  // ---------------------------------------------------------------------------
  describe("Static Scene Evaluation", () => {
    it("evaluates a scene containing static elements without animations", () => {
      const el1 = createTextElement({
        name: "Headline",
        text: "Motion Graphics",
        transform: { ...DEFAULT_TRANSFORM, x: 200, y: 150, width: 600, height: 100 },
        appearance: { ...DEFAULT_APPEARANCE, opacity: 0.9 },
        zIndex: 1,
      });

      const el2 = createShapeElement({
        name: "Backdrop",
        shapeKind: "rectangle",
        transform: { ...DEFAULT_TRANSFORM, x: 100, y: 100, width: 800, height: 400 },
        zIndex: 0,
      });

      const scene = createScene({
        name: "Static Intro",
        startTime: 0,
        duration: 3.0,
        elements: [el1, el2],
      });

      const state = evaluator.evaluateScene(scene, 1.5);

      assert.equal(state.totalElements, 2);
      assert.equal(state.animatedCount, 0);
      assert.equal(state.staticCount, 2);
      assert.equal(state.elements.length, 2);

      // Verify element 1 preserved all properties
      const eval1 = state.elementMap.get(el1.id);
      assert.ok(eval1);
      assert.equal(eval1.element.transform.x, 200);
      assert.equal(eval1.element.transform.y, 150);
      assert.equal(eval1.element.transform.width, 600);
      assert.equal(eval1.element.transform.height, 100);
      assert.equal(eval1.element.appearance.opacity, 0.9);
      assert.equal(eval1.evaluation.isAnimated, false);

      // Verify element 2 preserved all properties
      const eval2 = state.elementMap.get(el2.id);
      assert.ok(eval2);
      assert.equal(eval2.element.transform.x, 100);
      assert.equal(eval2.element.transform.y, 100);
      assert.equal(eval2.element.transform.width, 800);
      assert.equal(eval2.element.transform.height, 400);
      assert.equal(eval2.evaluation.isAnimated, false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. ANIMATED SCENE EVALUATION
  // ---------------------------------------------------------------------------
  describe("Animated Scene Evaluation", () => {
    it("evaluates animated elements at arbitrary timestamps using the property animation engine", () => {
      const xTrack = createAnimation("x", [
        createKeyframe(0.0, 0, "linear"),
        createKeyframe(2.0, 400, "linear"),
      ]);

      const animElement = createTextElement({
        name: "Sliding Text",
        text: "Incoming",
        transform: { ...DEFAULT_TRANSFORM, x: 0, y: 200, width: 300, height: 60 },
        appearance: { ...DEFAULT_APPEARANCE, opacity: 1.0 },
        propertyTracks: [xTrack],
      });

      const scene = createScene({
        name: "Slide Scene",
        startTime: 0,
        duration: 3.0,
        elements: [animElement],
      });

      // At t = 0.0s (start)
      const state0 = evaluator.evaluateScene(scene, 0.0);
      assert.equal(state0.animatedCount, 1);
      assert.equal(state0.elementMap.get(animElement.id)?.element.transform.x, 0);

      // At t = 1.0s (midpoint)
      const stateMid = evaluator.evaluateScene(scene, 1.0);
      assert.equal(stateMid.elementMap.get(animElement.id)?.element.transform.x, 200);

      // At t = 2.0s (end of track)
      const stateEnd = evaluator.evaluateScene(scene, 2.0);
      assert.equal(stateEnd.elementMap.get(animElement.id)?.element.transform.x, 400);

      // Non-animated properties remain preserved
      const evalState = stateMid.elementMap.get(animElement.id);
      assert.equal(evalState?.element.transform.y, 200);
      assert.equal(evalState?.element.transform.width, 300);
      assert.equal(evalState?.element.transform.height, 60);
      assert.equal(evalState?.element.appearance.opacity, 1.0);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. MULTIPLE ANIMATED ELEMENTS
  // ---------------------------------------------------------------------------
  describe("Multiple Animated Elements", () => {
    it("evaluates distinct elements with differing animated properties concurrently", () => {
      const el1X = createAnimation("x", [
        createKeyframe(0.0, 100, "linear"),
        createKeyframe(2.0, 300, "linear"),
      ]);
      const el1 = createShapeElement({
        name: "Shape 1",
        shapeKind: "rectangle",
        transform: { ...DEFAULT_TRANSFORM, x: 100, y: 100 },
        propertyTracks: [el1X],
      });

      const el2Opacity = createAnimation("opacity", [
        createKeyframe(0.0, 0.0, "linear"),
        createKeyframe(2.0, 1.0, "linear"),
      ]);
      const el2 = createTextElement({
        name: "Text 2",
        text: "Fade In",
        appearance: { ...DEFAULT_APPEARANCE, opacity: 0.0 },
        propertyTracks: [el2Opacity],
      });

      const el3Rot = createAnimation("rotation", [
        createKeyframe(0.0, 0, "linear"),
        createKeyframe(2.0, 180, "linear"),
      ]);
      const el3 = createImageElement({
        name: "Image 3",
        assetId: "asset-123",
        transform: { ...DEFAULT_TRANSFORM, rotation: 0 },
        propertyTracks: [el3Rot],
      });

      const scene = createScene({
        name: "Multi-Anim",
        startTime: 0,
        duration: 3.0,
        elements: [el1, el2, el3],
      });

      const state = evaluator.evaluateScene(scene, 1.0);

      assert.equal(state.totalElements, 3);
      assert.equal(state.animatedCount, 3);
      assert.equal(state.staticCount, 0);

      assert.equal(state.elementMap.get(el1.id)?.element.transform.x, 200);
      assert.equal(state.elementMap.get(el2.id)?.element.appearance.opacity, 0.5);
      assert.equal(state.elementMap.get(el3.id)?.element.transform.rotation, 90);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. MIXED STATIC AND ANIMATED SCENE
  // ---------------------------------------------------------------------------
  describe("Mixed Static and Animated Scenes", () => {
    it("correctly partitions static and animated elements in the same scene", () => {
      const staticBg = createShapeElement({
        name: "Background",
        shapeKind: "rectangle",
        transform: { ...DEFAULT_TRANSFORM, x: 0, y: 0, width: 1920, height: 1080 },
        zIndex: 0,
      });

      const animY = createAnimation("y", [
        createKeyframe(0.0, 800, "linear"),
        createKeyframe(2.0, 400, "linear"),
      ]);
      const animatedTitle = createTextElement({
        name: "Title",
        text: "Animated Title",
        transform: { ...DEFAULT_TRANSFORM, x: 960, y: 800 },
        propertyTracks: [animY],
        zIndex: 2,
      });

      const staticWatermark = createTextElement({
        name: "Watermark",
        text: "MOTION-BOT",
        transform: { ...DEFAULT_TRANSFORM, x: 50, y: 50 },
        zIndex: 1,
      });

      const scene = createScene({
        name: "Mixed Scene",
        startTime: 0,
        duration: 3.0,
        elements: [staticBg, animatedTitle, staticWatermark],
      });

      const state = evaluator.evaluateScene(scene, 1.0);

      assert.equal(state.totalElements, 3);
      assert.equal(state.animatedCount, 1);
      assert.equal(state.staticCount, 2);

      // Verify static elements remained exact
      assert.equal(state.elementMap.get(staticBg.id)?.element.transform.x, 0);
      assert.equal(state.elementMap.get(staticBg.id)?.evaluation.isAnimated, false);
      assert.equal(state.elementMap.get(staticWatermark.id)?.element.transform.x, 50);
      assert.equal(state.elementMap.get(staticWatermark.id)?.evaluation.isAnimated, false);

      // Verify animated element updated
      assert.equal(state.elementMap.get(animatedTitle.id)?.element.transform.y, 600);
      assert.equal(state.elementMap.get(animatedTitle.id)?.evaluation.isAnimated, true);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. SCENE BOUNDARIES & DETERMINISM
  // ---------------------------------------------------------------------------
  describe("Scene Boundaries & Determinism", () => {
    it("handles non-zero scene startTime and evaluates accurately within interval", () => {
      const xTrack = createAnimation("x", [
        createKeyframe(0.0, 0, "linear"),
        createKeyframe(4.0, 400, "linear"),
      ]);
      const element = createTextElement({
        name: "Timed Element",
        transform: { ...DEFAULT_TRANSFORM, x: 0 },
        propertyTracks: [xTrack],
      });

      const scene = createScene({
        name: "Scene Offset",
        startTime: 3.0,
        duration: 5.0, // Valid range: [3.0, 8.0]
        elements: [element],
      });

      // At global t = 5.0 (local t = 2.0s -> 50% through track)
      const activeState = evaluator.evaluateScene(scene, 5.0);
      assert.equal(activeState.globalTime, 5.0);
      assert.equal(activeState.localTime, 2.0);
      assert.equal(activeState.isActive, true);
      assert.equal(activeState.isBeforeScene, false);
      assert.equal(activeState.isAfterScene, false);
      assert.equal(activeState.elementMap.get(element.id)?.element.transform.x, 200);
    });

    it("clamps deterministically when evaluated strictly before scene start", () => {
      const xTrack = createAnimation("x", [
        createKeyframe(0.0, 100, "linear"),
        createKeyframe(4.0, 500, "linear"),
      ]);
      const element = createTextElement({
        name: "Clamped Pre",
        transform: { ...DEFAULT_TRANSFORM, x: 100 },
        propertyTracks: [xTrack],
      });

      const scene = createScene({
        startTime: 2.0,
        duration: 4.0, // Valid range: [2.0, 6.0]
        elements: [element],
      });

      // Evaluate at global t = 0.5s (< 2.0s start)
      const preState = evaluator.evaluateScene(scene, 0.5);
      assert.equal(preState.globalTime, 0.5);
      assert.equal(preState.localTime, -1.5);
      assert.equal(preState.isActive, false);
      assert.equal(preState.isBeforeScene, true);
      assert.equal(preState.isAfterScene, false);

      // Element should deterministically evaluate at start frame (local t = 0)
      assert.equal(preState.elementMap.get(element.id)?.element.transform.x, 100);
    });

    it("clamps deterministically when evaluated strictly after scene duration", () => {
      const xTrack = createAnimation("x", [
        createKeyframe(0.0, 100, "linear"),
        createKeyframe(4.0, 500, "linear"),
      ]);
      const element = createTextElement({
        name: "Clamped Post",
        transform: { ...DEFAULT_TRANSFORM, x: 100 },
        propertyTracks: [xTrack],
      });

      const scene = createScene({
        startTime: 2.0,
        duration: 4.0, // Valid range: [2.0, 6.0]
        elements: [element],
      });

      // Evaluate at global t = 10.0s (> 6.0s end)
      const postState = evaluator.evaluateScene(scene, 10.0);
      assert.equal(postState.globalTime, 10.0);
      assert.equal(postState.localTime, 8.0);
      assert.equal(postState.isActive, false);
      assert.equal(postState.isBeforeScene, false);
      assert.equal(postState.isAfterScene, true);

      // Element should deterministically evaluate at end frame (local t = 4.0)
      assert.equal(postState.elementMap.get(element.id)?.element.transform.x, 500);
    });

    it("supports local time mode via SceneEvaluationOptions", () => {
      const xTrack = createAnimation("x", [
        createKeyframe(0.0, 0, "linear"),
        createKeyframe(2.0, 200, "linear"),
      ]);
      const element = createTextElement({
        transform: { ...DEFAULT_TRANSFORM, x: 0 },
        propertyTracks: [xTrack],
      });

      const scene = createScene({
        startTime: 5.0,
        duration: 3.0,
        elements: [element],
      });

      // Pass local time = 1.0 directly
      const state = evaluator.evaluateScene(scene, 1.0, { isLocalTime: true });
      assert.equal(state.localTime, 1.0);
      assert.equal(state.globalTime, 6.0);
      assert.equal(state.isActive, true);
      assert.equal(state.elementMap.get(element.id)?.element.transform.x, 100);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Z-ORDER PRESERVATION & ELEMENT ORDERING
  // ---------------------------------------------------------------------------
  describe("Z-Order Preservation & Layering", () => {
    it("preserves original scene element array order in elements and ascending zIndex in sortedElements", () => {
      const elA = createShapeElement({ name: "A", zIndex: 10 });
      const elB = createShapeElement({ name: "B", zIndex: 0 });
      const elC = createShapeElement({ name: "C", zIndex: 50 });
      const elD = createShapeElement({ name: "D", zIndex: -5 });
      const elE = createShapeElement({ name: "E", zIndex: 20 });

      const scene = createScene({
        elements: [elA, elB, elC, elD, elE],
      });

      const state = evaluator.evaluateScene(scene, 0);

      // 1. elements array MUST strictly preserve the original scene array order
      assert.equal(state.elements[0].element.id, elA.id);
      assert.equal(state.elements[1].element.id, elB.id);
      assert.equal(state.elements[2].element.id, elC.id);
      assert.equal(state.elements[3].element.id, elD.id);
      assert.equal(state.elements[4].element.id, elE.id);

      // 2. sortedElements MUST be ordered by ascending zIndex: [-5, 0, 10, 20, 50]
      const sortedIds = state.sortedElements.map((s) => s.element.id);
      assert.deepEqual(sortedIds, [elD.id, elB.id, elA.id, elE.id, elC.id]);

      // 3. zIndex on each element is completely preserved
      assert.equal(state.elementMap.get(elA.id)?.element.zIndex, 10);
      assert.equal(state.elementMap.get(elB.id)?.element.zIndex, 0);
      assert.equal(state.elementMap.get(elC.id)?.element.zIndex, 50);
      assert.equal(state.elementMap.get(elD.id)?.element.zIndex, -5);
      assert.equal(state.elementMap.get(elE.id)?.element.zIndex, 20);
    });

    it("uses stable tie-breaking on original scene index when zIndex values are identical", () => {
      const el1 = createShapeElement({ name: "First", zIndex: 5 });
      const el2 = createShapeElement({ name: "Second", zIndex: 5 });
      const el3 = createShapeElement({ name: "Third", zIndex: 5 });

      const scene = createScene({
        elements: [el1, el2, el3],
      });

      const state = evaluator.evaluateScene(scene, 0);
      assert.equal(state.sortedElements[0].element.id, el1.id);
      assert.equal(state.sortedElements[1].element.id, el2.id);
      assert.equal(state.sortedElements[2].element.id, el3.id);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. ELEMENT VISIBILITY HANDLING
  // ---------------------------------------------------------------------------
  describe("Element Visibility Handling", () => {
    it("preserves visible flag on all elements and filters visibleElements properly", () => {
      const visibleEl = createTextElement({
        name: "Visible Text",
        visible: true,
      });

      const hiddenEl = createTextElement({
        name: "Hidden Text",
        visible: false,
      });

      const scene = createScene({
        elements: [visibleEl, hiddenEl],
      });

      const state = evaluator.evaluateScene(scene, 0);

      // All elements evaluated
      assert.equal(state.totalElements, 2);
      assert.equal(state.elements.length, 2);
      assert.equal(state.elementMap.get(visibleEl.id)?.element.visible, true);
      assert.equal(state.elementMap.get(hiddenEl.id)?.element.visible, false);

      // visibleElements only contains visible items
      assert.equal(state.visibleElements.length, 1);
      assert.equal(state.visibleElements[0].element.id, visibleEl.id);
    });

    it("supports onlyVisible option to exclude hidden elements from evaluation", () => {
      const visibleEl = createTextElement({ name: "Visible", visible: true });
      const hiddenEl = createTextElement({ name: "Hidden", visible: false });

      const scene = createScene({ elements: [visibleEl, hiddenEl] });

      const state = evaluator.evaluateScene(scene, 0, { onlyVisible: true });
      assert.equal(state.elements.length, 1);
      assert.equal(state.elements[0].element.id, visibleEl.id);
      assert.equal(state.elementMap.has(hiddenEl.id), false);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. IMMUTABILITY & PURITY GUARANTEES
  // ---------------------------------------------------------------------------
  describe("Immutability & Purity", () => {
    it("does not mutate the source scene or its elements", () => {
      const xTrack = createAnimation("x", [
        createKeyframe(0.0, 100, "linear"),
        createKeyframe(2.0, 500, "linear"),
      ]);

      const baseElement = createTextElement({
        name: "Target",
        transform: { ...DEFAULT_TRANSFORM, x: 100 },
        propertyTracks: [xTrack],
      });

      const scene = createScene({
        elements: [baseElement],
      });

      // Snapshot scene data before evaluation
      const originalX = baseElement.transform.x;
      const originalLength = scene.elements.length;

      const evaluated = evaluator.evaluateScene(scene, 1.0);

      // Evaluated has updated position
      assert.equal(evaluated.elementMap.get(baseElement.id)?.element.transform.x, 300);

      // Source element remains unchanged
      assert.equal(baseElement.transform.x, originalX);
      assert.equal(scene.elements.length, originalLength);
      assert.equal(scene.elements[0].transform.x, 100);
    });

    it("produces identical deterministic results on repeated evaluations", () => {
      const xTrack = createAnimation("x", [
        createKeyframe(0.0, 0, "linear"),
        createKeyframe(2.0, 200, "easeInOut"),
      ]);
      const element = createShapeElement({ propertyTracks: [xTrack] });
      const scene = createScene({ elements: [element] });

      const run1 = evaluator.evaluateScene(scene, 1.0);
      const run2 = evaluator.evaluateScene(scene, 1.0);

      assert.deepEqual(
        run1.elementMap.get(element.id)?.element.transform,
        run2.elementMap.get(element.id)?.element.transform
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 10. MOTION ENGINE INTEGRATION
  // ---------------------------------------------------------------------------
  describe("Motion Engine Integration", () => {
    it("evaluates scenes via defaultMotionEngine.evaluateScene", () => {
      const scene = createScene({
        name: "Integrated Scene",
        startTime: 0,
        duration: 2.0,
        elements: [createTextElement({ name: "Sub" })],
      });

      const state = defaultMotionEngine.evaluateScene(scene, 1.0);
      assert.equal(state.sceneName, "Integrated Scene");
      assert.equal(state.elements.length, 1);
    });

    it("evaluates scenes via standalone evaluateScene helper", () => {
      const scene = createScene({
        name: "Standalone Scene",
        elements: [createShapeElement({ name: "Rect" })],
      });

      const state = evaluateScene(scene, 0.5);
      assert.equal(state.sceneName, "Standalone Scene");
      assert.equal(state.elements.length, 1);
    });

    it("creates custom scene evaluators via createSceneEvaluator factory", () => {
      const customEvaluator = createSceneEvaluator();
      const scene = createScene({ elements: [] });
      const state = customEvaluator.evaluateScene(scene, 0);
      assert.equal(state.totalElements, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 11. HIGH-VOLUME PERFORMANCE BENCHMARK (1,000 ELEMENTS)
  // ---------------------------------------------------------------------------
  describe("High-Volume Performance Benchmark", () => {
    it("evaluates a scene with 1,000 elements (mixed static and animated) under 30ms", () => {
      const elements = [];

      for (let i = 0; i < 1000; i++) {
        const isAnimated = i % 2 === 0;

        if (isAnimated) {
          const xTrack = createAnimation("x", [
            createKeyframe(0.0, i * 2, "linear"),
            createKeyframe(3.0, i * 4, "easeInOut"),
          ]);
          elements.push(
            createShapeElement({
              name: `Anim-Shape-${i}`,
              zIndex: i,
              transform: { ...DEFAULT_TRANSFORM, x: i * 2, y: i },
              propertyTracks: [xTrack],
            })
          );
        } else {
          elements.push(
            createTextElement({
              name: `Static-Text-${i}`,
              zIndex: i,
              text: `Item ${i}`,
              transform: { ...DEFAULT_TRANSFORM, x: i, y: i * 2 },
            })
          );
        }
      }

      const scene = createScene({
        name: "Stress Test 1000 Elements",
        startTime: 0,
        duration: 3.0,
        elements,
      });

      // Warmup run
      evaluator.evaluateScene(scene, 1.5);

      // Timed evaluation run
      const startTime = performance.now();
      const evaluated = evaluator.evaluateScene(scene, 1.5);
      const durationMs = performance.now() - startTime;

      assert.equal(evaluated.totalElements, 1000);
      assert.equal(evaluated.animatedCount, 500);
      assert.equal(evaluated.staticCount, 500);
      assert.equal(evaluated.elements.length, 1000);
      assert.equal(evaluated.sortedElements.length, 1000);

      // Verify throughput performance (should easily be < 30ms on modern hardware)
      assert.ok(
        durationMs < 30,
        `1,000 element scene evaluated in ${durationMs.toFixed(2)}ms (target < 30ms)`
      );
    });
  });
});
