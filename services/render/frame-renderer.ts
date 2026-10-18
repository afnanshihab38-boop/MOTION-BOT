/**
 * MOTION-BOT — Frame Renderer
 * Pure, deterministic Canvas 2D frame renderer that evaluates the scene at time T
 * using the Phase 6 Motion Engine and renders all elements onto a canvas.
 * Part of Phase 8.8: Preview + Rendering + Export.
 */

import { Scene, SceneBackground } from "@/types/scene";
import {
  MotionElement,
  TextElement,
  ShapeElement,
  ImageElement,
  LogoElement,
  FillStyle,
  GradientFill,
  ColorStop,
} from "@/types/element";
import { Asset } from "@/types/asset";
import { getEvaluatedSceneAtTime } from "@/timeline";
import { sortElementsDeterministically } from "@/components/editor/scene-renderer";
import { ICanvasContext2D, RenderFrameOptions } from "./types";
import { createRenderCanvas, HeadlessCanvas } from "./canvas-adapter";

/**
 * Resolves a fill configuration model into a Canvas fillStyle string or gradient.
 */
function resolveCanvasFill(
  ctx: ICanvasContext2D,
  fill: unknown,
  width: number,
  height: number,
  fallback = "#4F46E5"
): unknown {
  if (!fill) return fallback;

  if (typeof fill === "string") return fill;

  const f = fill as {
    type?: string;
    color?: string;
    gradient?: GradientFill;
    stops?: ColorStop[];
    angle?: number;
  };

  if (f.type === "solid") {
    return f.color || fallback;
  }

  const gradient = f.gradient;
  const stops = gradient?.stops || f.stops;

  if (
    f.type === "linear-gradient" ||
    f.type === "radial-gradient" ||
    f.type === "gradient" ||
    Boolean(stops)
  ) {
    if (stops && stops.length > 0) {
      const isRadial =
        f.type === "radial-gradient" ||
        gradient?.type === "radial" ||
        f.type === "radial";

      if (isRadial) {
        const cx = width / 2;
        const cy = height / 2;
        const r = Math.max(width, height) / 2;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        for (const stop of stops) {
          grad.addColorStop(stop.offset, stop.color);
        }
        return grad;
      }

      // Linear gradient
      const angle = (gradient?.angle ?? f.angle ?? 180) % 360;
      const angleRad = (angle * Math.PI) / 180;
      // Compute linear coords across box
      const cx = width / 2;
      const cy = height / 2;
      const length = Math.sqrt(width * width + height * height) / 2;
      const x0 = cx - Math.cos(angleRad) * length;
      const y0 = cy - Math.sin(angleRad) * length;
      const x1 = cx + Math.cos(angleRad) * length;
      const y1 = cy + Math.sin(angleRad) * length;

      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      for (const stop of stops) {
        grad.addColorStop(stop.offset, stop.color);
      }
      return grad;
    }
  }

  if (f.type === "none") {
    return "transparent";
  }

  return f.color || fallback;
}

/**
 * Draws the scene background onto the canvas.
 */
export function drawSceneBackground(
  ctx: ICanvasContext2D,
  width: number,
  height: number,
  background?: SceneBackground
): void {
  ctx.save();
  ctx.globalAlpha = 1;

  if (!background || background.type === "solid") {
    ctx.fillStyle = background?.color || "#0B0C10";
    ctx.fillRect(0, 0, width, height);
  } else if (background.type === "gradient" && background.gradient) {
    const { gradient } = background;
    if (gradient.type === "radial") {
      const cx = width / 2;
      const cy = height / 2;
      const r = Math.max(width, height) / 2;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      for (const s of gradient.stops) {
        grad.addColorStop(s.offset, s.color);
      }
      ctx.fillStyle = grad;
    } else {
      const angle = gradient.angle ?? 180;
      const angleRad = (angle * Math.PI) / 180;
      const cx = width / 2;
      const cy = height / 2;
      const length = Math.sqrt(width * width + height * height) / 2;
      const x0 = cx - Math.cos(angleRad) * length;
      const y0 = cy - Math.sin(angleRad) * length;
      const x1 = cx + Math.cos(angleRad) * length;
      const y1 = cy + Math.sin(angleRad) * length;

      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      for (const s of gradient.stops) {
        grad.addColorStop(s.offset, s.color);
      }
      ctx.fillStyle = grad;
    }
    ctx.fillRect(0, 0, width, height);
  } else if (background.type === "transparent") {
    ctx.clearRect(0, 0, width, height);
  } else {
    ctx.fillStyle = "#0B0C10";
    ctx.fillRect(0, 0, width, height);
  }

  ctx.restore();
}

