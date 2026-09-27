/**
 * MOTION-BOT — Property Animation Evaluation Unit Tests
 * Test suite verifying animated property resolution, non-animated property preservation,
 * immutability guarantees, and Phase 5 canvas compatibility.
 * Part of Phase 6.4: Element Property Evaluation.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultMotionEngine,
  defaultPropertyAnimationEvaluator,
  PropertyAnimationEvaluator,
  applyEvaluationToElement,
} from "../engine";
import { createAnimation, createKeyframe } from "../services/animation/animation-model";
import {
  createTextElement,
  createShapeElement,
  createImageElement,
  DEFAULT_TRANSFORM,
  DEFAULT_APPEARANCE,
} from "../services/element/element-model";
import { resolveElementFill } from "../components/editor/scene-renderer";

describe("Property Animation Evaluation — Phase 6.4", () => {
  const evaluator = new PropertyAnimationEvaluator();

  // ---------------------------------------------------------------------------
  // 1. SINGLE-PROPERTY ANIMATION
  // ---------------------------------------------------------------------------
  describe("Single-Property Animation", () => {
    it("evaluates single-property animation while preserving all other properties", () => {
      const xTrack = createAnimation("x", [
        createKeyframe(0.0, 100, "linear"),
        createKeyframe(2.0, 500, "linear"),
      ]);

      const baseElement = createTextElement({
        text: "Animated Title",
        transform: {
          ...DEFAULT_TRANSFORM,
          x: 100,
          y: 250,
          width: 400,
          height: 80,
          rotation: 12,
          scaleX: 1.5,
          scaleY: 1.5,
          anchorX: 0.5,
          anchorY: 0.5,
        },
        appearance: {
          ...DEFAULT_APPEARANCE,
          opacity: 0.9,
        },
        propertyTracks: [xTrack],
      });

      // Snapshot original for immutability check
      const originalJSON = JSON.stringify(baseElement);

      const { element: evaluated, evaluation } = evaluator.evaluateElement(baseElement, 1.0);

      // 1. Evaluated x
      assert.equal(evaluated.transform.x, 300);
      assert.equal(evaluation.transform.x, 300);
      assert.equal(evaluation.isAnimated, true);
      assert.deepEqual(evaluation.animatedProperties, ["x"]);

      // 2. All other transform properties strictly preserved from base
      assert.equal(evaluated.transform.y, 250);
      assert.equal(evaluated.transform.width, 400);
      assert.equal(evaluated.transform.height, 80);
      assert.equal(evaluated.transform.rotation, 12);
      assert.equal(evaluated.transform.scaleX, 1.5);
      assert.equal(evaluated.transform.scaleY, 1.5);
      assert.equal(evaluated.transform.anchorX, 0.5);
      assert.equal(evaluated.transform.anchorY, 0.5);

      // 3. Appearance preserved
      assert.equal(evaluated.appearance.opacity, 0.9);

      // 4. Element metadata, ID, and text content preserved
      assert.equal(evaluated.id, baseElement.id);
      assert.equal(evaluated.type, "text");
      assert.equal(evaluated.text, "Animated Title");
      assert.equal(evaluated.visible, baseElement.visible);
      assert.equal(evaluated.locked, baseElement.locked);

      // 5. Original element was NOT mutated
      assert.equal(JSON.stringify(baseElement), originalJSON);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. MULTIPLE-PROPERTY ANIMATION
  // ---------------------------------------------------------------------------
  describe("Multiple-Property Animation", () => {
    it("evaluates multiple properties concurrently at arbitrary time", () => {
      const tracks = [
        createAnimation("x", [createKeyframe(0.0, 0, "linear"), createKeyframe(1.0, 200, "linear")]),
        createAnimation("y", [createKeyframe(0.0, 50, "linear"), createKeyframe(1.0, 150, "linear")]),
        createAnimation("scaleX", [createKeyframe(0.0, 1.0, "linear"), createKeyframe(1.0, 2.0, "linear")]),
        createAnimation("scaleY", [createKeyframe(0.0, 1.0, "linear"), createKeyframe(1.0, 0.5, "linear")]),
        createAnimation("rotation", [createKeyframe(0.0, 0, "linear"), createKeyframe(1.0, 90, "linear")]),
        createAnimation("opacity", [createKeyframe(0.0, 0.2, "linear"), createKeyframe(1.0, 0.8, "linear")]),
      ];

      const shape = createShapeElement({
        shapeKind: "rectangle",
        transform: {
          ...DEFAULT_TRANSFORM,
          x: 0,
          y: 50,
          width: 300,
          height: 200,
          rotation: 0,
          scaleX: 1.0,
          scaleY: 1.0,
        },
        appearance: {
          ...DEFAULT_APPEARANCE,
          opacity: 0.2,
        },
        propertyTracks: tracks,
      });

      const { element: evaluated, evaluation } = evaluator.evaluateElement(shape, 0.5);

      assert.equal(evaluated.transform.x, 100);
      assert.equal(evaluated.transform.y, 100);
      assert.equal(evaluated.transform.scaleX, 1.5);
      assert.equal(evaluated.transform.scaleY, 0.75);
      assert.equal(evaluated.transform.rotation, 45);
      assert.equal(Math.round(evaluated.appearance.opacity * 100) / 100, 0.5);

      // Unanimated dimensions preserved
      assert.equal(evaluated.transform.width, 300);
      assert.equal(evaluated.transform.height, 200);

      assert.equal(evaluation.isAnimated, true);
      assert.equal(evaluation.animatedProperties.length, 6);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. PARTIAL ANIMATION & NO ANIMATION
  // ---------------------------------------------------------------------------
  describe("Partial Animation & No Animation", () => {
    it("preserves position, rotation, and opacity when only dimensions are animated", () => {
      const wTrack = createAnimation("width", [createKeyframe(0.0, 100, "linear"), createKeyframe(1.0, 300, "linear")]);
      const hTrack = createAnimation("height", [createKeyframe(0.0, 50, "linear"), createKeyframe(1.0, 150, "linear")]);

      const image = createImageElement({
        assetId: "asset-1",
        src: "https://example.com/asset.png",
        transform: {
          ...DEFAULT_TRANSFORM,
          x: 220,
          y: 330,
          width: 100,
          height: 50,
          rotation: 45,
        },
        propertyTracks: [wTrack, hTrack],
      });

      const { element: evaluated } = evaluator.evaluateElement(image, 0.5);

      assert.equal(evaluated.transform.width, 200);
      assert.equal(evaluated.transform.height, 100);
      assert.equal(evaluated.transform.x, 220);
      assert.equal(evaluated.transform.y, 330);
      assert.equal(evaluated.transform.rotation, 45);
      assert.equal(evaluated.src, "https://example.com/asset.png");
    });

    it("evaluates element with no animations safely without modifications", () => {
      const staticElement = createShapeElement({
        shapeKind: "circle",
        transform: {
          ...DEFAULT_TRANSFORM,
          x: 500,
          y: 600,
          width: 150,
          height: 150,
          rotation: 30,
        },
        appearance: {
          ...DEFAULT_APPEARANCE,
          opacity: 0.75,
        },
        propertyTracks: [],
      });

      const { element: evaluated, evaluation } = evaluator.evaluateElement(staticElement, 2.5);

      assert.equal(evaluated.transform.x, 500);
      assert.equal(evaluated.transform.y, 600);
      assert.equal(evaluated.transform.width, 150);
      assert.equal(evaluated.transform.height, 150);
      assert.equal(evaluated.transform.rotation, 30);
      assert.equal(evaluated.appearance.opacity, 0.75);

      assert.equal(evaluation.isAnimated, false);
      assert.equal(evaluation.animatedProperties.length, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. RESPECTING VISIBILITY & LOCKED STATE
  // ---------------------------------------------------------------------------
  describe("Visibility and Locked State Preservation", () => {
    it("faithfully preserves locked and visible flags on evaluated elements", () => {
      const xTrack = createAnimation("x", [createKeyframe(0.0, 0, "linear"), createKeyframe(1.0, 100, "linear")]);

      const lockedElement = createTextElement({
        text: "Protected Layer",
        locked: true,
        visible: false,
        propertyTracks: [xTrack],
      });

      const { element: evaluated } = evaluator.evaluateElement(lockedElement, 0.5);

      assert.equal(evaluated.locked, true);
      assert.equal(evaluated.visible, false);
      assert.equal(evaluated.transform.x, 50);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. MALFORMED & INVALID ANIMATION DATA
  // ---------------------------------------------------------------------------
  describe("Invalid & Disabled Animation Handling", () => {
    it("ignores disabled tracks and falls back to base values", () => {
      const disabledTrack = createAnimation(
        "x",
        [createKeyframe(0.0, 100), createKeyframe(1.0, 500)],
        { enabled: false }
      );

      const element = createShapeElement({
        transform: { ...DEFAULT_TRANSFORM, x: 25 },
        propertyTracks: [disabledTrack],
      });

      const { element: evaluated, evaluation } = evaluator.evaluateElement(element, 0.5);

      assert.equal(evaluated.transform.x, 25);
      assert.equal(evaluation.isAnimated, false);
    });

    it("safely handles tracks with empty or corrupted keyframes", () => {
      const corruptTrack = createAnimation("rotation", []);

      const element = createShapeElement({
        transform: { ...DEFAULT_TRANSFORM, rotation: 18 },
        propertyTracks: [corruptTrack],
      });

      const { element: evaluated } = evaluator.evaluateElement(element, 1.0);
      assert.equal(evaluated.transform.rotation, 18);
    });

    it("prevents NaN or Infinity from entering evaluated element properties", () => {
      const badTrack = createAnimation("opacity", [
        createKeyframe(0.0, NaN as unknown as number),
        createKeyframe(1.0, Infinity as unknown as number),
      ]);

      const element = createShapeElement({
        appearance: { ...DEFAULT_APPEARANCE, opacity: 0.6 },
        propertyTracks: [badTrack],
      });

      const { element: evaluated } = evaluator.evaluateElement(element, 0.5);

      assert.ok(Number.isFinite(evaluated.appearance.opacity));
      assert.ok(evaluated.appearance.opacity >= 0 && evaluated.appearance.opacity <= 1);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. PHASE 5 CANVAS COMPATIBILITY
  // ---------------------------------------------------------------------------
  describe("Phase 5 Canvas Compatibility", () => {
    it("verifies evaluated elements conform to the Phase 5 Canvas rendering contract", () => {
      const animTrack = createAnimation("x", [
        createKeyframe(0.0, 50, "linear"),
        createKeyframe(1.0, 250, "linear"),
      ]);

      const shape = createShapeElement({
        shapeKind: "rectangle",
        transform: { ...DEFAULT_TRANSFORM, x: 50, y: 100, width: 200, height: 100 },
        appearance: {
          ...DEFAULT_APPEARANCE,
          fill: { type: "solid", color: "#6366F1" },
        },
        propertyTracks: [animTrack],
      });

      // 1. Evaluate element via defaultMotionEngine.evaluateElement
      const evaluatedState = defaultMotionEngine.evaluateElement(shape, 0.5);
      const canvasReadyElement = evaluatedState.element;

      // 2. Verify all Phase 5 required properties are intact
      assert.equal(typeof canvasReadyElement.id, "string");
      assert.equal(canvasReadyElement.type, "shape");
      assert.equal(canvasReadyElement.transform.x, 150);
      assert.equal(canvasReadyElement.transform.y, 100);
      assert.equal(canvasReadyElement.transform.width, 200);
      assert.equal(canvasReadyElement.transform.height, 100);

      // 3. Test consumption by Phase 5 renderer utility (resolveElementFill)
      const fillStyles = resolveElementFill(canvasReadyElement.appearance.fill);
      assert.equal(fillStyles.backgroundColor, "#6366F1");

      // 4. Verify applyEvaluationToElement produces clean clone
      const reapplied = applyEvaluationToElement(shape, evaluatedState.evaluation);
      assert.deepEqual(reapplied, canvasReadyElement);
      assert.notEqual(reapplied, shape); // different object references
    });
  });
});
