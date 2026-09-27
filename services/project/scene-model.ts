/**
 * MOTION-BOT — Concrete Scene Model Implementation
 * Pure factory, validation, timing alignment, and immutable state functions for Scenes.
 * Part of Phase 3.2: Project & Scene Model.
 */

import { Scene, SceneBackground, SceneMetadata } from "@/types/scene";
import { MotionElement } from "@/types/element";

/**
 * Input arguments for creating a new Scene.
 */
export interface CreateSceneInput {
  id?: string;
  name?: string;
  order?: number;
  startTime?: number; // in seconds
  duration?: number; // in seconds
  durationFrames?: number;
  background?: SceneBackground;
  elements?: MotionElement[];
  metadata?: SceneMetadata;
}

/**
 * Default background configuration for newly created scenes.
 */
export const DEFAULT_SCENE_BACKGROUND: SceneBackground = {
  type: "solid",
  color: "#0B0C10",
};

/**
 * Default duration for a scene in seconds.
 */
export const DEFAULT_SCENE_DURATION_SECONDS = 3.0;

/**
 * Generates a unique scene identifier.
 */
export function generateSceneId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `scene_${crypto.randomUUID()}`;
  }
  return `scene_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Pure factory to construct a fully initialized Scene with explicit timing.
 */
export function createScene(input: CreateSceneInput = {}): Scene {
  const duration = typeof input.duration === "number" && input.duration > 0
    ? input.duration
    : DEFAULT_SCENE_DURATION_SECONDS;

  const startTime = typeof input.startTime === "number" && input.startTime >= 0
    ? input.startTime
    : 0;

  return {
    id: input.id || generateSceneId(),
    name: input.name || "Untitled Scene",
    order: typeof input.order === "number" ? input.order : 0,
    startTime,
    duration,
    durationFrames: input.durationFrames,
    background: input.background || { ...DEFAULT_SCENE_BACKGROUND },
    elements: input.elements ? [...input.elements] : [],
    metadata: input.metadata ? { ...input.metadata } : {},
  };
}

/**
 * Validates a scene data structure.
 */
export function validateScene(scene: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!scene || typeof scene !== "object") {
    return { valid: false, errors: ["Scene must be a non-null object"] };
  }

  const s = scene as Partial<Scene>;

  if (!s.id || typeof s.id !== "string" || s.id.trim() === "") {
    errors.push("Scene requires a valid string id");
  }

  if (!s.name || typeof s.name !== "string" || s.name.trim() === "") {
    errors.push("Scene requires a non-empty name");
  }

  if (typeof s.order !== "number" || isNaN(s.order) || s.order < 0) {
    errors.push("Scene requires a non-negative numeric order index");
  }

  if (typeof s.startTime !== "number" || isNaN(s.startTime) || s.startTime < 0) {
    errors.push("Scene requires a non-negative numeric startTime in seconds");
  }

  if (typeof s.duration !== "number" || isNaN(s.duration) || s.duration <= 0) {
    errors.push("Scene requires a positive numeric duration in seconds");
  }

  if (!s.background || typeof s.background !== "object") {
    errors.push("Scene requires a valid background object");
  }

  if (!Array.isArray(s.elements)) {
    errors.push("Scene elements must be an array");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Re-aligns a sequence of scenes consecutively in time without overlapping or gaps.
 * Guarantees Scene A: 0 -> d_A, Scene B: d_A -> d_A + d_B, Scene C: ...
 */
export function alignScenesSequentially(scenes: Scene[]): Scene[] {
  let currentTime = 0;

  return scenes.map((scene, index) => {
    const alignedScene: Scene = {
      ...scene,
      order: index,
      startTime: currentTime,
    };
    currentTime += scene.duration;
    return alignedScene;
  });
}

/**
 * Updates the timing of an individual scene and synchronizes frame count if FPS is provided.
 */
export function setSceneTiming(
  scene: Scene,
  startTime: number,
  duration: number,
  fps?: number
): Scene {
  if (startTime < 0) {
    throw new Error(`Scene startTime cannot be negative: ${startTime}`);
  }
  if (duration <= 0) {
    throw new Error(`Scene duration must be positive: ${duration}`);
  }

  return {
    ...scene,
    startTime,
    duration,
    durationFrames: fps ? Math.round(duration * fps) : scene.durationFrames,
  };
}

/**
 * Finds which scene is active at a given point in time (in seconds).
 */
export function findSceneAtTime(scenes: Scene[], timeInSeconds: number): Scene | undefined {
  if (timeInSeconds < 0 || scenes.length === 0) return undefined;

  return scenes.find(
    (scene) =>
      timeInSeconds >= scene.startTime &&
      timeInSeconds < scene.startTime + scene.duration
  );
}

/**
 * Calculates the total duration of a scene sequence.
 */
export function calculateScenesDuration(scenes: Scene[]): number {
  if (scenes.length === 0) return 0;
  return scenes.reduce((max, scene) => {
    const sceneEnd = scene.startTime + scene.duration;
    return sceneEnd > max ? sceneEnd : max;
  }, 0);
}

/**
 * Immutably adds an element to a scene.
 */
export function addElementToScene(scene: Scene, element: MotionElement): Scene {
  return {
    ...scene,
    elements: [...scene.elements, element],
  };
}

/**
 * Immutably removes an element from a scene by id.
 */
export function removeElementFromScene(scene: Scene, elementId: string): Scene {
  return {
    ...scene,
    elements: scene.elements.filter((el) => el.id !== elementId),
  };
}

/**
 * Immutably updates an element in a scene.
 */
export function updateElementInScene(
  scene: Scene,
  elementId: string,
  updates: Partial<MotionElement>
): Scene {
  return {
    ...scene,
    elements: scene.elements.map((el) => {
      if (el.id !== elementId) return el;
      return {
        ...el,
        ...updates,
      } as MotionElement;
    }),
  };
}

/**
 * Immutably clones a scene with a new unique id.
 */
export function cloneScene(scene: Scene, newId?: string, newName?: string): Scene {
  return {
    ...scene,
    id: newId || generateSceneId(),
    name: newName || `${scene.name} (Copy)`,
    elements: scene.elements.map((el) => ({
      ...el,
      id: `${el.id}_copy_${Math.random().toString(36).slice(2, 6)}`,
    })),
    metadata: { ...scene.metadata },
  };
}
