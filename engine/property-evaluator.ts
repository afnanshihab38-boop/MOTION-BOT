/**
 * MOTION-BOT — Property Animation Evaluator
 * Evaluates Phase 3 animated properties and combines them immutably with base element states.
 * Part of Phase 6.4: Element Property Evaluation.
 */

import { AnimatableProperty, Animation } from "@/types/animation";
import { MotionElement } from "@/types/element";
import { defaultAnimationEvaluator } from "./animation-evaluator";
import { clamp01 } from "./interpolation";
import {
  EvaluatedElementState,
  EvaluatedTransform,
  IAnimationEvaluator,
  IPropertyAnimationEvaluator,
  MotionEvaluationResult,
} from "./types";

/**
 * Evaluates animated properties for motion elements while guaranteeing immutability
 * and complete preservation of non-animated properties.
 */
export class PropertyAnimationEvaluator implements IPropertyAnimationEvaluator {
  private readonly animationEvaluator: IAnimationEvaluator;

  constructor(animationEvaluator: IAnimationEvaluator = defaultAnimationEvaluator) {
    this.animationEvaluator = animationEvaluator;
  }

  /**
   * Evaluates the motion transform and appearance properties of an element at a given time.
   * Does NOT mutate the element.
   */
  public evaluateProperties(
    element: MotionElement,
    time: number,
    overrideTracks?: Animation[]
  ): MotionEvaluationResult {
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

    // 2. Select tracks: use override tracks if provided, else element propertyTracks
    const tracks = overrideTracks !== undefined ? overrideTracks : (element.propertyTracks || []);

    if (tracks && tracks.length > 0) {
      for (const track of tracks) {
        if (!track || !track.enabled) {
          continue;
        }

        const prop = track.property;
        const defaultValue = propertiesMap[prop];

        const evaluatedValue = this.animationEvaluator.evaluateTrack(
          track,
          time,
          defaultValue
        );

        if (evaluatedValue !== undefined) {
          // Numerical sanity check
          if (typeof evaluatedValue === "number" && !Number.isFinite(evaluatedValue)) {
            continue; // Skip invalid non-finite values (NaN / Infinity)
          }

          propertiesMap[prop] = evaluatedValue;
          if (!animatedProperties.includes(prop)) {
            animatedProperties.push(prop);
          }
        }
      }
    }

    // 3. Assemble evaluated 8 core transform & appearance properties
    const evaluatedTransform: EvaluatedTransform = {
      x: safeNumber(propertiesMap.x, baseTransform.x),
      y: safeNumber(propertiesMap.y, baseTransform.y),
      width: safeNumber(propertiesMap.width, baseTransform.width),
      height: safeNumber(propertiesMap.height, baseTransform.height),
      rotation: safeNumber(propertiesMap.rotation, baseTransform.rotation),
      scaleX: safeNumber(propertiesMap.scaleX, baseTransform.scaleX),
      scaleY: safeNumber(propertiesMap.scaleY, baseTransform.scaleY),
    };

    const evaluatedAppearance = {
      opacity: clamp01(safeNumber(propertiesMap.opacity, baseAppearance.opacity)),
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
   * Guarantees the original element is not modified.
   */
  public evaluateElement<E extends MotionElement>(
    element: E,
    time: number,
    overrideTracks?: Animation[]
  ): EvaluatedElementState<E> {
    const evaluation = this.evaluateProperties(element, time, overrideTracks);
    const canvasElement = applyEvaluationToElement(element, evaluation);

    return {
      element: canvasElement,
      evaluation,
    };
  }
}

/**
 * Pure helper function to apply a MotionEvaluationResult onto a MotionElement.
 * Returns a new immutable element instance suitable for consumption by any renderer or canvas.
 */
export function applyEvaluationToElement<E extends MotionElement>(
  element: E,
  evaluation: MotionEvaluationResult
): E {
  return {
    ...element,
    transform: {
      ...element.transform,
      ...evaluation.transform,
      anchorX: element.transform?.anchorX ?? 0.5,
      anchorY: element.transform?.anchorY ?? 0.5,
    },
    appearance: {
      ...element.appearance,
      ...evaluation.appearance,
      blendMode: element.appearance?.blendMode ?? "normal",
      fill: element.appearance?.fill ?? { type: "solid", color: "#FFFFFF" },
    },
  };
}

/**
 * Numerical helper ensuring finite number fallback.
 */
function safeNumber(value: number | string | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}

/**
 * Singleton instance of PropertyAnimationEvaluator.
 */
export const defaultPropertyAnimationEvaluator = new PropertyAnimationEvaluator();
