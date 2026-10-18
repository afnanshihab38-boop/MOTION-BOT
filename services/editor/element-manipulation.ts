/**
 * MOTION-BOT — Element Manipulation & Interactive Transforms
 * Mathematical functions and safe reducers for moving, resizing, and rotating elements.
 * Guarantees data validity, protects locked/invisible elements, and prevents corrupt transforms.
 * Part of Phase 5.3: Basic Element Selection & Manipulation.
 */

import { Transform2D, MotionElement, TextElement } from "@/types/element";
import { ResizeHandleId, CanvasPoint } from "@/types/editor";
import { snapToGrid } from "./coordinate-system";

export const MIN_ELEMENT_DIMENSION = 8; // Minimum allowable width/height in px

/**
 * Validates a Transform2D object to prevent corrupt/invalid data.
 */
export function validateTransform(transform: Transform2D): { valid: boolean; error?: string } {
  if (typeof transform.x !== "number" || !Number.isFinite(transform.x)) {
    return { valid: false, error: "Transform x must be a finite number" };
  }
  if (typeof transform.y !== "number" || !Number.isFinite(transform.y)) {
    return { valid: false, error: "Transform y must be a finite number" };
  }
  if (typeof transform.width !== "number" || !Number.isFinite(transform.width) || transform.width <= 0) {
    return { valid: false, error: "Transform width must be a positive finite number" };
  }
  if (typeof transform.height !== "number" || !Number.isFinite(transform.height) || transform.height <= 0) {
    return { valid: false, error: "Transform height must be a positive finite number" };
  }
  if (typeof transform.rotation !== "number" || !Number.isFinite(transform.rotation)) {
    return { valid: false, error: "Transform rotation must be a finite number" };
  }
  if (typeof transform.scaleX !== "number" || !Number.isFinite(transform.scaleX)) {
    return { valid: false, error: "Transform scaleX must be a finite number" };
  }
  if (typeof transform.scaleY !== "number" || !Number.isFinite(transform.scaleY)) {
    return { valid: false, error: "Transform scaleY must be a finite number" };
  }
  return { valid: true };
}

/**
 * Sanitizes partial transform updates ensuring safe, positive finite values.
 */
export function sanitizeTransform(
  current: Transform2D,
  updates: Partial<Transform2D>
): Transform2D {
  const nextX = typeof updates.x === "number" && Number.isFinite(updates.x) ? updates.x : current.x;
  const nextY = typeof updates.y === "number" && Number.isFinite(updates.y) ? updates.y : current.y;
  const nextWidth =
    typeof updates.width === "number" && Number.isFinite(updates.width) && updates.width > 0
      ? Math.max(updates.width, MIN_ELEMENT_DIMENSION)
      : current.width;
  const nextHeight =
    typeof updates.height === "number" && Number.isFinite(updates.height) && updates.height > 0
      ? Math.max(updates.height, MIN_ELEMENT_DIMENSION)
      : current.height;
  const nextRotation =
    typeof updates.rotation === "number" && Number.isFinite(updates.rotation)
      ? normalizeAngle(updates.rotation)
      : current.rotation;
  const nextScaleX =
    typeof updates.scaleX === "number" && Number.isFinite(updates.scaleX)
      ? updates.scaleX
      : current.scaleX;
  const nextScaleY =
    typeof updates.scaleY === "number" && Number.isFinite(updates.scaleY)
      ? updates.scaleY
      : current.scaleY;
  const nextAnchorX =
    typeof updates.anchorX === "number" && Number.isFinite(updates.anchorX)
      ? updates.anchorX
      : current.anchorX ?? 0.5;
  const nextAnchorY =
    typeof updates.anchorY === "number" && Number.isFinite(updates.anchorY)
      ? updates.anchorY
      : current.anchorY ?? 0.5;

  return {
    x: Math.round(nextX * 100) / 100,
    y: Math.round(nextY * 100) / 100,
    width: Math.round(nextWidth * 100) / 100,
    height: Math.round(nextHeight * 100) / 100,
    rotation: Math.round(nextRotation * 10) / 10,
    scaleX: nextScaleX,
    scaleY: nextScaleY,
    anchorX: nextAnchorX,
    anchorY: nextAnchorY,
  };
}

/**
 * Normalizes an angle into the standard [-180, 180] degree interval.
 */
export function normalizeAngle(angleDeg: number): number {
  let angle = angleDeg % 360;
  if (angle > 180) angle -= 360;
  if (angle < -180) angle += 360;
  return angle;
}

/**
 * Snaps an angle in degrees to standard angular intervals (e.g. 15° increments when Shift held).
 */
export function snapAngle(angleDeg: number, increment = 15): number {
  if (increment <= 0) return angleDeg;
  return Math.round(angleDeg / increment) * increment;
}

// ============================================================================
// Element Movement & Translation
// ============================================================================

export interface MoveOptions {
  snapToGrid?: boolean;
  gridSize?: number;
}

