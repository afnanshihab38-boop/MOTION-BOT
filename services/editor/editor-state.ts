/**
 * MOTION-BOT — Editor State Management
 * Pure state reducer and factory functions for the visual editor.
 * Maintains clean separation between transient UI states and persistent Project models.
 * Part of Phase 5.1: Editor Architecture & Canvas Foundation.
 */

import { Project } from "@/types/project";
import { Scene, SceneId } from "@/types/scene";
import { MotionElement, Transform2D } from "@/types/element";
import { EditorState, EditorTool, ViewportState, ElementId } from "@/types/editor";
import { calculateFitZoom, clampZoom } from "./coordinate-system";
import { clearSelection, selectElement } from "./selection-system";
import { updateElementInScene, createScene, CreateSceneInput, addElementToScene } from "@/services/project/scene-model";
import {
  updateScene,
  addScene,
  removeScene,
  duplicateScene,
  reorderScenes,
  addAsset,
  removeAsset,
} from "@/services/project/project-model";
import {
  createImageElement,
  createLogoElement,
  createVideoElement,
  DEFAULT_TRANSFORM,
} from "@/services/element/element-model";
import { Asset } from "@/types/asset";
import { editVisualElement } from "./element-editing";

/**
 * Creates the initial editor state for a given Project.
 */
export function createInitialEditorState(
  project: Project,
  containerWidth = 1200,
  containerHeight = 800
): EditorState {
  const initialSceneId = project.scenes[0]?.id || "scene_1";
  const { zoom, panX, panY } = calculateFitZoom(
    project.width,
    project.height,
    containerWidth,
    containerHeight
  );

  return {
    project,
    activeSceneId: initialSceneId,
    activeTool: "select",
    viewport: {
      zoom,
      panX,
      panY,
      containerWidth,
      containerHeight,
    },
    selectedElementIds: [],
    hoveredElementId: null,
    isDragging: false,
    isPanning: false,
    dragStart: null,
    snapToGrid: true,
    gridSize: 10,
    showGuides: true,
    showTitleSafe: true,
  };
}

/**
 * Returns the currently active scene object from the project.
 */
export function getActiveScene(state: EditorState): Scene | undefined {
  return state.project.scenes.find((s) => s.id === state.activeSceneId) || state.project.scenes[0];
}

/**
 * Switches the active editing scene and clears element selection.
 */
export function setActiveScene(state: EditorState, sceneId: SceneId): EditorState {
  if (state.activeSceneId === sceneId) return state;

  return {
    ...state,
    activeSceneId: sceneId,
    selectedElementIds: [],
    hoveredElementId: null,
  };
}

/**
 * Changes the active tool.
 */
export function setActiveTool(state: EditorState, tool: EditorTool): EditorState {
  if (state.activeTool === tool) return state;
  return {
    ...state,
    activeTool: tool,
  };
}

/**
 * Updates the viewport zoom level.
 */
export function setViewportZoom(state: EditorState, newZoom: number): EditorState {
  const zoom = clampZoom(newZoom);
  return {
    ...state,
    viewport: {
      ...state.viewport,
      zoom,
    },
  };
}

/**
 * Updates the viewport pan offsets.
 */
export function setViewportPan(state: EditorState, panX: number, panY: number): EditorState {
  return {
    ...state,
    viewport: {
      ...state.viewport,
      panX: Math.round(panX),
      panY: Math.round(panY),
    },
  };
}

/**
 * Recalculates zoom and pan to fit the canvas within the current viewport container.
 */
export function fitCanvasToViewport(state: EditorState): EditorState {
  const { zoom, panX, panY } = calculateFitZoom(
    state.project.width,
    state.project.height,
    state.viewport.containerWidth,
    state.viewport.containerHeight
  );

  return {
    ...state,
    viewport: {
      ...state.viewport,
      zoom,
      panX,
      panY,
    },
  };
}

/**
 * Selects an element within the editor state.
 */
