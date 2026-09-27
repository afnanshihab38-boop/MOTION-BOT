/**
 * MOTION-BOT — Concrete Animation Model Implementation
 * Pure factories, validation, and immutable state functions for Keyframes, Animations, and Easing.
 * Part of Phase 3.4: Animation & Timeline Data Model.
 */

import {
  Keyframe,
  KeyframeId,
  Animation,
  AnimatableProperty,
  EasingType,
  EasingDefinition,
  InterpolationType,
} from "@/types/animation";
import { MotionElement } from "@/types/element";

/**
 * Options for creating a new Animation channel.
 */
export interface CreateAnimationOptions<T = number | string> {
  id?: string;
  elementId?: string;
  interpolation?: InterpolationType;
  easing?: EasingType | EasingDefinition;
  keyframes?: Keyframe<T>[];
  enabled?: boolean;
}

/**
 * Generates a unique keyframe identifier.
 */
export function generateKeyframeId(): KeyframeId {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `kf_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `kf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Generates a unique animation track identifier.
 */
export function generateAnimationId(property?: AnimatableProperty): string {
  const prefix = property ? `anim_${property}` : "anim";
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Sorts keyframes chronologically by their time in seconds.
 */
export function sortKeyframesByTime<T = number | string>(keyframes: Keyframe<T>[]): Keyframe<T>[] {
  return [...keyframes].sort((a, b) => a.time - b.time);
}

/**
 * Pure factory to construct a Keyframe at a given time with target value and easing.
 */
export function createKeyframe<T = number | string>(
  time: number,
  value: T,
  easing: EasingType | EasingDefinition = "easeInOut",
  label?: string,
  frame?: number
): Keyframe<T> {
  if (typeof time !== "number" || isNaN(time) || time < 0) {
    throw new Error(`Keyframe time must be a non-negative number in seconds, received: ${time}`);
  }

  return {
    id: generateKeyframeId(),
    time,
    frame,
    value,
    easing,
    label,
  };
}

/**
 * Pure factory to construct a strongly typed Animation for a specific animatable property.
 */
export function createAnimation<T = number | string>(
  property: AnimatableProperty,
  keyframes: Keyframe<T>[] = [],
  options: CreateAnimationOptions<T> = {}
): Animation<T> {
  const sortedKeyframes = sortKeyframesByTime(keyframes);

  return {
    id: options.id || generateAnimationId(property),
    elementId: options.elementId,
    property,
    interpolation: options.interpolation || "bezier",
    easing: options.easing || "easeInOut",
    keyframes: sortedKeyframes,
    enabled: options.enabled !== undefined ? options.enabled : true,
  };
}

/**
 * Validates an individual keyframe data structure.
 */
export function validateKeyframe(keyframe: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!keyframe || typeof keyframe !== "object") {
    return { valid: false, errors: ["Keyframe must be a non-null object"] };
  }

  const k = keyframe as Partial<Keyframe>;

  if (!k.id || typeof k.id !== "string") {
    errors.push("Keyframe requires a valid string id");
  }

  if (typeof k.time !== "number" || isNaN(k.time) || k.time < 0) {
    errors.push("Keyframe requires a non-negative numeric time (in seconds)");
  }

  if (k.value === undefined || k.value === null) {
    errors.push("Keyframe requires a defined value");
  }

  if (!k.easing) {
    errors.push("Keyframe requires an easing specification");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates an animation model and its keyframe sequence.
 */
export function validateAnimation(animation: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!animation || typeof animation !== "object") {
    return { valid: false, errors: ["Animation must be a non-null object"] };
  }

  const a = animation as Partial<Animation>;

  if (!a.id || typeof a.id !== "string") {
    errors.push("Animation requires a valid string id");
  }

  if (!a.property || typeof a.property !== "string") {
    errors.push("Animation requires a valid AnimatableProperty");
  }

  const validInterpolations: InterpolationType[] = ["linear", "bezier", "spring", "step", "hold"];
  if (!a.interpolation || !validInterpolations.includes(a.interpolation)) {
    errors.push(`Animation interpolation must be one of: ${validInterpolations.join(", ")}`);
  }

  if (!Array.isArray(a.keyframes)) {
    errors.push("Animation keyframes must be an array");
  } else {
    for (let i = 0; i < a.keyframes.length; i++) {
      const kfValidation = validateKeyframe(a.keyframes[i]);
      if (!kfValidation.valid) {
        errors.push(`Keyframe [${i}] invalid: ${kfValidation.errors.join(", ")}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// -----------------------------------------------------------------------------
// IMMUTABLE KEYFRAME MUTATORS
// -----------------------------------------------------------------------------

/**
 * Immutably adds a keyframe to an animation in sorted chronological order.
 * If a keyframe already exists at the exact time (within 1ms epsilon), it updates its value.
 */
export function addKeyframe<T = number | string>(
  animation: Animation<T>,
  newKeyframe: Keyframe<T>
): Animation<T> {
  const EPSILON = 0.001;
  const filtered = animation.keyframes.filter(
    (kf) => Math.abs(kf.time - newKeyframe.time) > EPSILON
  );
  const updatedKeyframes = sortKeyframesByTime([...filtered, newKeyframe]);

  return {
    ...animation,
    keyframes: updatedKeyframes,
  };
}

/**
 * Immutably removes a keyframe from an animation by id.
 */
export function removeKeyframe<T = number | string>(
  animation: Animation<T>,
  keyframeId: string
): Animation<T> {
  return {
    ...animation,
    keyframes: animation.keyframes.filter((kf) => kf.id !== keyframeId),
  };
}

/**
 * Immutably updates a specific keyframe's time, value, or easing.
 */
export function updateKeyframe<T = number | string>(
  animation: Animation<T>,
  keyframeId: string,
  updates: Partial<Omit<Keyframe<T>, "id">>
): Animation<T> {
  const updatedKeyframes = animation.keyframes.map((kf) => {
    if (kf.id !== keyframeId) return kf;
    return {
      ...kf,
      ...updates,
    };
  });

  return {
    ...animation,
    keyframes: sortKeyframesByTime(updatedKeyframes),
  };
}

/**
 * Retrieves a keyframe at an exact time if one exists.
 */
export function getKeyframeAtTime<T = number | string>(
  animation: Animation<T>,
  time: number
): Keyframe<T> | undefined {
  const EPSILON = 0.001;
  return animation.keyframes.find((kf) => Math.abs(kf.time - time) <= EPSILON);
}

// -----------------------------------------------------------------------------
// ELEMENT → ANIMATION RELATIONSHIP HELPERS
// -----------------------------------------------------------------------------

/**
 * Immutably attaches or replaces an animation track on an element.
 */
export function addAnimationToElement<E extends MotionElement>(
  element: E,
  animation: Animation
): E {
  const boundAnimation: Animation = {
    ...animation,
    elementId: element.id,
  };

  // Replace existing track for the same property or append
  const existingTracks = element.propertyTracks || [];
  const filteredTracks = existingTracks.filter(
    (track) => track.property !== animation.property
  );

  return {
    ...element,
    propertyTracks: [...filteredTracks, boundAnimation],
  };
}

/**
 * Immutably removes an animation track from an element by animation ID or property.
 */
export function removeAnimationFromElement<E extends MotionElement>(
  element: E,
  animationIdOrProperty: string
): E {
  const existingTracks = element.propertyTracks || [];
  const updatedTracks = existingTracks.filter(
    (track) => track.id !== animationIdOrProperty && track.property !== animationIdOrProperty
  );

  return {
    ...element,
    propertyTracks: updatedTracks,
  };
}

/**
 * Retrieves an animated property track from an element if present.
 */
export function getElementAnimationForProperty(
  element: MotionElement,
  property: AnimatableProperty
): Animation | undefined {
  return element.propertyTracks?.find((track) => track.property === property);
}

/**
 * Lists all properties currently animated on an element.
 */
export function getAnimatedProperties(element: MotionElement): AnimatableProperty[] {
  return (element.propertyTracks || []).map((track) => track.property);
}
