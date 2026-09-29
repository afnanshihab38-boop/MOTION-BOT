/**
 * MOTION-BOT — Structured Motion Plan Type System
 * Phase 7.4: Structured Motion Plan Generator
 *
 * Defines the deterministic, schema-validated Motion Plan data structures
 * that bridge high-level creative briefs to low-level timeline & animation engines.
 */

import { CreativeBrief } from "../creative-brain/types";

// =============================================================================
// CONTROLLED ANIMATION VOCABULARY
// =============================================================================

/**
 * Strictly allowed animation types. Arbitrary executable or unlisted instructions
 * are strictly prohibited to ensure deterministic and safe rendering.
 */
export type ControlledAnimationType =
  | "fade"
  | "slide"
  | "scale"
  | "zoom"
  | "rotate"
  | "reveal"
  | "typewriter"
  | "bounce"
  | "blur"
  | "parallax"
  | "pop"
  | "wipe"
  | "none";

export const CONTROLLED_ANIMATION_TYPES: readonly ControlledAnimationType[] = [
  "fade",
  "slide",
  "scale",
  "zoom",
  "rotate",
  "reveal",
  "typewriter",
  "bounce",
  "blur",
  "parallax",
  "pop",
  "wipe",
  "none",
] as const;

export const CONTROLLED_ANIMATION_SET: ReadonlySet<string> = new Set(CONTROLLED_ANIMATION_TYPES);

/**
 * Directional vectors for animations.
 */
export type AnimationDirectionVector =
  | "in"
  | "out"
  | "left"
  | "right"
  | "up"
  | "down"
  | "center";

/**
 * Controlled cinematic transition types between adjacent scenes.
 */
export type ControlledTransitionType =
  | "none"
  | "fade"
  | "cross_dissolve"
  | "slide_left"
  | "slide_right"
  | "slide_up"
  | "slide_down"
  | "zoom_in"
  | "zoom_out"
  | "wipe_left"
  | "wipe_right";

export const CONTROLLED_TRANSITION_TYPES: readonly ControlledTransitionType[] = [
  "none",
  "fade",
  "cross_dissolve",
  "slide_left",
  "slide_right",
  "slide_up",
  "slide_down",
  "zoom_in",
  "zoom_out",
  "wipe_left",
  "wipe_right",
] as const;

export const CONTROLLED_TRANSITION_SET: ReadonlySet<string> = new Set(CONTROLLED_TRANSITION_TYPES);

/**
 * Controlled camera motion direction / kinetic lens movements.
 */
export type ControlledCameraMotionType =
  | "static"
  | "zoom_in"
  | "zoom_out"
  | "pan_left"
  | "pan_right"
  | "pan_up"
  | "pan_down"
  | "dolly_in"
  | "dolly_out"
  | "shake";

export const CONTROLLED_CAMERA_MOTION_TYPES: readonly ControlledCameraMotionType[] = [
  "static",
  "zoom_in",
  "zoom_out",
  "pan_left",
  "pan_right",
  "pan_up",
  "pan_down",
  "dolly_in",
  "dolly_out",
  "shake",
] as const;

export const CONTROLLED_CAMERA_MOTION_SET: ReadonlySet<string> = new Set(
  CONTROLLED_CAMERA_MOTION_TYPES
);

// =============================================================================
// ANIMATION & MOTION SPECIFICATIONS
// =============================================================================

export interface AnimationSpec {
  /** Controlled animation keyword from vocabulary */
  type: ControlledAnimationType;
  /** Spatial vector */
  direction?: AnimationDirectionVector;
  /** Duration in seconds */
  duration: number;
  /** Start delay in seconds */
  delay?: number;
  /** Easing curve descriptor (e.g., 'easeOut', 'spring', 'easeInOut') */
  easing?: string;
}

export interface TransitionSpec {
  /** Controlled transition keyword */
  type: ControlledTransitionType;
  /** Transition overlap duration in seconds (0.1s to 1.5s) */
  duration: number;
  /** Easing curve descriptor */
  easing?: string;
}

export interface CameraMotionSpec {
  /** Controlled camera motion keyword */
  type: ControlledCameraMotionType;
  /** Intensity of the camera movement */
  intensity?: "subtle" | "moderate" | "dynamic";
  /** Optional active duration of the camera move in seconds */
  duration?: number;
}

// =============================================================================
// SCENE ELEMENT PLANS
// =============================================================================

export interface VisualElementPlan {
  id: string;
  type: "image" | "logo" | "shape" | "mockup" | "video_clip" | "sticker";
  description: string;
  position: {
    x: number; // Percentage (0-100) or canvas pixel
    y: number; // Percentage (0-100) or canvas pixel
  };
  size?: {
    width: number;
    height: number;
  };
  animation: AnimationSpec;
  layer_order: number;
}

