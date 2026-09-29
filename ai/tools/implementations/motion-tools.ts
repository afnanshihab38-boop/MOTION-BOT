/**
 * MOTION-BOT — Concrete Safe Motion Tools
 * Phase 7.5: Agent Tool / Action Layer
 *
 * Implements real motion design tools connected to existing project,
 * scene, asset, and motion-plan models and storage abstractions.
 */

import { ToolDefinition } from "../types";
import {
  addScene,
  updateScene,
  removeScene,
  createProject,
  DIMENSION_PRESETS,
} from "@/services/project/project-model";
import { createScene } from "@/services/project/scene-model";
import { SAMPLE_DEV_PROJECT } from "@/services/project/sample-project";
import { validateAndNormalizeMotionPlan } from "@/ai/motion-plan/validator";
import { CreativeBrief } from "@/ai/creative-brain/types";
import { Project } from "@/types/project";
import { Scene } from "@/types/scene";
import { Asset } from "@/types/asset";
import { createAsset } from "@/services/asset/asset-model";

// In-memory active project store for runtime tool operations if storage service is not provided in context
const activeToolProjectStore: Map<string, Project> = new Map([
  [SAMPLE_DEV_PROJECT.id, JSON.parse(JSON.stringify(SAMPLE_DEV_PROJECT))],
]);

// In-memory asset library catalog
const sampleAssetCatalog: Asset[] = [
  createAsset({
    id: "asset_logo_primary",
    name: "MotionBot Vector Logo",
    type: "logo",
    url: "/assets/logo.svg",
    tags: ["logo", "brand", "vector"],
    width: 512,
    height: 512,
  }),
  createAsset({
    id: "asset_sneaker_cutout",
    name: "AeroGlide Sneaker Cutout",
    type: "image",
    url: "/assets/products/sneaker-cutout.png",
    tags: ["product", "sneaker", "transparent", "hero"],
    width: 1200,
    height: 800,
  }),
  createAsset({
    id: "asset_music_trap_beat",
    name: "Energetic Trap Rhythm",
    type: "audio",
    url: "/audio/trap-beat.mp3",
    tags: ["music", "fast", "trap", "energetic"],
    durationSeconds: 15,
  }),
  createAsset({
    id: "asset_sfx_whoosh",
    name: "Cinematic Whip Whoosh",
    type: "audio",
    url: "/audio/whoosh.wav",
    tags: ["sfx", "transition", "whoosh"],
    durationSeconds: 0.8,
  }),
];

function resolveProject(projectId?: string): Project {
  if (projectId && activeToolProjectStore.has(projectId)) {
    return activeToolProjectStore.get(projectId)!;
  }
  // Default to sample project
  let project = activeToolProjectStore.get(SAMPLE_DEV_PROJECT.id);
  if (!project) {
    project = JSON.parse(JSON.stringify(SAMPLE_DEV_PROJECT));
    activeToolProjectStore.set(SAMPLE_DEV_PROJECT.id, project!);
  }
  return project!;
}

// =============================================================================
// 1. GET_PROJECT_INFO (READ)
// =============================================================================
export const getProjectInfoTool: ToolDefinition = {
  name: "get_project_info",
  description: "Retrieves project metadata, canvas dimensions, aspect ratio, duration, and scene overview.",
  parameters: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Unique project ID to inspect. Defaults to active project if omitted.",
      },
    },
    additionalProperties: false,
  },
  classification: "read",
  permissionLevel: "read",
  requiresConfirmation: false,
  execute: async (args) => {
    const project = resolveProject(args.projectId as string | undefined);
    return {
      id: project.id,
      name: project.name,
      width: project.width,
      height: project.height,
      aspectRatio: `${project.width}:${project.height}`,
      fps: project.fps,
      duration: project.duration,
      sceneCount: project.scenes.length,
      scenes: project.scenes.map((s) => ({
        id: s.id,
        name: s.name,
        duration: s.duration,
        startTime: s.startTime,
        endTime: s.startTime + s.duration,
        elementCount: s.elements.length,
      })),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  },
};

