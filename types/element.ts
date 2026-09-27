/**
 * MOTION-BOT — Element Data Architecture
 * Discriminated union and extensible type definitions for all canvas and motion elements.
 * Part of Phase 3.1: Data Architecture & Type System.
 */

import { PresetAnimation, PropertyAnimationTrack } from "./animation";

/**
 * 2D point coordinate.
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * 2D spatial dimensions.
 */
export interface Size2D {
  width: number;
  height: number;
}

/**
 * 2D spatial transform specification for elements on the canvas.
 */
export interface Transform2D {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in degrees
  scaleX: number;
  scaleY: number;
  anchorX: number; // 0 to 1, default 0.5 (center)
  anchorY: number; // 0 to 1, default 0.5 (center)
}

/**
 * Layer compositing blend modes.
 */
export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion";

/**
 * Color stop for gradient fills.
 */
export interface ColorStop {
  offset: number; // 0 to 1
  color: string; // hex, rgb, rgba
}

/**
 * Gradient definition.
 */
export interface GradientFill {
  type: "linear" | "radial";
  angle?: number; // degrees for linear
  stops: ColorStop[];
}

/**
 * Fill styling: solid, gradient, or transparent.
 */
export interface FillStyle {
  type: "solid" | "linear-gradient" | "radial-gradient" | "none";
  color?: string;
  gradient?: GradientFill;
}

/**
 * Stroke / outline styling.
 */
export interface StrokeStyle {
  color: string;
  width: number;
  dashArray?: number[];
  lineCap?: "butt" | "round" | "square";
  lineJoin?: "miter" | "round" | "bevel";
  position?: "inside" | "center" | "outside";
}

/**
 * Drop shadow / box shadow styling.
 */
export interface ShadowStyle {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
  spread?: number;
}

/**
 * General visual appearance tokens for an element.
 */
export interface ElementAppearance {
  opacity: number; // 0 to 1
  blendMode: BlendMode;
  fill: FillStyle;
  stroke?: StrokeStyle;
  shadow?: ShadowStyle;
  blurRadius?: number;
  brightness?: number; // 0 to 2, 1 is normal
  contrast?: number; // 0 to 2, 1 is normal
  saturation?: number; // 0 to 2, 1 is normal
}

/**
 * Discriminated element type discriminator.
 */
export type ElementType =
  | "text"
  | "image"
  | "shape"
  | "logo"
  | "video"
  | "audio"
  | "group";

/**
 * Base interface shared by all element types.
 */
export interface BaseElement {
  id: string;
  name: string;
  type: ElementType;
  visible: boolean;
  locked: boolean;
  transform: Transform2D;
  appearance: ElementAppearance;
  startFrame: number;
  durationFrames: number;
  zIndex: number;
  animations: PresetAnimation[];
  propertyTracks: PropertyAnimationTrack[];
  metadata?: Record<string, unknown>;
}

/**
 * Text Element — rich kinetic typography on the canvas.
 */
export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  content?: string; // Content alias for text
  fontFamily: string;
  fontSize: number;
  fontWeight: number | string;
  fontStyle?: "normal" | "italic";
  letterSpacing: number;
  lineHeight: number;
  textAlign: "left" | "center" | "right" | "justify";
  alignment?: "left" | "center" | "right" | "justify"; // Alignment alias for textAlign
  color?: string; // Direct text color property (maps to appearance.fill.color)
  verticalAlign: "top" | "middle" | "bottom";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  autoResize?: boolean;
}

/**
 * Image Element — raster or vector image display referencing an Asset.
 */
export interface ImageElement extends BaseElement {
  type: "image";
  assetId: string; // Required reference to project Asset
  src?: string; // Resolved asset URL
  aspectRatio?: number;
  objectFit?: "contain" | "cover" | "fill" | "none";
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  cornerRadius?: number | [number, number, number, number];
}

/**
 * Geometric shape variations.
 */
export type ShapeKind =
  | "rectangle"
  | "ellipse"
  | "circle"
  | "polygon"
  | "star"
  | "line"
  | "arrow"
  | "path";

/**
 * Shape Element — procedural geometric primitives and vector paths.
 */
export interface ShapeElement extends BaseElement {
  type: "shape";
  shapeKind: ShapeKind;
  cornerRadius?: number | [number, number, number, number];
  pointsCount?: number; // polygon / star vertex count
  innerRadiusRatio?: number; // star inner radius ratio (0 to 1)
  pathData?: string; // SVG path d attribute
}

/**
 * Logo Element — brand-aligned vector/raster logo mark referencing an Asset.
 */
export interface LogoElement extends BaseElement {
  type: "logo";
  assetId: string; // Required reference to project Asset
  src?: string;
  brandKitId?: string;
  variant?: "monochrome" | "full-color" | "mark" | "wordmark";
  colorTint?: string;
  cornerRadius?: number;
}

/**
 * Video Element — video clip on the canvas (data contract).
 */
export interface VideoElement extends BaseElement {
  type: "video";
  assetId: string; // Required reference to project Asset
  src?: string;
  mediaStartFrame: number;
  volume: number; // 0 to 1
  playbackRate: number;
  muted: boolean;
  loop: boolean;
  cornerRadius?: number;
}

/**
 * Audio Element — background music, voiceover, or sound effect (data contract).
 */
export interface AudioElement extends BaseElement {
  type: "audio";
  assetId: string; // Required reference to project Asset
  src?: string;
  mediaStartFrame: number;
  volume: number; // 0 to 1
  playbackRate: number;
  muted: boolean;
  loop: boolean;
  fadeInFrames?: number;
  fadeOutFrames?: number;
}

/**
 * Group Element — container grouping multiple child elements.
 */
export interface GroupElement extends BaseElement {
  type: "group";
  childrenIds: string[];
  clipChildren?: boolean;
}

/**
 * Discriminated union of all element types supported by MOTION-BOT.
 */
export type MotionElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | LogoElement
  | VideoElement
  | AudioElement
  | GroupElement;
