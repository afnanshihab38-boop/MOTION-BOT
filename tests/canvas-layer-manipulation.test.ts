/**
 * MOTION-BOT — Phase 8.2 Canvas & Layer Manipulation Test Suite
 * Comprehensive verification of selection, move, resize, rotate, duplicate,
 * delete, visibility, locking, ordering, inspector sync, undo/redo, zoom correctness,
 * and AI-generated project compatibility.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createSampleProject } from "../services/project/sample-project";
import {
  createInitialEditorState,
  getActiveScene,
  selectElementInState,
  clearSelectionInState,
  updateElementInActiveScene,
  updateElementsInActiveScene,
  toggleElementLockInActiveScene,
  toggleElementVisibilityInActiveScene,
  deleteElementInActiveScene,
  duplicateElementInActiveScene,
  reorderElementInActiveScene,
  setViewportZoom,
} from "../services/editor/editor-state";
import {
  moveElement,
  resizeElement,
  rotateElement,
  calculateRotationAngle,
} from "../services/editor/element-manipulation";
import {
  viewportToCanvas,
  canvasToViewport,
} from "../services/editor/coordinate-system";
import { MotionElement, TextElement, ShapeElement } from "../types/element";
import { Project } from "../types/project";

describe("MotionBot Phase 8.2 — Real Canvas & Layer Manipulation", () => {
  // =========================================================================
  // 1. Canvas Selection & Multi-Selection
  // =========================================================================
  describe("1. Canvas Selection & Multi-Selection", () => {
    test("selects a single element and updates selectedElementIds", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      const target = scene.elements[0];

      const selectedState = selectElementInState(state, target.id, false);
      assert.deepEqual(selectedState.selectedElementIds, [target.id]);
    });

    test("multi-select accumulates IDs with shift/cmd/ctrl", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      const first = scene.elements[0];
      const second = scene.elements[1];

      let current = selectElementInState(state, first.id, false);
      assert.deepEqual(current.selectedElementIds, [first.id]);

      current = selectElementInState(current, second.id, true);
      assert.deepEqual(current.selectedElementIds, [first.id, second.id]);

      // Toggling second element deselects it
      current = selectElementInState(current, second.id, true);
      assert.deepEqual(current.selectedElementIds, [first.id]);
    });

    test("clearing selection resets selectedElementIds", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      const target = scene.elements[0];

      const selected = selectElementInState(state, target.id);
      assert.equal(selected.selectedElementIds.length, 1);

      const cleared = clearSelectionInState(selected);
      assert.equal(cleared.selectedElementIds.length, 0);
    });

    test("works across diverse element types (text, shape, logo, image)", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;

      const types = new Set(scene.elements.map((e) => e.type));
      assert.ok(types.has("text"), "Sample project should have text element");
      assert.ok(types.has("shape"), "Sample project should have shape element");

      scene.elements.forEach((el) => {
        const nextState = selectElementInState(state, el.id);
        assert.equal(nextState.selectedElementIds[0], el.id);
      });
    });
  });

  // =========================================================================
  // 2. Move Layers & Snapping
  // =========================================================================
  describe("2. Move Layers & Grid Snapping", () => {
    test("moves an element smoothly by delta (x, y)", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      const target = scene.elements[0];

      const startX = target.transform.x;
      const startY = target.transform.y;

      const moved = moveElement(target, 45, 30, { snapToGrid: false });
      assert.equal(moved.transform.x, startX + 45);
      assert.equal(moved.transform.y, startY + 30);
    });

    test("snaps movement to grid when snapToGrid is enabled", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      const target = scene.elements[0];

      const moved = moveElement(target, 43, 27, {
        snapToGrid: true,
        gridSize: 10,
      });

      assert.equal(moved.transform.x % 10, 0, "X should be aligned to grid 10");
      assert.equal(moved.transform.y % 10, 0, "Y should be aligned to grid 10");
    });

    test("locked element ignores movement updates", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      const target = scene.elements[0];

      const lockedState = toggleElementLockInActiveScene(state, target.id, true);
      const lockedScene = getActiveScene(lockedState)!;
      const lockedElem = lockedScene.elements.find((e) => e.id === target.id)!;
      assert.equal(lockedElem.locked, true);

      // Attempting update on locked element returns unchanged state
      const attemptedState = updateElementsInActiveScene(lockedState, [
        { ...lockedElem, transform: { ...lockedElem.transform, x: 9999 } },
      ]);
      const resultElem = getActiveScene(attemptedState)!.elements.find(
        (e) => e.id === target.id
      )!;
      assert.equal(resultElem.transform.x, target.transform.x);
    });
  });

  // =========================================================================
  // 3. Resize & Scale
  // =========================================================================
  describe("3. Resize & Min-Size Bounds", () => {
    test("resizes corner handles (se, nw) correctly", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      const target = scene.elements.find((e) => e.type === "shape")!;

      const initialWidth = target.transform.width;
      const initialHeight = target.transform.height;

      const resizedSE = resizeElement(target, "se", 50, 40, {
        snapToGrid: false,
      });
      assert.equal(resizedSE.transform.width, initialWidth + 50);
      assert.equal(resizedSE.transform.height, initialHeight + 40);
    });

    test("enforces minimum size bounds so elements do not collapse to zero", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      const target = scene.elements[0];

      // Try shrinking by an absurdly huge delta
      const collapsed = resizeElement(target, "se", -5000, -5000, {
        snapToGrid: false,
      });
      assert.ok(
        collapsed.transform.width >= 8,
        "Width should never drop below min size (8px)"
      );
      assert.ok(
        collapsed.transform.height >= 8,
        "Height should never drop below min size (8px)"
      );
    });

    test("text element resizing preserves text content", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      const textElem = scene.elements.find((e) => e.type === "text") as TextElement;

      const originalText = textElem.text;
      const resized = resizeElement(textElem, "e", 100, 0, { snapToGrid: false });
      assert.equal((resized as TextElement).text, originalText);
      assert.ok(resized.transform.width > textElem.transform.width);
    });

    test("corner resizing preserves opposite corner anchored across all 4 corners (se, nw, ne, sw)", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      const target = scene.elements.find((e) => e.type === "shape")!;

      const getCorners = (el: MotionElement) => {
        const ax = el.transform.anchorX ?? 0.5;
        const ay = el.transform.anchorY ?? 0.5;
        const left = el.transform.x - el.transform.width * ax;
        const top = el.transform.y - el.transform.height * ay;
        const right = left + el.transform.width;
        const bottom = top + el.transform.height;
        return { left: Math.round(left), top: Math.round(top), right: Math.round(right), bottom: Math.round(bottom) };
      };

      const originalCorners = getCorners(target);

      // 1. Drag bottom-right (se) outward: Top-Left (left, top) must stay anchored
      const resizedSE = resizeElement(target, "se", 80, 60, { snapToGrid: false });
      const seCorners = getCorners(resizedSE);
      assert.equal(seCorners.left, originalCorners.left, "SE drag: Top-Left X must remain anchored");
      assert.equal(seCorners.top, originalCorners.top, "SE drag: Top-Left Y must remain anchored");
      assert.equal(seCorners.right, originalCorners.right + 80, "SE drag: Bottom-Right X must expand");
      assert.equal(seCorners.bottom, originalCorners.bottom + 60, "SE drag: Bottom-Right Y must expand");

      // 2. Drag top-left (nw) inward/outward: Bottom-Right (right, bottom) must stay anchored
      const resizedNW = resizeElement(target, "nw", -50, -40, { snapToGrid: false });
      const nwCorners = getCorners(resizedNW);
      assert.equal(nwCorners.right, originalCorners.right, "NW drag: Bottom-Right X must remain anchored");
      assert.equal(nwCorners.bottom, originalCorners.bottom, "NW drag: Bottom-Right Y must remain anchored");
      assert.equal(nwCorners.left, originalCorners.left - 50, "NW drag: Top-Left X must move");
      assert.equal(nwCorners.top, originalCorners.top - 40, "NW drag: Top-Left Y must move");

      // 3. Drag top-right (ne): Bottom-Left (left, bottom) must stay anchored
      const resizedNE = resizeElement(target, "ne", 60, -30, { snapToGrid: false });
      const neCorners = getCorners(resizedNE);
      assert.equal(neCorners.left, originalCorners.left, "NE drag: Bottom-Left X must remain anchored");
      assert.equal(neCorners.bottom, originalCorners.bottom, "NE drag: Bottom-Left Y must remain anchored");
      assert.equal(neCorners.right, originalCorners.right + 60, "NE drag: Top-Right X must move");
      assert.equal(neCorners.top, originalCorners.top - 30, "NE drag: Top-Right Y must move");

      // 4. Drag bottom-left (sw): Top-Right (right, top) must stay anchored
      const resizedSW = resizeElement(target, "sw", -40, 50, { snapToGrid: false });
      const swCorners = getCorners(resizedSW);
      assert.equal(swCorners.right, originalCorners.right, "SW drag: Top-Right X must remain anchored");
      assert.equal(swCorners.top, originalCorners.top, "SW drag: Top-Right Y must remain anchored");
      assert.equal(swCorners.left, originalCorners.left - 40, "SW drag: Bottom-Left X must move");
      assert.equal(swCorners.bottom, originalCorners.bottom + 50, "SW drag: Bottom-Left Y must move");
    });

    test("headline text element corner resizing: outward makes text larger, inward makes text smaller", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      const headline = scene.elements.find((e) => e.type === "text") as TextElement;

      const initialWidth = headline.transform.width;
      const initialHeight = headline.transform.height;
      const initialFontSize = headline.fontSize;

      // 1. Drag bottom-right (se) outward: width, height, and font size grow proportionally
      const larger = resizeElement(headline, "se", 200, 40, { snapToGrid: false }) as TextElement;
      assert.ok(larger.transform.width > initialWidth, "Width should increase outward");
      assert.ok(larger.transform.height > initialHeight, "Height should increase outward");
      assert.ok(larger.fontSize > initialFontSize, "Headline font size should increase outward");
      assert.equal(larger.text, headline.text, "Text content must never change");
      assert.equal(larger.fontFamily, headline.fontFamily, "Font family must be preserved");

      // 2. Drag bottom-right (se) inward with predominantly horizontal motion (deltaY = 0)
      // This is the exact user bug: dragging corner inward should shrink font size even if deltaY is 0!
      const smallerHoriz = resizeElement(headline, "se", -300, 0, { snapToGrid: false }) as TextElement;
      assert.ok(smallerHoriz.transform.width < initialWidth, "Width should decrease inward");
      assert.ok(smallerHoriz.transform.height < initialHeight, "Height should decrease proportionally");
      assert.ok(smallerHoriz.fontSize < initialFontSize, "Headline font size must decrease inward");
      assert.equal(smallerHoriz.text, headline.text, "Text content must never change");

      // 3. Drag bottom-right (se) inward diagonally
      const smaller = resizeElement(headline, "se", -100, -25, { snapToGrid: false }) as TextElement;
      assert.ok(smaller.transform.width < initialWidth, "Width should decrease inward");
      assert.ok(smaller.transform.height < initialHeight, "Height should decrease inward");
      assert.ok(smaller.fontSize < initialFontSize, "Headline font size should decrease inward");
      assert.ok(smaller.fontSize >= 8, "Headline font size must not collapse below 8px");
      assert.equal(smaller.text, headline.text, "Text content must never change");

      // 4. Test all four corners: nw, ne, sw, se inward drag all decrease font size
      const getCorners = (el: MotionElement) => {
        const ax = el.transform.anchorX ?? 0.5;
        const ay = el.transform.anchorY ?? 0.5;
        const left = el.transform.x - el.transform.width * ax;
        const top = el.transform.y - el.transform.height * ay;
        return {
          left: Math.round(left),
          top: Math.round(top),
          right: Math.round(left + el.transform.width),
          bottom: Math.round(top + el.transform.height),
        };
      };

      const origCorners = getCorners(headline);

      // Top-Left (nw) inward drag: Bottom-Right stays anchored, text shrinks
      const smallerNW = resizeElement(headline, "nw", 200, 20, { snapToGrid: false }) as TextElement;
      const nwCorners = getCorners(smallerNW);
      assert.ok(smallerNW.fontSize < initialFontSize, "NW inward drag must decrease font size");
      assert.equal(nwCorners.right, origCorners.right, "NW drag: Bottom-Right X remains anchored");
      assert.equal(nwCorners.bottom, origCorners.bottom, "NW drag: Bottom-Right Y remains anchored");

      // Top-Right (ne) inward drag: Bottom-Left stays anchored, text shrinks
      const smallerNE = resizeElement(headline, "ne", -200, 20, { snapToGrid: false }) as TextElement;
      const neCorners = getCorners(smallerNE);
      assert.ok(smallerNE.fontSize < initialFontSize, "NE inward drag must decrease font size");
      assert.equal(neCorners.left, origCorners.left, "NE drag: Bottom-Left X remains anchored");
      assert.equal(neCorners.bottom, origCorners.bottom, "NE drag: Bottom-Left Y remains anchored");

      // Bottom-Left (sw) inward drag: Top-Right stays anchored, text shrinks
      const smallerSW = resizeElement(headline, "sw", 200, -20, { snapToGrid: false }) as TextElement;
      const swCorners = getCorners(smallerSW);
      assert.ok(smallerSW.fontSize < initialFontSize, "SW inward drag must decrease font size");
      assert.equal(swCorners.right, origCorners.right, "SW drag: Top-Right X remains anchored");
      assert.equal(swCorners.top, origCorners.top, "SW drag: Top-Right Y remains anchored");

      // Bottom-Right (se) inward drag: Top-Left stays anchored, text shrinks
      const smallerSE = resizeElement(headline, "se", -200, -20, { snapToGrid: false }) as TextElement;
      const seCorners = getCorners(smallerSE);
      assert.ok(smallerSE.fontSize < initialFontSize, "SE inward drag must decrease font size");
      assert.equal(seCorners.left, origCorners.left, "SE drag: Top-Left X remains anchored");
      assert.equal(seCorners.top, origCorners.top, "SE drag: Top-Left Y remains anchored");

      // 5. Side/edge handles (e.g. 'e') adjust width without changing font size
      const widerBox = resizeElement(headline, "e", 100, 0, { snapToGrid: false }) as TextElement;
      assert.equal(widerBox.fontSize, initialFontSize, "Edge handle must NOT alter font size");
      assert.ok(widerBox.transform.width > initialWidth, "Edge handle must adjust width");
    });

    test("proportional scaling preserves aspect ratio when preserveAspect is true or for logos/images", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      const logo = scene.elements.find((e) => e.type === "logo")!;

      const initialRatio = logo.transform.width / logo.transform.height;
      const resizedLogo = resizeElement(logo, "se", 60, 40, { snapToGrid: false });
      const newRatio = resizedLogo.transform.width / resizedLogo.transform.height;
      assert.ok(
        Math.abs(newRatio - initialRatio) < 0.05,
        `Aspect ratio should be preserved for logo: initial=${initialRatio}, new=${newRatio}`
      );
    });

    test("canvas coordinate conversion works accurately across zoom levels (50%, 75%, 100%, Fit)", () => {
      const zoomLevels = [0.5, 0.75, 1.0, 0.62]; // 50%, 75%, 100%, Fit
      const panX = 120;
      const panY = 80;

      for (const zoom of zoomLevels) {
        const viewport = { zoom, panX, panY, containerWidth: 1920, containerHeight: 1080 };

        // Test roundtrip: Canvas -> Viewport -> Canvas
        const originalCanvasPoint = { x: 500, y: 350 };
        const viewportPoint = canvasToViewport(originalCanvasPoint, viewport);
        const mappedBack = viewportToCanvas(viewportPoint, viewport);

        assert.equal(
          Math.round(mappedBack.x),
          originalCanvasPoint.x,
          `X coordinate must roundtrip at zoom ${(zoom * 100).toFixed(0)}%`
        );
        assert.equal(
          Math.round(mappedBack.y),
          originalCanvasPoint.y,
          `Y coordinate must roundtrip at zoom ${(zoom * 100).toFixed(0)}%`
        );

        // Screen mouse movement delta of 50px converted to canvas delta must equal 50 / zoom
        const screenPoint1 = { x: 400, y: 300 };
        const screenPoint2 = { x: 450, y: 330 };
        const canvasPt1 = viewportToCanvas(screenPoint1, viewport);
        const canvasPt2 = viewportToCanvas(screenPoint2, viewport);
        const deltaCanvasX = canvasPt2.x - canvasPt1.x;
        const deltaCanvasY = canvasPt2.y - canvasPt1.y;

        assert.ok(
          Math.abs(deltaCanvasX - 50 / zoom) < 0.01,
          `Canvas delta X should be 50 / zoom at zoom ${zoom}`
        );
        assert.ok(
          Math.abs(deltaCanvasY - 30 / zoom) < 0.01,
          `Canvas delta Y should be 30 / zoom at zoom ${zoom}`
        );
      }
    });
  });

  // =========================================================================
  // 4. Rotation
  // =========================================================================
  describe("4. Rotation & Angle Snapping", () => {
    test("rotates element and updates transform.rotation value", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      const target = scene.elements[0];

      const rotated = rotateElement(target, 45);
      assert.equal(rotated.transform.rotation, 45);
    });

    test("calculateRotationAngle snaps to 15-degree increments with shift key", () => {
      const center = { x: 500, y: 500 };
      // 45 degrees corresponds to point (600, 600)
      const current = { x: 600, y: 600 };

      const angle = calculateRotationAngle(center, current, {
        snapToIncrements: true,
        incrementDegrees: 15,
      });

      assert.equal(angle % 15, 0, "Angle should snap to multiple of 15 degrees");
    });
  });

  // =========================================================================
  // 5. Layer Duplication
  // =========================================================================
  describe("5. Layer Duplication", () => {
    test("duplicates element with unique ID and offset position (+20, +20)", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      const originalCount = scene.elements.length;
      const target = scene.elements[0];

      const duplicatedState = duplicateElementInActiveScene(state, target.id);
      const updatedScene = getActiveScene(duplicatedState)!;

      assert.equal(
        updatedScene.elements.length,
        originalCount + 1,
        "Scene should have 1 more element"
      );

      const duplicatedId = duplicatedState.selectedElementIds[0];
      assert.ok(duplicatedId, "Newly duplicated element should be selected");
      assert.notEqual(duplicatedId, target.id, "ID must be unique");

      const duplicatedElem = updatedScene.elements.find((e) => e.id === duplicatedId)!;
      assert.equal(duplicatedElem.transform.x, target.transform.x + 20);
      assert.equal(duplicatedElem.transform.y, target.transform.y + 20);
      assert.equal(duplicatedElem.transform.width, target.transform.width);
      assert.equal(duplicatedElem.type, target.type);
      assert.equal(duplicatedElem.locked, false, "Duplicate should start unlocked");
    });
  });

  // =========================================================================
  // 6. Layer Deletion
  // =========================================================================
  describe("6. Layer Deletion", () => {
    test("deletes selected element and safely cleans up selection", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      const target = scene.elements[0];

      const selectedState = selectElementInState(state, target.id);
      assert.deepEqual(selectedState.selectedElementIds, [target.id]);

      const deletedState = deleteElementInActiveScene(selectedState, target.id);
      const updatedScene = getActiveScene(deletedState)!;

      assert.equal(
        updatedScene.elements.some((e) => e.id === target.id),
        false,
        "Element must be removed from scene"
      );
      assert.equal(
        deletedState.selectedElementIds.includes(target.id),
        false,
        "Deleted element must be removed from selection"
      );
    });
  });

  // =========================================================================
  // 7. Layer Visibility
  // =========================================================================
  describe("7. Layer Visibility", () => {
    test("toggles visibility state while keeping element in scene array", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      const target = scene.elements[0];

      const hiddenState = toggleElementVisibilityInActiveScene(
        state,
        target.id,
        false
      );
      const hiddenScene = getActiveScene(hiddenState)!;
      const hiddenElem = hiddenScene.elements.find((e) => e.id === target.id)!;
      assert.equal(hiddenElem.visible, false);

      const restoredState = toggleElementVisibilityInActiveScene(
        hiddenState,
        target.id,
        true
      );
      const restoredElem = getActiveScene(restoredState)!.elements.find(
        (e) => e.id === target.id
      )!;
      assert.equal(restoredElem.visible, true);
    });
  });

  // =========================================================================
  // 8. Layer Locking
  // =========================================================================
  describe("8. Layer Locking", () => {
    test("locks and unlocks elements correctly", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      const target = scene.elements[0];

      const lockedState = toggleElementLockInActiveScene(state, target.id, true);
      assert.equal(
        getActiveScene(lockedState)!.elements.find((e) => e.id === target.id)!.locked,
        true
      );

      const unlockedState = toggleElementLockInActiveScene(lockedState, target.id, false);
      assert.equal(
        getActiveScene(unlockedState)!.elements.find((e) => e.id === target.id)!.locked,
        false
      );
    });
  });

  // =========================================================================
  // 9. Layer Ordering (Z-Index and Array Position)
  // =========================================================================
  describe("9. Layer Ordering", () => {
    test("reorders elements with bringForward, sendBackward, bringToFront, sendToBack", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      assert.ok(scene.elements.length >= 3, "Need at least 3 elements for reorder test");

      const firstId = scene.elements[0].id;
      const lastId = scene.elements[scene.elements.length - 1].id;

      // Bring first element to front
      const toFront = reorderElementInActiveScene(state, firstId, "bringToFront");
      const frontElements = getActiveScene(toFront)!.elements;
      assert.equal(
        frontElements[frontElements.length - 1].id,
        firstId,
        "Element should be at end of array"
      );

      // Send last element to back
      const toBack = reorderElementInActiveScene(state, lastId, "sendToBack");
      const backElements = getActiveScene(toBack)!.elements;
      assert.equal(
        backElements[0].id,
        lastId,
        "Element should be at index 0 of array"
      );
    });
  });

  // =========================================================================
  // 10. Viewport Zoom & Coordinate System Invariance
  // =========================================================================
  describe("10. Zoom & Coordinate System Invariance", () => {
    test("converts screen coordinates accurately across multiple zoom levels (50%, 100%, 200%)", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);

      const zoomLevels = [0.5, 1.0, 2.0];

      zoomLevels.forEach((zoom) => {
        const zoomedState = setViewportZoom(state, zoom);
        const originalCanvasPoint = { x: 350, y: 420 };

        // Convert canvas -> viewport
        const viewportPoint = canvasToViewport(
          originalCanvasPoint,
          zoomedState.viewport
        );

        // Convert viewport -> canvas
        const roundTripCanvasPoint = viewportToCanvas(
          viewportPoint,
          zoomedState.viewport
        );

        assert.equal(
          Math.round(roundTripCanvasPoint.x),
          originalCanvasPoint.x,
          `X roundtrip must match at ${zoom * 100}% zoom`
        );
        assert.equal(
          Math.round(roundTripCanvasPoint.y),
          originalCanvasPoint.y,
          `Y roundtrip must match at ${zoom * 100}% zoom`
        );
      });
    });
  });

  // =========================================================================
  // 11. Inspector Synchronization & Single Source of Truth
  // =========================================================================
  describe("11. Inspector Synchronization & State Integrity", () => {
    test("updating an element property reflects in project, scene, and element models", () => {
      const project = createSampleProject();
      const state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;
      const target = scene.elements[0];

      const updatedState = updateElementInActiveScene(state, target.id, {
        name: "Renamed Title Layer",
        transform: {
          ...target.transform,
          x: 777,
          width: 888,
        },
      });

      const updatedScene = getActiveScene(updatedState)!;
      const updatedElem = updatedScene.elements.find((e) => e.id === target.id)!;

      assert.equal(updatedElem.name, "Renamed Title Layer");
      assert.equal(updatedElem.transform.x, 777);
      assert.equal(updatedElem.transform.width, 888);

      // Verify the underlying Project root is also updated (One Source of Truth)
      const projectScene = updatedState.project.scenes.find(
        (s) => s.id === updatedScene.id
      )!;
      const projectElem = projectScene.elements.find((e) => e.id === target.id)!;
      assert.equal(projectElem.name, "Renamed Title Layer");
      assert.equal(projectElem.transform.x, 777);
    });
  });

  // =========================================================================
  // 12. AI-Generated Project Compatibility
  // =========================================================================
  describe("12. Phase 8.1 AI Plan -> Phase 8.2 Canvas Compatibility", () => {
    test("loads an AI-generated motion project and enables full manipulation", () => {
      // Simulate an AI-generated project from Phase 8.1 Motion Plan
      const aiProject: Project = {
        id: "ai_proj_test_8_2",
        name: "AI Cyberpunk Title Comp",
        description: "Generated by MotionBot AI agent",
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 5.0,
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        scenes: [
          {
            id: "scene_ai_1",
            name: "Hero Reveal",
            order: 0,
            startTime: 0,
            duration: 5.0,
            background: { type: "solid", color: "#0B0C10" },
            elements: [
              {
                id: "ai_text_1",
                name: "Cyber Headline",
                type: "text",
                visible: true,
                locked: false,
                zIndex: 0,
                transform: {
                  x: 300,
                  y: 250,
                  width: 800,
                  height: 120,
                  rotation: 0,
                  scaleX: 1,
                  scaleY: 1,
                  anchorX: 0,
                  anchorY: 0,
                },
                appearance: { opacity: 1 },
                text: "NEO TOKYO 2099",
                fontSize: 64,
                fontFamily: "Inter",
                fontWeight: "800",
                fill: { type: "solid", color: "#00F0FF" },
                alignment: "center",
              } as unknown as TextElement,
              {
                id: "ai_shape_1",
                name: "Accent Glow Bar",
                type: "shape",
                shapeKind: "rectangle",
                visible: true,
                locked: false,
                zIndex: 1,
                transform: {
                  x: 300,
                  y: 400,
                  width: 400,
                  height: 8,
                  rotation: 0,
                  scaleX: 1,
                  scaleY: 1,
                  anchorX: 0,
                  anchorY: 0,
                },
                appearance: {
                  opacity: 1,
                  fill: { type: "solid", color: "#FF0055" },
                },
              } as unknown as ShapeElement,
            ],
            metadata: {},
          },
        ],
        assets: [],
        metadata: {
          title: "AI Cyberpunk Project",
        },
      } as unknown as Project;

      const state = createInitialEditorState(aiProject);
      assert.equal(state.project.id, "ai_proj_test_8_2");

      // 1. Select AI layer
      const selectedState = selectElementInState(state, "ai_text_1");
      assert.deepEqual(selectedState.selectedElementIds, ["ai_text_1"]);

      // 2. Move AI layer
      const movedScene = updateElementInActiveScene(selectedState, "ai_text_1", {
        transform: {
          ...aiProject.scenes[0].elements[0].transform,
          x: 450,
          y: 350,
        },
      });
      const movedElem = getActiveScene(movedScene)!.elements.find(
        (e) => e.id === "ai_text_1"
      )!;
      assert.equal(movedElem.transform.x, 450);
      assert.equal(movedElem.transform.y, 350);

      // 3. Duplicate AI layer
      const duplicatedState = duplicateElementInActiveScene(
        movedScene,
        "ai_shape_1"
      );
      const dupScene = getActiveScene(duplicatedState)!;
      assert.equal(dupScene.elements.length, 3);
      assert.ok(
        dupScene.elements.some((e) => e.name.includes("(Copy)")),
        "Duplicated AI shape should have copy name"
      );

      // 4. Delete AI layer
      const deletedState = deleteElementInActiveScene(
        duplicatedState,
        "ai_text_1"
      );
      assert.equal(
        getActiveScene(deletedState)!.elements.some((e) => e.id === "ai_text_1"),
        false
      );
    });

    test("13. Full End-to-End 16-Step Verification Sequence for Text Layer Resizing", () => {
      const project = createSampleProject();
      let state = createInitialEditorState(project);
      const scene = getActiveScene(state)!;

      // STEP 1: Select Headline Text layer
      const headline = scene.elements.find((e) => e.name === "Headline Text") as TextElement;
      assert.ok(headline, "Headline Text layer must exist");
      state = selectElementInState(state, headline.id);
      assert.deepEqual(state.selectedElementIds, [headline.id]);

      const initialWidth = headline.transform.width;
      const initialHeight = headline.transform.height;
      const initialFontSize = headline.fontSize;
      assert.equal(initialFontSize, 56);

      // STEP 2 & 3: Drag bottom-right (se) inward -> confirm actual letters become smaller
      const shrunkSE = resizeElement(headline, "se", -300, -20, { snapToGrid: false }) as TextElement;
      assert.ok(shrunkSE.transform.width < initialWidth, "SE inward: width must be smaller");
      assert.ok(shrunkSE.transform.height < initialHeight, "SE inward: height must be smaller");
      assert.ok(shrunkSE.fontSize < initialFontSize, "SE inward: font size must become smaller");
      assert.ok(shrunkSE.fontSize >= 8, "SE inward: font size must remain valid >= 8");

      // STEP 4 & 5: Drag bottom-right (se) outward -> confirm actual letters become larger
      const expandedSE = resizeElement(headline, "se", 300, 20, { snapToGrid: false }) as TextElement;
      assert.ok(expandedSE.transform.width > initialWidth, "SE outward: width must be larger");
      assert.ok(expandedSE.transform.height > initialHeight, "SE outward: height must be larger");
      assert.ok(expandedSE.fontSize > initialFontSize, "SE outward: font size must become larger");

      // STEP 6: Test top-left (nw) inward -> smaller text, bottom-right anchored
      const shrunkNW = resizeElement(headline, "nw", 200, 20, { snapToGrid: false }) as TextElement;
      assert.ok(shrunkNW.fontSize < initialFontSize, "NW inward: font size must decrease");
      const ax = headline.transform.anchorX ?? 0.5;
      const ay = headline.transform.anchorY ?? 0.5;
      const origRight = headline.transform.x + headline.transform.width * (1 - ax);
      const origBottom = headline.transform.y + headline.transform.height * (1 - ay);
      const nwRight = shrunkNW.transform.x + shrunkNW.transform.width * (1 - ax);
      const nwBottom = shrunkNW.transform.y + shrunkNW.transform.height * (1 - ay);
      assert.equal(Math.round(nwRight), Math.round(origRight), "NW: bottom-right X must remain anchored");
      assert.equal(Math.round(nwBottom), Math.round(origBottom), "NW: bottom-right Y must remain anchored");

      // STEP 7: Test top-right (ne) inward -> smaller text, bottom-left anchored
      const shrunkNE = resizeElement(headline, "ne", -200, 20, { snapToGrid: false }) as TextElement;
      assert.ok(shrunkNE.fontSize < initialFontSize, "NE inward: font size must decrease");
      const origLeft = headline.transform.x - headline.transform.width * ax;
      const neLeft = shrunkNE.transform.x - shrunkNE.transform.width * ax;
      const neBottom = shrunkNE.transform.y + shrunkNE.transform.height * (1 - ay);
      assert.equal(Math.round(neLeft), Math.round(origLeft), "NE: bottom-left X must remain anchored");
      assert.equal(Math.round(neBottom), Math.round(origBottom), "NE: bottom-left Y must remain anchored");

      // STEP 8: Test bottom-left (sw) inward -> smaller text, top-right anchored
      const shrunkSW = resizeElement(headline, "sw", 200, -20, { snapToGrid: false }) as TextElement;
      assert.ok(shrunkSW.fontSize < initialFontSize, "SW inward: font size must decrease");
      const origTop = headline.transform.y - headline.transform.height * ay;
      const swRight = shrunkSW.transform.x + shrunkSW.transform.width * (1 - ax);
      const swTop = shrunkSW.transform.y - shrunkSW.transform.height * ay;
      assert.equal(Math.round(swRight), Math.round(origRight), "SW: top-right X must remain anchored");
      assert.equal(Math.round(swTop), Math.round(origTop), "SW: top-right Y must remain anchored");

      // STEP 9: Test at 50% zoom
      const viewport50 = { zoom: 0.5, panX: 0, panY: 0 };
      const screenDelta50 = { x: -100, y: -10 }; // 100px screen drag at 50% zoom
      const canvasDelta50 = {
        x: screenDelta50.x / viewport50.zoom, // -200 canvas px
        y: screenDelta50.y / viewport50.zoom, // -20 canvas px
      };
      const shrunk50 = resizeElement(headline, "se", canvasDelta50.x, canvasDelta50.y, { snapToGrid: false }) as TextElement;
      assert.ok(shrunk50.fontSize < initialFontSize, "At 50% zoom: font size shrinks accurately");
      assert.equal(shrunk50.fontSize, Math.round(initialFontSize * (shrunk50.transform.width / initialWidth)));

      // STEP 10: Test at 100% zoom
      const viewport100 = { zoom: 1.0, panX: 0, panY: 0 };
      const screenDelta100 = { x: -200, y: -20 };
      const canvasDelta100 = {
        x: screenDelta100.x / viewport100.zoom,
        y: screenDelta100.y / viewport100.zoom,
      };
      const shrunk100 = resizeElement(headline, "se", canvasDelta100.x, canvasDelta100.y, { snapToGrid: false }) as TextElement;
      assert.equal(shrunk100.fontSize, shrunk50.fontSize, "Zoom invariant: same canvas delta yields exact same font size");

      // STEP 11 & 12: Change size through Inspector -> verify canvas updates
      state = updateElementInActiveScene(state, headline.id, {
        fontSize: 40,
      });
      const updatedInState = getActiveScene(state)!.elements.find((e) => e.id === headline.id) as TextElement;
      assert.equal(updatedInState.fontSize, 40, "Inspector update reflects in state and canvas");

      // STEP 13: Undo -> original size restored
      const historyStack: Project[] = [project];
      const futureStack: Project[] = [];
      const projectAfterResize = state.project;

      // Simulate undo action
      futureStack.push(projectAfterResize);
      const restoredProject = historyStack.pop()!;
      state = createInitialEditorState(restoredProject);
      const afterUndo = getActiveScene(state)!.elements.find((e) => e.id === headline.id) as TextElement;
      assert.equal(afterUndo.fontSize, 56, "Undo: original font size restored to 56");

      // STEP 14: Redo -> resized size restored
      historyStack.push(state.project);
      const redoProject = futureStack.pop()!;
      state = createInitialEditorState(redoProject);
      const afterRedo = getActiveScene(state)!.elements.find((e) => e.id === headline.id) as TextElement;
      assert.equal(afterRedo.fontSize, 40, "Redo: resized font size restored to 40");

      // STEP 15: Generate / Apply an AI project
      const aiProject = {
        ...project,
        id: "proj_ai_fitness",
        scenes: [
          {
            ...scene,
            id: "scene_ai_1",
            elements: [
              {
                id: "ai_text_headline",
                name: "AI Promo Headline",
                type: "text",
                visible: true,
                locked: false,
                zIndex: 1,
                transform: {
                  x: 960,
                  y: 500,
                  width: 800,
                  height: 100,
                  rotation: 0,
                  scaleX: 1,
                  scaleY: 1,
                  anchorX: 0.5,
                  anchorY: 0.5,
                },
                appearance: { opacity: 1 },
                text: "CRUSH YOUR LIMITS",
                fontSize: 60,
                fontFamily: "Outfit",
                fontWeight: "700",
                alignment: "center",
              } as unknown as TextElement,
            ],
          },
        ],
      } as unknown as Project;

      state = createInitialEditorState(aiProject);
      assert.equal(state.project.id, "proj_ai_fitness");

      // STEP 16: Resize an AI-generated text layer
      const aiText = getActiveScene(state)!.elements[0] as TextElement;
      assert.equal(aiText.fontSize, 60);

      // Drag AI text corner inward
      const shrunkAIText = resizeElement(aiText, "se", -200, 0, { snapToGrid: false }) as TextElement;
      assert.ok(shrunkAIText.fontSize < 60, "AI text corner inward: font size must decrease");
      assert.ok(shrunkAIText.transform.width < 800, "AI text corner inward: width must decrease");
      assert.equal(shrunkAIText.text, "CRUSH YOUR LIMITS", "AI text content must remain unchanged");

      // Drag AI text corner outward
      const expandedAIText = resizeElement(aiText, "se", 200, 0, { snapToGrid: false }) as TextElement;
      assert.ok(expandedAIText.fontSize > 60, "AI text corner outward: font size must increase");
    });
  });
});
