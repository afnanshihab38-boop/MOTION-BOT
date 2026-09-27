/**
 * MOTION-BOT — Editor Architecture & Type System
 * Types for canvas coordinate system, viewport state, selection, tools, and visual editor contracts.
 * Part of Phase 5.1: Editor Architecture & Canvas Foundation.
 */

import { Project, ProjectId } from "./project";
import { Scene, SceneId } from "./scene";
import { MotionElement } from "./element";

export type ElementId = string;

/**
 * Supported active interactive tools in the editor toolbar and canvas.
 */
export type EditorTool =
  | "select"
  | "hand"
  | "text"
  | "shape"
  | "image"
  | "logo";

/**
 * 2D point in virtual project coordinates (0, 0) to (project.width, project.height).
 */
export interface ProjectPoint {
  x: number;
  y: number;
}

/**
 * 2D point representation in canvas space (virtual stage coordinates).
 */
export interface CanvasPoint {
  x: number;
  y: number;
}

/**
 * 2D point representation in screen/DOM viewport space (pixels).
 */
export interface ViewportPoint {
  x: number;
  y: number;
}

/**
 * Alias for ViewportPoint for backwards compatibility.
 */
export type ScreenPoint = ViewportPoint;

/**
 * Transformative resize and rotation handle identifiers.
 */
export type ResizeHandleId =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "rot";

/**
 * Bounding box specification in canvas coordinates.
 */
export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/**
 * Viewport state representing camera pan and zoom relative to canvas stage.
 */
export interface ViewportState {
  /** Zoom scale multiplier (1.0 = 100%, 0.5 = 50%, 2.0 = 200%) */
  zoom: number;
  /** Horizontal pan offset in screen pixels */
  panX: number;
  /** Vertical pan offset in screen pixels */
  panY: number;
  /** Actual width of the viewport container element */
  containerWidth: number;
  /** Actual height of the viewport container element */
  containerHeight: number;
}

/**
 * Selection state tracking active elements and interaction states.
 */
export interface EditorSelectionState {
  /** Currently selected element IDs */
  selectedIds: ElementId[];
  /** Element ID currently hovered by cursor (if any) */
  hoveredId: ElementId | null;
  /** ID of the currently active scene being rendered/edited */
  activeSceneId: SceneId;
}

/**
 * Comprehensive transient editor state.
 * Strictly decoupled from persistent Project data models.
 */
export interface EditorState {
  /** Active project instance loaded in the editor */
  project: Project;
  /** Active scene identifier */
  activeSceneId: SceneId;
  /** Currently active tool */
  activeTool: EditorTool;
  /** Viewport pan and zoom state */
  viewport: ViewportState;
  /** Selected element IDs */
  selectedElementIds: ElementId[];
  /** Hovered element ID */
  hoveredElementId: ElementId | null;
  /** Dragging / interaction flags */
  isDragging: boolean;
  isPanning: boolean;
  dragStart: CanvasPoint | null;
  /** Canvas display helpers */
  snapToGrid: boolean;
  gridSize: number;
  showGuides: boolean;
  showTitleSafe: boolean;
}

/**
 * Zoom presets supported by the viewport controls.
 */
export type ZoomPreset = "25%" | "50%" | "75%" | "100%" | "150%" | "200%" | "fit";