/**
 * Immutably translates a single element by delta offsets.
 * Respects locked and invisible flags: locked or invisible elements are NOT moved.
 */
export function moveElement(
  element: MotionElement,
  deltaX: number,
  deltaY: number,
  options: MoveOptions = {}
): MotionElement {
  if (element.locked || !element.visible) {
    return element;
  }

  let nextX = element.transform.x + deltaX;
  let nextY = element.transform.y + deltaY;

  if (options.snapToGrid) {
    nextX = snapToGrid(nextX, options.gridSize);
    nextY = snapToGrid(nextY, options.gridSize);
  }

  const sanitized = sanitizeTransform(element.transform, { x: nextX, y: nextY });

  return {
    ...element,
    transform: sanitized,
  };
}

/**
 * Translates multiple elements together maintaining relative spatial positioning.
 * Skips any element that is locked or invisible.
 */
export function moveElements(
  elements: MotionElement[],
  deltaX: number,
  deltaY: number,
  options: MoveOptions = {}
): MotionElement[] {
  return elements.map((el) => moveElement(el, deltaX, deltaY, options));
}

// ============================================================================
// Element Resizing (8 Directional Handles)
// ============================================================================

export interface ResizeOptions {
  minWidth?: number;
  minHeight?: number;
  preserveAspect?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
}

/**
 * Calculates updated transform given a resize handle drag.
 * Accounts for handle direction, minimum dimensions, and anchor point compensation.
 */
