/**
 * MOTION-BOT — Motion Engine Core
 * Framework-independent engine for deterministic calculation of animated element states.
 * Part of Phase 6.1: Motion Engine Architecture.
 */

import { AnimatableProperty, Animation } from "@/types/animation";
import { MotionElement } from "@/types/element";
import { defaultAnimationEvaluator } from "./animation-evaluator";
import { defaultKeyframeEvaluator } from "./keyframe-evaluator";
import {
  EvaluatedElementState,
  EvaluatedSceneState,
  IAnimationEvaluator,
  IKeyframeEvaluator,
  IMotionEngine,
  MotionEngineOptions,
  MotionEvaluationResult,
  SceneEvaluationOptions,
} from "./types";
import { Scene } from "@/types/scene";
import { applyEvaluationToElement } from "./property-evaluator";
import { defaultSceneEvaluator } from "./scene-evaluator";

/**
 * Core 8 transform & appearance properties supported by default.
 */
export const CORE_ANIMATABLE_PROPERTIES: readonly AnimatableProperty[] = [
  "x",
  "y",
  "width",
  "height",
  "rotation",
  "scaleX",
  "scaleY",
  "opacity",
] as const;

/**
 * Standalone Motion Engine.
 * Evaluates element states deterministically at arbitrary time values.
 */
export class MotionEngine implements IMotionEngine {
  private readonly animationEvaluator: IAnimationEvaluator;
  private readonly keyframeEvaluator: IKeyframeEvaluator;

  constructor(options: MotionEngineOptions = {}) {
    this.keyframeEvaluator =
      options.keyframeEvaluator || defaultKeyframeEvaluator;
    this.animationEvaluator =
      options.animationEvaluator ||
      (options.keyframeEvaluator
        ? defaultAnimationEvaluator
        : defaultAnimationEvaluator);
  }

  /**
   * Evaluates an element's complete animated state at a specific time in seconds.
   */
  public evaluate(element: MotionElement, time: number): MotionEvaluationResult {
    // 1. Establish base values from element definition
    const baseTransform = {
      x: element.transform?.x ?? 0,
      y: element.transform?.y ?? 0,
      width: element.transform?.width ?? 0,
      height: element.transform?.height ?? 0,
      rotation: element.transform?.rotation ?? 0,
      scaleX: element.transform?.scaleX ?? 1,
      scaleY: element.transform?.scaleY ?? 1,
    };

    const baseAppearance = {
      opacity: element.appearance?.opacity ?? 1,
    };

    const propertiesMap: Partial<Record<AnimatableProperty, number | string>> = {
      x: baseTransform.x,
      y: baseTransform.y,
      width: baseTransform.width,
      height: baseTransform.height,
      rotation: baseTransform.rotation,
      scaleX: baseTransform.scaleX,
      scaleY: baseTransform.scaleY,
      opacity: baseAppearance.opacity,
    };

    const animatedProperties: AnimatableProperty[] = [];

    // 2. Evaluate active property tracks if present
    const tracks = element.propertyTracks;
    if (tracks && tracks.length > 0) {
      for (const track of tracks) {
        if (!track || !track.enabled) continue;

        const property = track.property;
        const defaultValue = propertiesMap[property];

        const evaluatedValue = this.animationEvaluator.evaluateTrack(
          track,
          time,
          defaultValue
        );

        if (evaluatedValue !== undefined) {
          propertiesMap[property] = evaluatedValue;
          if (!animatedProperties.includes(property)) {
            animatedProperties.push(property);
          }
        }
      }
    }

    // 3. Assemble evaluated 8 core properties
    const evaluatedTransform = {
      x: Number(propertiesMap.x ?? baseTransform.x),
      y: Number(propertiesMap.y ?? baseTransform.y),
      width: Number(propertiesMap.width ?? baseTransform.width),
      height: Number(propertiesMap.height ?? baseTransform.height),
      rotation: Number(propertiesMap.rotation ?? baseTransform.rotation),
      scaleX: Number(propertiesMap.scaleX ?? baseTransform.scaleX),
      scaleY: Number(propertiesMap.scaleY ?? baseTransform.scaleY),
    };

    const evaluatedAppearance = {
      opacity: Math.max(0, Math.min(1, Number(propertiesMap.opacity ?? baseAppearance.opacity))),
    };

    return {
      elementId: element.id,
      time,
      transform: evaluatedTransform,
      appearance: evaluatedAppearance,
      properties: propertiesMap,
      isAnimated: animatedProperties.length > 0,
      animatedProperties,
    };
  }

