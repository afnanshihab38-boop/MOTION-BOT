/**
 * MOTION-BOT — Animation Track Evaluator
 * Evaluates individual property animation tracks against time.
 * Part of Phase 6.1: Motion Engine Architecture.
 */

import { Animation } from "@/types/animation";
import { defaultKeyframeEvaluator, KeyframeEvaluator } from "./keyframe-evaluator";
import { IAnimationEvaluator, IKeyframeEvaluator } from "./types";

/**
 * Evaluator for individual animation tracks.
 */
export class AnimationEvaluator implements IAnimationEvaluator {
  private readonly keyframeEvaluator: IKeyframeEvaluator;

  constructor(keyframeEvaluator: IKeyframeEvaluator = defaultKeyframeEvaluator) {
    this.keyframeEvaluator = keyframeEvaluator;
  }

  /**
   * Evaluates an individual animation track at a specific time in seconds.
   * If the track is disabled, empty, or missing, safely falls back to defaultValue.
   */
  public evaluateTrack<T = number | string>(
    track: Animation<T>,
    time: number,
    defaultValue?: T
  ): T | undefined {
    if (!track) {
      return defaultValue;
    }

    // Disabled tracks do not alter property values
    if (!track.enabled) {
      return defaultValue;
    }

    // Empty keyframe sequence returns default base value
    if (!track.keyframes || track.keyframes.length === 0) {
      return defaultValue;
    }

    const result = this.keyframeEvaluator.evaluate(
      track.keyframes,
      time,
      track.interpolation || "bezier",
      track.easing || "easeInOut"
    );

    return result !== undefined ? result : defaultValue;
  }
}

/**
 * Singleton instance of AnimationEvaluator.
 */
export const defaultAnimationEvaluator = new AnimationEvaluator();
