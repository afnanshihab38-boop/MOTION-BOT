/**
 * MOTION-BOT — Scene Data Architecture
 * Data definitions for scenes, compositions, and scene transitions.
 * Part of Phase 3.1: Data Architecture & Type System.
 */

import { EasingDefinition } from "./animation";
import { MotionElement, GradientFill } from "./element";

/**
 * Unique identifier for a scene.
 */
export type SceneId = string;

/**
 * Supported cinematic transition types between scenes.
 */
export type SceneTransitionType =
  | "none"
  | "fade"
  | "cross-dissolve"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "zoom-in"
  | "zoom-out"
  | "wipe-left"
  | "wipe-right"
  | "wipe-up"
  | "wipe-down"
  | "iris-open"
  | "iris-close";

/**
 * Transition configuration between adjacent scenes.
 */
export interface SceneTransition {
  type: SceneTransitionType;
  durationFrames: number;
  easing: EasingDefinition;
}

/**
 * Scene background appearance.
 */
export interface SceneBackground {
  type: "solid" | "gradient" | "transparent";
  color?: string;
  gradient?: GradientFill;
}

/**
 * Metadata for a scene allowing extensible metadata while preserving strong typing.
 */
export interface SceneMetadata {
  description?: string;
  colorTag?: string;
  notes?: string;
  customFields?: Record<string, string | number | boolean | null>;
  [key: string]: unknown;
}

import { Timeline } from "./timeline";

/**
 * Composition scene holding an ordered set of motion elements with explicit timing.
 */
export interface Scene {
  id: SceneId;
  name: string;
  order: number;
  startTime: number; // Start time in seconds (e.g. 0, 3, 6)
  duration: number; // Duration in seconds (e.g. 3, 3, 4)
  durationFrames?: number; // Duration in frames for timeline rendering
  background: SceneBackground;
  elements: MotionElement[];
  timeline?: Timeline; // Scene-level timeline track and keyframe organization
  transitionIn?: SceneTransition;
  transitionOut?: SceneTransition;
  metadata?: SceneMetadata;
}


