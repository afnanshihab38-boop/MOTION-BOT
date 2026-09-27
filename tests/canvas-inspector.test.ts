/**
 * MOTION-BOT — Canvas Inspector & Properties Panel Test Suite
 * Tests inspector state logic, modular sections, project/scene overview when unselected,
 * text/shape/image property bindings, locked element behavior, and Phase 3 compatibility.
 * Part of Phase 5.5: Properties / Inspector Panel.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  createInitialEditorState,
  selectElementInState,
  clearSelectionInState,
  updateElementInActiveScene,
  toggleElementLockInActiveScene,
  getActiveScene,
} from "../services/editor/editor-state";

import {
  createTextElement,
  createShapeElement,
  createImageElement,
} from "../services/element/element-model";

import { createProject } from "../services/project/project-model";
import { createScene } from "../services/project/scene-model";
import { createAsset } from "../services/asset/asset-model";
import { validateProjectDeep } from "../services/project/project-validator";
import { TextElement, ShapeElement, ImageElement } from "../types/element";

// ============================================================================
// 1. Unselected State: Project & Scene Information Overview
// ============================================================================

test("Inspector Unselected State: Provides accurate project and scene overview data", () => {
  const textEl = createTextElement({ id: "txt_1", text: "Title" });
  const shapeEl = createShapeElement({ id: "shp_1", shapeKind: "rectangle" });

  const scene = createScene({
    id: "scene_overview",
    name: "Intro Sequence",
    duration: 6.0,
    background: { type: "solid", color: "#18181B" },
    elements: [textEl, shapeEl],
  });

  const project = createProject({
    id: "proj_overview",
    name: "Brand Video 2026",
    width: 3840,
    height: 2160,
    fps: 60,
    scenes: [scene],
  });

  const state = createInitialEditorState(project);
  assert.equal(state.selectedElementIds.length, 0); // No element selected

  const activeScene = getActiveScene(state);
  assert.ok(activeScene);
  assert.equal(state.project.name, "Brand Video 2026");
  assert.equal(state.project.width, 3840);
  assert.equal(state.project.height, 2160);
  assert.equal(state.project.fps, 60);
  assert.equal(activeScene.name, "Intro Sequence");
  assert.equal(activeScene.duration, 6.0);
  assert.equal(activeScene.elements.length, 2);
  assert.equal(activeScene.background?.type, "solid");
  assert.equal(activeScene.background?.color, "#18181B");
});

// ============================================================================
// 2. Selected Element Properties Binding
// ============================================================================

test("Inspector Selected Element: Resolves primary selected element in active scene", () => {
  const textEl = createTextElement({ id: "txt_select", text: "Selected Text" });
  const shapeEl = createShapeElement({ id: "shp_unselect", shapeKind: "circle" });

  const scene = createScene({ id: "scene_sel", elements: [textEl, shapeEl] });
  const project = createProject({ id: "proj_sel", scenes: [scene] });

  let state = createInitialEditorState(project);
  state = selectElementInState(state, "txt_select");

  assert.equal(state.selectedElementIds.length, 1);
  assert.equal(state.selectedElementIds[0], "txt_select");

  const activeScene = getActiveScene(state);
  const selected = activeScene?.elements.find((el) => el.id === state.selectedElementIds[0]);

  assert.ok(selected);
  assert.equal(selected.type, "text");
  assert.equal((selected as TextElement).text, "Selected Text");
});

test("Inspector Transform Controls: Correctly updates X, Y, Width, Height, Rotation, Scale, Opacity", () => {
  const shapeEl = createShapeElement({
    id: "shp_transform",
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
    appearance: {
      opacity: 1,
      blendMode: "normal",
      fill: { type: "solid", color: "#6366F1" },
    },
  });

  const scene = createScene({ id: "scene_trans", elements: [shapeEl] });
  const project = createProject({ id: "proj_trans", scenes: [scene] });
  let state = createInitialEditorState(project);
  state = selectElementInState(state, "shp_transform");

  // Update transform
  state = updateElementInActiveScene(state, "shp_transform", {
    transform: {
      ...shapeEl.transform,
      x: 320,
      y: 480,
      width: 400,
      height: 250,
      rotation: 45,
      scaleX: 1.5,
      scaleY: 1.5,
    },
    appearance: {
      ...shapeEl.appearance,
      opacity: 0.8,
    },
  });

  const activeScene = getActiveScene(state);
  const updated = activeScene?.elements.find((el) => el.id === "shp_transform") as ShapeElement;

  assert.equal(updated.transform.x, 320);
  assert.equal(updated.transform.y, 480);
  assert.equal(updated.transform.width, 400);
  assert.equal(updated.transform.height, 250);
  assert.equal(updated.transform.rotation, 45);
  assert.equal(updated.transform.scaleX, 1.5);
  assert.equal(updated.transform.scaleY, 1.5);
  assert.equal(updated.appearance.opacity, 0.8);
});

// ============================================================================
// 3. Text, Shape, Image Element Specific Controls
// ============================================================================

test("Inspector Text Controls: Updates content, font, size, weight, alignment, spacing", () => {
  const textEl = createTextElement({
    id: "txt_ctrl",
    text: "Initial",
    fontFamily: "Inter, sans-serif",
    fontSize: 28,
    fontWeight: 400,
    textAlign: "left",
    lineHeight: 1.2,
    letterSpacing: 0,
  });

  const scene = createScene({ id: "scene_txt", elements: [textEl] });
  const project = createProject({ id: "proj_txt", scenes: [scene] });
  let state = createInitialEditorState(project);

  state = updateElementInActiveScene(state, "txt_ctrl", {
    text: "Kinetic Display Title",
    fontFamily: "Outfit, sans-serif",
    fontSize: 64,
    fontWeight: 800,
    textAlign: "center",
    lineHeight: 1.4,
    letterSpacing: 1.5,
    color: "#E11D48",
  });

  const activeScene = getActiveScene(state);
  const updated = activeScene?.elements.find((el) => el.id === "txt_ctrl") as TextElement;

  assert.equal(updated.text, "Kinetic Display Title");
  assert.equal(updated.fontFamily, "Outfit, sans-serif");
  assert.equal(updated.fontSize, 64);
  assert.equal(updated.fontWeight, 800);
  assert.equal(updated.textAlign, "center");
  assert.equal(updated.lineHeight, 1.4);
  assert.equal(updated.letterSpacing, 1.5);
  assert.equal(updated.color, "#E11D48");
});

test("Inspector Shape Controls: Updates shape kind, fill, stroke, and corner radius", () => {
  const shapeEl = createShapeElement({
    id: "shp_ctrl",
    shapeKind: "rectangle",
    cornerRadius: 0,
  });

  const scene = createScene({ id: "scene_shp", elements: [shapeEl] });
  const project = createProject({ id: "proj_shp", scenes: [scene] });
  let state = createInitialEditorState(project);

  state = updateElementInActiveScene(state, "shp_ctrl", {
    shapeKind: "polygon",
    pointsCount: 6,
    cornerRadius: 16,
    appearance: {
      opacity: 1,
      blendMode: "normal",
      fill: { type: "solid", color: "#10B981" },
      stroke: {
        color: "#FFFFFF",
        width: 2,
        dashArray: [6, 3],
      },
    },
  });

  const activeScene = getActiveScene(state);
  const updated = activeScene?.elements.find((el) => el.id === "shp_ctrl") as ShapeElement;

  assert.equal(updated.shapeKind, "polygon");
  assert.equal(updated.pointsCount, 6);
  assert.equal(updated.cornerRadius, 16);
  assert.equal(updated.appearance.fill.color, "#10B981");
  assert.equal(updated.appearance.stroke?.color, "#FFFFFF");
  assert.equal(updated.appearance.stroke?.width, 2);
  assert.deepEqual(updated.appearance.stroke?.dashArray, [6, 3]);
});

test("Inspector Image Controls: Updates source reference, dimensions, and opacity", () => {
  const imageEl = createImageElement({
    id: "img_ctrl",
    assetId: "asset_initial",
    src: "https://example.com/start.png",
  });

  const scene = createScene({ id: "scene_img", elements: [imageEl] });
  const project = createProject({ id: "proj_img", scenes: [scene] });
  let state = createInitialEditorState(project);

  state = updateElementInActiveScene(state, "img_ctrl", {
    src: "https://example.com/updated.png",
    objectFit: "contain",
    cornerRadius: 12,
    transform: {
      ...imageEl.transform,
      width: 800,
      height: 600,
    },
    appearance: {
      ...imageEl.appearance,
      opacity: 0.9,
    },
  });

  const activeScene = getActiveScene(state);
  const updated = activeScene?.elements.find((el) => el.id === "img_ctrl") as ImageElement;

  assert.equal(updated.src, "https://example.com/updated.png");
  assert.equal(updated.objectFit, "contain");
  assert.equal(updated.cornerRadius, 12);
  assert.equal(updated.transform.width, 800);
  assert.equal(updated.transform.height, 600);
  assert.equal(updated.appearance.opacity, 0.9);
});

// ============================================================================
// 4. Locked Element State Handling
// ============================================================================

test("Inspector Locked State: Correctly reflects locked state and blocks edits", () => {
  const shapeEl = createShapeElement({ id: "shp_locked", locked: true, shapeKind: "rectangle" });
  const scene = createScene({ id: "scene_lock", elements: [shapeEl] });
  const project = createProject({ id: "proj_lock", scenes: [scene] });
  let state = createInitialEditorState(project);

  assert.equal(shapeEl.locked, true);

  // Attempting to edit while locked
  state = updateElementInActiveScene(state, "shp_locked", {
    shapeKind: "star",
  });

  let activeScene = getActiveScene(state);
  let el = activeScene?.elements.find((e) => e.id === "shp_locked") as ShapeElement;
  assert.equal(el.shapeKind, "rectangle"); // Rejected

  // Unlock via inspector action
  state = toggleElementLockInActiveScene(state, "shp_locked", false);
  activeScene = getActiveScene(state);
  el = activeScene?.elements.find((e) => e.id === "shp_locked") as ShapeElement;
  assert.equal(el.locked, false);

  // Now editing succeeds
  state = updateElementInActiveScene(state, "shp_locked", {
    shapeKind: "star",
  });
  activeScene = getActiveScene(state);
  el = activeScene?.elements.find((e) => e.id === "shp_locked") as ShapeElement;
  assert.equal(el.shapeKind, "star");
});

// ============================================================================
// 5. Schema Validation & Project Persistence Compatibility
// ============================================================================

test("Inspector Schema Safety: Complete inspector modifications pass deep validation", () => {
  const textEl = createTextElement({ id: "txt_safe", text: "Motion Title" });
  const shapeEl = createShapeElement({ id: "shp_safe", shapeKind: "rectangle" });
  const imageEl = createImageElement({ id: "img_safe", assetId: "asset_test", src: "https://example.com/asset.png" });

  const scene = createScene({
    id: "scene_safe",
    elements: [textEl, shapeEl, imageEl],
  });

  const asset = createAsset({
    id: "asset_test",
    name: "Test Asset",
    type: "image",
    url: "https://example.com/asset.png",
  });

  const project = createProject({
    id: "proj_safe",
    scenes: [scene],
    assets: [asset],
  });

  let state = createInitialEditorState(project);

  // Apply sequential inspector updates to elements
  state = updateElementInActiveScene(state, "txt_safe", {
    text: "Updated Studio Text",
    fontSize: 52,
    fontWeight: 700,
  });

  state = updateElementInActiveScene(state, "shp_safe", {
    shapeKind: "ellipse",
    appearance: {
      opacity: 0.9,
      blendMode: "normal",
      fill: { type: "solid", color: "#6366F1" },
    },
  });

  state = updateElementInActiveScene(state, "img_safe", {
    objectFit: "cover",
    transform: {
      ...imageEl.transform,
      width: 600,
      height: 400,
    },
  });

  // Verify Project passes Phase 3 deep validator
  const validation = validateProjectDeep(state.project);
  assert.equal(validation.valid, true, `Validation failed: ${validation.errors?.map((e) => e.message).join(", ")}`);
});
