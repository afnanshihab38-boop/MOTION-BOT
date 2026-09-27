/**
 * MOTION-BOT — Element Editing & Mutation Service
 * Pure functions for modifying Text, Shape, and Image visual elements.
 * Enforces strong validation, protects locked elements, preserves element IDs and ordering,
 * and guarantees that invalid inputs cannot corrupt the Project object.
 * Part of Phase 5.4: Basic Editing of Visual Elements.
 */

import {
  MotionElement,
  TextElement,
  ShapeElement,
  ImageElement,
  ShapeKind,
  ElementAppearance,
  FillStyle,
  StrokeStyle,
  Transform2D,
} from "@/types/element";
import { sanitizeTransform, MIN_ELEMENT_DIMENSION } from "./element-manipulation";

// ============================================================================
// Supported Options & Constants
// ============================================================================

export const SUPPORTED_FONT_FAMILIES = [
  "Inter, sans-serif",
  "Roboto, sans-serif",
  "Outfit, sans-serif",
  "Space Grotesk, sans-serif",
  "Playfair Display, serif",
  "JetBrains Mono, monospace",
] as const;

export const SUPPORTED_SHAPE_KINDS: readonly ShapeKind[] = [
  "rectangle",
  "ellipse",
  "circle",
  "polygon",
  "star",
  "line",
  "arrow",
  "path",
] as const;

export const SUPPORTED_TEXT_ALIGNS = ["left", "center", "right", "justify"] as const;

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates text-specific property updates.
 */
export function validateTextProperties(updates: Partial<TextElement>): ValidationResult {
  if (updates.fontSize !== undefined) {
    if (typeof updates.fontSize !== "number" || !Number.isFinite(updates.fontSize) || updates.fontSize <= 0) {
      return { valid: false, error: "fontSize must be a positive finite number" };
    }
  }

  if (updates.lineHeight !== undefined) {
    if (typeof updates.lineHeight !== "number" || !Number.isFinite(updates.lineHeight) || updates.lineHeight <= 0) {
      return { valid: false, error: "lineHeight must be a positive finite number" };
    }
  }

  if (updates.letterSpacing !== undefined) {
    if (typeof updates.letterSpacing !== "number" || !Number.isFinite(updates.letterSpacing)) {
      return { valid: false, error: "letterSpacing must be a finite number" };
    }
  }

  if (updates.textAlign !== undefined) {
    if (!SUPPORTED_TEXT_ALIGNS.includes(updates.textAlign)) {
      return { valid: false, error: `Invalid textAlign: ${updates.textAlign}` };
    }
  }

  if (updates.alignment !== undefined) {
    if (!SUPPORTED_TEXT_ALIGNS.includes(updates.alignment)) {
      return { valid: false, error: `Invalid alignment: ${updates.alignment}` };
    }
  }

  if (updates.text !== undefined && typeof updates.text !== "string") {
    return { valid: false, error: "text content must be a string" };
  }

  if (updates.content !== undefined && typeof updates.content !== "string") {
    return { valid: false, error: "content must be a string" };
  }

  return { valid: true };
}

/**
 * Validates shape-specific property updates.
 */
export function validateShapeProperties(updates: Partial<ShapeElement>): ValidationResult {
  if (updates.shapeKind !== undefined) {
    if (!SUPPORTED_SHAPE_KINDS.includes(updates.shapeKind)) {
      return { valid: false, error: `Invalid shapeKind: ${updates.shapeKind}` };
    }
  }

  if (updates.pointsCount !== undefined) {
    if (typeof updates.pointsCount !== "number" || !Number.isInteger(updates.pointsCount) || updates.pointsCount < 3) {
      return { valid: false, error: "pointsCount must be an integer >= 3" };
    }
  }

  if (updates.innerRadiusRatio !== undefined) {
    if (
      typeof updates.innerRadiusRatio !== "number" ||
      !Number.isFinite(updates.innerRadiusRatio) ||
      updates.innerRadiusRatio < 0 ||
      updates.innerRadiusRatio > 1
    ) {
      return { valid: false, error: "innerRadiusRatio must be a number between 0 and 1" };
    }
  }

  return { valid: true };
}

/**
 * Validates image-specific property updates.
 */
export function validateImageProperties(updates: Partial<ImageElement>): ValidationResult {
  if (updates.assetId !== undefined && typeof updates.assetId !== "string") {
    return { valid: false, error: "assetId must be a string" };
  }

  if (updates.src !== undefined && typeof updates.src !== "string") {
    return { valid: false, error: "src must be a string" };
  }

  if (updates.objectFit !== undefined) {
    const validFits = ["contain", "cover", "fill", "none"];
    if (!validFits.includes(updates.objectFit)) {
      return { valid: false, error: `Invalid objectFit: ${updates.objectFit}` };
    }
  }

  return { valid: true };
}

/**
 * Validates appearance property updates.
 */