// =============================================================================
// 2. GET_SCENE_INFO (READ)
// =============================================================================
export const getSceneInfoTool: ToolDefinition = {
  name: "get_scene_info",
  description: "Retrieves granular details about a specific scene, including visual layers and kinetic text.",
  parameters: {
    type: "object",
    properties: {
      sceneId: {
        type: "string",
        description: "ID of the scene to inspect.",
        required: true,
      },
      projectId: {
        type: "string",
        description: "Project containing the scene.",
      },
    },
    required: ["sceneId"],
    additionalProperties: false,
  },
  classification: "read",
  permissionLevel: "read",
  requiresConfirmation: false,
  execute: async (args) => {
    const project = resolveProject(args.projectId as string | undefined);
    const sceneId = String(args.sceneId);
    const scene = project.scenes.find((s) => s.id === sceneId);

    if (!scene) {
      throw new Error(`Scene '${sceneId}' not found in project '${project.name}'.`);
    }

    return {
      id: scene.id,
      name: scene.name,
      duration: scene.duration,
      startTime: scene.startTime,
      endTime: scene.startTime + scene.duration,
      background: scene.background,
      transition: scene.transitionIn?.type || "none",
      elementCount: scene.elements.length,
      elements: scene.elements.map((el) => ({
        id: el.id,
        name: el.name,
        type: el.type,
        x: el.transform.x,
        y: el.transform.y,
        opacity: el.appearance?.opacity ?? 1,
        scaleX: el.transform.scaleX,
        scaleY: el.transform.scaleY,
        content: el.type === "text" ? (el as { text?: string }).text : undefined,
      })),
    };
  },
};

// =============================================================================
// 3. GET_MOTION_PLAN (READ)
// =============================================================================
export const getMotionPlanTool: ToolDefinition = {
  name: "get_motion_plan",
  description: "Retrieves the active structured motion plan or synthesizes a plan summary from the current project.",
  parameters: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Project identifier.",
      },
    },
    additionalProperties: false,
  },
  classification: "read",
  permissionLevel: "read",
  requiresConfirmation: false,
  execute: async (args) => {
    const project = resolveProject(args.projectId as string | undefined);
    return {
      projectId: project.id,
      title: project.name,
      canvas: {
        width: project.width,
        height: project.height,
        aspect_ratio: `${project.width}:${project.height}`,
        fps: project.fps,
      },
      duration: project.duration,
      scenes: project.scenes.map((s, idx) => ({
        scene_id: s.id,
        start_time: s.startTime,
        end_time: s.startTime + s.duration,
        duration: s.duration,
        purpose: idx === 0 ? "hook" : idx === project.scenes.length - 1 ? "call_to_action" : "feature",
        background: s.background,
        elementsCount: s.elements.length,
      })),
    };
  },
};

// =============================================================================
// 4. VALIDATE_MOTION_PLAN (READ / ANALYZE)
// =============================================================================
export const validateMotionPlanTool: ToolDefinition = {
  name: "validate_motion_plan",
  description: "Validates a candidate Motion Plan against temporal correctness, schema, and controlled animation vocabulary.",
  parameters: {
    type: "object",
    properties: {
      motionPlan: {
        type: "object",
        description: "The complete candidate MotionPlan object to validate.",
        required: true,
      },
      sourceBrief: {
        type: "object",
        description: "Optional CreativeBrief to test fidelity against.",
      },
    },
    required: ["motionPlan"],
    additionalProperties: false,
  },
  classification: "read",
  permissionLevel: "read",
  requiresConfirmation: false,
  execute: async (args) => {
    const rawPlan = args.motionPlan as Record<string, unknown>;
    const rawBrief = (args.sourceBrief || {}) as Record<string, unknown>;

    const brief: CreativeBrief = {
      id: typeof rawBrief.id === "string" ? rawBrief.id : "brief_validation_check",
      version: "1.0.0",
      title: typeof rawBrief.title === "string" ? rawBrief.title : "Validation Brief",
      projectType: "ad",
      platform: "general",
      duration: typeof rawPlan.duration === "number" ? rawPlan.duration : 10,
      aspectRatio: "16:9",
      style: "modern",
      tone: "energetic",
      subject: "Motion Product",
      visualDirection: {},
      textContent: { headline: "HEADLINE" },
      animationDirection: { pacing: "fast" },
      createdAt: new Date().toISOString(),
    };

    const validation = validateAndNormalizeMotionPlan(rawPlan, brief, { strict: true });

    return {
      valid: validation.valid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
      errors: validation.errors,
      warnings: validation.warnings,
      duration: validation.plan.duration,
      sceneCount: validation.plan.scenes.length,
    };
  },
};

