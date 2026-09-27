/**
 * MOTION-BOT — Scene-Level Motion Evaluator
 * Pure, deterministic evaluation of visual states for all elements in a scene at arbitrary timestamps.
 * Part of Phase 6.5: Scene-Level Motion Evaluation System.
 */

import { Scene, SceneBackground } from "@/types/scene";
import { MotionElement } from "@/types/element";
import { defaultPropertyAnimationEvaluator } from "./property-evaluator";
import {
  EvaluatedElementState,
  EvaluatedSceneState,
  IPropertyAnimationEvaluator,
  ISceneEvaluator,
  SceneEvaluationOptions,
} from "./types";

/**
 * Pure evaluator for scene motion states.
 * Calculates what every element in a scene looks like at time X without side effects.
 */
export class SceneEvaluator implements ISceneEvaluator {
  private readonly defaultPropertyEvaluator: IPropertyAnimationEvaluator;

  constructor(propertyEvaluator?: IPropertyAnimationEvaluator) {
    this.defaultPropertyEvaluator =
      propertyEvaluator || defaultPropertyAnimationEvaluator;
  }

  /**
   * Evaluates the visual state of all elements in a scene at a specific point in time.
   * Pure and non-mutating.
   *
   * @param scene The Scene data model to evaluate.
   * @param time The timestamp in seconds (global project time by default, or local scene time if isLocalTime is true).
   * @param options Configuration options for scene evaluation.
   */
  public evaluateScene(
    scene: Scene,
    time: number,
    options?: SceneEvaluationOptions
  ): EvaluatedSceneState {
    const propertyEvaluator =
      options?.propertyEvaluator || this.defaultPropertyEvaluator;

    // 1. Resolve and sanitize scene timing
    const startTime =
      typeof scene.startTime === "number" && Number.isFinite(scene.startTime)
        ? scene.startTime
        : 0;

    const rawDuration =
      typeof scene.duration === "number" && Number.isFinite(scene.duration)
        ? scene.duration
        : 0;
    const duration = Math.max(0, rawDuration);
    const endTime = startTime + duration;

    // 2. Resolve global and local time
    const safeTime = Number.isFinite(time) ? time : 0;
    let globalTime: number;
    let localTime: number;

    if (options?.isLocalTime) {
      localTime = safeTime;
      globalTime = startTime + localTime;
    } else {
      globalTime = safeTime;
      localTime = globalTime - startTime;
    }

    // 3. Compute boundary state & deterministic clamped evaluation time
    const isBeforeScene = globalTime < startTime;
    const isAfterScene = globalTime > endTime;
    const isActive = !isBeforeScene && !isAfterScene;

    // Clamped time ensures evaluation outside the scene range is strictly deterministic:
    // Before start: fixed to local time 0
    // After end: fixed to local time equal to duration
    const effectiveLocalTime = Math.max(0, Math.min(duration, localTime));

    // 4. Resolve background
    const background: SceneBackground = scene.background || {
      type: "solid",
      color: "#0B0C10",
    };

    // 5. Evaluate scene elements
    const sceneElements = Array.isArray(scene.elements) ? scene.elements : [];
    const totalElements = sceneElements.length;

    // Fast return for empty scenes
    if (totalElements === 0) {
      return {
        sceneId: scene.id,
        sceneName: scene.name || "Untitled Scene",
        globalTime,
        localTime,
        startTime,
        duration,
        background,
        isActive,
        isBeforeScene,
        isAfterScene,
        elements: [],
        sortedElements: [],
        elementMap: new Map(),
        visibleElements: [],
        totalElements: 0,
        animatedCount: 0,
        staticCount: 0,
      };
    }

    const evaluatedElements: EvaluatedElementState[] = [];
    const elementMap = new Map<string, EvaluatedElementState>();
    const originalIndexMap = new Map<string, number>();

    let animatedCount = 0;
    let staticCount = 0;

    for (let i = 0; i < totalElements; i++) {
      const el = sceneElements[i];
      if (!el || !el.id) continue;

      originalIndexMap.set(el.id, i);

      // Check optional visibility filter
      if (options?.onlyVisible && el.visible === false) {
        continue;
      }

      // Check if element has animated tracks to avoid unnecessary calculations
      const isActivelyAnimated = hasAnimationTracks(el);

      let evaluatedState: EvaluatedElementState;

      if (!isActivelyAnimated) {
        // Fast-path: Static element with no keyframe animation
        evaluatedState = evaluateStaticElement(el, effectiveLocalTime);
        staticCount++;
      } else {
        // Animated element: Evaluate via property animation engine
        evaluatedState = propertyEvaluator.evaluateElement(
          el,
          effectiveLocalTime
        );
        if (evaluatedState.evaluation.isAnimated) {
          animatedCount++;
        } else {
          staticCount++;
        }
      }

      evaluatedElements.push(evaluatedState);
      elementMap.set(el.id, evaluatedState);
    }

    // 6. Generate sortedElements deterministically by ascending zIndex
    // Preserves z-order layering hierarchy with stable tie-breaking on original index
    const sortedElements = [...evaluatedElements].sort((a, b) => {
      const zA = a.element.zIndex ?? 0;
      const zB = b.element.zIndex ?? 0;
      if (zA !== zB) {
        return zA - zB;
      }
      const idxA = originalIndexMap.get(a.element.id) ?? 0;
      const idxB = originalIndexMap.get(b.element.id) ?? 0;
      return idxA - idxB;
    });

    // 7. Visible elements list (visible !== false)
    const visibleElements = evaluatedElements.filter(
      (s) => s.element.visible !== false
    );

    return {
      sceneId: scene.id,
      sceneName: scene.name || "Untitled Scene",
      globalTime,
      localTime,
      startTime,
      duration,
      background,
      isActive,
      isBeforeScene,
      isAfterScene,
      elements: evaluatedElements,
      sortedElements,
      elementMap,
      visibleElements,
      totalElements,
      animatedCount,
      staticCount,
    };
  }
}

