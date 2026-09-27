/**
 * MOTION-BOT — Animation & Keyframe Data Architecture
 * Framework-independent type definitions for the motion system.
 * Part of Phase 3.1: Data Architecture & Type System.
 */

/**
 * Standard interpolation easing curves supported by the motion engine.
 */
export type EasingType =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "easeInQuad"
  | "easeOutQuad"
  | "easeInOutQuad"
  | "easeInCubic"
  | "easeOutCubic"
  | "easeInOutCubic"
  | "easeInQuart"
  | "easeOutQuart"
  | "easeInOutQuart"
  | "easeInExpo"
  | "easeOutExpo"
  | "easeInOutExpo"
  | "easeInBack"
  | "easeOutBack"
  | "easeInOutBack"
  | "easeInElastic"
  | "easeOutElastic"
  | "easeInOutElastic"
  | "easeInBounce"
  | "easeOutBounce"
  | "easeInOutBounce"
  | "cubicBezier"
  | "spring"
  | "steps";

/**
 * Cubic bezier control points (P1, P2) where P0=(0,0) and P3=(1,1).
 */
export interface CubicBezierCurve {
  p1x: number;
  p1y: number;
  p2x: number;
  p2y: number;
}

/**
 * Physical spring simulation parameters for organic motion.
 */
export interface SpringConfig {
  mass: number;
  stiffness: number;
  damping: number;
  initialVelocity?: number;
}

/**
 * Stepped interpolation configuration (e.g. for pixel-art or typewriter effects).
 */
export interface StepsConfig {
  stepsCount: number;
  stepPosition?: "start" | "end" | "jump-none" | "jump-both";
}

/**
 * Complete easing specification attached to keyframes and transitions.
 */
export interface EasingDefinition {
  type: EasingType;
  bezier?: CubicBezierCurve;
  spring?: SpringConfig;
  steps?: StepsConfig;
}

/**
 * Unique identifier for a keyframe.
 */
export type KeyframeId = string;

/**
 * Discrete point in time on a property track defining a target value and easing.
 * Supports both continuous time (seconds) and discrete frame numbers.
 */
export interface Keyframe<T = number | string> {
  id: KeyframeId;
  time: number; // in seconds (e.g. 0.0, 0.5, 1.25)
  frame?: number; // discrete frame number based on composition FPS
  value: T;
  easing: EasingType | EasingDefinition;
  label?: string;
}

/**
 * Interpolation mode applied between adjacent keyframes.
 */
export type InterpolationType =
  | "linear"
  | "bezier"
  | "spring"
  | "step"
  | "hold";

/**
 * Enumeration of all properties that can be animated over time.
 * Extensible for geometric transforms, appearance styles, and typography.
 */
export type AnimatableProperty =
  | "x"
  | "y"
  | "width"
  | "height"
  | "rotation"
  | "scaleX"
  | "scaleY"
  | "opacity"
  | "fillColor"
  | "strokeColor"
  | "strokeWidth"
  | "cornerRadius"
  | "blurRadius"
  | "fontSize"
  | "letterSpacing"
  | "lineHeight"
  | "volume";

/**
 * Strongly typed animation model defining keyframed property changes over time.
 */
export interface Animation<T = number | string> {
  id: string;
  elementId?: string;
  property: AnimatableProperty;
  interpolation: InterpolationType;
  easing?: EasingType | EasingDefinition;
  keyframes: Keyframe<T>[];
  enabled: boolean;
}

/**
 * Animation track for a specific numeric or string property of an element.
 */
export type PropertyAnimationTrack<T = number | string> = Animation<T>;


/**
 * High-level animation choreography categories.
 */
export type AnimationCategory = "entrance" | "exit" | "emphasis" | "loop" | "path";

/**
 * Recognized preset animation templates designed for automated or curated motion.
 */
export type AnimationPresetType =
  | "fade-in"
  | "fade-out"
  | "slide-up"
  | "slide-down"
  | "slide-left"
  | "slide-right"
  | "zoom-in"
  | "zoom-out"
  | "pop-in"
  | "pop-out"
  | "bounce-in"
  | "flip-x"
  | "flip-y"
  | "rotate-in"
  | "pulse"
  | "shake"
  | "glow"
  | "float"
  | "typewriter"
  | "wipe-horizontal"
  | "wipe-vertical"
  | "custom";

/**
 * Preset animation definition applied to an element over a frame range.
 */
export interface PresetAnimation {
  id: string;
  name: string;
  category: AnimationCategory;
  type: AnimationPresetType;
  startFrame: number;
  durationFrames: number;
  easing: EasingDefinition;
  staggerDelayFrames?: number;
  parameters?: Record<string, number | string | boolean>;
}

/**
 * 2D spatial coordinate point along a motion trajectory path.
 */
export interface MotionPathPoint {
  x: number;
  y: number;
  controlPointIn?: { x: number; y: number };
  controlPointOut?: { x: number; y: number };
  frame: number;
}

/**
 * Spatial motion path curve for complex positional choreography.
 */
export interface MotionPath {
  id: string;
  points: MotionPathPoint[];
  tension?: number;
  closed?: boolean;
}