export interface TextElementPlan {
  id: string;
  text: string;
  role: "headline" | "subheadline" | "body" | "cta" | "tagline" | "badge";
  position: {
    x: number; // Percentage (0-100)
    y: number; // Percentage (0-100)
  };
  style?: {
    fontSize?: number;
    color?: string;
    fontWeight?: "normal" | "medium" | "bold" | "black";
    align?: "left" | "center" | "right";
  };
  animation: AnimationSpec;
}

export interface AudioCuePlan {
  id: string;
  /** Timestamp in seconds relative to project timeline */
  timestamp: number;
  type: "sfx" | "beat_drop" | "voice_start" | "riser" | "whoosh" | "impact" | "glitch";
  description: string;
}

export interface SceneBackgroundPlan {
  type: "solid" | "gradient" | "media" | "transparent";
  value: string; // Hex color (#000000), CSS gradient, or asset ref
}

// =============================================================================
// SCENE PLAN
// =============================================================================

export interface MotionPlanScene {
  /** Unique scene identifier */
  scene_id: string;
  /** Start timestamp in seconds on the timeline (start_time >= 0) */
  start_time: number;
  /** End timestamp in seconds on the timeline (end_time > start_time) */
  end_time: number;
  /** Scene duration in seconds (duration === end_time - start_time) */
  duration: number;
  /** Narrative role (e.g., 'hook', 'feature_highlight', 'call_to_action') */
  purpose: string;
  /** Scene background */
  background: SceneBackgroundPlan;
  /** Visual graphical assets to display */
  visual_elements: VisualElementPlan[];
  /** Kinetic text layers to display */
  text_elements: TextElementPlan[];
  /** Scene entrance choreography */
  entrance_animation: AnimationSpec;
  /** Scene exit choreography */
  exit_animation: AnimationSpec;
  /** Transition into the next scene */
  transition: TransitionSpec;
  /** Camera & kinetic lens motion */
  camera_motion: CameraMotionSpec;
  /** Synchronized sound effects & musical hits */
  audio_cues: AudioCuePlan[];
}

// =============================================================================
// GLOBAL CONFIGURATION & SETTINGS
// =============================================================================

export interface MotionPlanCanvas {
  width: number;
  height: number;
  aspect_ratio: string; // e.g., '16:9', '9:16', '1:1', '4:5'
  fps: number; // e.g., 24, 30, 60
}

export interface MotionPlanProjectMeta {
  title: string;
  description?: string;
  version: "1.0.0";
  projectType: string;
  sourceBriefId: string;
}

export interface MotionPlanGlobalStyle {
  palette: string[];
  typography: string;
  theme: string;
  motion_pacing: string;
  motion_intensity?: string;
}

export interface MotionPlanAudioDirection {
  music_mood: string;
  tempo: string;
  genre: string;
  sound_effects_enabled: boolean;
  voiceover_notes?: string;
}

export interface MotionPlanExportSettings {
  format: "mp4" | "webm" | "gif";
  resolution: string; // e.g., '1080x1920'
  fps: number;
  quality: "draft" | "standard" | "high" | "production";
}

// =============================================================================
// ROOT MOTION PLAN
// =============================================================================

export interface MotionPlan {
  /** Unique plan identifier */
  id: string;
  /** Schema specification version */
  version: "1.0.0";
  /** Project metadata */
  project: MotionPlanProjectMeta;
  /** Target canvas dimensions & frame rate */
  canvas: MotionPlanCanvas;
  /** Total project duration in seconds */
  duration: number;
  /** Ordered, temporally validated scene sequences */
  scenes: MotionPlanScene[];
  /** Unified visual design language */
  global_style: MotionPlanGlobalStyle;
  /** Background track & SFX guidelines */
  audio_direction: MotionPlanAudioDirection;
  /** Output delivery configurations */
  export_settings: MotionPlanExportSettings;
  /** Timestamp when plan was generated */
  createdAt: string;
}

// =============================================================================
// GENERATION & VALIDATION CONTRACTS
// =============================================================================

export interface MotionPlanValidationIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
  value?: unknown;
}

export interface MotionPlanValidationResult {
  valid: boolean;
  errors: MotionPlanValidationIssue[];
  warnings: MotionPlanValidationIssue[];
  plan: MotionPlan;
}

export interface MotionPlanGenerationResult {
  plan: MotionPlan;
  validation: MotionPlanValidationResult;
  processingTimeMs: number;
  model: string;
}

export interface MotionPlanGenerationRequest {
  brief: CreativeBrief;
  fps?: number;
  quality?: "draft" | "standard" | "high" | "production";
}
