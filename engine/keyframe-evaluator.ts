/**
 * MOTION-BOT — Keyframe Sequence Evaluator
 * Deterministic calculation of interpolated values across keyframe sequences with robust edge-case handling.
 * Part of Phase 6.3: Keyframe Evaluation.
 */

import {
  EasingDefinition,
  EasingType,
  InterpolationType,
  Keyframe,
} from "@/types/animation";
import { resolveEasing } from "./easing";
import { clamp01, lerp } from "./interpolation";
import { IKeyframeEvaluator, ValueInterpolator } from "./types";

/**
 * Floating point comparison threshold.
 */
const EPSILON = 1e-6;

/**
 * Evaluates values across keyframe tracks with boundary, easing, and sorting guarantees.
 */
export class KeyframeEvaluator implements IKeyframeEvaluator {
  private readonly typeInterpolators = new Map<string, ValueInterpolator>();

  constructor() {
    this.registerDefaultInterpolators();
  }

  /**
   * Registers a custom interpolator for a specialized data type.
   */
  public registerInterpolator<T>(type: string, interpolator: ValueInterpolator<T>): void {
    this.typeInterpolators.set(type, interpolator as ValueInterpolator);
  }

  /**
   * Evaluates a value from an array of keyframes at an arbitrary time in seconds.
   */
  public evaluate<T = number | string>(
    keyframes: Keyframe<T>[],
    time: number,
    interpolation: InterpolationType = "bezier",
    defaultEasing: EasingType | EasingDefinition = "easeInOut"
  ): T | undefined {
    // 1. Guard against empty or invalid keyframe arrays
    if (!Array.isArray(keyframes) || keyframes.length === 0) {
      return undefined;
    }

    // 2. Sanitize and validate individual keyframes
    const validKeyframes = this.sanitizeKeyframes(keyframes);
    if (validKeyframes.length === 0) {
      return undefined;
    }

    // 3. Single keyframe holds its value everywhere
    if (validKeyframes.length === 1) {
      return validKeyframes[0].value;
    }

    // 4. Sanitize evaluation time (protect against NaN / non-finite)
    const sanitizedTime = typeof time === "number" && Number.isFinite(time) ? time : 0;

    // 5. Boundary case: Before or at the first keyframe
    const firstKeyframe = validKeyframes[0];
    if (sanitizedTime <= firstKeyframe.time + EPSILON) {
      return firstKeyframe.value;
    }

    // 6. Boundary case: At or after the final keyframe
    const lastKeyframe = validKeyframes[validKeyframes.length - 1];
    if (sanitizedTime >= lastKeyframe.time - EPSILON) {
      return lastKeyframe.value;
    }

    // 7. Locate bounding interval [prev, next]
    let prevIndex = 0;
    for (let i = 0; i < validKeyframes.length - 1; i++) {
      if (
        sanitizedTime >= validKeyframes[i].time &&
        sanitizedTime < validKeyframes[i + 1].time
      ) {
        prevIndex = i;
        break;
      }
    }

    // Check exact hit on a keyframe
    if (Math.abs(sanitizedTime - validKeyframes[prevIndex].time) <= EPSILON) {
      // If there are duplicate timestamps, return the latest one at this time
      let lastDuplicateIndex = prevIndex;
      while (
        lastDuplicateIndex + 1 < validKeyframes.length &&
        Math.abs(validKeyframes[lastDuplicateIndex + 1].time - sanitizedTime) <= EPSILON
      ) {
        lastDuplicateIndex++;
      }
      return validKeyframes[lastDuplicateIndex].value;
    }

    const prev = validKeyframes[prevIndex];
    const next = validKeyframes[prevIndex + 1];

    return this.interpolateValues(
      prev,
      next,
      sanitizedTime,
      interpolation,
      defaultEasing
    );
  }

  /**
   * Evaluates the interpolated value between two adjacent keyframes.
   */
  public evaluatePair<T = number | string>(
    prevKeyframe: Keyframe<T>,
    nextKeyframe: Keyframe<T>,
    time: number,
    interpolation: InterpolationType = "bezier"
  ): T {
    const sanitizedTime = typeof time === "number" && Number.isFinite(time) ? time : 0;
    return this.interpolateValues(
      prevKeyframe,
      nextKeyframe,
      sanitizedTime,
      interpolation,
      prevKeyframe.easing || "easeInOut"
    );
  }

  /**
   * Internal pure interpolation routine between two keyframes.
   */
  private interpolateValues<T = number | string>(
    prev: Keyframe<T>,
    next: Keyframe<T>,
    time: number,
    interpolation: InterpolationType,
    defaultEasing: EasingType | EasingDefinition
  ): T {
    const duration = next.time - prev.time;

    // Degenerate interval: duplicate timestamps or zero duration
    if (duration <= EPSILON) {
      return next.value;
    }

    // Normalized progress in [0, 1]
    const rawProgress = (time - prev.time) / duration;
    const clampedProgress = clamp01(rawProgress);

    // Hold / step interpolation: hold previous value until arrival at next
    if (interpolation === "hold" || interpolation === "step") {
      return clampedProgress < 1 ? prev.value : next.value;
    }

    // Resolve easing curve
    const easingSpec = prev.easing || defaultEasing;
    const easingFn = resolveEasing(easingSpec);
    const easedProgress = easingFn(clampedProgress);

    // Numeric interpolation
    if (typeof prev.value === "number" && typeof next.value === "number") {
      const start = Number.isFinite(prev.value) ? prev.value : 0;
      const end = Number.isFinite(next.value) ? next.value : 0;
      const result = lerp(start, end, easedProgress);
      return result as unknown as T;
    }

    // Custom type interpolator fallback
    const valueType = typeof prev.value;
    const customInterpolator = this.typeInterpolators.get(valueType);
    if (customInterpolator) {
      return customInterpolator(prev.value, next.value, easedProgress) as T;
    }

    // Discrete / string midpoint switch
    return (easedProgress < 0.5 ? prev.value : next.value) as T;
  }

  /**
   * Sanitizes keyframes by filtering out invalid objects and ensuring chronological order.
   */
  private sanitizeKeyframes<T>(keyframes: Keyframe<T>[]): Keyframe<T>[] {
    const valid: Keyframe<T>[] = [];

    for (const kf of keyframes) {
      if (
        kf &&
        typeof kf === "object" &&
        typeof kf.time === "number" &&
        Number.isFinite(kf.time) &&
        kf.value !== undefined &&
        kf.value !== null
      ) {
        valid.push(kf);
      }
    }

    if (valid.length <= 1) {
      return valid;
    }

    // Check if sorting is necessary
    let isSorted = true;
    for (let i = 0; i < valid.length - 1; i++) {
      if (valid[i].time > valid[i + 1].time) {
        isSorted = false;
        break;
      }
    }

    return isSorted ? valid : [...valid].sort((a, b) => a.time - b.time);
  }

  private registerDefaultInterpolators(): void {
    // Number interpolator
    this.registerInterpolator<number>("number", (start, end, progress) => {
      const a = Number.isFinite(start) ? start : 0;
      const b = Number.isFinite(end) ? end : 0;
      return lerp(a, b, progress);
    });

    // Boolean interpolator
    this.registerInterpolator<boolean>("boolean", (start, end, progress) => {
      return progress < 0.5 ? start : end;
    });
  }
}

/**
 * Singleton instance of KeyframeEvaluator.
 */
export const defaultKeyframeEvaluator = new KeyframeEvaluator();
