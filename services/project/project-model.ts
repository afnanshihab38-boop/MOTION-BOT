/**
 * MOTION-BOT — Concrete Project Model Implementation
 * Pure factory, validation, dimensions, and immutable state functions for Projects.
 * Part of Phase 3.2: Project & Scene Model.
 */

import { Project, ProjectMetadata, CURRENT_SCHEMA_VERSION } from "@/types/project";
import { Scene } from "@/types/scene";
import { Asset } from "@/types/asset";
import { MotionElement } from "@/types/element";
import {
  createScene,
  calculateScenesDuration,
  alignScenesSequentially,
  addElementToScene as addElementToSceneHelper,
  removeElementFromScene as removeElementFromSceneHelper,
  updateElementInScene as updateElementInSceneHelper,
  cloneScene,
} from "./scene-model";

/**
 * Standard aspect ratio preset specifications.
 */
export interface DimensionPreset {
  name: string;
  aspectRatio: string;
  width: number;
  height: number;
  description: string;
}

/**
 * Common motion design presets.
 * Note: Project dimensions are NEVER restricted to these presets.
 */
export const DIMENSION_PRESETS: Record<string, DimensionPreset> = {
  "16:9": {
    name: "Landscape (YouTube / Web)",
    aspectRatio: "16:9",
    width: 1920,
    height: 1080,
    description: "Standard horizontal high-definition video",
  },
  "9:16": {
    name: "Vertical (Reels / TikTok / Shorts)",
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    description: "Full vertical mobile video",
  },
  "1:1": {
    name: "Square (Feed / Post)",
    aspectRatio: "1:1",
    width: 1080,
    height: 1080,
    description: "Square format for social media feeds",
  },
  "4:5": {
    name: "Portrait (Instagram Feed)",
    aspectRatio: "4:5",
    width: 1080,
    height: 1350,
    description: "Optimized vertical timeline post",
  },
  "21:9": {
    name: "Ultrawide (Cinematic)",
    aspectRatio: "21:9",
    width: 2560,
    height: 1080,
    description: "Cinematic widescreen display",
  },
};

/**
 * Input arguments for creating a new Project.
 */
export interface CreateProjectInput {
  id?: string;
  name?: string;
  width?: number;
  height?: number;
  fps?: number;
  duration?: number; // in seconds
  scenes?: Scene[];
  assets?: Asset[];
  metadata?: Partial<ProjectMetadata>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Generates a unique project identifier.
 */
export function generateProjectId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `proj_${crypto.randomUUID()}`;
  }
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Validates arbitrary project dimensions.
 */
export function validateDimensions(
  width: number,
  height: number
): { valid: boolean; error?: string } {
  if (typeof width !== "number" || isNaN(width) || width <= 0) {
    return { valid: false, error: `Width must be a positive number, received: ${width}` };
  }
  if (typeof height !== "number" || isNaN(height) || height <= 0) {
    return { valid: false, error: `Height must be a positive number, received: ${height}` };
  }
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return { valid: false, error: "Dimensions must be finite numbers" };
  }
  return { valid: true };
}

/**
 * Pure factory to construct a concrete Project model.
 * Supports arbitrary dimensions, explicit scene timing, and strongly typed metadata.
 */
export function createProject(input: CreateProjectInput = {}): Project {
  const width = typeof input.width === "number" && input.width > 0 ? input.width : 1920;
  const height = typeof input.height === "number" && input.height > 0 ? input.height : 1080;
  const fps = typeof input.fps === "number" && input.fps > 0 ? input.fps : 30;

  const now = new Date().toISOString();
  const createdAt = input.createdAt || now;
  const updatedAt = input.updatedAt || now;

  // Initialize with provided scenes or create an initial default scene
  let scenes: Scene[];
  if (input.scenes && input.scenes.length > 0) {
    scenes = alignScenesSequentially(input.scenes);
  } else {
    scenes = [createScene({ name: "Scene 1", order: 0, startTime: 0, duration: 5.0 })];
  }

  // Calculate project duration based on scenes if not explicitly specified
  const calculatedDuration = calculateScenesDuration(scenes);
  const duration = typeof input.duration === "number" && input.duration > 0
    ? input.duration
    : Math.max(calculatedDuration, 5.0);

  const metadata: ProjectMetadata = {
    title: input.name || "Untitled Motion Comp",
    description: "",
    tags: [],
    ...input.metadata,
  };

  return {
    id: input.id || generateProjectId(),
    name: input.name || "Untitled Motion Comp",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    width,
    height,
    fps,
    duration,
    scenes,
    assets: input.assets ? [...input.assets] : [],
    metadata,
    createdAt,
    updatedAt,
  };
}

