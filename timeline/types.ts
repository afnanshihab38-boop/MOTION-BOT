/**
 * MOTION-BOT — Timeline Architecture & State Interfaces
 * Framework-independent type contracts for timeline playback state, playhead position,
 * selection, viewport, and transport operations.
 * Part of Phase 7.1: Timeline Architecture & State.
 */

import { Scene } from "@/types/scene";
import { Project } from "@/types/project";

/**
 * Supported playback transport states for the timeline.
 */
export type TimelinePlaybackState = "stopped" | "playing" | "paused";

/**
 * Timeline selection state tracking selected track, clip, and keyframe IDs.
 */
export interface TimelineSelectionState {
  /** Identifier of the currently focused timeline track, or null */
  selectedTrackId: string | null;
  /** Identifier of the currently focused keyframe, or null */
  selectedKeyframeId: string | null;
  /** Identifier of the track that owns the selected keyframe, or null */
  selectedKeyframeTrackId: string | null;
  /** Identifier of the currently selected clip, or null */
  selectedClipId: string | null;
}

/**
 * Viewport navigation state for the timeline dock (zoom scale and scroll offsets).
 */
export interface TimelineViewportState {
  /** Zoom scale multiplier (1.0 = standard, 0.5 = zoom out, 2.0 = zoom in) */
  zoom: number;
  /** Horizontal scroll offset in pixels */
  scrollLeft: number;
  /** Vertical scroll offset in pixels (for scrolling through multiple tracks) */
  scrollTop: number;
}

/**
 * Comprehensive timeline state.
 * Strictly decoupled from persistent Project/Scene models to prevent accidental mutations.
 */
export interface TimelineState {
  /** Current playhead time in seconds (clamped to [0, duration]) */
  currentTime: number;
  /** Total timeline duration in seconds */
  duration: number;
  /** Playback framerate in frames per second (e.g. 30, 60) */
  fps: number;
  /** Current playhead frame derived from currentTime and fps */
  currentFrame: number;
  /** Total frame count derived from duration and fps */
  totalFrames: number;
  /** Current transport playback state */
  playbackState: TimelinePlaybackState;
  /** Convenience boolean flag indicating whether playback is active */
  isPlaying: boolean;
  /** Convenience boolean flag indicating whether playback is paused */
  isPaused: boolean;
  /** Convenience boolean flag indicating whether playback is stopped */
  isStopped: boolean;
  /** Track, clip, and keyframe selection */
  selection: TimelineSelectionState;
  /** Timeline viewport zoom and scroll state */
  viewport: TimelineViewportState;
  /** Optional in-point (work area start) in seconds */
  inPoint: number;
  /** Optional out-point (work area end) in seconds */
  outPoint: number;
  /** Whether playback should loop upon reaching duration/outPoint */
  loop: boolean;
  /** Formatted SMPTE timecode (HH:MM:SS:FF) */
  timecode: string;
}

/**
 * Listener callback function triggered when TimelineState changes.
 */
export type TimelineStateListener = (state: TimelineState) => void;

/**
 * Configuration options for initializing timeline state.
 */
export interface TimelineStateOptions {
  currentTime?: number;
  duration?: number;
  fps?: number;
  playbackState?: TimelinePlaybackState;
  zoom?: number;
  scrollLeft?: number;
  scrollTop?: number;
  inPoint?: number;
  outPoint?: number;
  loop?: boolean;
}

/**
 * Interface defining all timeline state management and transport operations.
 */
export interface ITimelineStateManager {
  /**
   * Returns a snapshot of the current immutable timeline state.
   */
  getState(): TimelineState;

  /**
   * Updates the current playhead time in seconds.
   * Strictly clamps time between 0 and duration.
   */
  setCurrentTime(time: number): void;

  /**
   * Updates the timeline duration in seconds.
   * Re-clamps currentTime if necessary.
   */
  setDuration(duration: number): void;

  /**
   * Updates the timeline frame rate in fps.
   */
  setFps(fps: number): void;

  /**
   * Transitions playback state to "playing".
   * If current playhead is at duration/outPoint, automatically restarts from inPoint/0.
   */
  play(): void;

  /**
   * Transitions playback state to "paused", keeping the current playhead position.
   */
  pause(): void;

  /**
   * Transitions playback state to "stopped" and resets playhead to inPoint or 0.
   */
  stop(): void;

  /**
   * Seeks playhead directly to a target time in seconds.
   */
  seek(time: number): void;

  /**
   * Seeks playhead directly to a discrete frame number.
   */
  seekFrame(frame: number): void;

  /**
   * Steps playhead forward by a specified number of frames (default 1).
   */
  stepForward(frames?: number): void;

  /**
   * Steps playhead backward by a specified number of frames (default 1).
   */
  stepBackward(frames?: number): void;

  /**
   * Jumps playhead to the beginning (inPoint or 0s).
   */
  jumpToStart(): void;

  /**
   * Jumps playhead to the end (outPoint or duration).
   */
  jumpToEnd(): void;

  /**
   * Focuses or clears track selection.
   */
  selectTrack(trackId: string | null): void;

  /**
   * Focuses or clears keyframe selection.
   */
  selectKeyframe(keyframeId: string | null, trackId?: string | null): void;

  /**
   * Focuses or clears clip selection.
   */
  selectClip(clipId: string | null): void;

  /**
   * Clears all timeline selections.
   */
  clearSelection(): void;

  /**
   * Sets timeline zoom scale.
   */
  setZoom(zoom: number): void;

  /**
   * Sets timeline horizontal and vertical scroll offsets.
   */
  setScrollPosition(scrollLeft: number, scrollTop?: number): void;

  /**
   * Toggles or sets looping behavior.
   */
  setLoop(loop: boolean): void;

  /**
   * Sets work area in-point and out-point in seconds.
   */
  setWorkArea(inPoint?: number, outPoint?: number): void;

  /**
   * Synchronizes timeline duration and frame rate from an active Scene data model.
   * Does NOT mutate the scene.
   */
  syncWithScene(scene: Scene): void;

  /**
   * Synchronizes timeline duration and frame rate from a Project data model.
   * Does NOT mutate the project.
   */
  syncWithProject(project: Project): void;

  /**
   * Subscribes to timeline state changes.
   * Returns an unsubscribe cleanup function.
   */
  subscribe(listener: TimelineStateListener): () => void;
}
