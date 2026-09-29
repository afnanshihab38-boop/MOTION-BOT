/**
 * MOTION-BOT — Timeline Pure State Operations
 * Pure mathematical functions, timecode formatting, state creation, and immutable transitions.
 * Part of Phase 7.1: Timeline Architecture & State.
 */

import {
  TimelinePlaybackState,
  TimelineSelectionState,
  TimelineState,
  TimelineStateOptions,
  TimelineViewportState,
} from "./types";

export const DEFAULT_TIMELINE_DURATION = 5.0; // 5 seconds
export const DEFAULT_TIMELINE_FPS = 30;
export const MIN_TIMELINE_ZOOM = 0.1;
export const MAX_TIMELINE_ZOOM = 10.0;

/**
 * Safely clamps a time value within [0, duration].
 * Returns 0 if time is invalid or non-finite.
 */
export function clampTime(time: number, duration: number): number {
  if (typeof time !== "number" || !Number.isFinite(time)) {
    return 0;
  }
  const safeDuration =
    typeof duration === "number" && Number.isFinite(duration) && duration >= 0
      ? duration
      : 0;
  return Math.max(0, Math.min(time, safeDuration));
}

/**
 * Safely clamps zoom factor within min and max bounds.
 */
export function clampZoom(zoom: number): number {
  if (typeof zoom !== "number" || !Number.isFinite(zoom) || zoom <= 0) {
    return 1.0;
  }
  return Math.max(MIN_TIMELINE_ZOOM, Math.min(zoom, MAX_TIMELINE_ZOOM));
}

/**
 * Converts a continuous timestamp in seconds into a discrete frame index.
 */
export function timeToFrame(time: number, fps: number): number {
  const safeFps = typeof fps === "number" && fps > 0 ? fps : DEFAULT_TIMELINE_FPS;
  const safeTime = typeof time === "number" && Number.isFinite(time) ? Math.max(0, time) : 0;
  return Math.round(safeTime * safeFps);
}

/**
 * Converts a discrete frame index into continuous time in seconds.
 */
export function frameToTime(frame: number, fps: number): number {
  const safeFps = typeof fps === "number" && fps > 0 ? fps : DEFAULT_TIMELINE_FPS;
  const safeFrame = typeof frame === "number" && Number.isFinite(frame) ? Math.max(0, frame) : 0;
  return safeFrame / safeFps;
}

/**
 * Formats a time value into standard SMPTE timecode (HH:MM:SS:FF).
 */
export function formatTimecode(time: number, fps: number): string {
  const safeFps = typeof fps === "number" && fps > 0 ? Math.round(fps) : DEFAULT_TIMELINE_FPS;
  const totalFrames = timeToFrame(time, safeFps);

  const frames = totalFrames % safeFps;
  const totalSeconds = Math.floor(totalFrames / safeFps);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  const pad = (val: number): string => String(val).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}

/**
 * Default initial timeline state.
 */
export const DEFAULT_TIMELINE_STATE: TimelineState = Object.freeze({
  currentTime: 0,
  duration: DEFAULT_TIMELINE_DURATION,
  fps: DEFAULT_TIMELINE_FPS,
  currentFrame: 0,
  totalFrames: Math.round(DEFAULT_TIMELINE_DURATION * DEFAULT_TIMELINE_FPS),
  playbackState: "stopped" as TimelinePlaybackState,
  isPlaying: false,
  isPaused: false,
  isStopped: true,
  selection: Object.freeze({
    selectedTrackId: null,
    selectedKeyframeId: null,
    selectedKeyframeTrackId: null,
    selectedClipId: null,
  }),
  viewport: Object.freeze({
    zoom: 1.0,
    scrollLeft: 0,
    scrollTop: 0,
  }),
  inPoint: 0,
  outPoint: DEFAULT_TIMELINE_DURATION,
  loop: false,
  timecode: "00:00:00:00",
});

/**
 * Pure factory creating a fully validated TimelineState.
 */
export function createInitialTimelineState(
  options: TimelineStateOptions = {}
): TimelineState {
  const duration =
    typeof options.duration === "number" &&
    Number.isFinite(options.duration) &&
    options.duration > 0
      ? options.duration
      : DEFAULT_TIMELINE_DURATION;

  const fps =
    typeof options.fps === "number" &&
    Number.isFinite(options.fps) &&
    options.fps > 0
      ? Math.round(options.fps)
      : DEFAULT_TIMELINE_FPS;

  const currentTime = clampTime(options.currentTime ?? 0, duration);
  const playbackState: TimelinePlaybackState =
    options.playbackState === "playing" || options.playbackState === "paused"
      ? options.playbackState
      : "stopped";

  const inPoint =
    typeof options.inPoint === "number" && Number.isFinite(options.inPoint)
      ? clampTime(options.inPoint, duration)
      : 0;

  const outPoint =
    typeof options.outPoint === "number" && Number.isFinite(options.outPoint)
      ? clampTime(options.outPoint, duration)
      : duration;

  const zoom = clampZoom(options.zoom ?? 1.0);
  const scrollLeft = Math.max(0, options.scrollLeft ?? 0);
  const scrollTop = Math.max(0, options.scrollTop ?? 0);

  return {
    currentTime,
    duration,
    fps,
    currentFrame: timeToFrame(currentTime, fps),
    totalFrames: timeToFrame(duration, fps),
    playbackState,
    isPlaying: playbackState === "playing",
    isPaused: playbackState === "paused",
    isStopped: playbackState === "stopped",
    selection: {
      selectedTrackId: null,
      selectedKeyframeId: null,
      selectedKeyframeTrackId: null,
      selectedClipId: null,
    },
    viewport: {
      zoom,
      scrollLeft,
      scrollTop,
    },
    inPoint,
    outPoint: Math.max(inPoint, outPoint),
    loop: options.loop ?? false,
    timecode: formatTimecode(currentTime, fps),
  };
}

