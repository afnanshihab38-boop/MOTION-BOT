/**
 * MOTION-BOT — Mathematical Interpolation Foundation
 * Pure numerical interpolation routines and boundary guarantees.
 * Part of Phase 6.2: Smooth Motion Mathematical Foundation.
 */

import { EasingFunction } from "./types";

/**
 * Safely clamps and normalizes an input number strictly between 0 and 1.
 * Guaranteed to return a valid finite number in [0, 1].
 *
 * - Returns 0 for NaN, null/undefined, or values <= 0
 * - Returns 1 for values >= 1 or Infinity
 * - Returns exact value for 0 <= t <= 1
 */
export function clamp01(t: number): number {
  if (typeof t !== "number" || Number.isNaN(t)) {
    return 0;
  }
  if (t <= 0) {
    return 0;
  }
  if (t >= 1) {
    return 1;
  }
  return t;
}

/**
 * Clamps a numerical value within the specified range [min, max].
 * Handles cases where min > max safely.
 */
export function clamp(val: number, min: number, max: number): number {
  if (typeof val !== "number" || Number.isNaN(val)) {
    return min;
  }
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return Math.max(lower, Math.min(upper, val));
}

/**
 * Maps a value from an input range [min, max] to a normalized [0, 1] range.
 * If min equals max, returns 0 to prevent division by zero.
 */
export function normalize(val: number, min: number, max: number): number {
  const range = max - min;
  if (Math.abs(range) < 1e-12) {
    return 0;
  }
  return clamp01((val - min) / range);
}

/**
 * Linearly interpolates between two numeric values a and b at progress t.
 *
 * Exact boundary guarantees:
 * - lerp(a, b, 0) === a
 * - lerp(a, b, 1) === b
 * - lerp(a, a, t) === a
 * - midpoint: lerp(a, b, 0.5) === a + (b - a) * 0.5
 *
 * Prevents invalid numerical results (NaN, non-finite).
 */
export function lerp(a: number, b: number, t: number): number {
  // Validate and sanitize numeric boundaries
  const start = typeof a === "number" && Number.isFinite(a) ? a : 0;
  const end = typeof b === "number" && Number.isFinite(b) ? b : 0;

  if (typeof t !== "number" || Number.isNaN(t)) {
    return start;
  }
  if (t === Infinity) {
    return end;
  }
  if (t === -Infinity) {
    return start;
  }

  // Strict boundary guarantees
  if (t === 0) {
    return start;
  }
  if (t === 1) {
    return end;
  }
  if (start === end) {
    return start;
  }

  // Exact linear interpolation
  const result = start + (end - start) * t;

  // Numerical sanity check
  if (!Number.isFinite(result)) {
    return t < 0.5 ? start : end;
  }

  return result;
}

/**
 * Linearly interpolates between two numeric values with progress t clamped to [0, 1].
 */
export function lerpClamped(a: number, b: number, t: number): number {
  return lerp(a, b, clamp01(t));
}

/**
 * Interpolates between two numbers using an optional easing function.
 * Easing progress is normalized safely to [0, 1] before evaluation.
 */
export function interpolate(
  a: number,
  b: number,
  t: number,
  easingFn?: EasingFunction
): number {
  const normalizedT = clamp01(t);
  const progress = easingFn ? easingFn(normalizedT) : normalizedT;
  return lerp(a, b, progress);
}
