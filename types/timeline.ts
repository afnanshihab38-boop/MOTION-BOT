/**
 * MOTION-BOT — Timeline Data Architecture
 * Data definitions for timeline tracks, clips, channels, and markers.
 * Part of Phase 3.1: Data Architecture & Type System.
 */

/**
 * Unique identifier for a timeline track.
 */
export type TrackId = string;

/**
 * Unique identifier for a timeline clip.
 */
export type ClipId = string;

/**
 * Semantic classification of timeline tracks.
 */
export type TrackType =
  | "video"
  | "audio"
  | "graphic"
  | "text"
  | "effect";

/**
 * A discrete clip placed on a timeline track mapped to an element.
 */
export interface TimelineClip {
  id: ClipId;
  elementId: string;
  trackId: TrackId;
  startFrame: number;
  durationFrames: number;
  inPointFrame: number; // offset into source media/layer
  outPointFrame: number; // trimmed end of source media/layer
  label?: string;
  colorTag?: string;
  muted?: boolean;
  locked?: boolean;
}

/**
 * A timeline track channel holding chronological clips.
 */
export interface TimelineTrack {
  id: TrackId;
  name: string;
  type: TrackType;
  order: number;
  visible: boolean;
  locked: boolean;
  muted: boolean;
  solo: boolean;
  clips: TimelineClip[];
}

/**
 * Timeline cue/marker for beats, sections, or notes.
 */
export interface TimelineMarker {
  id: string;
  frame: number;
  label: string;
  color?: string;
  durationFrames?: number;
}

import { Animation } from "./animation";

/**
 * Complete timeline data representation independent of UI layout.
 */
export interface Timeline {
  id?: string;
  duration: number; // Duration in seconds
  currentTime: number; // Current playhead time in seconds
  fps: number; // Playback framerate
  tracks: TimelineTrack[]; // Chronological track channels
  animations: Animation[]; // Aggregated animations organized on the timeline
  markers?: TimelineMarker[];
  inPoint?: number; // Work area start in seconds
  outPoint?: number; // Work area end in seconds
}

/**
 * Extended timeline organization with discrete frame boundaries.
 */
export interface TimelineStructure extends Timeline {
  totalFrames: number;
  inPointFrame?: number; // Work area start frame
  outPointFrame?: number; // Work area end frame
}