  /**
   * Evaluates an element's animated state, returning an immutable canvas-ready element clone.
   */
  public evaluateElement<E extends MotionElement>(
    element: E,
    time: number,
    overrideTracks?: Animation[]
  ): EvaluatedElementState<E> {
    const evaluation = overrideTracks !== undefined
      ? this.evaluateWithTracks(element, time, overrideTracks)
      : this.evaluate(element, time);

    const canvasElement = applyEvaluationToElement(element, evaluation);

    return {
      element: canvasElement,
      evaluation,
    };
  }

  /**
   * Evaluates an element with explicit override tracks.
   */
  private evaluateWithTracks(
    element: MotionElement,
    time: number,
    overrideTracks: Animation[]
  ): MotionEvaluationResult {
    const tempElement = {
      ...element,
      propertyTracks: overrideTracks,
    };
    return this.evaluate(tempElement, time);
  }

  /**
   * Evaluates a single property of an element at a specific time in seconds.
   */
  public evaluateProperty<T = number | string>(
    element: MotionElement,
    property: AnimatableProperty,
    time: number
  ): T | undefined {
    // If an animated track exists for this property, evaluate it
    const track = element.propertyTracks?.find(
      (t) => t.property === property && t.enabled
    ) as Animation<T> | undefined;

    const baseValue = this.getBasePropertyValue<T>(element, property);

    if (track) {
      return this.animationEvaluator.evaluateTrack(track, time, baseValue);
    }

    return baseValue;
  }

  /**
   * Evaluates an array of elements at a specific time, returning a map of element IDs to results.
   */
  public evaluateElements(
    elements: MotionElement[],
    time: number
  ): Map<string, MotionEvaluationResult> {
    const results = new Map<string, MotionEvaluationResult>();
    for (const element of elements) {
      results.set(element.id, this.evaluate(element, time));
    }
    return results;
  }

  /**
   * Evaluates an entire scene at an arbitrary point in time.
   */
  public evaluateScene(
    scene: Scene,
    time: number,
    options?: SceneEvaluationOptions
  ): EvaluatedSceneState {
    return defaultSceneEvaluator.evaluateScene(scene, time, options);
  }

  /**
   * Internal helper to extract the base un-animated property value from an element.
   */
  private getBasePropertyValue<T = number | string>(
    element: MotionElement,
    property: AnimatableProperty
  ): T | undefined {
    switch (property) {
      case "x":
        return element.transform?.x as unknown as T;
      case "y":
        return element.transform?.y as unknown as T;
      case "width":
        return element.transform?.width as unknown as T;
      case "height":
        return element.transform?.height as unknown as T;
      case "rotation":
        return element.transform?.rotation as unknown as T;
      case "scaleX":
        return element.transform?.scaleX as unknown as T;
      case "scaleY":
        return element.transform?.scaleY as unknown as T;
      case "opacity":
        return element.appearance?.opacity as unknown as T;
      default:
        return undefined;
    }
  }
}

/**
 * Factory to instantiate a new MotionEngine instance.
 */
export function createMotionEngine(options?: MotionEngineOptions): IMotionEngine {
  return new MotionEngine(options);
}

/**
 * Default singleton instance of MotionEngine.
 */
export const defaultMotionEngine = new MotionEngine();
