/**
 * MOTION-BOT — Concrete Timeline Model Implementation
 * Pure factory, validation, and immutable state functions for Timelines, Tracks, and Clips.
 * Part of Phase 3.4: Animation & Timeline Data Model.
 */

import {
  Timeline,
  TimelineTrack,
  TimelineClip,
  TimelineMarker,
  TrackType,
  TrackId,
  ClipId,
} from "@/types/timeline";
import { Animation } from "@/types/animation";
import { Scene } from "@/types/scene";

/**
 * Options for creating a new Timeline instance.
 */
export interface CreateTimelineOptions {
  id?: string;
  duration?: number; // in seconds
  currentTime?: number; // in seconds
  fps?: number;
  tracks?: TimelineTrack[];
  animations?: Animation[];
  markers?: TimelineMarker[];
  inPoint?: number;
  outPoint?: number;
}

/**
 * Options for creating a Timeline Track channel.
 */
export interface CreateTimelineTrackOptions {
  id?: string;
  name: string;
  type: TrackType;
  order?: number;
  visible?: boolean;
  locked?: boolean;
  muted?: boolean;
  solo?: boolean;
  clips?: TimelineClip[];
}

/**
 * Options for placing a Clip on a Timeline Track.
 */
export interface CreateTimelineClipOptions {
  id?: string;
  elementId: string;
  trackId: TrackId;
  startFrame: number;
  durationFrames: number;
  inPointFrame?: number;
  outPointFrame?: number;
  label?: string;
  colorTag?: string;
  muted?: boolean;
  locked?: boolean;
}

/**
 * Options for creating a Timeline Marker.
 */
export interface CreateTimelineMarkerOptions {
  id?: string;
  frame: number;
  label: string;
  color?: string;
  durationFrames?: number;
}

/**
 * Generates a unique track identifier.
 */
