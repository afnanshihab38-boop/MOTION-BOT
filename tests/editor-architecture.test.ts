/**
 * MOTION-BOT — Editor Architecture & Canvas Foundation Test Suite
 * Tests coordinate system calculations, viewport zoom/pan, selection system,
 * aggregate bounds computation, and editor state management.
 * Part of Phase 5.1: Editor Architecture & Canvas Foundation.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  clampZoom,
  calculateFitZoom,
  screenToCanvas,
  canvasToScreen,
  snapToGrid,
  calculateElementBounds,
  isPointInBounds,
  MIN_ZOOM,
  MAX_ZOOM,
} from "../services/editor/coordinate-system";

import {
  selectElement,
  deselectElement,
  clearSelection,
  selectAllElements,
  isElementSelected,
  getSelectedElements,
  calculateAggregateBounds,
} from "../services/editor/selection-system";

import {
  createInitialEditorState,
  getActiveScene,
  setActiveScene,
  setActiveTool,
  setViewportZoom,
  setViewportPan,
  fitCanvasToViewport,
  selectElementInState,
  clearSelectionInState,
  setHoveredElement,
  updateSelectedElementsTransform,
} from "../services/editor/editor-state";

import { createProject, addScene } from "../services/project/project-model";
import { createScene, addElementToScene } from "../services/project/scene-model";
import { createTextElement, createShapeElement } from "../services/element/element-model";
import { MotionElement } from "../types/element";

// ============================================================================
// Coordinate System & Viewport Tests
// ============================================================================

test("clampZoom: correctly clamps within MIN_ZOOM and MAX_ZOOM", () => {
  assert.equal(clampZoom(1.0), 1.0);
  assert.equal(clampZoom(0.01), MIN_ZOOM);
  assert.equal(clampZoom(-5), MIN_ZOOM);
  assert.equal(clampZoom(10.0), MAX_ZOOM);
  assert.equal(clampZoom(5.0), 5.0);
});

test("calculateFitZoom: computes correct zoom ratio with padding and centering", () => {
  const { zoom, panX, panY } = calculateFitZoom(1920, 1080, 1200, 800, 40);

  // Available width: 1200 - 80 = 1120. Scale = 1120 / 1920 ≈ 0.5833
  // Available height: 800 - 80 = 720. Scale = 720 / 1080 ≈ 0.6667
  // Min scale should be ~0.58
  assert.ok(zoom > 0.55 && zoom < 0.60);
  assert.ok(panX > 0);
  assert.ok(panY > 0);
});

test("screenToCanvas & canvasToScreen: accurate bidirectional mathematical projection", () => {
  const viewport = {
    zoom: 1.5,
    panX: 100,
    panY: 50,
    containerWidth: 1200,
    containerHeight: 800,
  };

  const canvasPt = { x: 300, y: 200 };
  const screenPt = canvasToScreen(canvasPt, viewport);

  assert.equal(screenPt.x, 300 * 1.5 + 100);
  assert.equal(screenPt.y, 200 * 1.5 + 50);

  const projectedBack = screenToCanvas(screenPt, viewport);
  assert.equal(Math.round(projectedBack.x), canvasPt.x);
  assert.equal(Math.round(projectedBack.y), canvasPt.y);
});

test("snapToGrid: snaps coordinates to nearest grid interval", () => {
  assert.equal(snapToGrid(12, 10), 10);
  assert.equal(snapToGrid(16, 10), 20);
  assert.equal(snapToGrid(25, 10), 30);
  assert.equal(snapToGrid(0, 10), 0);
  assert.equal(snapToGrid(104, 16), 112);
});

test("calculateElementBounds & isPointInBounds: hit testing logic", () => {
  const textEl = createTextElement({
    id: "test_txt",
    transform: {
      x: 100,
      y: 150,
      width: 200,
      height: 80,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0,
      anchorY: 0,
    },
  });

  const bounds = calculateElementBounds(textEl);
  assert.deepEqual(bounds, {
    x: 100,
    y: 150,
    width: 200,
    height: 80,
    rotation: 0,
  });

  // Inside
  assert.equal(isPointInBounds({ x: 150, y: 190 }, bounds), true);
  assert.equal(isPointInBounds({ x: 100, y: 150 }, bounds), true);
  assert.equal(isPointInBounds({ x: 300, y: 230 }, bounds), true);

  // Outside
  assert.equal(isPointInBounds({ x: 50, y: 150 }, bounds), false);
  assert.equal(isPointInBounds({ x: 350, y: 150 }, bounds), false);
  assert.equal(isPointInBounds({ x: 150, y: 300 }, bounds), false);
});

// ============================================================================
// Selection System Tests
// ============================================================================

test("selectElement: single selection replaces, multi-select toggles/appends", () => {
  // Single selection
  let selection = selectElement([], "el_1", false);
  assert.deepEqual(selection, ["el_1"]);

  selection = selectElement(selection, "el_2", false);
  assert.deepEqual(selection, ["el_2"]);

  // Multi-select append
  selection = selectElement(selection, "el_3", true);
  assert.deepEqual(selection, ["el_2", "el_3"]);

  // Multi-select toggle off existing
  selection = selectElement(selection, "el_2", true);
  assert.deepEqual(selection, ["el_3"]);
});

test("deselectElement & clearSelection: removes element or clears array", () => {
  const initial = ["el_1", "el_2", "el_3"];

  const afterDeselect = deselectElement(initial, "el_2");
  assert.deepEqual(afterDeselect, ["el_1", "el_3"]);

  const afterClear = clearSelection();
  assert.deepEqual(afterClear, []);
});

test("selectAllElements & isElementSelected", () => {
  const elements: MotionElement[] = [
    createTextElement({ id: "t1" }),
    createShapeElement({ id: "s1" }),
  ];

  const allSelected = selectAllElements(elements);
  assert.deepEqual(allSelected, ["t1", "s1"]);

  assert.equal(isElementSelected(allSelected, "t1"), true);
  assert.equal(isElementSelected(allSelected, "s1"), true);
  assert.equal(isElementSelected(allSelected, "unknown"), false);
});

test("calculateAggregateBounds: computes encompassing bounding box", () => {
  // Empty
  assert.equal(calculateAggregateBounds([]), null);

  const el1 = createTextElement({
    id: "el_1",
    transform: {
      x: 100,
      y: 100,
      width: 100,
      height: 50,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0,
      anchorY: 0,
    },
  });

  // Single element
  const singleBounds = calculateAggregateBounds([el1]);
  assert.deepEqual(singleBounds, {
    x: 100,
    y: 100,
    width: 100,
    height: 50,
    rotation: 0,
  });

  const el2 = createShapeElement({
    id: "el_2",
    transform: {
      x: 250,
      y: 200,
      width: 150,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0,
      anchorY: 0,
    },
  });

  // Multiple elements:
  // minX = 100, minY = 100
  // maxX = 250 + 150 = 400, maxY = 200 + 100 = 300
  // width = 400 - 100 = 300, height = 300 - 100 = 200
  const multiBounds = calculateAggregateBounds([el1, el2]);
  assert.deepEqual(multiBounds, {
    x: 100,
    y: 100,
    width: 300,
    height: 200,
    rotation: 0,
  });
});

// ============================================================================
// Editor State Reducer & Management Tests
// ============================================================================

test("createInitialEditorState: initializes cleanly without mutating project", () => {
  const project = createProject({ name: "Editor Project", width: 1920, height: 1080 });
  const state = createInitialEditorState(project, 1200, 800);

  assert.equal(state.project.name, "Editor Project");
  assert.equal(state.activeTool, "select");
  assert.equal(state.selectedElementIds.length, 0);
  assert.equal(state.hoveredElementId, null);
  assert.ok(state.viewport.zoom > 0);
  assert.equal(state.viewport.containerWidth, 1200);
  assert.equal(state.viewport.containerHeight, 800);
});

test("setActiveScene: switches scene and clears selection", () => {
  let project = createProject({ name: "Multi-Scene Project" });
  const scene2 = createScene({ name: "Scene 2", startTime: 5, duration: 5 });
  project = addScene(project, scene2);

  let state = createInitialEditorState(project);
  state = { ...state, selectedElementIds: ["el_temp"], hoveredElementId: "el_temp" };

  const nextState = setActiveScene(state, scene2.id);
  assert.equal(nextState.activeSceneId, scene2.id);
  assert.deepEqual(nextState.selectedElementIds, []);
  assert.equal(nextState.hoveredElementId, null);
});

test("setActiveTool: changes tool state", () => {
  const project = createProject();
  let state = createInitialEditorState(project);

  state = setActiveTool(state, "hand");
  assert.equal(state.activeTool, "hand");

  state = setActiveTool(state, "text");
  assert.equal(state.activeTool, "text");
});

test("setViewportZoom & setViewportPan: updates viewport camera", () => {
  const project = createProject();
  let state = createInitialEditorState(project);

  state = setViewportZoom(state, 2.5);
  assert.equal(state.viewport.zoom, 2.5);

  state = setViewportPan(state, 120, -85);
  assert.equal(state.viewport.panX, 120);
  assert.equal(state.viewport.panY, -85);
});

test("selectElementInState & clearSelectionInState", () => {
  const project = createProject();
  let state = createInitialEditorState(project);

  state = selectElementInState(state, "el_100");
  assert.deepEqual(state.selectedElementIds, ["el_100"]);

  state = selectElementInState(state, "el_200", true);
  assert.deepEqual(state.selectedElementIds, ["el_100", "el_200"]);

  state = clearSelectionInState(state);
  assert.deepEqual(state.selectedElementIds, []);
});

test("updateSelectedElementsTransform: updates selected element in active scene", () => {
  let project = createProject();
  const el = createTextElement({
    id: "txt_1",
    transform: { x: 50, y: 50, scaleX: 1, scaleY: 1, rotation: 0, width: 200, height: 80, anchorX: 0.5, anchorY: 0.5 },
  });

  const updatedScene = addElementToScene(project.scenes[0], el);
  project = {
    ...project,
    scenes: [updatedScene],
  };

  let state = createInitialEditorState(project);
  state = selectElementInState(state, "txt_1");

  const stateWithUpdatedEl = updateSelectedElementsTransform(state, {
    x: 180,
    y: 220,
    rotation: 45,
  });

  const sceneAfter = getActiveScene(stateWithUpdatedEl);
  const elAfter = sceneAfter?.elements.find((e) => e.id === "txt_1");

  assert.equal(elAfter?.transform.x, 180);
  assert.equal(elAfter?.transform.y, 220);
  assert.equal(elAfter?.transform.rotation, 45);
  assert.equal(elAfter?.appearance.opacity, 1); // Unchanged properties preserved
});
