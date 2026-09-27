/**
 * MOTION-BOT — Visual Element Editing Test Suite
 * Tests editing of Text, Shape, and Image elements, validation, sanitization,
 * preservation of element IDs and ordering, locked element protection,
 * editor state integration, and Project persistence compatibility.
 * Part of Phase 5.4: Basic Editing of Visual Elements.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  editTextElement,
  editShapeElement,
  editImageElement,
  editVisualElement,
  validateTextProperties,
  validateShapeProperties,
  validateImageProperties,
  validateAppearance,
  sanitizeAppearance,
  SUPPORTED_FONT_FAMILIES,
  SUPPORTED_SHAPE_KINDS,
} from "../services/editor/element-editing";

import {
  createInitialEditorState,
  selectElementInState,
  updateElementInActiveScene,
  updateSelectedElement,
  toggleElementLockInActiveScene,
  toggleElementVisibilityInActiveScene,
  getActiveScene,
} from "../services/editor/editor-state";

import {
  createTextElement,
  createShapeElement,
  createImageElement,
} from "../services/element/element-model";

import { createProject } from "../services/project/project-model";
import { createScene } from "../services/project/scene-model";
import { validateProjectDeep } from "../services/project/project-validator";
import { TextElement, ShapeElement, ImageElement } from "../types/element";

// ============================================================================
// 1. Text Element Editing Tests
// ============================================================================

test("Text Editing: Edits text content and synchronizes text and content fields", () => {
  const textEl = createTextElement({
    id: "txt_1",
    text: "Initial Headline",
  });

  const edited = editTextElement(textEl, {
    text: "Updated Kinetic Title",
  });

  assert.equal(edited.text, "Updated Kinetic Title");
  assert.equal(edited.content, "Updated Kinetic Title");
  assert.equal(edited.id, "txt_1"); // Preserves ID
  assert.equal(edited.type, "text");
});

test("Text Editing: Edits typography styling (font family, size, weight, alignment, line height, letter spacing)", () => {
  const textEl = createTextElement({
    id: "txt_2",
    fontFamily: "Inter, sans-serif",
    fontSize: 24,
    fontWeight: 400,
    textAlign: "left",
    lineHeight: 1.2,
    letterSpacing: 0,
  });

  const edited = editTextElement(textEl, {
    fontFamily: "Outfit, sans-serif",
    fontSize: 48,
    fontWeight: 700,
    textAlign: "center",
    lineHeight: 1.5,
    letterSpacing: 2,
  });

  assert.equal(edited.fontFamily, "Outfit, sans-serif");
  assert.equal(edited.fontSize, 48);
  assert.equal(edited.fontWeight, 700);
  assert.equal(edited.textAlign, "center");
  assert.equal(edited.alignment, "center"); // Synchronizes alignment alias
  assert.equal(edited.lineHeight, 1.5);
  assert.equal(edited.letterSpacing, 2);
});

test("Text Editing: Edits opacity, rotation, position, and dimensions", () => {
  const textEl = createTextElement({
    id: "txt_3",
    transform: {
      x: 100,
      y: 100,
      width: 300,
      height: 80,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    },
    appearance: {
      opacity: 1,
      blendMode: "normal",
      fill: { type: "solid", color: "#FFFFFF" },
    },
  });

  const edited = editTextElement(textEl, {
    transform: {
      ...textEl.transform,
      x: 250,
      y: 350,
      width: 450,
      height: 120,
      rotation: 15,
    },
    appearance: {
      ...textEl.appearance,
      opacity: 0.85,
    },
    color: "#F43F5E",
  });

  assert.equal(edited.transform.x, 250);
  assert.equal(edited.transform.y, 350);
  assert.equal(edited.transform.width, 450);
  assert.equal(edited.transform.height, 120);
  assert.equal(edited.transform.rotation, 15);
  assert.equal(edited.appearance.opacity, 0.85);
  assert.equal(edited.color, "#F43F5E");
  assert.equal(edited.appearance.fill.color, "#F43F5E");
});

test("Text Editing: Rejects edits to locked text elements", () => {
  const lockedText = createTextElement({
    id: "txt_locked",
    text: "Locked Content",
    locked: true,
  });

  const result = editTextElement(lockedText, {
    text: "Should Not Change",
    fontSize: 100,
  });

  assert.equal(result.text, "Locked Content");
  assert.notEqual(result.fontSize, 100);
});

// ============================================================================
// 2. Shape Element Editing Tests
// ============================================================================

test("Shape Editing: Edits shape kind, position, dimensions, rotation, opacity, and fill", () => {
  const shapeEl = createShapeElement({
    id: "shp_1",
    shapeKind: "rectangle",
    transform: {
      x: 50,
      y: 50,
      width: 100,
      height: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    },
    appearance: {
      opacity: 1,
      blendMode: "normal",
      fill: { type: "solid", color: "#4F46E5" },
    },
  });

  const edited = editShapeElement(shapeEl, {
    shapeKind: "ellipse",
    transform: {
      ...shapeEl.transform,
      x: 120,
      y: 180,
      width: 220,
      height: 160,
      rotation: -45,
    },
    appearance: {
      ...shapeEl.appearance,
      opacity: 0.7,
      fill: { type: "solid", color: "#10B981" },
    },
  });

  assert.equal(edited.shapeKind, "ellipse");
  assert.equal(edited.transform.x, 120);
  assert.equal(edited.transform.y, 180);
  assert.equal(edited.transform.width, 220);
  assert.equal(edited.transform.height, 160);
  assert.equal(edited.transform.rotation, -45);
  assert.equal(edited.appearance.opacity, 0.7);
  assert.equal(edited.appearance.fill.color, "#10B981");
  assert.equal(edited.id, "shp_1"); // Preserves ID
  assert.equal(edited.type, "shape");
});

test("Shape Editing: Edits basic border/stroke and corner radius", () => {
  const shapeEl = createShapeElement({
    id: "shp_2",
    shapeKind: "rectangle",
    cornerRadius: 0,
  });

  const edited = editShapeElement(shapeEl, {
    cornerRadius: 12,
    appearance: {
      ...shapeEl.appearance,
      stroke: {
        color: "#FFFFFF",
        width: 3,
        dashArray: [4, 4],
      },
    },
  });

  assert.equal(edited.cornerRadius, 12);
  assert.equal(edited.appearance.stroke?.color, "#FFFFFF");
  assert.equal(edited.appearance.stroke?.width, 3);
  assert.deepEqual(edited.appearance.stroke?.dashArray, [4, 4]);
});

test("Shape Editing: Rejects edits to locked shape elements", () => {
  const lockedShape = createShapeElement({
    id: "shp_locked",
    shapeKind: "rectangle",
    locked: true,
  });

  const result = editShapeElement(lockedShape, {
    shapeKind: "circle",
    cornerRadius: 20,
  });

  assert.equal(result.shapeKind, "rectangle");
  assert.notEqual(result.cornerRadius, 20);
});

// ============================================================================
// 3. Image Element Editing Tests
// ============================================================================

test("Image Editing: Edits source, asset reference, position, dimensions, scale, rotation, and opacity", () => {
  const imageEl = createImageElement({
    id: "img_1",
    assetId: "asset_initial",
    src: "https://example.com/initial.jpg",
    transform: {
      x: 200,
      y: 200,
      width: 400,
      height: 300,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    },
    appearance: {
      opacity: 1,
      blendMode: "normal",
      fill: { type: "none" },
    },
  });

  const edited = editImageElement(imageEl, {
    assetId: "asset_updated",
    src: "https://example.com/updated.png",
    objectFit: "contain",
    cornerRadius: 8,
    transform: {
      ...imageEl.transform,
      x: 300,
      y: 250,
      width: 500,
      height: 350,
      scaleX: 1.2,
      scaleY: 1.2,
      rotation: 30,
    },
    appearance: {
      ...imageEl.appearance,
      opacity: 0.9,
    },
  });

  assert.equal(edited.assetId, "asset_updated");
  assert.equal(edited.src, "https://example.com/updated.png");
  assert.equal(edited.objectFit, "contain");
  assert.equal(edited.cornerRadius, 8);
  assert.equal(edited.transform.x, 300);
  assert.equal(edited.transform.y, 250);
  assert.equal(edited.transform.width, 500);
  assert.equal(edited.transform.height, 350);
  assert.equal(edited.transform.scaleX, 1.2);
  assert.equal(edited.transform.scaleY, 1.2);
  assert.equal(edited.transform.rotation, 30);
  assert.equal(edited.appearance.opacity, 0.9);
  assert.equal(edited.id, "img_1"); // Preserves ID
  assert.equal(edited.type, "image");
});

test("Image Editing: Rejects edits to locked image elements", () => {
  const lockedImage = createImageElement({
    id: "img_locked",
    assetId: "asset_locked",
    locked: true,
  });

  const result = editImageElement(lockedImage, {
    src: "https://malicious.com/overwrite.jpg",
  });

  assert.notEqual(result.src, "https://malicious.com/overwrite.jpg");
});

// ============================================================================
// 4. Validation & Sanitization Tests (Corrupt Input Prevention)
// ============================================================================

test("Validation: validateTextProperties rejects invalid font size and non-string text", () => {
  assert.equal(validateTextProperties({ fontSize: 24 }).valid, true);
  assert.equal(validateTextProperties({ fontSize: -10 }).valid, false);
  assert.equal(validateTextProperties({ fontSize: NaN }).valid, false);
  assert.equal(validateTextProperties({ text: 123 as unknown as string }).valid, false);
  assert.equal(validateTextProperties({ textAlign: "invalid-align" as unknown as "left" }).valid, false);
});

test("Validation: validateShapeProperties rejects invalid shapeKind and vertex count", () => {
  assert.equal(validateShapeProperties({ shapeKind: "circle" }).valid, true);
  assert.equal(validateShapeProperties({ shapeKind: "cube" as unknown as "rectangle" }).valid, false);
  assert.equal(validateShapeProperties({ pointsCount: 5 }).valid, true);
  assert.equal(validateShapeProperties({ pointsCount: 2 }).valid, false);
  assert.equal(validateShapeProperties({ innerRadiusRatio: 1.5 }).valid, false);
});

test("Validation: validateAppearance rejects opacity outside [0, 1] and negative stroke width", () => {
  assert.equal(validateAppearance({ opacity: 0.5 }).valid, true);
  assert.equal(validateAppearance({ opacity: -0.1 }).valid, false);
  assert.equal(validateAppearance({ opacity: 1.5 }).valid, false);
  assert.equal(validateAppearance({ opacity: NaN }).valid, false);
  assert.equal(validateAppearance({ stroke: { color: "#fff", width: -5 } }).valid, false);
});

test("Sanitization: sanitizeAppearance clamps out-of-range opacity to [0, 1]", () => {
  const current = {
    opacity: 1,
    blendMode: "normal" as const,
    fill: { type: "solid" as const, color: "#fff" },
  };

  assert.equal(sanitizeAppearance(current, { opacity: 1.5 }).opacity, 1);
  assert.equal(sanitizeAppearance(current, { opacity: -0.5 }).opacity, 0);
  assert.equal(sanitizeAppearance(current, { opacity: 0.42 }).opacity, 0.42);
});

// ============================================================================
// 5. Element Ordering and ID Preservation Tests
// ============================================================================

test("State Integration: updateElementInActiveScene preserves exact array ordering of scene elements", () => {
  const elA = createShapeElement({ id: "el_A", name: "Element A" });
  const elB = createTextElement({ id: "el_B", text: "Element B" });
  const elC = createShapeElement({ id: "el_C", name: "Element C" });

  const scene = createScene({
    id: "scene_ordering",
    elements: [elA, elB, elC],
  });

  const project = createProject({
    id: "proj_ordering",
    scenes: [scene],
  });

  const state = createInitialEditorState(project);

  // Update middle element (el_B)
  const nextState = updateElementInActiveScene(state, "el_B", {
    text: "Modified Element B Content",
  });

  const activeScene = getActiveScene(nextState);
  assert.ok(activeScene);
  assert.equal(activeScene.elements.length, 3);

  // Verify ordering: A at 0, B at 1, C at 2
  assert.equal(activeScene.elements[0].id, "el_A");
  assert.equal(activeScene.elements[1].id, "el_B");
  assert.equal(activeScene.elements[2].id, "el_C");

  // Verify content was updated on el_B
  const updatedB = activeScene.elements[1] as TextElement;
  assert.equal(updatedB.text, "Modified Element B Content");
});

test("State Integration: updateSelectedElement updates currently selected element", () => {
  const elA = createShapeElement({ id: "el_A", shapeKind: "rectangle" });
  const elB = createTextElement({ id: "el_B", text: "Text B" });

  const scene = createScene({ id: "scene_sel", elements: [elA, elB] });
  const project = createProject({ id: "proj_sel", scenes: [scene] });

  let state = createInitialEditorState(project);
  state = selectElementInState(state, "el_A");

  state = updateSelectedElement(state, {
    shapeKind: "circle",
  });

  const activeScene = getActiveScene(state);
  const updatedA = activeScene?.elements.find((e) => e.id === "el_A") as ShapeElement;
  assert.equal(updatedA.shapeKind, "circle");
});

test("State Integration: Lock and Visibility toggling in editor state", () => {
  const el = createShapeElement({ id: "el_toggle", locked: false, visible: true });
  const scene = createScene({ id: "scene_tog", elements: [el] });
  const project = createProject({ id: "proj_tog", scenes: [scene] });

  let state = createInitialEditorState(project);

  // Lock
  state = toggleElementLockInActiveScene(state, "el_toggle", true);
  let activeScene = getActiveScene(state);
  assert.equal(activeScene?.elements[0].locked, true);

  // Attempt edit while locked -> must be rejected
  state = updateElementInActiveScene(state, "el_toggle", { shapeKind: "circle" });
  activeScene = getActiveScene(state);
  assert.equal((activeScene?.elements[0] as ShapeElement).shapeKind, "rectangle");

  // Unlock
  state = toggleElementLockInActiveScene(state, "el_toggle", false);
  activeScene = getActiveScene(state);
  assert.equal(activeScene?.elements[0].locked, false);

  // Toggle visibility
  state = toggleElementVisibilityInActiveScene(state, "el_toggle", false);
  activeScene = getActiveScene(state);
  assert.equal(activeScene?.elements[0].visible, false);
});

// ============================================================================
// 6. Persistence & Project Validator Compatibility Tests
// ============================================================================

test("Persistence Compatibility: Edited project passes strict Phase 3 validateProject", () => {
  const textEl = createTextElement({ id: "txt_valid", text: "Valid Motion Title" });
  const shapeEl = createShapeElement({ id: "shp_valid", shapeKind: "rectangle" });

  const scene = createScene({
    id: "scene_val",
    elements: [textEl, shapeEl],
  });

  const project = createProject({
    id: "proj_val",
    scenes: [scene],
  });

  let state = createInitialEditorState(project);

  // Apply edits to text
  state = updateElementInActiveScene(state, "txt_valid", {
    text: "Kinetic Frame Title",
    fontSize: 44,
    fontFamily: "Outfit, sans-serif",
    textAlign: "center",
  });

  // Apply edits to shape
  state = updateElementInActiveScene(state, "shp_valid", {
    shapeKind: "ellipse",
    cornerRadius: 8,
    appearance: {
      opacity: 0.95,
      blendMode: "normal",
      fill: { type: "solid", color: "#10B981" },
    },
  });

  // Validate resulting Project object against Phase 3 schema
  const validation = validateProjectDeep(state.project);
  assert.equal(validation.valid, true, `Validation failed: ${validation.errors?.map((e) => e.message).join(", ")}`);
});