export function validateAppearance(updates: Partial<ElementAppearance>): ValidationResult {
  if (updates.opacity !== undefined) {
    if (typeof updates.opacity !== "number" || !Number.isFinite(updates.opacity) || updates.opacity < 0 || updates.opacity > 1) {
      return { valid: false, error: "opacity must be a number between 0 and 1" };
    }
  }

  if (updates.stroke !== undefined) {
    if (typeof updates.stroke.width !== "number" || !Number.isFinite(updates.stroke.width) || updates.stroke.width < 0) {
      return { valid: false, error: "stroke.width must be a non-negative number" };
    }
  }

  return { valid: true };
}

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Sanitizes appearance updates ensuring opacity is strictly in [0, 1] and fills/strokes are safe.
 */
export function sanitizeAppearance(
  current: ElementAppearance,
  updates?: Partial<ElementAppearance>
): ElementAppearance {
  if (!updates) return current;

  let nextOpacity = current.opacity;
  if (typeof updates.opacity === "number" && Number.isFinite(updates.opacity)) {
    nextOpacity = Math.min(Math.max(updates.opacity, 0), 1);
  }

  let nextFill: FillStyle = current.fill;
  if (updates.fill) {
    if (typeof updates.fill === "string") {
      nextFill = { type: "solid", color: updates.fill };
    } else {
      nextFill = {
        ...current.fill,
        ...updates.fill,
      };
    }
  }

  let nextStroke: StrokeStyle | undefined = current.stroke;
  if (updates.stroke !== undefined) {
    if (updates.stroke === null) {
      nextStroke = undefined;
    } else {
      nextStroke = {
        color: typeof updates.stroke.color === "string" ? updates.stroke.color : current.stroke?.color || "#FFFFFF",
        width: typeof updates.stroke.width === "number" && Number.isFinite(updates.stroke.width) && updates.stroke.width >= 0
          ? updates.stroke.width
          : current.stroke?.width || 0,
        dashArray: Array.isArray(updates.stroke.dashArray) ? updates.stroke.dashArray : current.stroke?.dashArray,
      };
    }
  }

  return {
    ...current,
    ...updates,
    opacity: Math.round(nextOpacity * 100) / 100,
    fill: nextFill,
    stroke: nextStroke,
    blendMode: updates.blendMode || current.blendMode || "normal",
  };
}

// ============================================================================
// Element Editing Functions (Text, Shape, Image, Generic)
// ============================================================================

/**
 * Edits a TextElement immutably.
 * Rejects modifications if the element is locked.
 * Preserves element ID, zIndex, and structural invariants.
 */
export function editTextElement(
  element: TextElement,
  updates: Partial<TextElement>
): TextElement {
  if (element.locked) {
    return element;
  }

  // Validate updates
  const textValidation = validateTextProperties(updates);
  if (!textValidation.valid) {
    console.warn(`[editTextElement] Invalid text update: ${textValidation.error}`);
    return element;
  }

  if (updates.appearance) {
    const appValidation = validateAppearance(updates.appearance);
    if (!appValidation.valid) {
      console.warn(`[editTextElement] Invalid appearance update: ${appValidation.error}`);
      return element;
    }
  }

  // Resolve text content
  const nextText = updates.text ?? updates.content ?? element.text;
  const nextFontSize = typeof updates.fontSize === "number" && Number.isFinite(updates.fontSize) && updates.fontSize > 0
    ? updates.fontSize
    : element.fontSize;
  const nextLineHeight = typeof updates.lineHeight === "number" && Number.isFinite(updates.lineHeight) && updates.lineHeight > 0
    ? updates.lineHeight
    : element.lineHeight;
  const nextLetterSpacing = typeof updates.letterSpacing === "number" && Number.isFinite(updates.letterSpacing)
    ? updates.letterSpacing
    : element.letterSpacing;
  const nextAlign = updates.textAlign ?? updates.alignment ?? element.textAlign;

  // Resolve typography color sync with appearance.fill
  let nextAppearance = sanitizeAppearance(element.appearance, updates.appearance);
  let nextColor = updates.color ?? element.color;

  if (updates.color) {
    nextColor = updates.color;
    nextAppearance = {
      ...nextAppearance,
      fill: { type: "solid", color: updates.color },
    };
  }

  // Transform update with sanitization
  const nextTransform = updates.transform
    ? sanitizeTransform(element.transform, updates.transform)
    : element.transform;

  return {
    ...element,
    text: nextText,
    content: nextText,
    fontFamily: updates.fontFamily ?? element.fontFamily,
    fontSize: nextFontSize,
    fontWeight: updates.fontWeight ?? element.fontWeight,
    fontStyle: updates.fontStyle ?? element.fontStyle,
    lineHeight: nextLineHeight,
    letterSpacing: nextLetterSpacing,
    textAlign: nextAlign,
    alignment: nextAlign,
    color: nextColor,
    verticalAlign: updates.verticalAlign ?? element.verticalAlign,
    textTransform: updates.textTransform ?? element.textTransform,
    transform: nextTransform,
    appearance: nextAppearance,
    name: updates.name ?? element.name,
    visible: updates.visible ?? element.visible,
    // ID and type must be preserved
    id: element.id,
    type: "text",
  };
}