// =============================================================================
// 5. LIST_ASSETS (READ)
// =============================================================================
export const listAssetsTool: ToolDefinition = {
  name: "list_assets",
  description: "Lists visual, vector, and audio assets available for motion composition.",
  parameters: {
    type: "object",
    properties: {
      type: {
        type: "string",
        description: "Filter assets by media type (image, video, audio, logo).",
        enum: ["image", "video", "audio", "logo"],
      },
      limit: {
        type: "number",
        description: "Maximum number of items to return. Defaults to 20.",
      },
    },
    additionalProperties: false,
  },
  classification: "read",
  permissionLevel: "read",
  requiresConfirmation: false,
  execute: async (args) => {
    let assets = [...sampleAssetCatalog];
    if (args.type) {
      assets = assets.filter((a) => a.type === args.type);
    }
    const limit = typeof args.limit === "number" && args.limit > 0 ? args.limit : 20;
    return {
      total: assets.length,
      assets: assets.slice(0, limit).map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        url: a.url,
        width: a.metadata?.width,
        height: a.metadata?.height,
        durationSeconds: a.metadata?.durationSeconds,
        tags: a.tags,
      })),
    };
  },
};

// =============================================================================
// 6. SEARCH_ASSETS (READ)
// =============================================================================
export const searchAssetsTool: ToolDefinition = {
  name: "search_assets",
  description: "Searches the asset catalog by keyword query matching name or tags.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search keyword (e.g. 'sneaker', 'logo', 'whoosh').",
        required: true,
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  classification: "read",
  permissionLevel: "read",
  requiresConfirmation: false,
  execute: async (args) => {
    const q = String(args.query || "").toLowerCase().trim();
    const matches = sampleAssetCatalog.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        (a.tags && a.tags.some((t) => t.toLowerCase().includes(q)))
    );

    return {
      query: q,
      matchCount: matches.length,
      matches: matches.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        url: m.url,
        tags: m.tags,
      })),
    };
  },
};

// =============================================================================
// 7. CREATE_SCENE (WRITE)
// =============================================================================
export const createSceneTool: ToolDefinition = {
  name: "create_scene",
  description: "Creates and appends a new scene to the project timeline.",
  parameters: {
    type: "object",
    properties: {
      projectId: {
        type: "string",
        description: "Target project identifier.",
      },
      name: {
        type: "string",
        description: "Human-readable scene name (e.g., 'Hero Product Intro').",
      },
      duration: {
        type: "number",
        description: "Scene duration in seconds (must be > 0). Defaults to 3s.",
      },
      backgroundColor: {
        type: "string",
        description: "Background hex color (e.g., '#000000').",
      },
    },
    additionalProperties: false,
  },
  classification: "write",
  permissionLevel: "write",
  requiresConfirmation: false,
  execute: async (args) => {
    let project = resolveProject(args.projectId as string | undefined);
    const duration = typeof args.duration === "number" && args.duration > 0 ? args.duration : 3;
    const name = typeof args.name === "string" && args.name.trim() ? args.name.trim() : `Scene ${project.scenes.length + 1}`;
    const bgColor = typeof args.backgroundColor === "string" ? args.backgroundColor : "#000000";

    const newScene = createScene({
      name,
      duration,
      background: {
        type: "solid",
        color: bgColor,
      },
    });

    project = addScene(project, newScene);
    activeToolProjectStore.set(project.id, project);

    return {
      success: true,
      message: `Scene '${newScene.name}' created successfully.`,
      scene: {
        id: newScene.id,
        name: newScene.name,
        duration: newScene.duration,
        startTime: newScene.startTime,
        endTime: newScene.startTime + newScene.duration,
      },
      projectDuration: project.duration,
    };
  },
};