export function selectElementInState(
  state: EditorState,
  elementId: ElementId,
  multiSelect = false
): EditorState {
  const nextSelectedIds = selectElement(state.selectedElementIds, elementId, multiSelect);
  return {
    ...state,
    selectedElementIds: nextSelectedIds,
  };
}

/**
 * Clears current selection in editor state.
 */
export function clearSelectionInState(state: EditorState): EditorState {
  return {
    ...state,
    selectedElementIds: clearSelection(),
  };
}

/**
 * Updates the hovered element ID.
 */
export function setHoveredElement(state: EditorState, elementId: ElementId | null): EditorState {
  if (state.hoveredElementId === elementId) return state;
  return {
    ...state,
    hoveredElementId: elementId,
  };
}

/**
 * Updates transform properties for currently selected elements in the active scene.
 */
export function updateSelectedElementsTransform(
  state: EditorState,
  transformUpdates: Partial<Transform2D>
): EditorState {
  if (state.selectedElementIds.length === 0) return state;

  const scene = getActiveScene(state);
  if (!scene) return state;

  let updatedScene = scene;
  for (const elementId of state.selectedElementIds) {
    const el = updatedScene.elements.find((e) => e.id === elementId);
    if (el && !el.locked) {
      updatedScene = updateElementInScene(updatedScene, elementId, {
        transform: {
          ...el.transform,
          ...transformUpdates,
        },
      });
    }
  }

  const updatedProject = updateScene(state.project, updatedScene.id, updatedScene);

  return {
    ...state,
    project: updatedProject,
  };
}

/**
 * Immutably updates multiple elements in the active scene.
 * Skips elements that are locked or invisible.
 */
export function updateElementsInActiveScene(
  state: EditorState,
  updatedElements: MotionElement[]
): EditorState {
  const activeScene = getActiveScene(state);
  if (!activeScene || updatedElements.length === 0) return state;

  const elementMap = new Map(updatedElements.map((el) => [el.id, el]));
  const nextElements = activeScene.elements.map((el) => {
    const updated = elementMap.get(el.id);
    if (!updated) return el;
    // Guard against modifying locked elements
    if (el.locked) return el;
    return updated;
  });

  const updatedScene = { ...activeScene, elements: nextElements };
  const updatedProject = updateScene(state.project, updatedScene.id, updatedScene);

  return {
    ...state,
    project: updatedProject,
  };
}

/**
 * Updates an element in the active scene using editVisualElement.
 * Preserves exact array ordering of elements in scene.elements.
 * Preserves element ID and rejects edits to locked elements.
 */
export function updateElementInActiveScene(
  state: EditorState,
  elementId: ElementId,
  updates: Partial<MotionElement>
): EditorState {
  const activeScene = getActiveScene(state);
  if (!activeScene) return state;

  const target = activeScene.elements.find((el) => el.id === elementId);
  if (!target || target.locked) return state;

  const updatedElement = editVisualElement(target, updates);

  // Preserve exact array ordering
  const nextElements = activeScene.elements.map((el) =>
    el.id === elementId ? updatedElement : el
  );

  const updatedScene = { ...activeScene, elements: nextElements };
  const updatedProject = updateScene(state.project, updatedScene.id, updatedScene);

  return {
    ...state,
    project: updatedProject,
  };
}

/**
 * Updates the currently selected primary element in the active scene.
 */
export function updateSelectedElement(
  state: EditorState,
  updates: Partial<MotionElement>
): EditorState {
  if (state.selectedElementIds.length === 0) return state;
  const primaryId = state.selectedElementIds[0];
  return updateElementInActiveScene(state, primaryId, updates);
}

/**
 * Toggles or sets the lock state of an element in the active scene.
 */
