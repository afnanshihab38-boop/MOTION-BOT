/**
 * MOTION-BOT — Editor Selection System
 * Pure selection management functions for single-selection, multi-selection,
 * bounding box aggregation, and element lookup.
 * Part of Phase 5.1: Editor Architecture & Canvas Foundation.
 */

import { ElementBounds, ElementId } from "@/types/editor";
import { MotionElement } from "@/types/element";
import { calculateElementBounds } from "./coordinate-system";

/**
 * Handles element selection logic.
 * Supports toggle/additive selection when multiSelect is true (e.g. Shift / Cmd key held).
 */
export function selectElement(
  currentSelectedIds: ElementId[],
  targetId: ElementId,
  multiSelect = false
): ElementId[] {
  if (multiSelect) {
    if (currentSelectedIds.includes(targetId)) {
      // Deselect if already selected in multi-select mode
      return currentSelectedIds.filter((id) => id !== targetId);
    }
    return [...currentSelectedIds, targetId];
  }

  // Single select: replace selection
  return [targetId];
}

/**
 * Removes an element from the selection.
 */
export function deselectElement(
  currentSelectedIds: ElementId[],
  targetId: ElementId
): ElementId[] {
  return currentSelectedIds.filter((id) => id !== targetId);
}

/**
 * Clears all selected elements.
 */
export function clearSelection(): ElementId[] {
  return [];
}

/**
 * Selects all unlocked, visible elements in the current scene.
 */
export function selectAllElements(elements: MotionElement[]): ElementId[] {
  return elements
    .filter((el) => !el.locked && el.visible)
    .map((el) => el.id);
}

/**
 * Checks if a specific element ID is currently selected.
 */
export function isElementSelected(
  selectedIds: ElementId[],
  elementId: ElementId
): boolean {
  return selectedIds.includes(elementId);
}

/**
 * Resolves full MotionElement objects for current selection.
 */
export function getSelectedElements(
  elements: MotionElement[],
  selectedIds: ElementId[]
): MotionElement[] {
  const set = new Set(selectedIds);
  return elements.filter((el) => set.has(el.id));
}

/**
 * Aggregates an enclosing bounding box across multiple selected elements.
 */
export function calculateAggregateBounds(elements: MotionElement[]): ElementBounds | null {
  if (elements.length === 0) return null;

  if (elements.length === 1) {
    return calculateElementBounds(elements[0]);
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    const bounds = calculateElementBounds(el);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    rotation: 0,
  };
}