/**
 * Edits a ShapeElement immutably.
 * Rejects modifications if the element is locked.
 * Preserves element ID, zIndex, and structural invariants.
 */
export function editShapeElement(
  element: ShapeElement,
  updates: Partial<ShapeElement>
): ShapeElement {
  if (element.locked) {
    return element;
  }

  // Validate updates
  const shapeValidation = validateShapeProperties(updates);
  if (!shapeValidation.valid) {
    console.warn(`[editShapeElement] Invalid shape update: ${shapeValidation.error}`);
    return element;
  }

  if (updates.appearance) {
    const appValidation = validateAppearance(updates.appearance);
    if (!appValidation.valid) {
      console.warn(`[editShapeElement] Invalid appearance update: ${appValidation.error}`);
      return element;
    }
  }

  const nextKind = updates.shapeKind && SUPPORTED_SHAPE_KINDS.includes(updates.shapeKind)
    ? updates.shapeKind
    : element.shapeKind;

  const nextTransform = updates.transform
    ? sanitizeTransform(element.transform, updates.transform)
    : element.transform;

  const nextAppearance = sanitizeAppearance(element.appearance, updates.appearance);

  let nextCornerRadius = element.cornerRadius;
  if (updates.cornerRadius !== undefined) {
    if (typeof updates.cornerRadius === "number" && Number.isFinite(updates.cornerRadius) && updates.cornerRadius >= 0) {
      nextCornerRadius = updates.cornerRadius;
    } else if (Array.isArray(updates.cornerRadius)) {
      nextCornerRadius = updates.cornerRadius;
    }
  }

  return {
    ...element,
    shapeKind: nextKind,
    cornerRadius: nextCornerRadius,
    pointsCount: updates.pointsCount ?? element.pointsCount,
    innerRadiusRatio: updates.innerRadiusRatio ?? element.innerRadiusRatio,
    pathData: updates.pathData ?? element.pathData,
    transform: nextTransform,
    appearance: nextAppearance,
    name: updates.name ?? element.name,
    visible: updates.visible ?? element.visible,
    // ID and type must be preserved
    id: element.id,
    type: "shape",
  };
}

/**
 * Edits an ImageElement immutably.
 * Rejects modifications if the element is locked.
 * Preserves element ID, zIndex, and structural invariants.
 */
export function editImageElement(
  element: ImageElement,
  updates: Partial<ImageElement>
): ImageElement {
  if (element.locked) {
    return element;
  }

  // Validate updates
  const imageValidation = validateImageProperties(updates);
  if (!imageValidation.valid) {
    console.warn(`[editImageElement] Invalid image update: ${imageValidation.error}`);
    return element;
  }

  if (updates.appearance) {
    const appValidation = validateAppearance(updates.appearance);
    if (!appValidation.valid) {
      console.warn(`[editImageElement] Invalid appearance update: ${appValidation.error}`);
      return element;
    }
  }

  const nextTransform = updates.transform
    ? sanitizeTransform(element.transform, updates.transform)
    : element.transform;

  const nextAppearance = sanitizeAppearance(element.appearance, updates.appearance);

  return {
    ...element,
    assetId: updates.assetId ?? element.assetId,
    src: updates.src ?? element.src,
    objectFit: updates.objectFit ?? element.objectFit,
    cornerRadius: updates.cornerRadius ?? element.cornerRadius,
    transform: nextTransform,
    appearance: nextAppearance,
    name: updates.name ?? element.name,
    visible: updates.visible ?? element.visible,
    // ID and type must be preserved
    id: element.id,
    type: "image",
  };
}

/**
 * Generic dispatcher for editing any visual MotionElement safely.
 * Dispatches to specialized type-safe editors for text, shape, image.
 */
export function editVisualElement(
  element: MotionElement,
  updates: Partial<MotionElement>
): MotionElement {
  if (element.locked) {
    return element;
  }

  switch (element.type) {
    case "text":
      return editTextElement(element as TextElement, updates as Partial<TextElement>);
    case "shape":
      return editShapeElement(element as ShapeElement, updates as Partial<ShapeElement>);
    case "image":
      return editImageElement(element as ImageElement, updates as Partial<ImageElement>);
    default: {
      const nextTransform = updates.transform
        ? sanitizeTransform(element.transform, updates.transform)
        : element.transform;
      const nextAppearance = sanitizeAppearance(element.appearance, updates.appearance);
      return {
        ...element,
        ...updates,
        transform: nextTransform,
        appearance: nextAppearance,
        id: element.id,
        type: element.type,
      } as MotionElement;
    }
  }
}
