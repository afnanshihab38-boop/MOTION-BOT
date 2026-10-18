/**
 * MOTION-BOT — Keyframe & Layer Timing Manipulation Service
 * Pure, immutable functions for adding, moving, deleting keyframes,
 * updating layer start/duration times, and synchronizing animated properties.
 * Part of Phase 8.3: Timeline + Keyframe Editing.
 */

import {
  AnimatableProperty,
  Keyframe,
  PropertyAnimationTrack,
} from "@/types/animation";
import { MotionElement } from "@/types/element";
import {
  createAnimation,
  createKeyframe,
  addKeyframe,
  removeKeyframe,
  updateKeyframe,
  addAnimationToElement,
  removeAnimationFromElement,
  getKeyframeAtTime,
} from "@/services/animation/animation-model";

export interface LayerTiming {
  startTime: number; // in seconds
  duration: number; // in seconds
  endTime: number; // in seconds
  startFrame: number;
  durationFrames: number;
}

/**
 * Extracts normalized layer timing in seconds and frames from an element.
 */
export function getElementTiming(
  element: MotionElement,
  fps = 30,
  fallbackDuration = 10
): LayerTiming {
  const safeFps = fps > 0 ? fps : 30;
  const startTime =
    typeof (element as any).startTime === "number" && Number.isFinite((element as any).startTime)
      ? Math.max(0, (element as any).startTime)
      : typeof element.startFrame === "number" && Number.isFinite(element.startFrame)
      ? Math.max(0, element.startFrame / safeFps)
      : 0;

  const duration =
    typeof (element as any).duration === "number" && Number.isFinite((element as any).duration)
      ? Math.max(0.1, (element as any).duration)
      : typeof element.durationFrames === "number" && Number.isFinite(element.durationFrames)
      ? Math.max(0.1, element.durationFrames / safeFps)
      : Math.max(0.1, fallbackDuration);

  const startFrame = Math.round(startTime * safeFps);
  const durationFrames = Math.max(1, Math.round(duration * safeFps));

  return {
    startTime,
    duration,
    endTime: startTime + duration,
    startFrame,
    durationFrames,
  };
}

/**
 * Immutably updates an element's layer timing (startTime, duration, startFrame, durationFrames).
 */
export function updateElementTiming(
  element: MotionElement,
  startTime: number,
  duration: number,
  fps = 30
): MotionElement {
  const safeFps = fps > 0 ? fps : 30;
  const safeStartTime = Math.max(0, Number.isFinite(startTime) ? startTime : 0);
  const safeDuration = Math.max(0.05, Number.isFinite(duration) ? duration : 0.1);
  const startFrame = Math.round(safeStartTime * safeFps);
  const durationFrames = Math.max(1, Math.round(safeDuration * safeFps));

  return {
    ...element,
    startFrame,
    durationFrames,
    startTime: safeStartTime,
    duration: safeDuration,
  } as unknown as MotionElement;
}

/**
 * Resolves the baseline value of an animatable property from an element's static transform or appearance.
 */
export function getBasePropertyValue(
  element: MotionElement,
  property: AnimatableProperty
): number | string {
  switch (property) {
    case "x":
      return element.transform?.x ?? 0;
    case "y":
      return element.transform?.y ?? 0;
    case "width":
      return element.transform?.width ?? 100;
    case "height":
      return element.transform?.height ?? 100;
    case "rotation":
      return element.transform?.rotation ?? 0;
    case "scaleX":
      return element.transform?.scaleX ?? 1;
    case "scaleY":
      return element.transform?.scaleY ?? 1;
    case "opacity":
      return element.appearance?.opacity ?? 1;
    case "fontSize":
      return (element as any).fontSize ?? 32;
    default:
      return 0;
  }
}

/**
 * Immutably adds a keyframe to an element for a specific property at a given timestamp.
 * If an animation track does not exist for the property, initializes one with baseline values.
 */
export function addKeyframeToElement(
  element: MotionElement,
  property: AnimatableProperty,
  time: number,
  value?: number | string,
  fps = 30
): { element: MotionElement; keyframe: Keyframe } {
  const safeTime = Math.max(0, Number.isFinite(time) ? time : 0);
  const safeFrame = Math.round(safeTime * (fps > 0 ? fps : 30));
  const resolvedValue = value !== undefined ? value : getBasePropertyValue(element, property);

  const newKeyframe = createKeyframe(safeTime, resolvedValue, "easeInOut", undefined, safeFrame);

  const existingTrack = element.propertyTracks?.find((t) => t.property === property);

  let updatedTrack: PropertyAnimationTrack;

  if (existingTrack) {
    updatedTrack = addKeyframe(existingTrack, newKeyframe);
  } else {
    // Create new track with base value at time 0 if current time > 0
    const initialKeyframes: Keyframe[] = [];
    if (safeTime > 0.001) {
      const baseVal = getBasePropertyValue(element, property);
      initialKeyframes.push(createKeyframe(0, baseVal, "easeInOut", undefined, 0));
    }
    initialKeyframes.push(newKeyframe);
    updatedTrack = createAnimation(property, initialKeyframes, {
      interpolation: "bezier",
      easing: "easeInOut",
      enabled: true,
    });
  }

  const updatedElement = addAnimationToElement(element, updatedTrack);

  return {
    element: updatedElement,
    keyframe: newKeyframe,
  };
}