export function toggleElementLockInActiveScene(
  state: EditorState,
  elementId: ElementId,
  locked?: boolean
): EditorState {
  const activeScene = getActiveScene(state);
  if (!activeScene) return state;

  const target = activeScene.elements.find((el) => el.id === elementId);
  if (!target) return state;

  const nextLocked = locked !== undefined ? locked : !target.locked;
  const updatedScene = updateElementInScene(activeScene, elementId, {
    locked: nextLocked,
  });

  const updatedProject = updateScene(state.project, updatedScene.id, updatedScene);

  return {
    ...state,
    project: updatedProject,
  };
}

/**
 * Toggles or sets the visibility of an element in the active scene.
 */
export function toggleElementVisibilityInActiveScene(
  state: EditorState,
  elementId: ElementId,
  visible?: boolean
): EditorState {
  const activeScene = getActiveScene(state);
  if (!activeScene) return state;

  const target = activeScene.elements.find((el) => el.id === elementId);
  if (!target) return state;

  const nextVisible = visible !== undefined ? visible : !target.visible;
  const updatedScene = updateElementInScene(activeScene, elementId, {
    visible: nextVisible,
  });

  const updatedProject = updateScene(state.project, updatedScene.id, updatedScene);

  return {
    ...state,
    project: updatedProject,
  };
}

/**
 * Deletes an element from the active scene.
 * Cleans up selection if the deleted element was selected.
 */
export function deleteElementInActiveScene(
  state: EditorState,
  elementId: ElementId
): EditorState {
  const activeScene = getActiveScene(state);
  if (!activeScene) return state;

  const target = activeScene.elements.find((el) => el.id === elementId);
  if (!target) return state;

  const nextElements = activeScene.elements.filter((el) => el.id !== elementId);
  const updatedScene = { ...activeScene, elements: nextElements };
  const updatedProject = updateScene(state.project, updatedScene.id, updatedScene);

  return {
    ...state,
    project: updatedProject,
    selectedElementIds: state.selectedElementIds.filter((id) => id !== elementId),
    hoveredElementId: state.hoveredElementId === elementId ? null : state.hoveredElementId,
  };
}

/**
 * Duplicates an element in the active scene with a unique ID, deep-copied properties,
 * offset position (+20px, +20px), and automatically selects the newly created duplicate.
 */
export function duplicateElementInActiveScene(
  state: EditorState,
  elementId: ElementId
): EditorState {
  const activeScene = getActiveScene(state);
  if (!activeScene) return state;

  const target = activeScene.elements.find((el) => el.id === elementId);
  if (!target) return state;

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const duplicateId = `${target.type}_${uniqueSuffix}`;

  const duplicatedElement: MotionElement = {
    ...JSON.parse(JSON.stringify(target)),
    id: duplicateId,
    name: `${target.name || target.type} (Copy)`,
    transform: {
      ...target.transform,
      x: target.transform.x + 20,
      y: target.transform.y + 20,
    },
    locked: false, // Duplicates start unlocked so user can immediately manipulate them
  };

  // Insert right after the original element in the layer stack
  const targetIndex = activeScene.elements.findIndex((el) => el.id === elementId);
  const nextElements = [...activeScene.elements];
  nextElements.splice(targetIndex + 1, 0, duplicatedElement);

  // Recalculate zIndex for all elements in order
  const reIndexedElements = nextElements.map((el, idx) => ({
    ...el,
    zIndex: idx,
  }));

  const updatedScene = { ...activeScene, elements: reIndexedElements };
  const updatedProject = updateScene(state.project, updatedScene.id, updatedScene);

  return {
    ...state,
    project: updatedProject,
    selectedElementIds: [duplicateId],
  };
}

/**
 * Reorders an element in the active scene's layer stack.
 * In canvas rendering, elements earlier in the array are behind, later are in front.
 */
