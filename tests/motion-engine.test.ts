/**
 * MOTION-BOT — Motion Engine Architecture Unit Tests
 * Test suite verifying deterministic evaluation, keyframe interpolation, easing, and element states.
 * Part of Phase 6.1: Motion Engine Architecture.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createMotionEngine,
  defaultMotionEngine,
  MotionEngine,
  linear,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeOutBounce,
  createCubicBezierSolver,
  createStepsSolver,
  createSpringSolver,
  resolveEasing,
  KeyframeEvaluator,
  AnimationEvaluator,
} from "../engine";
import { createAnimation, createKeyframe } from "../services/animation/animation-model";
import {
  createTextElement,
  createShapeElement,
  DEFAULT_TRANSFORM,
  DEFAULT_APPEARANCE,
} from "../services/element/element-model";

describe("Motion Engine — Phase 6.1 Architecture", () => {
  // ---------------------------------------------------------------------------
  // 1. EASING FUNCTIONS & SOLVERS
  // ---------------------------------------------------------------------------
  describe("Easing Curves & Mathematical Solvers", () => {
    it("linear easing maps directly 1:1", () => {
      assert.equal(linear(0), 0);
      assert.equal(linear(0.25), 0.25);
      assert.equal(linear(0.5), 0.5);
      assert.equal(linear(1), 1);
    });

    it("quad and cubic curves satisfy boundary conditions [0, 1]", () => {
      const curves = [
        easeInQuad,
        easeOutQuad,
        easeInOutQuad,
        easeInCubic,
        easeOutCubic,
        easeInOutCubic,
        easeOutBounce,
      ];

      for (const curve of curves) {
        assert.ok(Math.abs(curve(0) - 0) < 1e-5, `Curve failed at 0: ${curve(0)}`);
        assert.ok(Math.abs(curve(1) - 1) < 1e-5, `Curve failed at 1: ${curve(1)}`);
      }
    });

    it("cubic-bezier solver calculates accurate intermediate progression", () => {
      // EaseInOut bezier curve
      const solver = createCubicBezierSolver({ p1x: 0.42, p1y: 0.0, p2x: 0.58, p2y: 1.0 });

      assert.equal(solver(0), 0);
      assert.equal(solver(1), 1);
      const mid = solver(0.5);
      assert.ok(Math.abs(mid - 0.5) < 0.05, `Expected mid ~ 0.5, got ${mid}`);
    });

    it("steps solver produces quantized discrete values", () => {
      const stepSolver = createStepsSolver({ stepsCount: 4, stepPosition: "end" });

      assert.equal(stepSolver(0), 0);
      assert.equal(stepSolver(0.2), 0);
      assert.equal(stepSolver(0.3), 0.25);
      assert.equal(stepSolver(0.6), 0.5);
      assert.equal(stepSolver(0.8), 0.75);
      assert.equal(stepSolver(1), 1);
    });

    it("spring solver simulates damped oscillation ending at 1", () => {
      const springSolver = createSpringSolver({ mass: 1, stiffness: 100, damping: 10 });

      assert.equal(springSolver(0), 0);
      assert.equal(springSolver(1), 1);
      const mid = springSolver(0.5);
      assert.ok(typeof mid === "number" && !isNaN(mid));
    });

    it("resolveEasing handles string names and definitions safely", () => {
      const linFn = resolveEasing("linear");
      assert.equal(linFn(0.5), 0.5);

      const quadFn = resolveEasing("easeInQuad");
      assert.equal(quadFn(0.5), 0.25);

      const undefFn = resolveEasing(undefined);
      assert.equal(undefFn(0.5), 0.5);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. KEYFRAME EVALUATOR
  // ---------------------------------------------------------------------------
  describe("Keyframe Sequence Evaluation", () => {
    const evaluator = new KeyframeEvaluator();

    it("returns undefined for empty keyframe sequences", () => {
      const result = evaluator.evaluate([], 1.5);
      assert.equal(result, undefined);
    });

    it("returns constant value for single keyframe", () => {
      const kf = [createKeyframe(1.0, 42)];
      assert.equal(evaluator.evaluate(kf, 0), 42);
      assert.equal(evaluator.evaluate(kf, 1.0), 42);
      assert.equal(evaluator.evaluate(kf, 5.0), 42);
    });

    it("clamps values before first keyframe and after last keyframe", () => {
      const keyframes = [
        createKeyframe(1.0, 100, "linear"),
        createKeyframe(3.0, 300, "linear"),
      ];

      assert.equal(evaluator.evaluate(keyframes, 0.5), 100);
      assert.equal(evaluator.evaluate(keyframes, 1.0), 100);
      assert.equal(evaluator.evaluate(keyframes, 3.0), 300);
      assert.equal(evaluator.evaluate(keyframes, 4.5), 300);
    });

    it("interpolates intermediate values linearly with linear easing", () => {
      const keyframes = [
        createKeyframe(0.0, 0, "linear"),
        createKeyframe(2.0, 200, "linear"),
      ];

      const valAt1s = evaluator.evaluate(keyframes, 1.0);
      assert.equal(valAt1s, 100);

      const valAt0_5s = evaluator.evaluate(keyframes, 0.5);
      assert.equal(valAt0_5s, 50);
    });

    it("respects hold/step interpolation by holding previous value", () => {
      const keyframes = [
        createKeyframe(0.0, 10),
        createKeyframe(2.0, 50),
      ];

      assert.equal(evaluator.evaluate(keyframes, 0.5, "hold"), 10);
      assert.equal(evaluator.evaluate(keyframes, 1.99, "hold"), 10);
      assert.equal(evaluator.evaluate(keyframes, 2.0, "hold"), 50);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. ANIMATION EVALUATOR
  // ---------------------------------------------------------------------------
  describe("Animation Track Evaluation", () => {
    const animEvaluator = new AnimationEvaluator();

    it("evaluates enabled tracks with keyframes", () => {
      const track = createAnimation("x", [
        createKeyframe(0.0, 0, "linear"),
        createKeyframe(1.0, 100, "linear"),
      ]);

      const value = animEvaluator.evaluateTrack(track, 0.5, 0);
      assert.equal(value, 50);
    });

    it("returns defaultValue when track is disabled", () => {
      const track = createAnimation(
        "x",
        [createKeyframe(0.0, 0), createKeyframe(1.0, 100)],
        { enabled: false }
      );

      const value = animEvaluator.evaluateTrack(track, 0.5, 999);
      assert.equal(value, 999);
    });

    it("returns defaultValue when track has no keyframes", () => {
      const track = createAnimation("x", []);
      const value = animEvaluator.evaluateTrack(track, 0.5, 250);
      assert.equal(value, 250);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. MOTION ENGINE EVALUATION
  // ---------------------------------------------------------------------------
  describe("Motion Engine Evaluation", () => {
    it("evaluates static element without tracks to its exact base transform & opacity", () => {
      const element = createTextElement({
        text: "Static Header",
        transform: {
          ...DEFAULT_TRANSFORM,
          x: 150,
          y: 250,
          width: 400,
          height: 100,
          rotation: 15,
          scaleX: 1.2,
          scaleY: 1.2,
        },
        appearance: {
          ...DEFAULT_APPEARANCE,
          opacity: 0.85,
        },
      });

      const engine = createMotionEngine();
      const result = engine.evaluate(element, 1.0);

      assert.equal(result.elementId, element.id);
      assert.equal(result.time, 1.0);
      assert.equal(result.isAnimated, false);
      assert.equal(result.animatedProperties.length, 0);

      // Exact base transform preserved
      assert.equal(result.transform.x, 150);
      assert.equal(result.transform.y, 250);
      assert.equal(result.transform.width, 400);
      assert.equal(result.transform.height, 100);
      assert.equal(result.transform.rotation, 15);
      assert.equal(result.transform.scaleX, 1.2);
      assert.equal(result.transform.scaleY, 1.2);
      assert.equal(result.appearance.opacity, 0.85);
    });

    it("evaluates element with position animation (x, y) over time", () => {
      const xTrack = createAnimation("x", [
        createKeyframe(0.0, 100, "linear"),
        createKeyframe(2.0, 500, "linear"),
      ]);

      const yTrack = createAnimation("y", [
        createKeyframe(0.0, 50, "linear"),
        createKeyframe(2.0, 250, "linear"),
      ]);

      const element = createShapeElement({
        shapeKind: "rectangle",
        transform: { ...DEFAULT_TRANSFORM, x: 100, y: 50, width: 200, height: 100 },
        propertyTracks: [xTrack, yTrack],
      });

      const engine = defaultMotionEngine;

      // At start (0.0s)
      const res0 = engine.evaluate(element, 0.0);
      assert.equal(res0.transform.x, 100);
      assert.equal(res0.transform.y, 50);
      assert.equal(res0.isAnimated, true);
      assert.deepEqual(res0.animatedProperties.sort(), ["x", "y"]);

      // At midpoint (1.0s)
      const res1 = engine.evaluate(element, 1.0);
      assert.equal(res1.transform.x, 300);
      assert.equal(res1.transform.y, 150);

      // At end (2.0s)
      const res2 = engine.evaluate(element, 2.0);
      assert.equal(res2.transform.x, 500);
      assert.equal(res2.transform.y, 250);

      // Post-end clamped (3.0s)
      const res3 = engine.evaluate(element, 3.0);
      assert.equal(res3.transform.x, 500);
      assert.equal(res3.transform.y, 250);
    });

    it("evaluates element with rotation, scale, and opacity tracks", () => {
      const rotTrack = createAnimation("rotation", [
        createKeyframe(0.0, 0, "linear"),
        createKeyframe(1.0, 180, "linear"),
      ]);

      const scaleXTrack = createAnimation("scaleX", [
        createKeyframe(0.0, 1.0, "linear"),
        createKeyframe(1.0, 2.0, "linear"),
      ]);

      const opacityTrack = createAnimation("opacity", [
        createKeyframe(0.0, 0.0, "linear"),
        createKeyframe(1.0, 1.0, "linear"),
      ]);

      const element = createTextElement({
        text: "Animated Logo",
        propertyTracks: [rotTrack, scaleXTrack, opacityTrack],
      });

      const engine = new MotionEngine();
      const res = engine.evaluate(element, 0.5);

      assert.equal(res.transform.rotation, 90);
      assert.equal(res.transform.scaleX, 1.5);
      assert.equal(res.appearance.opacity, 0.5);
    });

    it("evaluates single property via evaluateProperty()", () => {
      const opacityTrack = createAnimation("opacity", [
        createKeyframe(0.0, 0.2, "linear"),
        createKeyframe(1.0, 0.8, "linear"),
      ]);

      const element = createShapeElement({
        shapeKind: "circle",
        appearance: { ...DEFAULT_APPEARANCE, opacity: 0.2 },
        propertyTracks: [opacityTrack],
      });

      const engine = defaultMotionEngine;
      const opacityAtHalf = engine.evaluateProperty<number>(element, "opacity", 0.5);
      assert.ok(Math.abs((opacityAtHalf ?? 0) - 0.5) < 1e-4);

      // Unanimated property returns base value
      const unWidth = engine.evaluateProperty<number>(element, "width", 0.5);
      assert.equal(unWidth, element.transform.width);
    });

    it("evaluates multiple elements via evaluateElements()", () => {
      const el1 = createTextElement({ id: "text-1", text: "One" });
      const el2 = createTextElement({ id: "text-2", text: "Two" });

      const engine = defaultMotionEngine;
      const map = engine.evaluateElements([el1, el2], 1.5);

      assert.equal(map.size, 2);
      assert.ok(map.has("text-1"));
      assert.ok(map.has("text-2"));
      assert.equal(map.get("text-1")?.elementId, "text-1");
    });

    it("guarantees absolute determinism across successive evaluations", () => {
      const track = createAnimation("rotation", [
        createKeyframe(0.0, 0, "easeInOut"),
        createKeyframe(1.5, 360, "easeInOut"),
      ]);

      const element = createShapeElement({
        propertyTracks: [track],
      });

      const engine = defaultMotionEngine;
      const firstResult = engine.evaluate(element, 0.75);

      for (let i = 0; i < 50; i++) {
        const subsequentResult = engine.evaluate(element, 0.75);
        assert.deepEqual(subsequentResult, firstResult);
      }
    });

    it("clamps evaluated opacity safely within standard [0, 1] range", () => {
      const overOpacityTrack = createAnimation("opacity", [
        createKeyframe(0.0, -0.5, "linear"),
        createKeyframe(1.0, 1.5, "linear"),
      ]);

      const element = createShapeElement({
        propertyTracks: [overOpacityTrack],
      });

      const engine = defaultMotionEngine;
      const at0 = engine.evaluate(element, 0.0);
      assert.equal(at0.appearance.opacity, 0);

      const at1 = engine.evaluate(element, 1.0);
      assert.equal(at1.appearance.opacity, 1);
    });
  });
});
