/**
 * MOTION-BOT — Contextual Action Applier & Validator
 * Phase 8.7: AI Contextual Editing
 *
 * Immutably applies validated structured actions to the Project model.
 * Enforces strict property boundaries, referential integrity, and deep validation.
 */

import { Project } from "@/types/project";
import { Scene } from "@/types/scene";
import { MotionElement, TextElement, ShapeElement } from "@/types/element";
import { ContextualEditAction } from "./types";
import { updateScene, updateProject } from "@/services/project/project-model";
import { alignScenesSequentially, calculateScenesDuration } from "@/services/project/scene-model";
import { validateProjectDeep, formatValidationErrors } from "@/services/project/project-validator";
import { cloneProject } from "@/services/project/project-serializer";

export interface ApplyActionResult {
  success: boolean;
  project: Project;
  error?: string;
  errors?: string[];
}

/**
 * Validates whether an action's target and properties are supported and structurally valid.
 */
export function validateContextualAction(
  project: Project,
  action: ContextualEditAction
): { valid: boolean; error?: string } {
  if (!action || typeof action !== "object") {
    return { valid: false, error: "Action must be a valid object." };
  }

  // 1. Verify scene exists
  const scene = project.scenes.find((s) => s.id === action.sceneId);
  if (!scene) {
    return {
      valid: false,
      error: `Target scene '${action.sceneId}' does not exist in project '${project.name}'.`,
    };
  }

  // 2. If element is targeted, verify element exists
  if (action.elementId) {
    const element = scene.elements.find((el) => el.id === action.elementId);
    if (!element) {
      return {
        valid: false,
        error: `Target layer '${action.elementId}' was not found in scene '${scene.name}'.`,
      };
    }

    // Validate element-level properties
    switch (action.type) {
      case "UPDATE_LAYER_TRANSFORM": {
        const payload = action.payload;
        if ("x" in payload && (!Number.isFinite(payload.x) || typeof payload.x !== "number")) {
          return { valid: false, error: "Transform 'x' coordinate must be a finite number." };
        }
        if ("y" in payload && (!Number.isFinite(payload.y) || typeof payload.y !== "number")) {
          return { valid: false, error: "Transform 'y' coordinate must be a finite number." };
        }
        if ("rotation" in payload && (!Number.isFinite(payload.rotation) || typeof payload.rotation !== "number")) {
          return { valid: false, error: "Transform 'rotation' must be a finite number of degrees." };
        }
        if ("scaleX" in payload) {
          if (typeof payload.scaleX !== "number" || !Number.isFinite(payload.scaleX) || payload.scaleX <= 0) {
            return { valid: false, error: "Transform 'scaleX' must be a positive number greater than 0." };
          }
        }
        if ("scaleY" in payload) {
          if (typeof payload.scaleY !== "number" || !Number.isFinite(payload.scaleY) || payload.scaleY <= 0) {
            return { valid: false, error: "Transform 'scaleY' must be a positive number greater than 0." };
          }
        }
        break;
      }

      case "UPDATE_TEXT_PROPERTY": {
        if (element.type !== "text") {
          return {
            valid: false,
            error: `Layer '${element.name}' is of type '${element.type}', not a text element.`,
          };
        }
        const payload = action.payload;
        if ("fontSize" in payload) {
          if (typeof payload.fontSize !== "number" || !Number.isFinite(payload.fontSize) || payload.fontSize <= 0 || payload.fontSize > 500) {
            return { valid: false, error: "Text 'fontSize' must be a positive number between 1 and 500." };
          }
        }
        if ("text" in payload && typeof payload.text !== "string") {
          return { valid: false, error: "Text content must be a string." };
        }
        break;
      }

      case "UPDATE_LAYER_APPEARANCE": {
        const payload = action.payload;
        if ("opacity" in payload) {
          if (typeof payload.opacity !== "number" || !Number.isFinite(payload.opacity) || payload.opacity < 0 || payload.opacity > 1) {
            return { valid: false, error: "Opacity must be a number between 0 and 1." };
          }
        }
        break;
      }
    }
  }

  // 3. Validate scene-level properties
  if (action.type === "UPDATE_SCENE_DURATION") {
    const payload = action.payload;
    if (typeof payload.duration !== "number" || !Number.isFinite(payload.duration) || payload.duration <= 0 || payload.duration > 600) {
      return { valid: false, error: "Scene duration must be a positive number between 0.1s and 600s." };
    }
  }

  if (action.type === "UPDATE_SCENE_BACKGROUND") {
    const payload = action.payload;
    if (!payload.color && !payload.background) {
      return { valid: false, error: "Scene background requires a valid color or background definition." };
    }
  }

  return { valid: true };
}

