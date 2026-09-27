/**
 * MOTION-BOT — Motion Engine Core Types & Interfaces
 * Framework-independent interfaces and contracts for evaluating animations and keyframes.
 * Part of Phase 6.1: Motion Engine Architecture.
 */

import {
  AnimatableProperty,
  Animation,
  EasingDefinition,
  EasingType,
  InterpolationType,
  Keyframe,
} from "@/types/animation";
import { MotionElement } from "@/types/element";

/**
 * Pure mathematical easing function mapping normalized time [0, 1] to progress.
 */
export type EasingFunction = (t: number) => number;

/**
 * Interface for registering, retrieving, and resolving pluggable easing functions.
 */
export interface IEasingRegistry {
  /**
   * Registers a custom easing function by name.
   */
  register(name: string, fn: EasingFunction): void;

  /**
   * Retrieves an easing function by name.
   */
  get(name: string): EasingFunction | undefined;

  /**
   * Checks if an easing function is registered.
   */
  has(name: string): boolean;

  /**
   * Resolves an easing specification (type name, definition object, or custom name)
   * to a safe, normalized EasingFunction.
   */
  resolve(easing: EasingType | EasingDefinition | string | undefined): EasingFunction;

  /**
   * Returns a list of all registered easing curve names.
   */
  list(): string[];
}

/**
 * Evaluated 2D spatial transform state for an element.
 */
export interface EvaluatedTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Evaluated visual appearance state for an element.
 */
export interface EvaluatedAppearance {
  opacity: number;
}

/**
 * Complete evaluated state of a motion element at a specific point in time.
 */
export interface MotionEvaluationResult {
  /** Target element identifier */
  elementId: string;
  /** Evaluation timestamp in seconds */
  time: number;
  /** Evaluated 2D spatial transform */
  transform: EvaluatedTransform;
  /** Evaluated visual appearance */
  appearance: EvaluatedAppearance;
  /** Map of all evaluated properties (including custom/extensible properties) */
  properties: Partial<Record<AnimatableProperty, number | string>>;
  /** Indicates if any animated property tracks were evaluated */
  isAnimated: boolean;
  /** List of properties that were actively animated by enabled tracks */
  animatedProperties: AnimatableProperty[];
}

/**
 * Generic value interpolator function for interpolating between two values of arbitrary type T.
 */
export type ValueInterpolator<T = unknown> = (
  start: T,
  end: T,
  progress: number
) => T;

/**
 * Interface for evaluating keyframe sequences and intervals.
 */
export interface IKeyframeEvaluator {
  /**
   * Evaluates a value from a sequence of sorted keyframes at an arbitrary time.
   */
  evaluate<T = number | string>(
    keyframes: Keyframe<T>[],
    time: number,
    interpolation?: InterpolationType,
    defaultEasing?: EasingType | EasingDefinition
  ): T | undefined;

  /**
   * Evaluates the interpolated value between two adjacent keyframes.
   */
  evaluatePair<T = number | string>(
    prevKeyframe: Keyframe<T>,
    nextKeyframe: Keyframe<T>,
    time: number,
    interpolation?: InterpolationType
  ): T;
}

/**
 * Interface for evaluating individual property animation tracks.
 */
export interface IAnimationEvaluator {
  /**
   * Evaluates an individual animation track at a specific time.
   */
  evaluateTrack<T = number | string>(
    track: Animation<T>,
    time: number,
    defaultValue?: T
  ): T | undefined;
}

/**
 * Configuration options for the MotionEngine.
 */
export interface MotionEngineOptions {
  /** Custom keyframe evaluator implementation */
  keyframeEvaluator?: IKeyframeEvaluator;
  /** Custom animation evaluator implementation */
  animationEvaluator?: IAnimationEvaluator;
  /** Numeric precision tolerance for calculations (default 1e-6) */
  precision?: number;
}

/**
 * Fully evaluated element state containing both the renderable MotionElement clone
 * and the evaluation metadata.
 */
export interface EvaluatedElementState<E extends MotionElement = MotionElement> {
  /** The immutable MotionElement with animated properties resolved (canvas-renderable) */
  element: E;
  /** Detailed motion evaluation result metrics */
  evaluation: MotionEvaluationResult;
}

/**
 * Interface for evaluating property animation tracks and combining them with base element states.
 */
