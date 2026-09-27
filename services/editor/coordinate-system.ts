import {
  CanvasPoint,
  ElementBounds,
  ProjectPoint,
  ScreenPoint,
  ViewportPoint,
  ViewportState,
} from "@/types/editor";
import { MotionElement } from "@/types/element";

export const MIN_ZOOM = 0.1; // 10%
export const MAX_ZOOM = 5.0; // 500%
export const DEFAULT_GRID_SIZE = 10; // 10px

/**
 * Clamps zoom multiplier within safe architectural bounds.
 */
export function clampZoom(zoom: number): number {
  if (isNaN(zoom) || !Number.isFinite(zoom)) return 1.0;
  return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
}

/**
 * Calculates the optimal zoom multiplier and centering pan offsets
 * to fit the canvas project dimensions within the container viewport.
 */
export function calculateFitZoom(
  canvasWidth: number,
  canvasHeight: number,
  containerWidth: number,
  containerHeight: number,
  padding = 40
): { zoom: number; panX: number; panY: number } {
  if (containerWidth <= 0 || containerHeight <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
    return { zoom: 1.0, panX: 0, panY: 0 };
  }

  const availableWidth = Math.max(containerWidth - padding * 2, 100);
  const availableHeight = Math.max(containerHeight - padding * 2, 100);

  const scaleX = availableWidth / canvasWidth;
  const scaleY = availableHeight / canvasHeight;
  const fitScale = Math.min(scaleX, scaleY);
  const zoom = clampZoom(fitScale);

  // Center canvas inside container
  const scaledWidth = canvasWidth * zoom;
  const scaledHeight = canvasHeight * zoom;
  const panX = Math.round((containerWidth - scaledWidth) / 2);
  const panY = Math.round((containerHeight - scaledHeight) / 2);

  return { zoom, panX, panY };
}

// ============================================================================
// Coordinate Mapping Architecture: Project ↔ Canvas ↔ Viewport
// ============================================================================

/**
 * Maps project virtual coordinates to canvas stage coordinates (1:1 spatial mapping).
 */
export function projectToCanvas(point: ProjectPoint): CanvasPoint {
  return {
    x: point.x,
    y: point.y,
  };
}

/**
 * Maps canvas stage coordinates to project virtual coordinates (1:1 spatial mapping).
 */
export function canvasToProject(point: CanvasPoint): ProjectPoint {
  return {
    x: point.x,
    y: point.y,
  };
}

/**
 * Transforms a canvas point into viewport/screen pixel coordinates.
 */
export function canvasToViewport(
  canvasPoint: CanvasPoint,
  viewport?: ViewportState
): ViewportPoint {
  const zoom = viewport?.zoom || 1.0;
  const panX = viewport?.panX || 0;
  const panY = viewport?.panY || 0;
  return {
    x: canvasPoint.x * zoom + panX,
    y: canvasPoint.y * zoom + panY,
  };
}

/**
 * Transforms a viewport/screen pixel coordinate into canvas space.
 */
export function viewportToCanvas(
  viewportPoint: ViewportPoint,
  viewport?: ViewportState
): CanvasPoint {
  const zoom = viewport?.zoom || 1.0;
  const panX = viewport?.panX || 0;
  const panY = viewport?.panY || 0;
  return {
    x: (viewportPoint.x - panX) / zoom,
    y: (viewportPoint.y - panY) / zoom,
  };
}

/**
 * Transforms project virtual coordinates directly to viewport pixel coordinates.
 */
export function projectToViewport(
  projectPoint: ProjectPoint,
  viewport?: ViewportState
): ViewportPoint {
  return canvasToViewport(projectToCanvas(projectPoint), viewport);
}

/**
 * Transforms viewport pixel coordinates directly to project virtual coordinates.
 */
export function viewportToProject(
  viewportPoint: ViewportPoint,
  viewport?: ViewportState
): ProjectPoint {
  return canvasToProject(viewportToCanvas(viewportPoint, viewport));
}

/**
 * Transforms an element bounding box from project/canvas coordinates to viewport pixels.
 */
export function projectBoundsToViewport(
  bounds: ElementBounds,
  viewport?: ViewportState
): ElementBounds {
  const zoom = viewport?.zoom || 1.0;
  const panX = viewport?.panX || 0;
  const panY = viewport?.panY || 0;
  return {
    x: bounds.x * zoom + panX,
    y: bounds.y * zoom + panY,
    width: bounds.width * zoom,
    height: bounds.height * zoom,
    rotation: bounds.rotation,
  };
}

/**
 * Transforms an element bounding box from viewport pixels to project/canvas coordinates.
 */
export function viewportBoundsToProject(
  bounds: ElementBounds,
  viewport?: ViewportState
): ElementBounds {
  const zoom = viewport?.zoom || 1.0;
  const panX = viewport?.panX || 0;
  const panY = viewport?.panY || 0;
  return {
    x: (bounds.x - panX) / zoom,
    y: (bounds.y - panY) / zoom,
    width: bounds.width / zoom,
    height: bounds.height / zoom,
    rotation: bounds.rotation,
  };
}

/**
 * Aliases for backwards compatibility with Phase 5.1 callers.
 */
export const screenToCanvas = viewportToCanvas;
export const canvasToScreen = canvasToViewport;

/**
 * Extracts normalized axis-aligned bounding box for a motion element.
 */
export function calculateElementBounds(element: MotionElement): ElementBounds {
  const { x, y, width, height, rotation, anchorX = 0, anchorY = 0 } = element.transform;

  // Calculate top-left based on anchor point
  const actualX = x - width * anchorX;
  const actualY = y - height * anchorY;

  return {
    x: actualX,
    y: actualY,
    width,
    height,
    rotation: rotation || 0,
  };
}

/**
 * Hit test determining whether a point in canvas space falls inside an element's bounding box.
 * Accounts for rotation if specified.
 */
export function isPointInBounds(point: CanvasPoint, bounds: ElementBounds): boolean {
  if (bounds.rotation === 0) {
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }

  // Rotate point into local element coordinate space
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const rad = (-bounds.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx = point.x - centerX;
  const dy = point.y - centerY;

  const localX = cos * dx - sin * dy + bounds.width / 2;
  const localY = sin * dx + cos * dy + bounds.height / 2;

  return (
    localX >= 0 &&
    localX <= bounds.width &&
    localY >= 0 &&
    localY <= bounds.height
  );
}

/**
 * Snaps a coordinate value to the nearest grid increment.
 */
export function snapToGrid(value: number, gridSize = DEFAULT_GRID_SIZE): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}