/**
 * Applies a single contextual action immutably to a project.
 */
export function applyContextualAction(
  project: Project,
  action: ContextualEditAction
): ApplyActionResult {
  const preCheck = validateContextualAction(project, action);
  if (!preCheck.valid) {
    return {
      success: false,
      project,
      error: preCheck.error,
    };
  }

  const workingCopy = cloneProject(project);
  let updatedProject = workingCopy;

  switch (action.type) {
    case "UPDATE_LAYER_TRANSFORM": {
      const sceneIndex = updatedProject.scenes.findIndex((s) => s.id === action.sceneId);
      if (sceneIndex === -1) break;

      const scene = updatedProject.scenes[sceneIndex];
      const nextElements = scene.elements.map((el) => {
        if (el.id !== action.elementId) return el;
        const currentTransform = { ...el.transform };
        const nextTransform = {
          ...currentTransform,
          ...action.payload,
        };
        return {
          ...el,
          transform: nextTransform,
        };
      });

      const nextScenes = [...updatedProject.scenes];
      nextScenes[sceneIndex] = {
        ...scene,
        elements: nextElements,
      };

      updatedProject = updateProject(updatedProject, { scenes: nextScenes });
      break;
    }

    case "UPDATE_TEXT_PROPERTY": {
      const sceneIndex = updatedProject.scenes.findIndex((s) => s.id === action.sceneId);
      if (sceneIndex === -1) break;

      const scene = updatedProject.scenes[sceneIndex];
      const nextElements = scene.elements.map((el) => {
        if (el.id !== action.elementId || el.type !== "text") return el;
        const textEl = el as TextElement;
        const updates = action.payload;

        const nextEl: TextElement = {
          ...textEl,
          ...(updates.text !== undefined ? { text: String(updates.text), content: String(updates.text) } : {}),
          ...(typeof updates.fontSize === "number" ? { fontSize: updates.fontSize } : {}),
          ...(updates.color ? { color: String(updates.color) } : {}),
          ...(updates.fontFamily ? { fontFamily: String(updates.fontFamily) } : {}),
          ...(updates.fontWeight ? { fontWeight: updates.fontWeight as number | string } : {}),
          ...(updates.textAlign ? { textAlign: updates.textAlign as any } : {}),
        };

        if (updates.color && nextEl.appearance?.fill) {
          nextEl.appearance = {
            ...nextEl.appearance,
            fill: {
              ...nextEl.appearance.fill,
              color: String(updates.color),
            },
          };
        }

        return nextEl;
      });

      const nextScenes = [...updatedProject.scenes];
      nextScenes[sceneIndex] = {
        ...scene,
        elements: nextElements,
      };

      updatedProject = updateProject(updatedProject, { scenes: nextScenes });
      break;
    }

    case "UPDATE_SCENE_DURATION": {
      const newDuration = action.payload.duration as number;
      updatedProject = updateScene(updatedProject, action.sceneId, {
        duration: newDuration,
      });
      break;
    }

    case "UPDATE_SCENE_BACKGROUND": {
      const color = (action.payload.color || action.proposedValue) as string;
      updatedProject = updateScene(updatedProject, action.sceneId, {
        background: {
          type: "solid",
          color: color || "#000000",
        },
      });
      break;
    }

    case "UPDATE_MOTION_PROPERTY": {
      // Handles animation speed / keyframe stretching or duration scaling
      const sceneIndex = updatedProject.scenes.findIndex((s) => s.id === action.sceneId);
      if (sceneIndex === -1) break;

      const scene = updatedProject.scenes[sceneIndex];
      const speedMultiplier = (action.payload.speedMultiplier as number) || 1.0;
      const durationFactor = (action.payload.durationFactor as number) || (speedMultiplier > 0 ? 1 / speedMultiplier : 1.5);

      const nextDuration = Math.max(0.5, Number((scene.duration * durationFactor).toFixed(2)));

      // Stretch elements animation timing if element targeted or whole scene
      const nextElements = scene.elements.map((el) => {
        if (action.elementId && el.id !== action.elementId) return el;
        const stretchedTracks = el.propertyTracks?.map((track) => ({
          ...track,
          keyframes: track.keyframes.map((kf) => ({
            ...kf,
            time: Number((kf.time * durationFactor).toFixed(3)),
          })),
        })) || [];

        return {
          ...el,
          propertyTracks: stretchedTracks,
        };
      });

      const nextScenes = [...updatedProject.scenes];
      nextScenes[sceneIndex] = {
        ...scene,
        duration: nextDuration,
        elements: nextElements,
      };

      const alignedScenes = alignScenesSequentially(nextScenes);
      const totalDuration = calculateScenesDuration(alignedScenes);

      updatedProject = updateProject(updatedProject, {
        scenes: alignedScenes,
        duration: Math.max(totalDuration, updatedProject.duration),
      });
      break;
    }

    case "UPDATE_LAYER_APPEARANCE": {
      const sceneIndex = updatedProject.scenes.findIndex((s) => s.id === action.sceneId);
      if (sceneIndex === -1) break;

      const scene = updatedProject.scenes[sceneIndex];
      const nextElements = scene.elements.map((el) => {
        if (el.id !== action.elementId) return el;
        return {
          ...el,
          appearance: {
            ...el.appearance,
            ...action.payload,
          },
        };
      });

      const nextScenes = [...updatedProject.scenes];
      nextScenes[sceneIndex] = {
        ...scene,
        elements: nextElements,
      };

      updatedProject = updateProject(updatedProject, { scenes: nextScenes });
      break;
    }

    default:
      return {
        success: false,
        project,
        error: `Unsupported action type: '${(action as any).type}'`,
      };
  }

  // 4. Verify project deep structural and referential validity
  const deepValidation = validateProjectDeep(updatedProject);
  if (!deepValidation.valid) {
    const errorStrings = formatValidationErrors(deepValidation.errors);
    return {
      success: false,
      project, // Return untouched project on validation failure
      error: `Project failed validation after applying edit: ${errorStrings.slice(0, 2).join("; ")}`,
      errors: errorStrings,
    };
  }

  return {
    success: true,
    project: updatedProject,
  };
}

/**
 * Applies multiple contextual actions sequentially.
 * If ANY action fails validation, the entire batch is aborted and the original project is preserved.
 */
export function applyContextualActions(
  project: Project,
  actions: ContextualEditAction[]
): ApplyActionResult {
  if (!actions || actions.length === 0) {
    return { success: true, project };
  }

  let currentProject = project;
  const errors: string[] = [];

  for (const action of actions) {
    const result = applyContextualAction(currentProject, action);
    if (!result.success) {
      return {
        success: false,
        project, // Abort entire batch on failure
        error: result.error || "Failed to apply action",
        errors: [result.error || "Action application error"],
      };
    }
    currentProject = result.project;
  }

  return {
    success: true,
    project: currentProject,
  };
}