export function generateTrackId(type: TrackType = "graphic"): TrackId {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `track_${type}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `track_${type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Generates a unique clip identifier.
 */
export function generateClipId(): ClipId {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `clip_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `clip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Generates a unique timeline identifier.
 */
export function generateTimelineId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `timeline_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `timeline_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Pure factory to construct a Timeline data model independent of UI layout.
 */
export function createTimeline(options: CreateTimelineOptions = {}): Timeline {
  const duration = typeof options.duration === "number" && options.duration > 0
    ? options.duration
    : 5.0;

  const currentTime = typeof options.currentTime === "number" && options.currentTime >= 0
    ? Math.min(options.currentTime, duration)
    : 0;

  const fps = typeof options.fps === "number" && options.fps > 0 ? options.fps : 30;

  return {
    id: options.id || generateTimelineId(),
    duration,
    currentTime,
    fps,
    tracks: options.tracks ? [...options.tracks] : [],
    animations: options.animations ? [...options.animations] : [],
    markers: options.markers ? [...options.markers] : [],
    inPoint: options.inPoint !== undefined ? options.inPoint : 0,
    outPoint: options.outPoint !== undefined ? options.outPoint : duration,
  };
}

/**
 * Pure factory to construct a Timeline Track channel.
 */
export function createTimelineTrack(options: CreateTimelineTrackOptions): TimelineTrack {
  return {
    id: options.id || generateTrackId(options.type),
    name: options.name,
    type: options.type,
    order: typeof options.order === "number" ? options.order : 0,
    visible: options.visible !== undefined ? options.visible : true,
    locked: options.locked !== undefined ? options.locked : false,
    muted: options.muted !== undefined ? options.muted : false,
    solo: options.solo !== undefined ? options.solo : false,
    clips: options.clips ? [...options.clips] : [],
  };
}

/**
 * Pure factory to construct a discrete Timeline Clip mapped to an element.
 */
export function createTimelineClip(options: CreateTimelineClipOptions): TimelineClip {
  return {
    id: options.id || generateClipId(),
    elementId: options.elementId,
    trackId: options.trackId,
    startFrame: options.startFrame,
    durationFrames: options.durationFrames,
    inPointFrame: options.inPointFrame !== undefined ? options.inPointFrame : 0,
    outPointFrame: options.outPointFrame !== undefined ? options.outPointFrame : options.durationFrames,
    label: options.label,
    colorTag: options.colorTag,
    muted: options.muted !== undefined ? options.muted : false,
    locked: options.locked !== undefined ? options.locked : false,
  };
}

/**
 * Pure factory to construct a Timeline Marker cue.
 */
export function createTimelineMarker(options: CreateTimelineMarkerOptions): TimelineMarker {
  return {
    id: options.id || `marker_${Date.now().toString(36)}`,
    frame: options.frame,
    label: options.label,
    color: options.color,
    durationFrames: options.durationFrames,
  };
}

/**
 * Validates a Timeline data model.
 */
export function validateTimeline(timeline: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!timeline || typeof timeline !== "object") {
    return { valid: false, errors: ["Timeline must be a non-null object"] };
  }

  const t = timeline as Partial<Timeline>;

  if (typeof t.duration !== "number" || isNaN(t.duration) || t.duration <= 0) {
    errors.push("Timeline requires a positive numeric duration (in seconds)");
  }

  if (typeof t.currentTime !== "number" || isNaN(t.currentTime) || t.currentTime < 0) {
    errors.push("Timeline requires a non-negative numeric currentTime (in seconds)");
  }

  if (typeof t.fps !== "number" || isNaN(t.fps) || t.fps <= 0) {
    errors.push("Timeline requires a positive numeric fps");
  }

  if (!Array.isArray(t.tracks)) {
    errors.push("Timeline tracks must be an array");
  }

  if (!Array.isArray(t.animations)) {
    errors.push("Timeline animations must be an array");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// -----------------------------------------------------------------------------
// IMMUTABLE TIMELINE MUTATORS
// -----------------------------------------------------------------------------

/**
 * Immutably updates the current playhead time on a timeline (clamped between 0 and duration).
 */
export function setTimelineCurrentTime(timeline: Timeline, currentTime: number): Timeline {
  const clampedTime = Math.max(0, Math.min(currentTime, timeline.duration));
  return {
    ...timeline,
    currentTime: clampedTime,
  };
}

/**
 * Immutably updates the total duration of a timeline.
 */
export function setTimelineDuration(timeline: Timeline, duration: number): Timeline {
  if (duration <= 0) {
    throw new Error(`Timeline duration must be positive: ${duration}`);
  }
  return {
    ...timeline,
    duration,
    currentTime: Math.min(timeline.currentTime, duration),
    outPoint: Math.min(timeline.outPoint ?? duration, duration),
  };
}

/**
 * Immutably adds a track to the timeline.
 */
export function addTrackToTimeline(timeline: Timeline, track: TimelineTrack): Timeline {
  return {
    ...timeline,
    tracks: [...timeline.tracks, track],
  };
}

/**
 * Immutably removes a track from the timeline by trackId.
 */
export function removeTrackFromTimeline(timeline: Timeline, trackId: TrackId): Timeline {
  return {
    ...timeline,
    tracks: timeline.tracks.filter((t) => t.id !== trackId),
  };
}

/**
 * Immutably adds a clip to a specific track in the timeline.
 */
export function addClipToTrack(
  timeline: Timeline,
  trackId: TrackId,
  clip: TimelineClip
): Timeline {
  const updatedTracks = timeline.tracks.map((track) => {
    if (track.id !== trackId) return track;
    return {
      ...track,
      clips: [...track.clips, clip],
    };
  });

  return {
    ...timeline,
    tracks: updatedTracks,
  };
}

/**
 * Immutably registers an animation into the timeline animation collection.
 */
export function addAnimationToTimeline(timeline: Timeline, animation: Animation): Timeline {
  const existing = timeline.animations.filter((a) => a.id !== animation.id);
  return {
    ...timeline,
    animations: [...existing, animation],
  };
}

/**
 * Attaches a Timeline to a Scene data model (Project -> Scene -> Timeline).
 */
export function attachTimelineToScene(scene: Scene, timeline: Timeline): Scene {
  return {
    ...scene,
    timeline,
    duration: timeline.duration,
  };
}
