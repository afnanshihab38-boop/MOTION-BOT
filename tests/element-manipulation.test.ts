/**
 * MOTION-BOT — Element Selection & Manipulation Test Suite
 * Tests selection, deselection, translation, resizing, rotation, locked elements protection,
 * invisible elements handling, and transform validation/sanitization.
 * Part of Phase 5.3: Basic Element Selection & Manipulation.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  validateTransform,
  sanitizeTransform,
  normalizeAngle,
  snapAngle,
  moveElement,
  moveElements,
  calculateResizeTransform,
  resizeElement,
  calculateRotationAngle,
  rotateElement,
  MIN_ELEMENT_DIMENSION,
} from "../services/editor/element-manipulation";

import {
  selectElement,
  deselectElement,
  clearSelection,
  isElementSelected,
  selectAllElements,
} from "../services/editor/selection-system";

import {
  createInitialEditorState,
  selectElementInState,
  clearSelectionInState,
  updateElementsInActiveScene,
  updateSelectedElementsTransform,
  getActiveScene,
} from "../services/editor/editor-state";

import { MotionElement, ShapeElement } from "../types/element";
import { Project } from "../types/project";
import { Scene } from "../types/scene";
import { createProject } from "../services/project/project-model";
import { createScene } from "../services/project/scene-model";
import { createShapeElement } from "../services/element/element-model";

// Helper to create test shape elements
function createTestShape(
  id: string,
  overrides: Partial<ShapeElement> = {}
): ShapeElement {
  return createShapeElement({
    id,
    name: `Shape ${id}`,
    shapeKind: "rectangle",
    visible: true,
    locked: false,
    zIndex: 1,
    transform: {
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    },
    ...overrides,
  });
}

// Helper to create test project
function createTestProject(): Project {
  const element1 = createTestShape("el_1", { transform: { x: 50, y: 50, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0.5, anchorY: 0.5 } });
  const element2 = createTestShape("el_2", { locked: true, transform: { x: 200, y: 200, width: 150, height: 80, rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0.5, anchorY: 0.5 } });
  const element3 = createTestShape("el_3", { visible: false, transform: { x: 400, y: 400, width: 120, height: 60, rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0.5, anchorY: 0.5 } });

  const scene = createScene({
    id: "scene_test",
    name: "Main Scene",
    elements: [element1, element2, element3],
  });

  return createProject({
    id: "proj_test",
    name: "Test Project",
    scenes: [scene],
  });
}

// ============================================================================
// 1. Selection & Deselection Tests
// ============================================================================

test("Selection: Single-element selection sets active selection", () => {
  const selected = selectElement([], "el_1", false);
  assert.deepEqual(selected, ["el_1"]);
});

test("Selection: Selecting a different element replaces selection in single-select mode", () => {
  const initial = ["el_1"];
  const next = selectElement(initial, "el_2", false);
  assert.deepEqual(next, ["el_2"]);
});

test("Selection: Multi-select toggles element membership", () => {
  let selected = selectElement([], "el_1", true);
  assert.deepEqual(selected, ["el_1"]);

  selected = selectElement(selected, "el_2", true);
  assert.deepEqual(selected, ["el_1", "el_2"]);

  // Toggle off el_1
  selected = selectElement(selected, "el_1", true);
  assert.deepEqual(selected, ["el_2"]);
});

test("Deselection: deselectElement removes specified element ID", () => {
  const initial = ["el_1", "el_2", "el_3"];
  const result = deselectElement(initial, "el_2");
  assert.deepEqual(result, ["el_1", "el_3"]);
});

test("Deselection: clearSelection clears all selected element IDs", () => {
  const result = clearSelection();
  assert.deepEqual(result, []);
});

test("Selection State: selectElementInState and clearSelectionInState update editor state", () => {
  const project = createTestProject();
  let state = createInitialEditorState(project);

  assert.equal(state.selectedElementIds.length, 0);

  state = selectElementInState(state, "el_1");
  assert.deepEqual(state.selectedElementIds, ["el_1"]);

  state = clearSelectionInState(state);
  assert.deepEqual(state.selectedElementIds, []);
});

test("Selection: selectAllElements excludes locked and invisible elements", () => {
  const project = createTestProject();
  const scene = project.scenes[0];
  const allSelectable = selectAllElements(scene.elements);

  // el_1 is unlocked and visible; el_2 is locked; el_3 is invisible
  assert.deepEqual(allSelectable, ["el_1"]);
});

// ============================================================================
// 2. Element Movement Tests
// ============================================================================

test("Movement: moveElement translates x and y by delta offset", () => {
  const element = createTestShape("el_1", {
    transform: {
      x: 100,
      y: 150,
      width: 200,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    },
  });

  const moved = moveElement(element, 25, -30);

  assert.equal(moved.transform.x, 125);
  assert.equal(moved.transform.y, 120);
  // Preserves all other transform properties
  assert.equal(moved.transform.width, 200);
  assert.equal(moved.transform.height, 100);
  assert.equal(moved.transform.rotation, 0);
  assert.equal(moved.transform.scaleX, 1);
  assert.equal(moved.transform.scaleY, 1);
  assert.equal(moved.transform.anchorX, 0.5);
  assert.equal(moved.transform.anchorY, 0.5);
});

test("Movement: moveElement with snapToGrid snaps coordinates to grid", () => {
  const element = createTestShape("el_1", {
    transform: {
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    },
  });

  // delta 23 -> x: 123 -> snaps to 120 (grid 10)
  // delta 37 -> y: 137 -> snaps to 140 (grid 10)
  const moved = moveElement(element, 23, 37, { snapToGrid: true, gridSize: 10 });
  assert.equal(moved.transform.x, 120);
  assert.equal(moved.transform.y, 140);
});

test("Movement: moveElements translates multiple elements together", () => {
  const el1 = createTestShape("el_1", { transform: { x: 50, y: 50, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0.5, anchorY: 0.5 } });
  const el2 = createTestShape("el_2", { transform: { x: 200, y: 100, width: 80, height: 80, rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0.5, anchorY: 0.5 } });

  const moved = moveElements([el1, el2], 10, 20);
  assert.equal(moved[0].transform.x, 60);
  assert.equal(moved[0].transform.y, 70);
  assert.equal(moved[1].transform.x, 210);
  assert.equal(moved[1].transform.y, 120);
});

// ============================================================================
// 3. Element Resizing Tests (8 Directional Handles)
// ============================================================================

test("Resizing: Handle 'e' expands width to the right", () => {
  const initial = {
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    anchorX: 0.5,
    anchorY: 0.5,
  };

  const updated = calculateResizeTransform(initial, "e", 40, 0);
  assert.equal(updated.width, 240);
  assert.equal(updated.height, 100);
  // Center anchor point shifts right by dw * (1 - 0.5) = 20
  assert.equal(updated.x, 120);
  assert.equal(updated.y, 100);
});

test("Resizing: Handle 'w' expands width to the left", () => {
  const initial = {
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    anchorX: 0.5,
    anchorY: 0.5,
  };

  // Dragging left by 30 (deltaX = -30)
  const updated = calculateResizeTransform(initial, "w", -30, 0);
  assert.equal(updated.width, 230);
  assert.equal(updated.height, 100);
  // Center anchor point shifts left by -dw * 0.5 = -15
  assert.equal(updated.x, 85);
  assert.equal(updated.y, 100);
});

test("Resizing: Handle 's' expands height downward", () => {
  const initial = {
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    anchorX: 0.5,
    anchorY: 0.5,
  };

  const updated = calculateResizeTransform(initial, "s", 0, 50);
  assert.equal(updated.width, 200);
  assert.equal(updated.height, 150);
  assert.equal(updated.x, 100);
  assert.equal(updated.y, 125);
});

test("Resizing: Handle 'n' expands height upward", () => {
  const initial = {
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    anchorX: 0.5,
    anchorY: 0.5,
  };

  // Dragging upward by 40 (deltaY = -40)
  const updated = calculateResizeTransform(initial, "n", 0, -40);
  assert.equal(updated.width, 200);
  assert.equal(updated.height, 140);
  assert.equal(updated.x, 100);
  assert.equal(updated.y, 80);
});

test("Resizing: Handle 'se' expands width and height", () => {
  const initial = {
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    anchorX: 0.5,
    anchorY: 0.5,
  };

  const updated = calculateResizeTransform(initial, "se", 50, 30);
  assert.equal(updated.width, 250);
  assert.equal(updated.height, 130);
  assert.equal(updated.x, 125);
  assert.equal(updated.y, 115);
});

test("Resizing: Enforces MIN_ELEMENT_DIMENSION clamping", () => {
  const initial = {
    x: 100,
    y: 100,
    width: 50,
    height: 50,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    anchorX: 0.5,
    anchorY: 0.5,
  };

  // Shrink dramatically past zero
  const updated = calculateResizeTransform(initial, "se", -100, -100);
  assert.ok(updated.width >= MIN_ELEMENT_DIMENSION);
  assert.ok(updated.height >= MIN_ELEMENT_DIMENSION);
  assert.equal(updated.width, MIN_ELEMENT_DIMENSION);
  assert.equal(updated.height, MIN_ELEMENT_DIMENSION);
});

// ============================================================================
// 4. Element Rotation Tests
// ============================================================================

test("Rotation: calculateRotationAngle computes angle relative to 12 o'clock handle", () => {
  const center = { x: 100, y: 100 };

  // Directly above center (12 o'clock) -> angle should be 0°
  const topPoint = { x: 100, y: 50 };
  const angleTop = calculateRotationAngle(center, topPoint);
  assert.equal(angleTop, 0);

  // Directly to the right (3 o'clock) -> angle should be 90°
  const rightPoint = { x: 150, y: 100 };
  const angleRight = calculateRotationAngle(center, rightPoint);
  assert.equal(angleRight, 90);

  // Directly below (6 o'clock) -> angle should be 180°
  const bottomPoint = { x: 100, y: 150 };
  const angleBottom = calculateRotationAngle(center, bottomPoint);
  assert.equal(Math.abs(angleBottom), 180);

  // Directly to the left (9 o'clock) -> angle should be -90°
  const leftPoint = { x: 50, y: 100 };
  const angleLeft = calculateRotationAngle(center, leftPoint);
  assert.equal(angleLeft, -90);
});

test("Rotation: snapAngle snaps to 15° increments when Shift held", () => {
  assert.equal(snapAngle(13, 15), 15);
  assert.equal(snapAngle(44, 15), 45);
  assert.equal(snapAngle(88, 15), 90);
  assert.equal(snapAngle(-28, 15), -30);
});

test("Rotation: normalizeAngle normalizes degrees into [-180, 180]", () => {
  assert.equal(normalizeAngle(0), 0);
  assert.equal(normalizeAngle(90), 90);
  assert.equal(normalizeAngle(270), -90);
  assert.equal(normalizeAngle(-270), 90);
  assert.equal(normalizeAngle(360), 0);
  assert.equal(normalizeAngle(720), 0);
});

test("Rotation: rotateElement updates element rotation and preserves other properties", () => {
  const element = createTestShape("el_1", {
    transform: {
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    },
  });

  const rotated = rotateElement(element, 45);
  assert.equal(rotated.transform.rotation, 45);
  assert.equal(rotated.transform.x, 100);
  assert.equal(rotated.transform.y, 100);
  assert.equal(rotated.transform.width, 200);
  assert.equal(rotated.transform.height, 100);
  assert.equal(rotated.transform.scaleX, 1);
  assert.equal(rotated.transform.scaleY, 1);
});

// ============================================================================
// 5. Locked Elements Tests
// ============================================================================

test("Locked Elements: moveElement does NOT move locked elements", () => {
  const lockedElement = createTestShape("el_locked", {
    locked: true,
    transform: {
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    },
  });

  const result = moveElement(lockedElement, 50, 50);
  assert.equal(result.transform.x, 100);
  assert.equal(result.transform.y, 100);
});

test("Locked Elements: resizeElement does NOT resize locked elements", () => {
  const lockedElement = createTestShape("el_locked", {
    locked: true,
    transform: {
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    },
  });

  const result = resizeElement(lockedElement, "se", 50, 50);
  assert.equal(result.transform.width, 200);
  assert.equal(result.transform.height, 100);
});

test("Locked Elements: rotateElement does NOT rotate locked elements", () => {
  const lockedElement = createTestShape("el_locked", {
    locked: true,
    transform: {
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    },
  });

  const result = rotateElement(lockedElement, 90);
  assert.equal(result.transform.rotation, 0);
});

test("Locked Elements: updateSelectedElementsTransform skips locked elements", () => {
  const project = createTestProject();
  let state = createInitialEditorState(project);
  // el_2 is locked
  state = selectElementInState(state, "el_2");

  const nextState = updateSelectedElementsTransform(state, { x: 999, y: 999 });
  const activeScene = getActiveScene(nextState);
  const el2 = activeScene?.elements.find((e) => e.id === "el_2");

  assert.equal(el2?.transform.x, 200); // Unchanged from 200
  assert.equal(el2?.transform.y, 200);
});

test("Locked Elements: updateElementsInActiveScene rejects modifications to locked elements", () => {
  const project = createTestProject();
  const state = createInitialEditorState(project);

  const modifiedLocked: ShapeElement = {
    ...createTestShape("el_2"),
    locked: true,
    transform: {
      x: 999,
      y: 999,
      width: 500,
      height: 500,
      rotation: 90,
      scaleX: 2,
      scaleY: 2,
      anchorX: 0.5,
      anchorY: 0.5,
    },
  };

  const nextState = updateElementsInActiveScene(state, [modifiedLocked]);
  const activeScene = getActiveScene(nextState);
  const el2 = activeScene?.elements.find((e) => e.id === "el_2");

  // Should NOT be modified
  assert.equal(el2?.transform.x, 200);
  assert.equal(el2?.transform.width, 150);
});

// ============================================================================
// 6. Invisible Elements Tests
// ============================================================================

test("Invisible Elements: moveElement, resizeElement, rotateElement do not modify invisible elements", () => {
  const invisibleElement = createTestShape("el_inv", {
    visible: false,
    transform: {
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    },
  });

  const moved = moveElement(invisibleElement, 20, 20);
  assert.equal(moved.transform.x, 100);

  const resized = resizeElement(invisibleElement, "se", 40, 40);
  assert.equal(resized.transform.width, 200);

  const rotated = rotateElement(invisibleElement, 45);
  assert.equal(rotated.transform.rotation, 0);
});

// ============================================================================
// 7. Invalid Transform Handling & Sanitization Tests
// ============================================================================

test("Transform Validation: validateTransform catches invalid non-finite numbers and zero/negative dimensions", () => {
  assert.equal(
    validateTransform({
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    }).valid,
    true
  );

  assert.equal(
    validateTransform({
      x: NaN,
      y: 100,
      width: 200,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    }).valid,
    false
  );

  assert.equal(
    validateTransform({
      x: 100,
      y: Infinity,
      width: 200,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    }).valid,
    false
  );

  assert.equal(
    validateTransform({
      x: 100,
      y: 100,
      width: 0,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    }).valid,
    false
  );

  assert.equal(
    validateTransform({
      x: 100,
      y: 100,
      width: 100,
      height: -50,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    }).valid,
    false
  );
});

test("Transform Sanitization: sanitizeTransform enforces safe values and minimum dimension constraints", () => {
  const current = {
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    anchorX: 0.5,
    anchorY: 0.5,
  };

  // Passing NaN for x should fall back to current.x
  const sanitized = sanitizeTransform(current, {
    x: NaN,
    width: -50, // Invalid width should fall back or clamp
    rotation: 450, // Should normalize to 90
  });

  assert.equal(sanitized.x, 100);
  assert.equal(sanitized.width, 200);
  assert.equal(sanitized.rotation, 90);
});