export interface IPropertyAnimationEvaluator {
  /**
   * Evaluates an element's animated state, returning an immutable canvas-ready element clone.
   */
  evaluateElement<E extends MotionElement>(
    element: E,
    time: number,
    overrideTracks?: Animation[]
  ): EvaluatedElementState<E>;

  /**
   * Evaluates the motion transform and appearance properties of an element.
   */
  evaluateProperties(
    element: MotionElement,
    time: number,
    overrideTracks?: Animation[]
  ): MotionEvaluationResult;
}

/**
 * Configuration options for scene-level motion evaluation.
 */
export interface SceneEvaluationOptions {
  /**
   * If true, the time argument is interpreted as local scene time [0, duration].
   * If false (default), time is interpreted as global composition time.
   */
  isLocalTime?: boolean;
  /**
   * Optional custom property animation evaluator instance.
   */
  propertyEvaluator?: IPropertyAnimationEvaluator;
  /**
   * If true, only visible elements (element.visible !== false) are evaluated.
   * Defaults to false (all elements are evaluated).
   */
  onlyVisible?: boolean;
}

/**
 * Result of evaluating an entire scene at a specific time.
 */
export interface EvaluatedSceneState {
  /** Target scene identifier */
  sceneId: string;
  /** Scene name */
  sceneName: string;
  /** Global evaluation time in seconds */
  globalTime: number;
  /** Local evaluation time relative to scene start clamped to [0, duration] */
  localTime: number;
  /** Scene start time in seconds */
  startTime: number;
  /** Scene duration in seconds */
  duration: number;
  /** Scene background appearance */
  background: {
    type: "solid" | "gradient" | "transparent";
    color?: string;
    gradient?: unknown;
  };
  /** Whether the evaluation time falls within the scene's [startTime, startTime + duration] range */
  isActive: boolean;
  /** Whether evaluation time is strictly before scene start */
  isBeforeScene: boolean;
  /** Whether evaluation time is strictly after scene end */
  isAfterScene: boolean;
  /**
   * Evaluated elements preserving original scene array order.
   * Each item contains the immutable canvas-ready element clone and evaluation metrics.
   */
  elements: EvaluatedElementState[];
  /**
   * Evaluated elements sorted deterministically by ascending zIndex (preserving layering order).
   */
  sortedElements: EvaluatedElementState[];
  /**
   * Fast lookup map of evaluated element states by element ID.
   */
  elementMap: Map<string, EvaluatedElementState>;
  /**
   * Elements with visible !== false.
   */
  visibleElements: EvaluatedElementState[];
  /** Total number of elements in the scene */
  totalElements: number;
  /** Number of elements actively animated */
  animatedCount: number;
  /** Number of static elements */
  staticCount: number;
}

/**
 * Interface for evaluating complete scenes at arbitrary timestamps.
 */
export interface ISceneEvaluator {
  /**
   * Evaluates all elements in a scene at a specific timestamp.
   * Pure, deterministic, and non-mutating.
   */
  evaluateScene(
    scene: import("@/types/scene").Scene,
    time: number,
    options?: SceneEvaluationOptions
  ): EvaluatedSceneState;
}

/**
 * Core Motion Engine interface for calculating animation states.
 */
export interface IMotionEngine {
  /**
   * Evaluates an element's animated state at an arbitrary time in seconds.
   */
  evaluate(element: MotionElement, time: number): MotionEvaluationResult;

  /**
   * Evaluates an element's animated state, returning an immutable canvas-ready element clone.
   */
  evaluateElement<E extends MotionElement>(
    element: E,
    time: number,
    overrideTracks?: Animation[]
  ): EvaluatedElementState<E>;

  /**
   * Evaluates a single animatable property for an element at a specific time.
   */
  evaluateProperty<T = number | string>(
    element: MotionElement,
    property: AnimatableProperty,
    time: number
  ): T | undefined;

  /**
   * Evaluates multiple elements at a specific time, returning a map of element IDs to results.
   */
  evaluateElements(
    elements: MotionElement[],
    time: number
  ): Map<string, MotionEvaluationResult>;

  /**
   * Evaluates an entire scene at an arbitrary point in time.
   */
  evaluateScene(
    scene: import("@/types/scene").Scene,
    time: number,
    options?: SceneEvaluationOptions
  ): EvaluatedSceneState;
}

