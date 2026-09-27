/**
 * MOTION-BOT — Concrete Element Model Implementation
 * Pure factory, validation, and immutable state functions for all Motion Elements.
 * Part of Phase 3.3: Element & Asset Model.
 */

import {
  MotionElement,
  BaseElement,
  TextElement,
  ImageElement,
  ShapeElement,
  ShapeKind,
  LogoElement,
  VideoElement,
  AudioElement,
  GroupElement,
  Transform2D,
  ElementAppearance,
} from "@/types/element";

/**
 * Default spatial transform applied to newly created elements.
 */
export const DEFAULT_TRANSFORM: Transform2D = {
  x: 0,
  y: 0,
  width: 200,
  height: 200,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  anchorX: 0.5,
  anchorY: 0.5,
};

/**
 * Default visual appearance applied to newly created elements.
 */
export const DEFAULT_APPEARANCE: ElementAppearance = {
  opacity: 1,
  blendMode: "normal",
  fill: { type: "solid", color: "#FFFFFF" },
};

/**
 * Generates a unique element identifier with optional type prefix.
 */
export function generateElementId(prefix = "el"): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Common base initializer ensuring all common element properties are consistent.
 */
function createBaseElement(
  type: MotionElement["type"],
  input: Partial<BaseElement> = {}
): BaseElement {
  return {
    id: input.id || generateElementId(type),
    name: input.name || `${type.charAt(0).toUpperCase() + type.slice(1)} Layer`,
    type,
    visible: input.visible !== undefined ? input.visible : true,
    locked: input.locked !== undefined ? input.locked : false,
    zIndex: typeof input.zIndex === "number" ? input.zIndex : 0,
    startFrame: typeof input.startFrame === "number" ? input.startFrame : 0,
    durationFrames: typeof input.durationFrames === "number" ? input.durationFrames : 90,
    transform: {
      ...DEFAULT_TRANSFORM,
      ...input.transform,
    },
    appearance: {
      ...DEFAULT_APPEARANCE,
      ...input.appearance,
    },
    animations: input.animations ? [...input.animations] : [],
    propertyTracks: input.propertyTracks ? [...input.propertyTracks] : [],
    metadata: input.metadata ? { ...input.metadata } : {},
  };
}

/**
 * Factory to construct a concrete TextElement with kinetic typography properties.
 */
export function createTextElement(
  input: Partial<TextElement> & { text?: string; content?: string } = {}
): TextElement {
  const base = createBaseElement("text", input);
  const textContent = input.content || input.text || "Heading Text";

  const color = input.color || (base.appearance.fill.type === "solid" ? base.appearance.fill.color : "#FFFFFF");
  const alignment = input.alignment || input.textAlign || "left";

  return {
    ...base,
    type: "text",
    name: input.name || "Text Layer",
    text: textContent,
    content: textContent,
    fontFamily: input.fontFamily || "Inter",
    fontSize: typeof input.fontSize === "number" ? input.fontSize : 48,
    fontWeight: input.fontWeight !== undefined ? input.fontWeight : 600,
    fontStyle: input.fontStyle || "normal",
    letterSpacing: typeof input.letterSpacing === "number" ? input.letterSpacing : 0,
    lineHeight: typeof input.lineHeight === "number" ? input.lineHeight : 1.2,
    textAlign: alignment,
    alignment,
    color,
    verticalAlign: input.verticalAlign || "top",
    textTransform: input.textTransform || "none",
    autoResize: input.autoResize !== undefined ? input.autoResize : true,
    transform: {
      ...base.transform,
      width: input.transform?.width || 400,
      height: input.transform?.height || 80,
    },
    appearance: {
      ...base.appearance,
      fill: {
        type: "solid",
        color,
      },
    },
  };
}

/**
 * Factory to construct an ImageElement referencing an Asset.
 */
export function createImageElement(
  input: Partial<ImageElement> & { assetId: string }
): ImageElement {
  if (!input.assetId) {
    throw new Error("ImageElement requires an assetId reference");
  }

  const base = createBaseElement("image", input);

  return {
    ...base,
    type: "image",
    name: input.name || "Image Layer",
    assetId: input.assetId,
    src: input.src,
    aspectRatio: input.aspectRatio || 1,
    objectFit: input.objectFit || "cover",
    crop: input.crop,
    cornerRadius: input.cornerRadius,
  };
}