// =============================================================================
// 8. UPDATE_SCENE (WRITE)
// =============================================================================
export const updateSceneTool: ToolDefinition = {
  name: "update_scene",
  description: "Updates properties (name, duration, background) of an existing scene.",
  parameters: {
    type: "object",
    properties: {
      sceneId: {
        type: "string",
        description: "ID of the scene to update.",
        required: true,
      },
      projectId: {
        type: "string",
        description: "Target project identifier.",
      },
      name: {
        type: "string",
        description: "New scene name.",
      },
      duration: {
        type: "number",
        description: "New duration in seconds (must be > 0).",
      },
      backgroundColor: {
        type: "string",
        description: "New background hex color.",
      },
    },
    required: ["sceneId"],
    additionalProperties: false,
  },
  classification: "write",
  permissionLevel: "write",
  requiresConfirmation: false,
  execute: async (args) => {
    let project = resolveProject(args.projectId as string | undefined);
    const sceneId = String(args.sceneId);
    const targetScene = project.scenes.find((s) => s.id === sceneId);

    if (!targetScene) {
      throw new Error(`Scene '${sceneId}' does not exist in project '${project.name}'.`);
    }

    const updates: Partial<Scene> = {};
    if (typeof args.name === "string" && args.name.trim()) {
      updates.name = args.name.trim();
    }
    if (typeof args.duration === "number" && args.duration > 0) {
      updates.duration = args.duration;
    }
    if (typeof args.backgroundColor === "string") {
      updates.background = {
        type: "solid",
        color: args.backgroundColor,
      };
    }

    project = updateScene(project, sceneId, updates);
    activeToolProjectStore.set(project.id, project);

    const updatedScene = project.scenes.find((s) => s.id === sceneId)!;

    return {
      success: true,
      message: `Scene '${sceneId}' updated successfully.`,
      scene: {
        id: updatedScene.id,
        name: updatedScene.name,
        duration: updatedScene.duration,
        startTime: updatedScene.startTime,
        endTime: updatedScene.startTime + updatedScene.duration,
      },
      projectDuration: project.duration,
    };
  },
};

// =============================================================================
// 9. DELETE_SCENE (DESTRUCTIVE WRITE — REQUIRES CONFIRMATION)
// =============================================================================
export const deleteSceneTool: ToolDefinition = {
  name: "delete_scene",
  description: "Permanently removes a scene and its layers from the composition. High impact: requires confirmation.",
  parameters: {
    type: "object",
    properties: {
      sceneId: {
        type: "string",
        description: "ID of the scene to permanently remove.",
        required: true,
      },
      projectId: {
        type: "string",
        description: "Target project identifier.",
      },
    },
    required: ["sceneId"],
    additionalProperties: false,
  },
  classification: "write",
  permissionLevel: "write",
  requiresConfirmation: true, // DESTRUCTIVE: must pass confirmation check
  execute: async (args) => {
    let project = resolveProject(args.projectId as string | undefined);
    const sceneId = String(args.sceneId);

    if (project.scenes.length <= 1) {
      throw new Error("Cannot delete the only remaining scene in the project.");
    }

    const targetScene = project.scenes.find((s) => s.id === sceneId);
    if (!targetScene) {
      throw new Error(`Scene '${sceneId}' not found.`);
    }

    project = removeScene(project, sceneId);
    activeToolProjectStore.set(project.id, project);

    return {
      success: true,
      message: `Scene '${targetScene.name}' (${sceneId}) was deleted.`,
      remainingScenes: project.scenes.length,
      projectDuration: project.duration,
    };
  },
};

export const ALL_SAFE_MOTION_TOOLS: ToolDefinition[] = [
  getProjectInfoTool,
  getSceneInfoTool,
  getMotionPlanTool,
  validateMotionPlanTool,
  listAssetsTool,
  searchAssetsTool,
  createSceneTool,
  updateSceneTool,
  deleteSceneTool,
];
