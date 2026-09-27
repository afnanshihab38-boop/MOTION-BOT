/**
 * MOTION-BOT — Smooth Motion Mathematical Foundation Unit Tests
 * Test suite verifying lerp, easing curves, boundaries, midpoints, range normalization, and determinism.
 * Part of Phase 6.2: Smooth Motion Mathematical Foundation.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  lerp,
  lerpClamped,
  clamp01,
  clamp,
  normalize,
  interpolate,
  linear,
  easeIn,
  easeOut,
  easeInOut,
  safeEasing,
  EasingRegistry,
  defaultEasingRegistry,
  resolveEasing,
} from "../engine";

describe("Smooth Motion Mathematical Foundation — Phase 6.2", () => {
  // ---------------------------------------------------------------------------
  // 1. LINEAR INTERPOLATION (lerp)
  // ---------------------------------------------------------------------------
  describe("Linear Interpolation (lerp)", () => {
    it("satisfies exact boundary conditions at t = 0 and t = 1", () => {
      assert.equal(lerp(10, 50, 0), 10);
      assert.equal(lerp(10, 50, 1), 50);
      assert.equal(lerp(-100, 100, 0), -100);
      assert.equal(lerp(-100, 100, 1), 100);
    });

    it("evaluates exact midpoints correctly", () => {
      assert.equal(lerp(0, 100, 0.5), 50);
      assert.equal(lerp(-50, 50, 0.5), 0);
      assert.equal(lerp(100, 200, 0.5), 150);
      assert.equal(lerp(200, 100, 0.5), 150);
    });

    it("evaluates identical start and end values without divergence", () => {
      assert.equal(lerp(42, 42, 0), 42);
      assert.equal(lerp(42, 42, 0.5), 42);
      assert.equal(lerp(42, 42, 1), 42);
      assert.equal(lerp(42, 42, 5.0), 42);
    });

    it("supports continuous linear extrapolation outside [0, 1]", () => {
      assert.equal(lerp(0, 100, -0.5), -50);
      assert.equal(lerp(0, 100, 1.5), 150);
      assert.equal(lerp(100, 200, 2.0), 300);
    });

    it("lerpClamped restricts progress strictly to [0, 1]", () => {
      assert.equal(lerpClamped(0, 100, -0.5), 0);
      assert.equal(lerpClamped(0, 100, 1.5), 100);
      assert.equal(lerpClamped(-50, 50, 2.0), 50);
      assert.equal(lerpClamped(-50, 50, -10), -50);
    });

    it("prevents invalid numerical results when passed NaN or non-finite inputs", () => {
      assert.equal(lerp(NaN, 100, 0.5), 50);
      assert.equal(lerp(0, NaN, 0.5), 0);
      assert.equal(lerp(0, 100, NaN), 0);
      assert.equal(lerp(0, 100, Infinity), 100);
      assert.equal(lerp(0, 100, -Infinity), 0);
    });

    it("clamp and normalize helper routines function correctly", () => {
      assert.equal(clamp01(-0.5), 0);
      assert.equal(clamp01(0.75), 0.75);
      assert.equal(clamp01(1.5), 1);
      assert.equal(clamp01(NaN), 0);

      assert.equal(clamp(5, 10, 20), 10);
      assert.equal(clamp(15, 10, 20), 15);
      assert.equal(clamp(25, 10, 20), 20);

      assert.equal(normalize(150, 100, 200), 0.5);
      assert.equal(normalize(50, 100, 200), 0);
      assert.equal(normalize(250, 100, 200), 1);
      assert.equal(normalize(100, 100, 100), 0); // division by zero protection
    });
  });

  // ---------------------------------------------------------------------------
  // 2. CORE PHASE 3 EASING FUNCTIONS (linear, easeIn, easeOut, easeInOut)
  // ---------------------------------------------------------------------------
  describe("Core Easing Functions", () => {
    const coreCurves = [
      { name: "linear", fn: linear },
      { name: "easeIn", fn: easeIn },
      { name: "easeOut", fn: easeOut },
      { name: "easeInOut", fn: easeInOut },
    ];

    it("guarantees exact boundary values at t = 0 and t = 1", () => {
      for (const { name, fn } of coreCurves) {
        assert.equal(fn(0), 0, `${name} failed boundary at t=0`);
        assert.equal(fn(1), 1, `${name} failed boundary at t=1`);
      }
    });

    it("safely handles values below expected normalized range (t < 0)", () => {
      for (const { name, fn } of coreCurves) {
        assert.equal(fn(-0.0001), 0, `${name} failed for negative epsilon`);
        assert.equal(fn(-0.5), 0, `${name} failed for negative half`);
        assert.equal(fn(-100), 0, `${name} failed for large negative`);
        assert.equal(fn(-Infinity), 0, `${name} failed for -Infinity`);
      }
    });

    it("safely handles values above expected normalized range (t > 1)", () => {
      for (const { name, fn } of coreCurves) {
        assert.equal(fn(1.0001), 1, `${name} failed for positive epsilon above 1`);
        assert.equal(fn(1.5), 1, `${name} failed for 1.5`);
        assert.equal(fn(1000), 1, `${name} failed for large positive`);
        assert.equal(fn(Infinity), 1, `${name} failed for Infinity`);
      }
    });

    it("safely handles non-finite and NaN inputs without throwing or producing NaN", () => {
      for (const { name, fn } of coreCurves) {
        assert.equal(fn(NaN), 0, `${name} failed for NaN`);
        assert.equal(fn(Number("invalid")), 0, `${name} failed for casted NaN`);
      }
    });

    it("verifies accurate midpoint behavior for core curves", () => {
      // Linear midpoint is exactly 0.5
      assert.equal(linear(0.5), 0.5);

      // EaseIn accelerates from zero: midpoint progress must be < 0.5 (cubic: 0.5^3 = 0.125)
      const inMid = easeIn(0.5);
      assert.ok(inMid < 0.5, `easeIn(0.5) should be < 0.5, got ${inMid}`);
      assert.equal(inMid, 0.125);

      // EaseOut decelerates towards 1: midpoint progress must be > 0.5 (1 - 0.5^3 = 0.875)
      const outMid = easeOut(0.5);
      assert.ok(outMid > 0.5, `easeOut(0.5) should be > 0.5, got ${outMid}`);
      assert.equal(outMid, 0.875);

      // EaseInOut is symmetric: midpoint progress is exactly 0.5
      const inOutMid = easeInOut(0.5);
      assert.equal(inOutMid, 0.5);
    });

    it("guarantees monotonic progression from 0 to 1 without inversions", () => {
      const step = 0.02;
      for (const { name, fn } of coreCurves) {
        let prev = 0;
        for (let t = 0; t <= 1; t += step) {
          const val = fn(t);
          assert.ok(
            val >= prev - 1e-9,
            `${name} violated monotonicity at t=${t}: prev=${prev}, current=${val}`
          );
          prev = val;
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 3. EASING INTERACTION WITH INTERPOLATE
  // ---------------------------------------------------------------------------
  describe("Interpolation with Easing (interpolate)", () => {
    it("interpolates linearly when no easing is provided", () => {
      assert.equal(interpolate(100, 200, 0), 100);
      assert.equal(interpolate(100, 200, 0.5), 150);
      assert.equal(interpolate(100, 200, 1), 200);
    });

    it("applies easeIn cubic progression to interpolate range", () => {
      // easeIn at 0.5 is 0.125 -> 0 + 100 * 0.125 = 12.5
      assert.equal(interpolate(0, 100, 0.5, easeIn), 12.5);
    });

    it("applies easeOut cubic progression to interpolate range", () => {
      // easeOut at 0.5 is 0.875 -> 0 + 100 * 0.875 = 87.5
      assert.equal(interpolate(0, 100, 0.5, easeOut), 87.5);
    });

    it("applies easeInOut symmetric progression to interpolate range", () => {
      assert.equal(interpolate(0, 100, 0.5, easeInOut), 50);
    });

    it("safely normalizes input t out of range when interpolating", () => {
      assert.equal(interpolate(50, 150, -1, easeInOut), 50);
      assert.equal(interpolate(50, 150, 2, easeInOut), 150);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. EXTENSIBLE EASING REGISTRY INTERFACE
  // ---------------------------------------------------------------------------
  describe("Extensible Easing Function Interface & Registry", () => {
    it("allows registering and resolving custom easing curves", () => {
      const customRegistry = new EasingRegistry();

      // Custom quadratic curve
      customRegistry.register("customQuad", (t) => t * t);
      assert.ok(customRegistry.has("customQuad"));

      const resolved = customRegistry.resolve("customQuad");
      assert.equal(resolved(0), 0);
      assert.equal(resolved(0.5), 0.25);
      assert.equal(resolved(1), 1);
    });

    it("safeEasing automatically protects custom registered curves against out-of-range inputs", () => {
      const customRegistry = new EasingRegistry();
      customRegistry.register("unclampedTriple", (t) => t * 3);

      const fn = customRegistry.resolve("unclampedTriple");
      assert.equal(fn(0), 0);
      assert.equal(fn(1), 1);
      assert.equal(fn(-0.5), 0);
      assert.equal(fn(2.0), 1);
      assert.equal(fn(NaN), 0);
    });

    it("falls back to linear when resolving unknown easing names", () => {
      const resolved = defaultEasingRegistry.resolve("nonExistentCurve");
      assert.equal(resolved(0.5), 0.5);
    });

    it("global resolveEasing resolves definitions and strings safely", () => {
      const lin = resolveEasing("linear");
      assert.equal(lin(0.5), 0.5);

      const inOut = resolveEasing("easeInOut");
      assert.equal(inOut(0.5), 0.5);

      const undef = resolveEasing(undefined);
      assert.equal(undef(0.5), 0.5);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. DETERMINISTIC OUTPUT GUARANTEE
  // ---------------------------------------------------------------------------
  describe("Deterministic Output", () => {
    it("produces identical output over 100 consecutive iterations", () => {
      const testValues = [0, 0.001, 0.1, 0.25, 0.5, 0.75, 0.999, 1, -0.5, 1.5, NaN];

      for (const t of testValues) {
        const expectedLerp = lerp(123.456, 789.012, t);
        const expectedEaseIn = easeIn(t);
        const expectedEaseOut = easeOut(t);
        const expectedEaseInOut = easeInOut(t);

        for (let i = 0; i < 100; i++) {
          assert.equal(lerp(123.456, 789.012, t), expectedLerp);
          assert.equal(easeIn(t), expectedEaseIn);
          assert.equal(easeOut(t), expectedEaseOut);
          assert.equal(easeInOut(t), expectedEaseInOut);
        }
      }
    });
  });
});