/**
 * Checks whether an element possesses at least one enabled animation track with keyframes.
 * Avoids unnecessary keyframe evaluation sweeps for static elements.
 */
function hasAnimationTracks(element: MotionElement): boolean {
  if (!element.propertyTracks || element.propertyTracks.length === 0) {
    return false;
  }
  for (let i = 0; i < element.propertyTracks.length; i++) {
    const track = element.propertyTracks[i];
    if (track && track.enabled && track.keyframes && track.keyframes.length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Fast-path evaluation for elements with no active animation tracks.
 * Preserves all original element properties, z-index, visibility, and transform values immutably.
 */
function evaluateStaticElement<E extends MotionElement>(
  element: E,
  time: number
): EvaluatedElementState<E> {
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
    opacity: Math.max(0, Math.min(1, element.appearance?.opacity ?? 1)),
  };

  // Return a cloned element with normalized transform and appearance while preserving all element properties
  const clonedElement: E = {
    ...element,
    transform: {
      ...element.transform,
      ...baseTransform,
      anchorX: element.transform?.anchorX ?? 0.5,
      anchorY: element.transform?.anchorY ?? 0.5,
    },
    appearance: {
      ...element.appearance,
      ...baseAppearance,
      blendMode: element.appearance?.blendMode ?? "normal",
      fill: element.appearance?.fill ?? { type: "solid", color: "#FFFFFF" },
    },
  };

  return {
    element: clonedElement,
    evaluation: {
      elementId: element.id,
      time,
      transform: baseTransform,
      appearance: baseAppearance,
      properties: {
        x: baseTransform.x,
        y: baseTransform.y,
        width: baseTransform.width,
        height: baseTransform.height,
        rotation: baseTransform.rotation,
        scaleX: baseTransform.scaleX,
        scaleY: baseTransform.scaleY,
        opacity: baseAppearance.opacity,
      },
      isAnimated: false,
      animatedProperties: [],
    },
  };
}

/**
 * Singleton instance of SceneEvaluator with default configuration.
 */
export const defaultSceneEvaluator = new SceneEvaluator();

/**
 * Standalone pure function to evaluate a scene at a specific time.
 */
export function evaluateScene(
  scene: Scene,
  time: number,
  options?: SceneEvaluationOptions
): EvaluatedSceneState {
  return defaultSceneEvaluator.evaluateScene(scene, time, options);
}

/**
 * Factory to create a new SceneEvaluator instance.
 */
export function createSceneEvaluator(
  propertyEvaluator?: IPropertyAnimationEvaluator
): ISceneEvaluator {
  return new SceneEvaluator(propertyEvaluator);
}