export function calculateResizeTransform(
  initial: Transform2D,
  handle: ResizeHandleId,
  deltaX: number,
  deltaY: number,
  options: ResizeOptions = {}
): Transform2D {
  const minW = options.minWidth || MIN_ELEMENT_DIMENSION;
  const minH = options.minHeight || MIN_ELEMENT_DIMENSION;

  const anchorX = typeof initial.anchorX === "number" ? initial.anchorX : 0.5;
  const anchorY = typeof initial.anchorY === "number" ? initial.anchorY : 0.5;

  // Un-rotate delta vector if the element has rotation
  const rad = (-initial.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const localDx = cos * deltaX - sin * deltaY;
  const localDy = sin * deltaX + cos * deltaY;

  let newWidth = initial.width;
  let newHeight = initial.height;
  let localShiftX = 0;
  let localShiftY = 0;

  const isCorner = handle === "nw" || handle === "ne" || handle === "se" || handle === "sw";

  if (options.preserveAspect && isCorner && initial.width > 0 && initial.height > 0) {
    const aspect = initial.width / initial.height;
    let rawW = initial.width;
    let rawH = initial.height;
    switch (handle) {
      case "se":
        rawW = initial.width + localDx;
        rawH = initial.height + localDy;
        break;
      case "sw":
        rawW = initial.width - localDx;
        rawH = initial.height + localDy;
        break;
      case "ne":
        rawW = initial.width + localDx;
        rawH = initial.height - localDy;
        break;
      case "nw":
        rawW = initial.width - localDx;
        rawH = initial.height - localDy;
        break;
    }
    const scaleW = rawW / initial.width;
    const scaleH = rawH / initial.height;
    const scale = Math.abs(scaleW - 1) > Math.abs(scaleH - 1) ? scaleW : scaleH;
    const safeScale = Math.max(0.001, scale);
    newWidth = Math.max(initial.width * safeScale, minW);
    newHeight = Math.max(newWidth / aspect, minH);
    newWidth = newHeight * aspect;

    const dw = newWidth - initial.width;
    const dh = newHeight - initial.height;

    switch (handle) {
      case "se":
        localShiftX = dw * anchorX;
        localShiftY = dh * anchorY;
        break;
      case "sw":
        localShiftX = -dw * (1 - anchorX);
        localShiftY = dh * anchorY;
        break;
      case "ne":
        localShiftX = dw * anchorX;
        localShiftY = -dh * (1 - anchorY);
        break;
      case "nw":
        localShiftX = -dw * (1 - anchorX);
        localShiftY = -dh * (1 - anchorY);
        break;
    }
  } else {
    switch (handle) {
      case "e": {
        newWidth = Math.max(initial.width + localDx, minW);
        const actualChange = newWidth - initial.width;
        localShiftX = actualChange * anchorX;
        break;
      }
      case "w": {
        newWidth = Math.max(initial.width - localDx, minW);
        const actualChange = newWidth - initial.width;
        localShiftX = -actualChange * (1 - anchorX);
        break;
      }
      case "s": {
        newHeight = Math.max(initial.height + localDy, minH);
        const actualChange = newHeight - initial.height;
        localShiftY = actualChange * anchorY;
        break;
      }
      case "n": {
        newHeight = Math.max(initial.height - localDy, minH);
        const actualChange = newHeight - initial.height;
        localShiftY = -actualChange * (1 - anchorY);
        break;
      }
      case "se": {
        newWidth = Math.max(initial.width + localDx, minW);
        newHeight = Math.max(initial.height + localDy, minH);
        const dw = newWidth - initial.width;
        const dh = newHeight - initial.height;
        localShiftX = dw * anchorX;
        localShiftY = dh * anchorY;
        break;
      }
      case "sw": {
        newWidth = Math.max(initial.width - localDx, minW);
        newHeight = Math.max(initial.height + localDy, minH);
        const dw = newWidth - initial.width;
        const dh = newHeight - initial.height;
        localShiftX = -dw * (1 - anchorX);
        localShiftY = dh * anchorY;
        break;
      }
      case "ne": {
        newWidth = Math.max(initial.width + localDx, minW);
        newHeight = Math.max(initial.height - localDy, minH);
        const dw = newWidth - initial.width;
        const dh = newHeight - initial.height;
        localShiftX = dw * anchorX;
        localShiftY = -dh * (1 - anchorY);
        break;
      }
      case "nw": {
        newWidth = Math.max(initial.width - localDx, minW);
        newHeight = Math.max(initial.height - localDy, minH);
        const dw = newWidth - initial.width;
        const dh = newHeight - initial.height;
        localShiftX = -dw * (1 - anchorX);
        localShiftY = -dh * (1 - anchorY);
        break;
      }
      default:
        break;
    }
  }

  // Rotate local shift back into canvas world coordinate space
  const worldRad = (initial.rotation * Math.PI) / 180;
  const worldCos = Math.cos(worldRad);
  const worldSin = Math.sin(worldRad);
  const worldShiftX = worldCos * localShiftX - worldSin * localShiftY;
  const worldShiftY = worldSin * localShiftX + worldCos * localShiftY;

  return sanitizeTransform(initial, {
    x: initial.x + worldShiftX,
    y: initial.y + worldShiftY,
    width: newWidth,
    height: newHeight,
  });
}

/**
 * Resizes an element using the specified handle.
 * If the element is locked or invisible, returns the element unmodified.
 */
export function resizeElement(
  element: MotionElement,
  handle: ResizeHandleId,
  deltaX: number,
  deltaY: number,
  options: ResizeOptions = {}
): MotionElement {
  if (element.locked || !element.visible) {
    return element;
  }

  const isCorner = handle === "nw" || handle === "ne" || handle === "se" || handle === "sw";
  const shouldPreserveAspect =
    options.preserveAspect ??
    (isCorner && (element.type === "image" || element.type === "logo" || element.type === "text"));

  const updatedTransform = calculateResizeTransform(
    element.transform,
    handle,
    deltaX,
    deltaY,
    {
      ...options,
      preserveAspect: shouldPreserveAspect,
    }
  );

  // If resizing a text element via corner handle, scale fontSize proportionally
  if (element.type === "text" && isCorner) {
    const textEl = element as TextElement;
    const initialWidth = element.transform.width;
    const initialHeight = element.transform.height;
    if (initialWidth > 0 && initialHeight > 0) {
      const widthRatio = updatedTransform.width / initialWidth;
      const heightRatio = updatedTransform.height / initialHeight;
      const scaleRatio = shouldPreserveAspect
        ? widthRatio
        : Math.min(widthRatio, heightRatio);
      const initialFontSize = textEl.fontSize || 32;
      const newFontSize = Math.max(8, Math.min(500, Math.round(initialFontSize * scaleRatio)));
      return {
        ...textEl,
        fontSize: newFontSize,
        transform: updatedTransform,
      };
    }
  }

  return {
    ...element,
    transform: updatedTransform,
  };
}

// ============================================================================
// Element Rotation
// ============================================================================

export interface RotateOptions {
  snapToIncrements?: boolean;
  incrementDegrees?: number;
}

/**
 * Calculates element rotation from center to current cursor point in canvas space.
 * Rotation handle is positioned at 12 o'clock (-90° relative to positive X-axis).
 */
export function calculateRotationAngle(
  centerPoint: CanvasPoint,
  cursorPoint: CanvasPoint,
  options: RotateOptions = {}
): number {
  const dx = cursorPoint.x - centerPoint.x;
  const dy = cursorPoint.y - centerPoint.y;

  // Angle in degrees from positive X axis
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  // Compensate for 12 o'clock handle placement
  angle += 90;

  angle = normalizeAngle(angle);

  if (options.snapToIncrements) {
    angle = snapAngle(angle, options.incrementDegrees || 15);
  }

  return Math.round(angle * 10) / 10;
}

/**
 * Immutably rotates an element to a new angle.
 * If the element is locked or invisible, returns the element unmodified.
 */
export function rotateElement(
  element: MotionElement,
  angleDegrees: number,
  options: RotateOptions = {}
): MotionElement {
  if (element.locked || !element.visible) {
    return element;
  }

  let nextAngle = normalizeAngle(angleDegrees);
  if (options.snapToIncrements) {
    nextAngle = snapAngle(nextAngle, options.incrementDegrees || 15);
  }

  const sanitized = sanitizeTransform(element.transform, {
    rotation: nextAngle,
  });

  return {
    ...element,
    transform: sanitized,
  };
}