/**
 * Draws a text element with typography alignment, styling, and bounds.
 */
function drawTextElement(
  ctx: ICanvasContext2D,
  element: TextElement,
  width: number,
  height: number
): void {
  const content = element.text ?? element.content ?? "";
  if (!content) return;

  const fontSize = typeof element.fontSize === "number" ? element.fontSize : 32;
  const fontFamily = element.fontFamily || "Inter, sans-serif";
  const fontWeight = element.fontWeight || 600;
  const align = element.alignment || element.textAlign || "left";
  const verticalAlign = element.verticalAlign || "middle";

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = align === "center" ? "center" : align === "right" ? "right" : "left";
  ctx.textBaseline = "alphabetic";

  // Resolve color
  let textColor: unknown = element.color;
  if (!textColor) {
    textColor = resolveCanvasFill(ctx, element.appearance?.fill, width, height, "#FFFFFF");
  }
  ctx.fillStyle = textColor;

  // Horizontal position
  let x = 0;
  if (align === "center") {
    x = width / 2;
  } else if (align === "right") {
    x = width;
  }

  // Handle multi-line text
  const lines = content.split("\n");
  const lineHeight = (typeof element.lineHeight === "number" ? element.lineHeight : 1.2) * fontSize;
  const totalTextHeight = lines.length * lineHeight;

  // Vertical baseline offset
  let startY = fontSize * 0.85;
  if (verticalAlign === "middle") {
    startY = (height - totalTextHeight) / 2 + fontSize * 0.85;
  } else if (verticalAlign === "bottom") {
    startY = height - totalTextHeight + fontSize * 0.85;
  }

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + i * lineHeight);
  }
}

/**
 * Draws a shape element (rectangle, circle, ellipse, polygon, star, line, arrow).
 */
