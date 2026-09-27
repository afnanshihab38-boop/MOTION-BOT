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
import { updateElementInScene } from "@/services/project/scene-model";
import { updateScene } from "@/services/project/project-model";
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