/**
 * Pure state reducer updating current playhead time.
 */
export function updateCurrentTime(
  state: TimelineState,
  time: number
): TimelineState {
  const clamped = clampTime(time, state.duration);
  if (clamped === state.currentTime) {
    return state;
  }

  return {
    ...state,
    currentTime: clamped,
    currentFrame: timeToFrame(clamped, state.fps),
    timecode: formatTimecode(clamped, state.fps),
  };
}

/**
 * Pure state reducer updating timeline duration.
 */
export function updateDuration(
  state: TimelineState,
  duration: number
): TimelineState {
  const safeDuration =
    typeof duration === "number" && Number.isFinite(duration) && duration > 0
      ? duration
      : DEFAULT_TIMELINE_DURATION;

  if (safeDuration === state.duration) {
    return state;
  }

  const nextCurrentTime = Math.min(state.currentTime, safeDuration);
  const wasOutPointAtEnd = state.outPoint >= state.duration;
  const nextOutPoint = wasOutPointAtEnd
    ? safeDuration
    : Math.min(state.outPoint, safeDuration);

  return {
    ...state,
    duration: safeDuration,
    currentTime: nextCurrentTime,
    currentFrame: timeToFrame(nextCurrentTime, state.fps),
    totalFrames: timeToFrame(safeDuration, state.fps),
    outPoint: Math.max(state.inPoint, nextOutPoint),
    timecode: formatTimecode(nextCurrentTime, state.fps),
  };
}

/**
 * Pure state reducer updating playback transport state.
 */
export function updatePlaybackState(
  state: TimelineState,
  playbackState: TimelinePlaybackState
): TimelineState {
  if (state.playbackState === playbackState) {
    return state;
  }

  let nextCurrentTime = state.currentTime;

  // If transitioning to playing and playhead is at or beyond duration/outPoint, reset to inPoint
  if (playbackState === "playing" && nextCurrentTime >= state.outPoint) {
    nextCurrentTime = state.inPoint;
  }

  // If stopping, reset playhead to inPoint
  if (playbackState === "stopped") {
    nextCurrentTime = state.inPoint;
  }

  return {
    ...state,
    currentTime: nextCurrentTime,
    currentFrame: timeToFrame(nextCurrentTime, state.fps),
    timecode: formatTimecode(nextCurrentTime, state.fps),
    playbackState,
    isPlaying: playbackState === "playing",
    isPaused: playbackState === "paused",
    isStopped: playbackState === "stopped",
  };
}

/**
 * Pure state reducer updating track, clip, and keyframe selections.
 */
export function updateSelection(
  state: TimelineState,
  updates: Partial<TimelineSelectionState>
): TimelineState {
  return {
    ...state,
    selection: {
      ...state.selection,
      ...updates,
    },
  };
}

/**
 * Pure state reducer updating viewport zoom and scroll offsets.
 */
export function updateViewport(
  state: TimelineState,
  updates: Partial<TimelineViewportState>
): TimelineState {
  return {
    ...state,
    viewport: {
      ...state.viewport,
      zoom: updates.zoom !== undefined ? clampZoom(updates.zoom) : state.viewport.zoom,
      scrollLeft:
        updates.scrollLeft !== undefined
          ? Math.max(0, updates.scrollLeft)
          : state.viewport.scrollLeft,
      scrollTop:
        updates.scrollTop !== undefined
          ? Math.max(0, updates.scrollTop)
          : state.viewport.scrollTop,
    },
  };
}

/**
 * Pure state reducer updating work area boundaries.
 */
export function updateWorkArea(
  state: TimelineState,
  inPoint?: number,
  outPoint?: number
): TimelineState {
  const safeIn =
    inPoint !== undefined ? clampTime(inPoint, state.duration) : state.inPoint;
  const safeOut =
    outPoint !== undefined ? clampTime(outPoint, state.duration) : state.outPoint;

  return {
    ...state,
    inPoint: Math.min(safeIn, safeOut),
    outPoint: Math.max(safeIn, safeOut),
  };
}

/**
 * Pure state reducer shifting playhead by a discrete number of frames.
 */
export function stepFrames(
  state: TimelineState,
  deltaFrames: number
): TimelineState {
  const currentFrame = state.currentFrame;
  const nextFrame = Math.max(0, Math.min(state.totalFrames, currentFrame + deltaFrames));
  const nextTime = frameToTime(nextFrame, state.fps);
  return updateCurrentTime(state, nextTime);
}