/**
 * Factory to construct a procedural ShapeElement.
 */
export function createShapeElement(
  input: Partial<ShapeElement> & { shapeKind?: ShapeKind } = {}
): ShapeElement {
  const base = createBaseElement("shape", input);
  const shapeKind: ShapeKind = input.shapeKind || "rectangle";

  return {
    ...base,
    type: "shape",
    name: input.name || `${shapeKind.charAt(0).toUpperCase() + shapeKind.slice(1)} Shape`,
    shapeKind,
    cornerRadius: input.cornerRadius,
    pointsCount: input.pointsCount,
    innerRadiusRatio: input.innerRadiusRatio,
    pathData: input.pathData,
  };
}

/**
 * Factory to construct a LogoElement referencing an Asset.
 */
export function createLogoElement(
  input: Partial<LogoElement> & { assetId: string }
): LogoElement {
  if (!input.assetId) {
    throw new Error("LogoElement requires an assetId reference");
  }

  const base = createBaseElement("logo", input);

  return {
    ...base,
    type: "logo",
    name: input.name || "Brand Logo",
    assetId: input.assetId,
    src: input.src,
    brandKitId: input.brandKitId,
    variant: input.variant || "full-color",
    colorTint: input.colorTint,
    cornerRadius: input.cornerRadius,
    transform: {
      ...base.transform,
      width: input.transform?.width || 160,
      height: input.transform?.height || 160,
    },
  };
}

/**
 * Factory to construct a VideoElement referencing an Asset (data contract).
 */
export function createVideoElement(
  input: Partial<VideoElement> & { assetId: string }
): VideoElement {
  if (!input.assetId) {
    throw new Error("VideoElement requires an assetId reference");
  }

  const base = createBaseElement("video", input);

  return {
    ...base,
    type: "video",
    name: input.name || "Video Layer",
    assetId: input.assetId,
    src: input.src,
    mediaStartFrame: typeof input.mediaStartFrame === "number" ? input.mediaStartFrame : 0,
    volume: typeof input.volume === "number" ? input.volume : 1,
    playbackRate: typeof input.playbackRate === "number" ? input.playbackRate : 1,
    muted: input.muted !== undefined ? input.muted : false,
    loop: input.loop !== undefined ? input.loop : false,
    cornerRadius: input.cornerRadius,
  };
}

/**
 * Factory to construct an AudioElement referencing an Asset (data contract).
 */
export function createAudioElement(
  input: Partial<AudioElement> & { assetId: string }
): AudioElement {
  if (!input.assetId) {
    throw new Error("AudioElement requires an assetId reference");
  }

  const base = createBaseElement("audio", input);

  return {
    ...base,
    type: "audio",
    name: input.name || "Audio Track",
    assetId: input.assetId,
    src: input.src,
    mediaStartFrame: typeof input.mediaStartFrame === "number" ? input.mediaStartFrame : 0,
    volume: typeof input.volume === "number" ? input.volume : 1,
    playbackRate: typeof input.playbackRate === "number" ? input.playbackRate : 1,
    muted: input.muted !== undefined ? input.muted : false,
    loop: input.loop !== undefined ? input.loop : false,
    fadeInFrames: input.fadeInFrames,
    fadeOutFrames: input.fadeOutFrames,
  };
}

/**
 * Factory to construct a GroupElement container.
 */
export function createGroupElement(
  input: Partial<GroupElement> & { childrenIds?: string[] } = {}
): GroupElement {
  const base = createBaseElement("group", input);

  return {
    ...base,
    type: "group",
    name: input.name || "Group",
    childrenIds: input.childrenIds ? [...input.childrenIds] : [],
    clipChildren: input.clipChildren !== undefined ? input.clipChildren : false,
  };
}

/**
 * Checks whether an element is an asset-referencing media element.
 */