/**
 * Validates a Project data structure.
 */
export function validateProject(project: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!project || typeof project !== "object") {
    return { valid: false, errors: ["Project must be a non-null object"] };
  }

  const p = project as Partial<Project>;

  if (!p.id || typeof p.id !== "string" || p.id.trim() === "") {
    errors.push("Project requires a valid string id");
  }

  if (!p.name || typeof p.name !== "string" || p.name.trim() === "") {
    errors.push("Project requires a non-empty name");
  }

  if (!p.schemaVersion || typeof p.schemaVersion !== "string") {
    errors.push("Project requires a schemaVersion");
  }

  const dimCheck = validateDimensions(p.width ?? -1, p.height ?? -1);
  if (!dimCheck.valid) {
    errors.push(dimCheck.error!);
  }

  if (typeof p.fps !== "number" || isNaN(p.fps) || p.fps <= 0) {
    errors.push("Project requires a positive numeric fps (frames per second)");
  }

  if (typeof p.duration !== "number" || isNaN(p.duration) || p.duration <= 0) {
    errors.push("Project requires a positive numeric duration in seconds");
  }

  if (!Array.isArray(p.scenes)) {
    errors.push("Project scenes must be an array");
  }

  if (!Array.isArray(p.assets)) {
    errors.push("Project assets must be an array");
  }

  if (!p.metadata || typeof p.metadata !== "object") {
    errors.push("Project requires a metadata object");
  }

  if (!p.createdAt || typeof p.createdAt !== "string") {
    errors.push("Project requires a createdAt ISO string");
  }

  if (!p.updatedAt || typeof p.updatedAt !== "string") {
    errors.push("Project requires an updatedAt ISO string");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// -----------------------------------------------------------------------------
// IMMUTABLE STATE UPDATE OPERATIONS
// -----------------------------------------------------------------------------

/**
 * Immutably updates core project fields and touches updatedAt timestamp.
 */
export function updateProject(
  project: Project,
  updates: Partial<Omit<Project, "id" | "schemaVersion" | "createdAt">>
): Project {
  return {
    ...project,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Immutably updates arbitrary project dimensions (width & height).
 */
export function updateProjectDimensions(
  project: Project,
  width: number,
  height: number
): Project {
  const check = validateDimensions(width, height);
  if (!check.valid) {
    throw new Error(check.error);
  }

  return updateProject(project, { width, height });
}

/**
 * Immutably adds a scene to the project and aligns timeline timing.
 */
export function addScene(
  project: Project,
  scene: Scene,
  index?: number
): Project {
  const currentScenes = [...project.scenes];

  if (typeof index === "number" && index >= 0 && index <= currentScenes.length) {
    currentScenes.splice(index, 0, scene);
  } else {
    currentScenes.push(scene);
  }

  const alignedScenes = alignScenesSequentially(currentScenes);
  const totalDuration = calculateScenesDuration(alignedScenes);

  return updateProject(project, {
    scenes: alignedScenes,
    duration: Math.max(totalDuration, project.duration),
  });
}

/**
 * Immutably removes a scene from the project by id and realigns timing.
 */
export function removeScene(project: Project, sceneId: string): Project {
  const remainingScenes = project.scenes.filter((s) => s.id !== sceneId);
  const alignedScenes = alignScenesSequentially(remainingScenes);
  const totalDuration = calculateScenesDuration(alignedScenes);

  return updateProject(project, {
    scenes: alignedScenes,
    duration: alignedScenes.length > 0 ? totalDuration : project.duration,
  });
}

/**
 * Immutably updates an existing scene in the project and realigns timing if duration changed.
 */
export function updateScene(
  project: Project,
  sceneId: string,
  updates: Partial<Omit<Scene, "id">>
): Project {
  const updatedScenes = project.scenes.map((s) => {
    if (s.id !== sceneId) return s;
    return {
      ...s,
      ...updates,
    };
  });

  const alignedScenes = alignScenesSequentially(updatedScenes);
  const totalDuration = calculateScenesDuration(alignedScenes);

  return updateProject(project, {
    scenes: alignedScenes,
    duration: Math.max(totalDuration, project.duration),
  });
}

/**
 * Immutably reorders scenes within the project.
 */
export function reorderScenes(
  project: Project,
  activeIndex: number,
  overIndex: number
): Project {
  if (
    activeIndex < 0 ||
    activeIndex >= project.scenes.length ||
    overIndex < 0 ||
    overIndex >= project.scenes.length
  ) {
    return project;
  }

  const nextScenes = [...project.scenes];
  const [movedScene] = nextScenes.splice(activeIndex, 1);
  nextScenes.splice(overIndex, 0, movedScene);

  const alignedScenes = alignScenesSequentially(nextScenes);

  return updateProject(project, {
    scenes: alignedScenes,
  });
}

/**
 * Immutably duplicates a scene within the project.
 */
export function duplicateScene(project: Project, sceneId: string): Project {
  const sceneIndex = project.scenes.findIndex((s) => s.id === sceneId);
  if (sceneIndex === -1) return project;

  const targetScene = project.scenes[sceneIndex];
  const cloned = cloneScene(targetScene);

  return addScene(project, cloned, sceneIndex + 1);
}

/**
 * Immutably adds a motion element to a specific scene in the project.
 */
export function addElementToProjectScene(
  project: Project,
  sceneId: string,
  element: MotionElement
): Project {
  const updatedScenes = project.scenes.map((scene) => {
    if (scene.id !== sceneId) return scene;
    return addElementToSceneHelper(scene, element);
  });

  return updateProject(project, { scenes: updatedScenes });
}

/**
 * Immutably removes an element from a specific scene in the project.
 */
export function removeElementFromProjectScene(
  project: Project,
  sceneId: string,
  elementId: string
): Project {
  const updatedScenes = project.scenes.map((scene) => {
    if (scene.id !== sceneId) return scene;
    return removeElementFromSceneHelper(scene, elementId);
  });

  return updateProject(project, { scenes: updatedScenes });
}

/**
 * Immutably updates an element within a specific scene in the project.
 */
export function updateElementInProjectScene(
  project: Project,
  sceneId: string,
  elementId: string,
  updates: Partial<MotionElement>
): Project {
  const updatedScenes = project.scenes.map((scene) => {
    if (scene.id !== sceneId) return scene;
    return updateElementInSceneHelper(scene, elementId, updates);
  });

  return updateProject(project, { scenes: updatedScenes });
}

/**
 * Immutably updates project metadata.
 */
export function updateProjectMetadata(
  project: Project,
  metadataUpdates: Partial<ProjectMetadata>
): Project {
  return updateProject(project, {
    metadata: {
      ...project.metadata,
      ...metadataUpdates,
    },
  });
}

/**
 * Immutably adds an asset to the project.
 * If an asset with the same ID already exists, it updates it.
 */
export function addAsset(project: Project, asset: Asset): Project {
  const existingAssets = project.assets || [];
  const existingIndex = existingAssets.findIndex((a) => a.id === asset.id);

  let nextAssets: Asset[];
  if (existingIndex >= 0) {
    nextAssets = existingAssets.map((a, i) => (i === existingIndex ? asset : a));
  } else {
    nextAssets = [...existingAssets, asset];
  }

  return updateProject(project, { assets: nextAssets });
}

/**
 * Immutably removes an asset from the project by id.
 */
export function removeAsset(project: Project, assetId: string): Project {
  const remainingAssets = (project.assets || []).filter((a) => a.id !== assetId);
  return updateProject(project, { assets: remainingAssets });
}

/**
 * Immutably updates an asset within the project.
 */
export function updateAsset(
  project: Project,
  assetId: string,
  updates: Partial<Asset>
): Project {
  const nextAssets = (project.assets || []).map((asset) => {
    if (asset.id !== assetId) return asset;
    return {
      ...asset,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  });

  return updateProject(project, { assets: nextAssets });
}