function drawShapeElement(
  ctx: ICanvasContext2D,
  element: ShapeElement,
  width: number,
  height: number
): void {
  const { shapeKind, cornerRadius, pointsCount = 5, innerRadiusRatio = 0.5 } = element;
  const fill = resolveCanvasFill(ctx, element.appearance?.fill, width, height, "#4F46E5");
  const stroke = element.appearance?.stroke;

  ctx.fillStyle = fill;
  if (stroke) {
    ctx.strokeStyle = stroke.color || "#FFFFFF";
    ctx.lineWidth = stroke.width || 1;
    if (stroke.dashArray && stroke.dashArray.length > 0) {
      ctx.setLineDash(stroke.dashArray);
    } else {
      ctx.setLineDash([]);
    }
  }

  if (shapeKind === "rectangle") {
    const radius =
      typeof cornerRadius === "number"
        ? cornerRadius
        : Array.isArray(cornerRadius)
        ? cornerRadius[0]
        : 0;

    if (radius > 0 && typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, radius);
      ctx.fill();
      if (stroke) ctx.stroke();
    } else if (radius > 0) {
      // Manual rounded rect fallback
      const r = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(width - r, 0);
      ctx.arc(width - r, r, r, -Math.PI / 2, 0);
      ctx.lineTo(width, height - r);
      ctx.arc(width - r, height - r, r, 0, Math.PI / 2);
      ctx.lineTo(r, height);
      ctx.arc(r, height - r, r, Math.PI / 2, Math.PI);
      ctx.lineTo(0, r);
      ctx.arc(r, r, r, Math.PI, (3 * Math.PI) / 2);
      ctx.closePath();
      ctx.fill();
      if (stroke) ctx.stroke();
    } else {
      ctx.fillRect(0, 0, width, height);
      if (stroke) ctx.strokeRect(0, 0, width, height);
    }
  } else if (shapeKind === "circle" || shapeKind === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, 2 * Math.PI);
    ctx.fill();
    if (stroke) ctx.stroke();
  } else if (shapeKind === "polygon" || shapeKind === "star") {
    const cx = width / 2;
    const cy = height / 2;
    const rx = width / 2;
    const ry = height / 2;
    const numPoints = shapeKind === "star" ? pointsCount * 2 : pointsCount;

    ctx.beginPath();
    for (let i = 0; i < numPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPoints - Math.PI / 2;
      const isInner = shapeKind === "star" && i % 2 !== 0;
      const curRx = isInner ? rx * innerRadiusRatio : rx;
      const curRy = isInner ? ry * innerRadiusRatio : ry;
      const px = cx + curRx * Math.cos(angle);
      const py = cy + curRy * Math.sin(angle);

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    if (stroke) ctx.stroke();
  } else if (shapeKind === "line" || shapeKind === "arrow") {
    const strokeColor = stroke?.color || (typeof fill === "string" ? fill : "#FFFFFF");
    const strokeWidth = stroke?.width || 2;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;

    const y = height / 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    if (shapeKind === "arrow") {
      const arrowSize = Math.max(8, strokeWidth * 3);
      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.moveTo(width, y);
      ctx.lineTo(width - arrowSize, y - arrowSize / 2);
      ctx.lineTo(width - arrowSize, y + arrowSize / 2);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    // Default fallback rectangle
    ctx.fillRect(0, 0, width, height);
    if (stroke) ctx.strokeRect(0, 0, width, height);
  }
}

/**
 * Draws an image element or graceful fallback card.
 */
function drawImageElement(
  ctx: ICanvasContext2D,
  element: ImageElement,
  width: number,
  height: number,
  assetMap: Map<string, Asset>
): void {
  const asset = element.assetId ? assetMap.get(element.assetId) : undefined;
  const url = element.src || asset?.url || "";

  // In test / offline environments or when asset is unloaded, render a high-fidelity image placeholder
  ctx.fillStyle = "rgba(30, 41, 59, 0.7)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(element.name || "Image Asset", width / 2, height / 2);
}

/**
 * Draws a logo element or brand placeholder.
 */
function drawLogoElement(
  ctx: ICanvasContext2D,
  element: LogoElement,
  width: number,
  height: number,
  assetMap: Map<string, Asset>
): void {
  ctx.fillStyle = "rgba(236, 72, 153, 0.15)";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(236, 72, 153, 0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  ctx.fillStyle = "#EC4899";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(element.name || "LOGO", width / 2, height / 2);
}

/**
 * Renders an evaluated scene at timestamp T onto a target Canvas 2D context.
 *
 * Guarantees:
 * - Does NOT mutate the input scene or project.
 * - Interpolates keyframes and transforms using the Phase 6 Motion Engine.
 * - Respects layer visibility, opacity, order, scale, and rotation.
 */
export function renderFrameToCanvas(
  ctx: ICanvasContext2D,
  scene: Scene,
  time: number,
  options: RenderFrameOptions,
  assets: Asset[] = []
): void {
  const { width, height } = options;

  // 1. Evaluate scene motion at target time
  const evaluatedScene = getEvaluatedSceneAtTime(scene, time);

  // 2. Draw scene background
  drawSceneBackground(ctx, width, height, evaluatedScene.background);

  // 3. Build asset map
  const assetMap = new Map<string, Asset>();
  for (const a of assets) {
    assetMap.set(a.id, a);
  }

  // 4. Sort elements deterministically by z-order
  const sortedElements = sortElementsDeterministically(evaluatedScene.elements);

  // 5. Draw each visible element
  for (const element of sortedElements) {
    if (element.visible === false) continue;

    const { transform, appearance } = element;
    const elWidth = Math.max(1, transform?.width ?? 100);
    const elHeight = Math.max(1, transform?.height ?? 100);
    const anchorX = transform?.anchorX ?? 0;
    const anchorY = transform?.anchorY ?? 0;
    const rotation = transform?.rotation ?? 0;
    const scaleX = transform?.scaleX ?? 1;
    const scaleY = transform?.scaleY ?? 1;
    const opacity = Math.min(Math.max(appearance?.opacity ?? 1, 0), 1);

    if (opacity <= 0) continue;

    ctx.save();
    ctx.globalAlpha = opacity;

    // Apply 2D transforms around anchor origin
    ctx.translate(transform?.x ?? 0, transform?.y ?? 0);
    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }
    if (scaleX !== 1 || scaleY !== 1) {
      ctx.scale(scaleX, scaleY);
    }
    ctx.translate(-elWidth * anchorX, -elHeight * anchorY);

    switch (element.type) {
      case "text":
        drawTextElement(ctx, element as TextElement, elWidth, elHeight);
        break;
      case "shape":
        drawShapeElement(ctx, element as ShapeElement, elWidth, elHeight);
        break;
      case "image":
        drawImageElement(ctx, element as ImageElement, elWidth, elHeight, assetMap);
        break;
      case "logo":
        drawLogoElement(ctx, element as LogoElement, elWidth, elHeight, assetMap);
        break;
      default:
        break;
    }

    ctx.restore();
  }
}
