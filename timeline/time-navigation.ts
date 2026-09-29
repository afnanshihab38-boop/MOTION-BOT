/**
 * MOTION-BOT — Timeline Time Navigation & Coordinate Conversion
 * Mathematical conversions between continuous time, discrete frames, pixel coordinates,
 * zoom scale, and horizontal scroll offsets.
 * Part of Phase 7.3: Interactive Time Navigation.
 */

import { Scene } from "@/types/scene";
import { evaluateScene, EvaluatedSceneState } from "@/engine";

export interface PixelToTimeOptions {
  scrollLeft?: number;
  duration?: number;
  fps?: number;
  snapToFrames?: boolean;
}

export interface ScrubCalculationParams {
  clientX: number;
  containerLeft: number;
  scrollLeft: number;
  pixelsPerSecond: number;
  duration: number;
  fps?: number;
  snapToFrames?: boolean;
}

/**
 * Converts continuous time in seconds to the nearest discrete integer frame.
 */
export function timeToFrames(time: number, fps: number): number {
  if (typeof time !== "number" || !Number.isFinite(time) || time < 0) {
    return 0;
  }
  const safeFps = typeof fps === "number" && Number.isFinite(fps) && fps > 0 ? Math.round(fps) : 30;
  return Math.round(time * safeFps);
}

/**
 * Converts a discrete integer frame number into continuous time in seconds.
 * Avoids micro floating-point drift.
 */
export function framesToTime(frame: number, fps: number): number {
  if (typeof frame !== "number" || !Number.isFinite(frame) || frame < 0) {
    return 0;
  }
  const safeFps = typeof fps === "number" && Number.isFinite(fps) && fps > 0 ? Math.round(fps) : 30;
  const safeFrame = Math.round(frame);
  const rawTime = safeFrame / safeFps;
  return Math.round(rawTime * 1e6) / 1e6;
}

/**
 * Clamps a given time value strictly between 0 and duration.
 * Safe against NaN, infinite, or negative values.
 */
export function clampTimeToDuration(time: number, duration: number): number {
  if (typeof time !== "number" || isNaN(time) || time <= 0) {
    return 0;
  }
  const safeDuration =
    typeof duration === "number" && !isNaN(duration) && duration >= 0
      ? duration
      : 0;

  if (safeDuration === Infinity) {
    return Number.isFinite(time) ? time : 0;
  }
  if (!Number.isFinite(time) || time >= safeDuration) {
    return safeDuration;
  }
  return time;
}

/**
 * Snaps a continuous timestamp in seconds to the nearest discrete frame based on FPS.
 * Eliminates floating-point accumulation drift (e.g. 0.10000000000000002 -> 0.1).
 */
export function snapTimeToFps(time: number, fps: number): number {
  if (typeof time !== "number" || !Number.isFinite(time) || time < 0) {
    return 0;
  }
  const safeFps = typeof fps === "number" && Number.isFinite(fps) && fps > 0 ? Math.round(fps) : 30;
  const frame = Math.round(time * safeFps);
  const snapped = frame / safeFps;
  return Math.round(snapped * 1e6) / 1e6;
}

/**
 * Converts a continuous timestamp in seconds into canvas horizontal pixels.
 * Accounts for zoom (pixelsPerSecond) and horizontal scroll offset.
 */
export function timeToPixels(
  time: number,
  pixelsPerSecond: number,
  options: { scrollLeft?: number } = {}
): number {
  const safePps =
    typeof pixelsPerSecond === "number" && Number.isFinite(pixelsPerSecond) && pixelsPerSecond > 0
      ? pixelsPerSecond
      : 100;
  const safeTime =
    typeof time === "number" && Number.isFinite(time) ? Math.max(0, time) : 0;
  const scrollOffset = options.scrollLeft ?? 0;
  return Math.round(safeTime * safePps - scrollOffset);
}

/**
 * Converts a canvas pixel coordinate into continuous time in seconds.
 * Strictly respects zoom, horizontal scroll, and duration boundaries.
 */
export function pixelsToTime(
  pixelX: number,
  pixelsPerSecond: number,
  options: PixelToTimeOptions = {}
): number {
  const safePps =
    typeof pixelsPerSecond === "number" && Number.isFinite(pixelsPerSecond) && pixelsPerSecond > 0
      ? pixelsPerSecond
      : 100;
  const scrollLeft = options.scrollLeft ?? 0;
  const fps = options.fps ?? 30;
  const duration =
    typeof options.duration === "number" && !isNaN(options.duration)
      ? Math.max(0, options.duration)
      : Infinity;
  const snap = options.snapToFrames ?? true;

  const safePixelX = typeof pixelX === "number" && Number.isFinite(pixelX) ? pixelX : 0;

  // Total horizontal pixel position on timeline canvas
  const canvasX = Math.max(0, safePixelX + scrollLeft);
  const rawTime = canvasX / safePps;

  // Clamp within [0, duration]
  const clampedTime = clampTimeToDuration(rawTime, duration);

  return snap ? snapTimeToFps(clampedTime, fps) : Math.round(clampedTime * 1e6) / 1e6;
}

/**
 * Accurately calculates target timeline time from pointer client coordinates.
 * Handles viewport offsets, horizontal scroll, zoom, and duration bounds.
 */
export function calculateScrubTime({
  clientX,
  containerLeft,
  scrollLeft,
  pixelsPerSecond,
  duration,
  fps = 30,
  snapToFrames = true,
}: ScrubCalculationParams): number {
  const safeClientX = typeof clientX === "number" && Number.isFinite(clientX) ? clientX : 0;
  const safeContainerLeft =
    typeof containerLeft === "number" && Number.isFinite(containerLeft) ? containerLeft : 0;
  const relativeX = safeClientX - safeContainerLeft;

  return pixelsToTime(relativeX, pixelsPerSecond, {
    scrollLeft,
    duration,
    fps,
    snapToFrames,
  });
}

/**
 * Formats time with frame information for scrubbing badges/tooltips.
 * Example: "01.50s (F45 @ 30fps)"
 */
export function formatTimeAndFrame(time: number, fps: number): string {
  const safeFps = typeof fps === "number" && fps > 0 ? Math.round(fps) : 30;
  const safeTime = clampTimeToDuration(time, Infinity);
  const frame = timeToFrames(safeTime, safeFps);
  const seconds = safeTime.toFixed(2);
  return `${seconds}s (F${frame} @ ${safeFps}fps)`;
}

/**
 * Pipeline integration: Evaluates a scene at the current timeline playhead time
 * using the Phase 6 Motion Engine, producing a canvas-renderable Scene with
 * animated properties resolved.
 *
 * Timeline -> currentTime -> Motion Engine -> evaluated scene -> Canvas
 */
export function getEvaluatedSceneAtTime(scene: Scene, time: number): Scene {
  if (!scene) return scene;
  const safeTime = clampTimeToDuration(time, scene.duration ?? Infinity);
  const evaluatedState = evaluateScene(scene, safeTime);

  return {
    ...scene,
    elements: evaluatedState.elements.map((s) => s.element),
  };
}

/**
 * Evaluates a scene at the current timeline playhead time returning the full
 * EvaluatedSceneState metadata from the Phase 6 Motion Engine.
 */
export function getEvaluatedSceneState(scene: Scene, time: number): EvaluatedSceneState {
  const safeTime = clampTimeToDuration(time, scene?.duration ?? Infinity);
  return evaluateScene(scene, safeTime);
}
