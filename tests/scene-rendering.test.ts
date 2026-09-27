/**
 * MOTION-BOT — Scene Rendering & Coordinate Architecture Test Suite
 * Tests scene background mapping, element fill resolution, data sufficiency validation,
 * deterministic element z-ordering, coordinate projections, visibility, and opacity handling.
 * Part of Phase 5.2: Project & Scene Rendering.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveSceneBackground,
  resolveElementFill,
  hasSufficientElementData,
  sortElementsDeterministically,
} from "../components/editor/scene-renderer";

import {
  projectToCanvas,
  canvasToProject,
  canvasToViewport,
  viewportToCanvas,
  projectToViewport,
  viewportToProject,
  projectBoundsToViewport,
  viewportBoundsToProject,
} from "../services/editor/coordinate-system";

import {
  createTextElement,
  createShapeElement,
  createImageElement,
  createLogoElement,
} from "../services/element/element-model";

import { SceneBackground } from "../types/scene";
import { ElementBounds, ViewportState } from "../types/editor";
import { MotionElement } from "../types/element";

// ============================================================================
// 1. Scene Rendering Data Mapping Tests
// ============================================================================

test("resolveSceneBackground: resolves solid, gradient, and transparent backgrounds", () => {
  // Undefined fallback
  const def = resolveSceneBackground(undefined, "#000000");
  assert.equal(def.backgroundColor, "#000000");

  // Solid background
  const solidBg: SceneBackground = { type: "solid", color: "#1E293B" };
  const solidResult = resolveSceneBackground(solidBg);
  assert.equal(solidResult.backgroundColor, "#1E293B");

  // Linear gradient background
  const linearBg: SceneBackground = {
    type: "gradient",
    gradient: {
      type: "linear",
      angle: 90,
      stops: [
        { offset: 0, color: "#4F46E5" },
        { offset: 1, color: "#06B6D4" },
      ],
    },
  };
  const linearResult = resolveSceneBackground(linearBg);
  assert.ok(typeof linearResult.background === "string");
  assert.ok(linearResult.background.includes("linear-gradient(90deg"));
  assert.ok(linearResult.background.includes("#4F46E5 0%"));
  assert.ok(linearResult.background.includes("#06B6D4 100%"));

  // Radial gradient background
  const radialBg: SceneBackground = {
    type: "gradient",
    gradient: {
      type: "radial",
      stops: [
        { offset: 0, color: "#FFFFFF" },
        { offset: 1, color: "#000000" },
      ],
    },
  };
  const radialResult = resolveSceneBackground(radialBg);
  assert.ok(typeof radialResult.background === "string");
  assert.ok(radialResult.background.includes("radial-gradient(circle"));

  // Transparent background with designer checkerboard
  const transBg: SceneBackground = { type: "transparent" };
  const transResult = resolveSceneBackground(transBg);
  assert.equal(transResult.backgroundColor, "transparent");
  assert.ok(typeof transResult.backgroundImage === "string");
  assert.ok(transResult.backgroundImage.includes("linear-gradient"));
});

test("resolveElementFill: maps solid, gradient, string, and none fills", () => {
  // Undefined fallback
  assert.deepEqual(resolveElementFill(undefined, "transparent"), { backgroundColor: "transparent" });

  // String color
  assert.deepEqual(resolveElementFill("#6366F1"), { backgroundColor: "#6366F1" });

  // Solid fill object
  assert.deepEqual(resolveElementFill({ type: "solid", color: "#10B981" }), {
    backgroundColor: "#10B981",
  });

  // None fill
  assert.deepEqual(resolveElementFill({ type: "none" }), { backgroundColor: "transparent" });

  // Gradient fill object
  const gradFill = resolveElementFill({
    type: "gradient",
    angle: 135,
    stops: [
      { offset: 0, color: "#FF0080" },
      { offset: 1, color: "#7928CA" },
    ],
  });
  assert.ok(typeof gradFill.background === "string");
  assert.ok(gradFill.background.includes("linear-gradient(135deg"));
  assert.ok(gradFill.background.includes("#FF0080 0%"));
});

test("hasSufficientElementData: accurately validates renderable data requirements", () => {
  // Valid TextElement
  const validText = createTextElement({
    id: "txt_valid",
    text: "Valid Headline",
    transform: { x: 100, y: 100, width: 400, height: 100, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 },
  });
  assert.equal(hasSufficientElementData(validText), true);

  // Invalid TextElement (missing content)
  const invalidText = {
    ...validText,
    text: undefined,
    content: undefined,
  } as unknown as MotionElement;
  assert.equal(hasSufficientElementData(invalidText), false);

  // Invalid Element: zero width
  const zeroWidth = createShapeElement({
    id: "shape_zero",
    transform: { x: 0, y: 0, width: 0, height: 100, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 },
  });
  assert.equal(hasSufficientElementData(zeroWidth), false);

  // Invalid Element: negative height
  const negHeight = createShapeElement({
    id: "shape_neg",
    transform: { x: 0, y: 0, width: 100, height: -50, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 },
  });
  assert.equal(hasSufficientElementData(negHeight), false);

  // Valid ShapeElement
  const validShape = createShapeElement({
    id: "shape_valid",
    shapeKind: "rectangle",
    transform: { x: 0, y: 0, width: 200, height: 200, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 },
  });
  assert.equal(hasSufficientElementData(validShape), true);

  // ImageElement requires assetId or src
  const imageNoAsset = {
    id: "img_no_asset",
    type: "image",
    name: "Corrupt Image",
    visible: true,
    locked: false,
    assetId: "",
    src: "",
    transform: { x: 0, y: 0, width: 200, height: 200, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 },
    appearance: { opacity: 1, blendMode: "normal", fill: { type: "solid", color: "#FFF" } },
    zIndex: 0,
    startFrame: 0,
    durationFrames: 90,
    animations: [],
    propertyTracks: [],
  } as unknown as MotionElement;
  assert.equal(hasSufficientElementData(imageNoAsset), false);

  const imageWithAsset = createImageElement({
    id: "img_with_asset",
    assetId: "asset_sample_1",
    transform: { x: 0, y: 0, width: 200, height: 200, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 },
  });
  assert.equal(hasSufficientElementData(imageWithAsset), true);
});

// ============================================================================
// 2. Element Ordering & Determinism Tests
// ============================================================================

test("sortElementsDeterministically: orders by zIndex ascending with id tie-breaker", () => {
  const elLayer1 = createShapeElement({
    id: "layer_back",
    zIndex: 1,
    transform: { x: 0, y: 0, width: 100, height: 100, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 },
  });

  const elLayer3 = createShapeElement({
    id: "layer_front",
    zIndex: 10,
    transform: { x: 0, y: 0, width: 100, height: 100, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 },
  });

  const elLayer2A = createShapeElement({
    id: "layer_mid_a",
    zIndex: 5,
    transform: { x: 0, y: 0, width: 100, height: 100, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 },
  });

  const elLayer2B = createShapeElement({
    id: "layer_mid_b",
    zIndex: 5,
    transform: { x: 0, y: 0, width: 100, height: 100, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 },
  });

  // Supply in random arbitrary order
  const input = [elLayer3, elLayer2B, elLayer1, elLayer2A];
  const sorted = sortElementsDeterministically(input);

  // Expected deterministic order:
  // 1. layer_back (zIndex 1)
  // 2. layer_mid_a (zIndex 5, id 'a' < 'b')
  // 3. layer_mid_b (zIndex 5, id 'b')
  // 4. layer_front (zIndex 10)
  assert.equal(sorted.length, 4);
  assert.equal(sorted[0].id, "layer_back");
  assert.equal(sorted[1].id, "layer_mid_a");
  assert.equal(sorted[2].id, "layer_mid_b");
  assert.equal(sorted[3].id, "layer_front");
});

// ============================================================================
// 3. Coordinate Conversion Tests
// ============================================================================

test("coordinate mapping: project ↔ canvas ↔ viewport projections", () => {
  const viewport: ViewportState = {
    zoom: 2.0,
    panX: 150,
    panY: 75,
    containerWidth: 1600,
    containerHeight: 900,
  };

  const projectPt = { x: 400, y: 300 };

  // Project <-> Canvas (1:1 spatial projection)
  const canvasPt = projectToCanvas(projectPt);
  assert.deepEqual(canvasPt, { x: 400, y: 300 });
  assert.deepEqual(canvasToProject(canvasPt), projectPt);

  // Canvas <-> Viewport (screen pixels)
  // viewportX = 400 * 2.0 + 150 = 950
  // viewportY = 300 * 2.0 + 75 = 675
  const viewportPt = canvasToViewport(canvasPt, viewport);
  assert.deepEqual(viewportPt, { x: 950, y: 675 });

  const canvasBack = viewportToCanvas(viewportPt, viewport);
  assert.equal(Math.round(canvasBack.x), 400);
  assert.equal(Math.round(canvasBack.y), 300);

  // End-to-end Project <-> Viewport
  const directViewport = projectToViewport(projectPt, viewport);
  assert.deepEqual(directViewport, { x: 950, y: 675 });

  const directProjectBack = viewportToProject(directViewport, viewport);
  assert.equal(Math.round(directProjectBack.x), projectPt.x);
  assert.equal(Math.round(directProjectBack.y), projectPt.y);
});

test("bounding box mapping: scales and translates accurately across viewports", () => {
  const viewport: ViewportState = {
    zoom: 1.5,
    panX: 80,
    panY: 40,
    containerWidth: 1200,
    containerHeight: 800,
  };

  const bounds: ElementBounds = {
    x: 200,
    y: 100,
    width: 300,
    height: 150,
    rotation: 45,
  };

  const vpBounds = projectBoundsToViewport(bounds, viewport);
  assert.equal(vpBounds.x, 200 * 1.5 + 80);
  assert.equal(vpBounds.y, 100 * 1.5 + 40);
  assert.equal(vpBounds.width, 300 * 1.5);
  assert.equal(vpBounds.height, 150 * 1.5);
  assert.equal(vpBounds.rotation, 45); // Rotation invariant to viewport camera

  const projBoundsBack = viewportBoundsToProject(vpBounds, viewport);
  assert.equal(Math.round(projBoundsBack.x), bounds.x);
  assert.equal(Math.round(projBoundsBack.y), bounds.y);
  assert.equal(Math.round(projBoundsBack.width), bounds.width);
  assert.equal(Math.round(projBoundsBack.height), bounds.height);
  assert.equal(projBoundsBack.rotation, bounds.rotation);
});

// ============================================================================
// 4. Visibility Handling Tests
// ============================================================================

test("visibility handling: invisible elements are completely excluded from render pipeline", () => {
  const visibleEl = createShapeElement({
    id: "visible_1",
    visible: true,
    transform: { x: 0, y: 0, width: 100, height: 100, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 },
  });

  const hiddenEl = createShapeElement({
    id: "hidden_1",
    visible: false,
    transform: { x: 0, y: 0, width: 100, height: 100, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 },
  });

  const rendered = sortElementsDeterministically([visibleEl, hiddenEl]);
  assert.equal(rendered.length, 1);
  assert.equal(rendered[0].id, "visible_1");
});

// ============================================================================
// 5. Opacity Handling Tests
// ============================================================================

test("opacity handling: elements carry valid opacity within standard 0 to 1 bounds", () => {
  const elFull = createShapeElement({
    id: "el_full",
    appearance: { opacity: 1, fill: { type: "solid", color: "#FFF" }, blendMode: "normal" },
    transform: { x: 0, y: 0, width: 100, height: 100, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 },
  });

  const elHalf = createShapeElement({
    id: "el_half",
    appearance: { opacity: 0.5, fill: { type: "solid", color: "#FFF" }, blendMode: "normal" },
    transform: { x: 0, y: 0, width: 100, height: 100, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 },
  });

  const elZero = createShapeElement({
    id: "el_zero",
    appearance: { opacity: 0, fill: { type: "solid", color: "#FFF" }, blendMode: "normal" },
    transform: { x: 0, y: 0, width: 100, height: 100, scaleX: 1, scaleY: 1, rotation: 0, anchorX: 0, anchorY: 0 },
  });

  assert.equal(elFull.appearance.opacity, 1);
  assert.equal(elHalf.appearance.opacity, 0.5);
  assert.equal(elZero.appearance.opacity, 0);
});
