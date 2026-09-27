/**
 * MOTION-BOT — Keyframe Evaluation Unit Tests
 * Test suite verifying boundary hits, midpoints, easing, malformed inputs, duplicate timestamps, and sorting.
 * Part of Phase 6.3: Keyframe Evaluation.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultKeyframeEvaluator,
  KeyframeEvaluator,
} from "../engine";
import { createKeyframe } from "../services/animation/animation-model";
import { Keyframe } from "../types/animation";

describe("Keyframe Evaluation — Phase 6.3", () => {
  const evaluator = new KeyframeEvaluator();

  // ---------------------------------------------------------------------------
  // 1. BOUNDARY CONDITIONS
  // ---------------------------------------------------------------------------
  describe("Boundary Evaluation", () => {
    const keyframes: Keyframe<number>[] = [
      createKeyframe(1.0, 100, "linear"),
      createKeyframe(3.0, 300, "linear"),
      createKeyframe(5.0, 500, "linear"),
    ];

    it("evaluates before the first keyframe by clamping to first value", () => {
      assert.equal(evaluator.evaluate(keyframes, 0.0), 100);
      assert.equal(evaluator.evaluate(keyframes, -5.0), 100);
      assert.equal(evaluator.evaluate(keyframes, 0.999), 100);
    });

    it("evaluates exactly at the first keyframe", () => {
      assert.equal(evaluator.evaluate(keyframes, 1.0), 100);
    });

    it("evaluates between keyframes linearly", () => {
      assert.equal(evaluator.evaluate(keyframes, 2.0), 200);
      assert.equal(evaluator.evaluate(keyframes, 4.0), 400);
    });

    it("evaluates exactly at the final keyframe", () => {
      assert.equal(evaluator.evaluate(keyframes, 5.0), 500);
    });

    it("evaluates after the final keyframe by clamping to final value", () => {
      assert.equal(evaluator.evaluate(keyframes, 5.001), 500);
      assert.equal(evaluator.evaluate(keyframes, 10.0), 500);
      assert.equal(evaluator.evaluate(keyframes, 1000.0), 500);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. MIDPOINTS & EASING BEHAVIOR
  // ---------------------------------------------------------------------------
  describe("Midpoints and Easing Behavior", () => {
    it("evaluates exact linear midpoint", () => {
      const kfs = [
        createKeyframe(0.0, 0, "linear"),
        createKeyframe(2.0, 200, "linear"),
      ];
      assert.equal(evaluator.evaluate(kfs, 1.0), 100);
    });

    it("evaluates midpoint with easeIn acceleration (progress < 0.5)", () => {
      const kfs = [
        createKeyframe(0.0, 0, "easeIn"),
        createKeyframe(1.0, 100, "easeIn"),
      ];
      // easeIn at 0.5 is 0.125 -> 0 + 100 * 0.125 = 12.5
      const val = evaluator.evaluate(kfs, 0.5);
      assert.equal(val, 12.5);
    });

    it("evaluates midpoint with easeOut deceleration (progress > 0.5)", () => {
      const kfs = [
        createKeyframe(0.0, 0, "easeOut"),
        createKeyframe(1.0, 100, "easeOut"),
      ];
      // easeOut at 0.5 is 0.875 -> 0 + 100 * 0.875 = 87.5
      const val = evaluator.evaluate(kfs, 0.5);
      assert.equal(val, 87.5);
    });

    it("evaluates midpoint with easeInOut symmetry (progress === 0.5)", () => {
      const kfs = [
        createKeyframe(0.0, 0, "easeInOut"),
        createKeyframe(1.0, 100, "easeInOut"),
      ];
      const val = evaluator.evaluate(kfs, 0.5);
      assert.equal(val, 50);
    });

    it("respects hold/step interpolation by holding previous value until exact hit", () => {
      const kfs = [
        createKeyframe(0.0, 10),
        createKeyframe(2.0, 50),
      ];

      assert.equal(evaluator.evaluate(kfs, 0.5, "hold"), 10);
      assert.equal(evaluator.evaluate(kfs, 1.999, "hold"), 10);
      assert.equal(evaluator.evaluate(kfs, 2.0, "hold"), 50);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. SPECIAL & DEGENERATE KEYFRAME SEQUENCES
  // ---------------------------------------------------------------------------
  describe("Special & Degenerate Sequences", () => {
    it("returns undefined for empty keyframe arrays", () => {
      assert.equal(evaluator.evaluate([], 1.0), undefined);
      assert.equal(evaluator.evaluate(null as unknown as Keyframe[], 1.0), undefined);
      assert.equal(evaluator.evaluate(undefined as unknown as Keyframe[], 1.0), undefined);
    });

    it("returns constant value for single keyframe everywhere", () => {
      const single = [createKeyframe(2.5, 77)];
      assert.equal(evaluator.evaluate(single, -10), 77);
      assert.equal(evaluator.evaluate(single, 2.5), 77);
      assert.equal(evaluator.evaluate(single, 100), 77);
    });

    it("automatically sorts out-of-order unsorted keyframes", () => {
      const unsorted = [
        createKeyframe(4.0, 400, "linear"),
        createKeyframe(1.0, 100, "linear"),
        createKeyframe(2.0, 200, "linear"),
      ];

      assert.equal(evaluator.evaluate(unsorted, 0.5), 100);
      assert.equal(evaluator.evaluate(unsorted, 1.5), 150);
      assert.equal(evaluator.evaluate(unsorted, 3.0), 300);
      assert.equal(evaluator.evaluate(unsorted, 5.0), 400);
    });

    it("handles duplicate keyframe timestamps deterministically", () => {
      // Jump cut at t = 2.0 from 100 to 200
      const duplicates = [
        createKeyframe(0.0, 0, "linear"),
        createKeyframe(2.0, 100, "linear"),
        createKeyframe(2.0, 200, "linear"),
        createKeyframe(4.0, 400, "linear"),
      ];

      // Prior to 2.0
      assert.equal(evaluator.evaluate(duplicates, 1.0), 50);

      // Exactly at duplicate timestamp 2.0: evaluates to latest keyframe value
      assert.equal(evaluator.evaluate(duplicates, 2.0), 200);

      // Between 2.0 and 4.0
      assert.equal(evaluator.evaluate(duplicates, 3.0), 300);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. MALFORMED KEYFRAMES & NUMERICAL SANITY
  // ---------------------------------------------------------------------------
  describe("Malformed Keyframes & Numerical Sanity", () => {
    it("filters out null or invalid keyframe objects safely", () => {
      const malformed = [
        null as unknown as Keyframe<number>,
        createKeyframe(1.0, 50, "linear"),
        { time: NaN, value: 999 } as unknown as Keyframe<number>,
        createKeyframe(3.0, 150, "linear"),
        undefined as unknown as Keyframe<number>,
      ];

      assert.equal(evaluator.evaluate(malformed, 0.5), 50);
      assert.equal(evaluator.evaluate(malformed, 2.0), 100);
      assert.equal(evaluator.evaluate(malformed, 4.0), 150);
    });

    it("safely handles non-finite or NaN evaluation times", () => {
      const kfs = [
        createKeyframe(0.0, 10, "linear"),
        createKeyframe(2.0, 50, "linear"),
      ];

      // NaN or non-finite time defaults to 0 safely
      assert.equal(evaluator.evaluate(kfs, NaN), 10);
      assert.equal(evaluator.evaluate(kfs, Infinity), 10);
      assert.equal(evaluator.evaluate(kfs, -Infinity), 10);
    });

    it("never produces NaN or Infinity for numeric tracks", () => {
      const kfs = [
        createKeyframe(0.0, NaN as unknown as number, "linear"),
        createKeyframe(2.0, Infinity as unknown as number, "linear"),
      ];

      const res = evaluator.evaluate(kfs, 1.0);
      assert.ok(typeof res === "number");
      assert.ok(!Number.isNaN(res));
      assert.ok(Number.isFinite(res));
    });
  });

  // ---------------------------------------------------------------------------
  // 5. EXTENSIBILITY FOR CUSTOM TYPES
  // ---------------------------------------------------------------------------
  describe("Type Extensibility", () => {
    it("interpolates boolean values with step midpoint", () => {
      const boolKfs = [
        createKeyframe(0.0, false),
        createKeyframe(2.0, true),
      ];

      assert.equal(evaluator.evaluate(boolKfs, 0.5), false);
      assert.equal(evaluator.evaluate(boolKfs, 1.5), true);
    });

    it("allows registering custom type interpolators", () => {
      const customEvaluator = new KeyframeEvaluator();

      // Custom RGB color string interpolator: "r,g,b"
      customEvaluator.registerInterpolator<string>("string", (start, end, progress) => {
        const sNums = start.split(",").map(Number);
        const eNums = end.split(",").map(Number);
        const r = Math.round(sNums[0] + (eNums[0] - sNums[0]) * progress);
        const g = Math.round(sNums[1] + (eNums[1] - sNums[1]) * progress);
        const b = Math.round(sNums[2] + (eNums[2] - sNums[2]) * progress);
        return `${r},${g},${b}`;
      });

      const colorKfs = [
        createKeyframe(0.0, "0,0,0", "linear"),
        createKeyframe(1.0, "100,200,50", "linear"),
      ];

      const midColor = customEvaluator.evaluate(colorKfs, 0.5);
      assert.equal(midColor, "50,100,25");
    });
  });
});