export function reorderElementInActiveScene(
  state: EditorState,
  elementId: ElementId,
  action: "bringForward" | "sendBackward" | "bringToFront" | "sendToBack"
): EditorState {
  const activeScene = getActiveScene(state);
  if (!activeScene) return state;

  const elements = [...activeScene.elements];
  const currentIndex = elements.findIndex((el) => el.id === elementId);
  if (currentIndex === -1) return state;

  const [targetElement] = elements.splice(currentIndex, 1);

  if (action === "bringForward") {
    const newIndex = Math.min(elements.length, currentIndex + 1);
    elements.splice(newIndex, 0, targetElement);
  } else if (action === "sendBackward") {
    const newIndex = Math.max(0, currentIndex - 1);
    elements.splice(newIndex, 0, targetElement);
  } else if (action === "bringToFront") {
    elements.push(targetElement);
  } else if (action === "sendToBack") {
    elements.unshift(targetElement);
  }

  // Synchronize zIndex with new array order
  const reIndexedElements = elements.map((el, idx) => ({
    ...el,
    zIndex: idx,
  }));

  const updatedScene = { ...activeScene, elements: reIndexedElements };
  const updatedProject = updateScene(state.project, updatedScene.id, updatedScene);

  return {
    ...state,
    project: updatedProject,
  };
}

// ============================================================================
// SCENE MANAGEMENT FUNCTIONS (Phase 8.4)
// ============================================================================

/**
 * Creates and appends a new scene to the project, immediately making it active.
 * Clears element selections to avoid stale references.
 */
export function addSceneToEditor(
  state: EditorState,
  input?: CreateSceneInput
): EditorState {
  const sceneNumber = state.project.scenes.length + 1;
  const newScene = createScene({
    name: input?.name || `Scene ${sceneNumber}`,
    duration: input?.duration ?? 3.0,
    ...input,
  });

  const updatedProject = addScene(state.project, newScene);

  return {
    ...state,
    project: updatedProject,
    activeSceneId: newScene.id,
    selectedElementIds: [],
    hoveredElementId: null,
  };
}

/**
 * Selects an active scene in the editor.
 * Clears element selection and hovered states to prevent stale layer data.
 */
export function selectSceneInEditor(
  state: EditorState,
  sceneId: SceneId
): EditorState {
  const target = state.project.scenes.find((s) => s.id === sceneId);
  if (!target || state.activeSceneId === sceneId) {
    return state;
  }

  return {
    ...state,
    activeSceneId: sceneId,
    selectedElementIds: [],
    hoveredElementId: null,
  };
}

/**
 * Renames a scene immutably.
 */
export function renameSceneInEditor(
  state: EditorState,
  sceneId: SceneId,
  newName: string
): EditorState {
  const trimmed = newName.trim();
  if (!trimmed) return state;

  const updatedProject = updateScene(state.project, sceneId, { name: trimmed });

  return {
    ...state,
    project: updatedProject,
  };
}

/**
 * Duplicates a scene, inserts the copy adjacent to the original,
 * and sets the duplicated scene as active.
 */
export function duplicateSceneInEditor(
  state: EditorState,
  sceneId: SceneId
): EditorState {
  const targetIndex = state.project.scenes.findIndex((s) => s.id === sceneId);
  if (targetIndex === -1) return state;

  const updatedProject = duplicateScene(state.project, sceneId);
  // The duplicate is inserted at targetIndex + 1
  const duplicatedScene = updatedProject.scenes[targetIndex + 1];

  return {
    ...state,
    project: updatedProject,
    activeSceneId: duplicatedScene ? duplicatedScene.id : state.activeSceneId,
    selectedElementIds: [],
    hoveredElementId: null,
  };
}

/**
 * Deletes a scene safely.
 * Enforces safety constraint: cannot delete if project only has 1 scene.
 * If deleting active scene, switches activeSceneId to another scene.
 */