export function isMediaElement(
  element: MotionElement
): element is ImageElement | LogoElement | VideoElement | AudioElement {
  return "assetId" in element && typeof element.assetId === "string";
}

/**
 * Extracts the referenced assetId from an element if applicable.
 */
export function getElementAssetId(element: MotionElement): string | undefined {
  if (isMediaElement(element)) {
    return element.assetId;
  }
  return undefined;
}

/**
 * Calculates the bounding box coordinates of an element on the canvas.
 */
export function getElementBounds(element: MotionElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const { x, y, width, height, scaleX, scaleY } = element.transform;
  return {
    x,
    y,
    width: width * scaleX,
    height: height * scaleY,
  };
}

/**
 * Validates any motion element against its structural contract.
 */
export function validateElement(element: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!element || typeof element !== "object") {
    return { valid: false, errors: ["Element must be a non-null object"] };
  }

  const el = element as Partial<MotionElement>;

  if (!el.id || typeof el.id !== "string") {
    errors.push("Element requires a valid string id");
  }

  const validTypes = ["text", "image", "shape", "logo", "video", "audio", "group"];
  if (!el.type || !validTypes.includes(el.type)) {
    errors.push(`Element type must be one of: ${validTypes.join(", ")}`);
  }

  if (!el.transform || typeof el.transform !== "object") {
    errors.push("Element requires a transform object");
  } else {
    const t = el.transform;
    if (typeof t.x !== "number" || typeof t.y !== "number") errors.push("Transform requires numeric x and y");
    if (typeof t.width !== "number" || t.width < 0) errors.push("Transform requires positive numeric width");
    if (typeof t.height !== "number" || t.height < 0) errors.push("Transform requires positive numeric height");
    if (typeof t.rotation !== "number") errors.push("Transform requires numeric rotation");
    if (typeof t.scaleX !== "number" || typeof t.scaleY !== "number") errors.push("Transform requires numeric scaleX and scaleY");
  }

  if (!el.appearance || typeof el.appearance !== "object") {
    errors.push("Element requires an appearance object");
  }

  // Type-specific validation
  if (el.type === "text") {
    const textEl = el as Partial<TextElement>;
    if (typeof textEl.text !== "string" && typeof textEl.content !== "string") {
      errors.push("TextElement requires text or content string");
    }
  }

  if (el.type === "image" || el.type === "logo" || el.type === "video" || el.type === "audio") {
    const mediaEl = el as { assetId?: unknown };
    if (!mediaEl.assetId || typeof mediaEl.assetId !== "string") {
      errors.push(`${el.type} requires a valid assetId reference`);
    }
  }

  if (el.type === "group") {
    const groupEl = el as Partial<GroupElement>;
    if (!Array.isArray(groupEl.childrenIds)) {
      errors.push("GroupElement requires an array of childrenIds");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// -----------------------------------------------------------------------------
// IMMUTABLE ELEMENT MUTATORS
// -----------------------------------------------------------------------------

/**
 * Immutably updates the transform properties of an element.
 */
export function updateElementTransform<T extends MotionElement>(
  element: T,
  transformUpdates: Partial<Transform2D>
): T {
  return {
    ...element,
    transform: {
      ...element.transform,
      ...transformUpdates,
    },
  };
}

/**
 * Immutably updates the appearance properties of an element.
 */
export function updateElementAppearance<T extends MotionElement>(
  element: T,
  appearanceUpdates: Partial<ElementAppearance>
): T {
  return {
    ...element,
    appearance: {
      ...element.appearance,
      ...appearanceUpdates,
    },
  };
}

/**
 * Immutably sets the locked status of an element.
 */
export function setElementLock<T extends MotionElement>(
  element: T,
  locked: boolean
): T {
  return {
    ...element,
    locked,
  };
}

/**
 * Immutably sets the visibility status of an element.
 */
export function setElementVisibility<T extends MotionElement>(
  element: T,
  visible: boolean
): T {
  return {
    ...element,
    visible,
  };
}

/**
 * Immutably sets the zIndex layering order of an element.
 */
export function setElementZIndex<T extends MotionElement>(
  element: T,
  zIndex: number
): T {
  return {
    ...element,
    zIndex,
  };
}