/**
 * Immutably moves an existing keyframe on an element to a new timestamp.
 * Supports calling as (element, keyframeId, newTime, fps) or (element, property, keyframeId, newTime, fps).
 */
export function moveKeyframeOnElement(
  element: MotionElement,
  propertyOrKeyframeId: AnimatableProperty | string,
  keyframeIdOrNewTime: string | number,
  newTimeOrFps?: number,
  fps = 30
): MotionElement {
  let keyframeId: string;
  let newTime: number;
  let effectiveFps: number;

  if (typeof keyframeIdOrNewTime === "number") {
    keyframeId = propertyOrKeyframeId as string;
    newTime = keyframeIdOrNewTime;
    effectiveFps = typeof newTimeOrFps === "number" ? newTimeOrFps : 30;
  } else {
    keyframeId = keyframeIdOrNewTime;
    newTime = typeof newTimeOrFps === "number" ? newTimeOrFps : 0;
    effectiveFps = fps;
  }

  const safeTime = Math.max(0, Number.isFinite(newTime) ? newTime : 0);
  const safeFrame = Math.round(safeTime * (effectiveFps > 0 ? effectiveFps : 30));

  const track = element.propertyTracks?.find((t) =>
    t.keyframes.some((kf) => kf.id === keyframeId)
  );
  if (!track) return element;

  const targetKf = track.keyframes.find((kf) => kf.id === keyframeId);
  if (!targetKf) return element;

  const updatedTrack = updateKeyframe(track, keyframeId, {
    time: safeTime,
    frame: safeFrame,
  });

  return addAnimationToElement(element, updatedTrack);
}

/**
 * Immutably deletes a keyframe from an element's property track.
 * Supports calling as (element, keyframeId) or (element, property, keyframeId).
 */
export function deleteKeyframeFromElement(
  element: MotionElement,
  propertyOrKeyframeId: AnimatableProperty | string,
  maybeKeyframeId?: string
): MotionElement {
  const keyframeId = maybeKeyframeId || (propertyOrKeyframeId as string);

  const track = element.propertyTracks?.find((t) =>
    t.keyframes.some((kf) => kf.id === keyframeId)
  );
  if (!track) return element;

  const updatedTrack = removeKeyframe(track, keyframeId);

  // If no keyframes remain, remove the track entirely
  if (updatedTrack.keyframes.length === 0) {
    return removeAnimationFromElement(element, updatedTrack.id);
  }

  return addAnimationToElement(element, updatedTrack);
}

/**
 * Updates a keyframe value directly on an element.
 */
export function updateKeyframeValueOnElement(
  element: MotionElement,
  property: AnimatableProperty,
  keyframeId: string,
  newValue: number | string
): MotionElement {
  const track = element.propertyTracks?.find((t) => t.property === property);
  if (!track) return element;

  const updatedTrack = updateKeyframe(track, keyframeId, {
    value: newValue,
  });

  return addAnimationToElement(element, updatedTrack);
}

/**
 * Synchronizes property edits (from Inspector or Canvas) with active keyframe tracks.
 * If the property is animated and a keyframe exists near currentTime (within 1/2 frame tolerance),
 * updates that keyframe value. If no keyframe exists at currentTime, adds one.
 */
export function syncPropertyWithKeyframes(
  element: MotionElement,
  property: AnimatableProperty,
  newValue: number | string,
  currentTime: number,
  fps = 30
): MotionElement {
  const track = element.propertyTracks?.find((t) => t.property === property);
  if (!track || track.keyframes.length === 0) {
    return element;
  }

  const frameDuration = 1 / (fps > 0 ? fps : 30);
  const tolerance = frameDuration * 0.6; // ~1/2 frame tolerance

  const existingKf = track.keyframes.find(
    (kf) => Math.abs(kf.time - currentTime) <= tolerance
  );

  if (existingKf) {
    const updated = updateKeyframeValueOnElement(element, property, existingKf.id, newValue);
    return applyBasePropertyUpdate(updated, property, newValue);
  } else {
    const { element: withNewKf } = addKeyframeToElement(
      element,
      property,
      currentTime,
      newValue,
      fps
    );
    return applyBasePropertyUpdate(withNewKf, property, newValue);
  }
}

/**
 * Updates an element's base transform or appearance property to match current keyframe value.
 */
function applyBasePropertyUpdate(
  element: MotionElement,
  property: AnimatableProperty,
  value: number | string
): MotionElement {
  if (["x", "y", "scaleX", "scaleY", "rotation", "width", "height"].includes(property)) {
    return {
      ...element,
      transform: {
        ...element.transform,
        [property]: typeof value === "number" ? value : parseFloat(value as string) || 0,
      },
    };
  }
  if (property === "opacity") {
    return {
      ...element,
      appearance: {
        ...element.appearance,
        opacity: typeof value === "number" ? value : parseFloat(value as string) || 1,
      },
    };
  }
  return element;
}