export function deleteSceneInEditor(
  state: EditorState,
  sceneId: SceneId
): EditorState {
  if (state.project.scenes.length <= 1) {
    // Prevent deleting the only scene
    return state;
  }

  const sceneIndex = state.project.scenes.findIndex((s) => s.id === sceneId);
  if (sceneIndex === -1) return state;

  let nextActiveSceneId = state.activeSceneId;
  if (state.activeSceneId === sceneId) {
    // Choose adjacent or previous scene
    const fallbackIndex = sceneIndex > 0 ? sceneIndex - 1 : 1;
    nextActiveSceneId = state.project.scenes[fallbackIndex]?.id || state.project.scenes[0].id;
  }

  const updatedProject = removeScene(state.project, sceneId);

  return {
    ...state,
    project: updatedProject,
    activeSceneId: nextActiveSceneId,
    selectedElementIds: [],
    hoveredElementId: null,
  };
}

/**
 * Reorders scenes within the editor.
 */
export function reorderScenesInEditor(
  state: EditorState,
  activeIndex: number,
  overIndex: number
): EditorState {
  const updatedProject = reorderScenes(state.project, activeIndex, overIndex);
  return {
    ...state,
    project: updatedProject,
  };
}

// ============================================================================
// ASSET MANAGEMENT FUNCTIONS (Phase 8.4)
// ============================================================================

/**
 * Adds an asset to project.assets.
 */
export function addAssetToEditor(
  state: EditorState,
  asset: Asset
): EditorState {
  const updatedProject = addAsset(state.project, asset);
  return {
    ...state,
    project: updatedProject,
  };
}

/**
 * Removes an asset from project.assets.
 */
export function removeAssetFromEditor(
  state: EditorState,
  assetId: string
): EditorState {
  const updatedProject = removeAsset(state.project, assetId);
  return {
    ...state,
    project: updatedProject,
  };
}

/**
 * Instantiates a project asset as a normal editable layer in the active scene.
 * Automatically selects the newly created layer.
 */
export function addAssetElementToActiveScene(
  state: EditorState,
  assetId: string
): EditorState {
  const activeScene = getActiveScene(state);
  if (!activeScene) return state;

  const asset = (state.project.assets || []).find((a) => a.id === assetId);
  if (!asset) return state;

  const defaultWidth = asset.width || (asset.type === "logo" ? 180 : asset.type === "video" ? 640 : 400);
  const defaultHeight = asset.height || (asset.type === "logo" ? 180 : asset.type === "video" ? 360 : 300);

  // Center on project canvas
  const centerX = Math.round((state.project.width - defaultWidth) / 2);
  const centerY = Math.round((state.project.height - defaultHeight) / 2);

  let newElement: MotionElement;

  if (asset.type === "logo") {
    newElement = createLogoElement({
      name: asset.name.replace(/\.[^/.]+$/, "") || "Brand Logo",
      assetId: asset.id,
      src: asset.url,
      transform: {
        ...DEFAULT_TRANSFORM,
        x: centerX,
        y: centerY,
        width: defaultWidth,
        height: defaultHeight,
      },
    });
  } else if (asset.type === "video") {
    newElement = createVideoElement({
      name: asset.name.replace(/\.[^/.]+$/, "") || "Video Layer",
      assetId: asset.id,
      src: asset.url,
      transform: {
        ...DEFAULT_TRANSFORM,
        x: centerX,
        y: centerY,
        width: defaultWidth,
        height: defaultHeight,
      },
    });
  } else {
    // Image or SVG
    newElement = createImageElement({
      name: asset.name.replace(/\.[^/.]+$/, "") || "Image Layer",
      assetId: asset.id,
      src: asset.url,
      transform: {
        ...DEFAULT_TRANSFORM,
        x: centerX,
        y: centerY,
        width: defaultWidth,
        height: defaultHeight,
      },
    });
  }

  const updatedScene = addElementToScene(activeScene, newElement);
  const updatedProject = updateScene(state.project, updatedScene.id, updatedScene);

  return {
    ...state,
    project: updatedProject,
    selectedElementIds: [newElement.id],
    hoveredElementId: null,
  };
}



