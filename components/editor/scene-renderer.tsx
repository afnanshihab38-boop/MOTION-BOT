"use client";

/**
 * MOTION-BOT — Scene Visual Element Renderer
 * Renders the active scene's motion elements onto the canvas stage in deterministic z-index hierarchy.
 * Supports static rendering of Text, Shape, Image, Logo, and Group element types
 * adhering strictly to the Phase 3 data models.
 * Part of Phase 5.2: Project & Scene Rendering.
 */

import * as React from "react";
import { Scene, SceneBackground } from "@/types/scene";
import {
  MotionElement,
  TextElement,
  ShapeElement,
  ImageElement,
  LogoElement,
  VideoElement,
  FillStyle,
  GradientFill,
  ColorStop,
} from "@/types/element";
import { Asset } from "@/types/asset";
import { cn } from "@/lib/utils";

// ============================================================================
// Data Mapping & Resolution Utilities
// ============================================================================

export type AnyFillInput =
  | FillStyle
  | { type?: string; color?: string; gradient?: GradientFill; stops?: ColorStop[]; angle?: number }
  | string
  | undefined;

/**
 * Resolves a fill configuration model into corresponding CSS background properties.
 * Handles solid colors, linear/radial gradients, pattern fills, and transparent fills.
 */
export function resolveElementFill(
  fill: AnyFillInput,
  fallback = "transparent"
): React.CSSProperties {
  if (!fill) {
    return { backgroundColor: fallback };
  }

  if (typeof fill === "string") {
    return { backgroundColor: fill };
  }

  if (fill.type === "solid") {
    return { backgroundColor: fill.color || fallback };
  }

  const gradient = (fill as { gradient?: GradientFill }).gradient;
  const stops = gradient?.stops || (fill as { stops?: ColorStop[] }).stops;

  if (
    fill.type === "linear-gradient" ||
    fill.type === "radial-gradient" ||
    fill.type === "gradient" ||
    Boolean(stops)
  ) {
    if (stops && stops.length > 0) {
      const stopsStr = stops
        .map((s: ColorStop) => `${s.color} ${Math.round(s.offset * 100)}%`)
        .join(", ");
      const isRadial =
        fill.type === "radial-gradient" ||
        gradient?.type === "radial" ||
        (fill as { type?: string }).type === "radial";
      if (isRadial) {
        return { background: `radial-gradient(circle, ${stopsStr})` };
      }
      const angle = gradient?.angle ?? (fill as { angle?: number }).angle ?? 180;
      return { background: `linear-gradient(${angle}deg, ${stopsStr})` };
    }
  }

  if (fill.type === "none") {
    return { backgroundColor: "transparent" };
  }

  return { backgroundColor: fill.color || fallback };
}

/**
 * Resolves a SceneBackground configuration into CSS background styles.
 * Supports solid colors, radial/linear gradients, and a designer transparency checkerboard.
 */
export function resolveSceneBackground(
  background?: SceneBackground,
  fallback = "#000000"
): React.CSSProperties {
  if (!background) {
    return { backgroundColor: fallback };
  }

  if (background.type === "solid") {
    return { backgroundColor: background.color || fallback };
  }

  if (background.type === "gradient" && background.gradient) {
    const { gradient } = background;
    const stopsStr = gradient.stops
      .map((s) => `${s.color} ${Math.round(s.offset * 100)}%`)
      .join(", ");
    if (gradient.type === "radial") {
      return { background: `radial-gradient(circle, ${stopsStr})` };
    }
    const angle = gradient.angle ?? 180;
    return { background: `linear-gradient(${angle}deg, ${stopsStr})` };
  }

  if (background.type === "transparent") {
    return {
      backgroundColor: "transparent",
      backgroundImage:
        "linear-gradient(45deg, #18181b 25%, transparent 25%), linear-gradient(-45deg, #18181b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #18181b 75%), linear-gradient(-45deg, transparent 75%, #18181b 75%)",
      backgroundSize: "16px 16px",
      backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
    };
  }

  return { backgroundColor: fallback };
}

/**
 * Validates whether an element contains sufficient data to be rendered on the canvas stage.
 */
export function hasSufficientElementData(element: MotionElement): boolean {
  if (!element.id || !element.type) return false;

  const { transform } = element;
  if (!transform) return false;
  if (
    typeof transform.width !== "number" ||
    isNaN(transform.width) ||
    transform.width <= 0 ||
    typeof transform.height !== "number" ||
    isNaN(transform.height) ||
    transform.height <= 0
  ) {
    return false;
  }

  switch (element.type) {
    case "text": {
      const textEl = element as TextElement;
      const content = textEl.text ?? textEl.content;
      return typeof content === "string";
    }
    case "shape": {
      const shapeEl = element as ShapeElement;
      return typeof shapeEl.shapeKind === "string";
    }
    case "image": {
      const imageEl = element as ImageElement;
      return Boolean(imageEl.assetId || imageEl.src);
    }
    case "logo": {
      const logoEl = element as LogoElement;
      return Boolean(logoEl.assetId || logoEl.src);
    }
    case "group":
      return true;
    default:
      return true;
  }
}

/**
 * Sorts elements deterministically by ascending zIndex with id tie-breaker.
 */
export function sortElementsDeterministically(elements: MotionElement[]): MotionElement[] {
  return [...elements]
    .filter((el) => el.visible && hasSufficientElementData(el))
    .sort((a, b) => {
      const zDiff = (a.zIndex || 0) - (b.zIndex || 0);
      if (zDiff !== 0) return zDiff;
      return a.id.localeCompare(b.id);
    });
}

// ============================================================================
// Scene Renderer Component
// ============================================================================

export interface SceneRendererProps {
  scene: Scene;
  assets?: Asset[];
  selectedElementIds?: string[];
  hoveredElementId?: string | null;
  onElementClick?: (elementId: string, event: React.MouseEvent) => void;
  onElementMouseDown?: (elementId: string, event: React.MouseEvent) => void;
  onElementMouseEnter?: (elementId: string) => void;
  onElementMouseLeave?: (elementId: string) => void;
}

export const SceneRenderer: React.FC<SceneRendererProps> = ({
  scene,
  assets = [],
  selectedElementIds = [],
  hoveredElementId = null,
  onElementClick,
  onElementMouseDown,
  onElementMouseEnter,
  onElementMouseLeave,
}) => {
  // Sort elements deterministically by z-order
  const sortedElements = React.useMemo(() => {
    return sortElementsDeterministically(scene.elements);
  }, [scene.elements]);

  // Asset lookup map by asset ID
  const assetMap = React.useMemo(() => {
    const map = new Map<string, Asset>();
    for (const asset of assets) {
      map.set(asset.id, asset);
    }
    return map;
  }, [assets]);

  return (
    <div className="absolute inset-0 pointer-events-auto overflow-hidden">
      {sortedElements.map((element) => {
        const isSelected = selectedElementIds.includes(element.id);
        const isHovered = hoveredElementId === element.id;

        return (
          <ElementNode
            key={element.id}
            element={element}
            assetMap={assetMap}
            isSelected={isSelected}
            isHovered={isHovered}
            onClick={(e) => onElementClick?.(element.id, e)}
            onMouseDown={(e) => onElementMouseDown?.(element.id, e)}
            onMouseEnter={() => onElementMouseEnter?.(element.id)}
            onMouseLeave={() => onElementMouseLeave?.(element.id)}
          />
        );
      })}
    </div>
  );
};

// ============================================================================
// Element Node Container
// ============================================================================

interface ElementNodeProps {
  element: MotionElement;
  assetMap: Map<string, Asset>;
  isSelected: boolean;
  isHovered: boolean;
  onClick: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const ElementNode: React.FC<ElementNodeProps> = ({
  element,
  assetMap,
  isSelected,
  isHovered,
  onClick,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
}) => {
  const { transform, appearance } = element;
  const anchorX = transform.anchorX ?? 0;
  const anchorY = transform.anchorY ?? 0;

  // Calculate position accounting for anchor point
  const left = transform.x - transform.width * anchorX;
  const top = transform.y - transform.height * anchorY;

  // Clamp opacity between 0 and 1
  const opacity = Math.min(Math.max(appearance.opacity ?? 1, 0), 1);

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${left}px`,
    top: `${top}px`,
    width: `${transform.width}px`,
    height: `${transform.height}px`,
    transform: `rotate(${transform.rotation || 0}deg) scale(${transform.scaleX ?? 1}, ${transform.scaleY ?? 1})`,
    transformOrigin: `${anchorX * 100}% ${anchorY * 100}%`,
    opacity,
    mixBlendMode: (appearance.blendMode as React.CSSProperties["mixBlendMode"]) || "normal",
    zIndex: element.zIndex || 0,
    cursor: element.locked ? "default" : "pointer",
  };

  return (
    <div
      id={`element_${element.id}`}
      style={style}
      className={cn(
        "select-none transition-shadow",
        !element.locked && isHovered && !isSelected && "ring-1 ring-accent/60"
      )}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {renderElementContent(element, assetMap)}
    </div>
  );
};

// ============================================================================
// Element Content Renderers (Text, Shape, Image, Logo, Group)
// ============================================================================

function renderElementContent(
  element: MotionElement,
  assetMap: Map<string, Asset>
): React.ReactNode {
  switch (element.type) {
    case "text":
      return renderTextElement(element as TextElement);
    case "shape":
      return renderShapeElement(element as ShapeElement);
    case "image":
      return renderImageElement(element as ImageElement, assetMap);
    case "logo":
      return renderLogoElement(element as LogoElement, assetMap);
    case "video":
      return renderVideoElement(element as VideoElement, assetMap);
    case "group":
      return renderGroupElement();
    default:
      return null;
  }
}

/**
 * Renders rich kinetic typography on the canvas stage.
 */
function renderTextElement(element: TextElement): React.ReactNode {
  const {
    text,
    content,
    fontFamily = "Inter, sans-serif",
    fontSize = 32,
    fontWeight = 600,
    fontStyle = "normal",
    lineHeight = 1.2,
    letterSpacing = 0,
    textAlign = "left",
    alignment,
    verticalAlign = "middle",
    textTransform = "none",
    color,
  } = element;

  const textContent = text ?? content ?? "";
  const align = alignment || textAlign;

  // Resolve text fill color: explicit element.color takes precedence, then appearance.fill
  let textColor = color;
  if (!textColor) {
    const fillStyle = resolveElementFill(element.appearance.fill, "#FFFFFF");
    textColor = String(fillStyle.backgroundColor || fillStyle.background || "#FFFFFF");
  }

  // Determine vertical alignment
  const alignItems =
    verticalAlign === "top"
      ? "flex-start"
      : verticalAlign === "bottom"
      ? "flex-end"
      : "center";

  // Determine horizontal alignment
  const justifyContent =
    align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";

  const style: React.CSSProperties = {
    width: "100%",
    height: "100%",
    color: textColor,
    fontFamily,
    fontSize: `${fontSize}px`,
    fontWeight,
    fontStyle,
    lineHeight: typeof lineHeight === "number" ? `${lineHeight}` : lineHeight,
    letterSpacing: letterSpacing ? `${letterSpacing}px` : "normal",
    textAlign: align,
    textTransform,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    display: "flex",
    alignItems,
    justifyContent,
  };

  return <div style={style}>{textContent}</div>;
}

/**
 * Formats corner radius value for CSS border-radius property.
 */
function formatCornerRadius(
  radius?: number | [number, number, number, number]
): string | undefined {
  if (radius === undefined) return undefined;
  if (typeof radius === "number") return `${radius}px`;
  if (Array.isArray(radius) && radius.length === 4) {
    return `${radius[0]}px ${radius[1]}px ${radius[2]}px ${radius[3]}px`;
  }
  return undefined;
}

/**
 * Renders procedural shapes, vector primitives, and geometric paths.
 */
function renderShapeElement(element: ShapeElement): React.ReactNode {
  const { shapeKind, cornerRadius, pointsCount = 5, innerRadiusRatio = 0.5, pathData } = element;
  const { width, height } = element.transform;
  const fillStyles = resolveElementFill(element.appearance.fill, "#4F46E5");
  const stroke = element.appearance.stroke;

  const strokeStyle: React.CSSProperties = stroke
    ? {
        borderWidth: `${stroke.width || 1}px`,
        borderStyle: stroke.dashArray ? "dashed" : "solid",
        borderColor: stroke.color || "#FFFFFF",
      }
    : {};

  // Standard rectangle
  if (shapeKind === "rectangle") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          ...fillStyles,
          ...strokeStyle,
          borderRadius: formatCornerRadius(cornerRadius) || "0px",
        }}
      />
    );
  }

  // Circle or Ellipse
  if (shapeKind === "circle" || shapeKind === "ellipse") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          ...fillStyles,
          ...strokeStyle,
          borderRadius: "50%",
        }}
      />
    );
  }

  // Vector SVG Path
  if (shapeKind === "path" && pathData) {
    const fillColor =
      fillStyles.backgroundColor && fillStyles.backgroundColor !== "transparent"
        ? fillStyles.backgroundColor
        : "currentColor";
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible pointer-events-none"
      >
        <path
          d={pathData}
          fill={fillColor}
          stroke={stroke?.color}
          strokeWidth={stroke?.width}
          strokeDasharray={stroke?.dashArray?.join(",")}
        />
      </svg>
    );
  }

  // Polygon or Star geometry rendered via SVG
  if (shapeKind === "polygon" || shapeKind === "star") {
    const cx = width / 2;
    const cy = height / 2;
    const rx = width / 2;
    const ry = height / 2;
    const points: string[] = [];
    const numPoints = shapeKind === "star" ? pointsCount * 2 : pointsCount;

    for (let i = 0; i < numPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPoints - Math.PI / 2;
      const isInner = shapeKind === "star" && i % 2 !== 0;
      const curRx = isInner ? rx * innerRadiusRatio : rx;
      const curRy = isInner ? ry * innerRadiusRatio : ry;
      const px = cx + curRx * Math.cos(angle);
      const py = cy + curRy * Math.sin(angle);
      points.push(`${px.toFixed(1)},${py.toFixed(1)}`);
    }

    const fillColor =
      fillStyles.backgroundColor && fillStyles.backgroundColor !== "transparent"
        ? fillStyles.backgroundColor
        : "#4F46E5";

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible pointer-events-none"
      >
        <polygon
          points={points.join(" ")}
          fill={fillColor}
          stroke={stroke?.color}
          strokeWidth={stroke?.width}
          strokeDasharray={stroke?.dashArray?.join(",")}
        />
      </svg>
    );
  }

  // Line or Arrow
  if (shapeKind === "line" || shapeKind === "arrow") {
    const strokeColor = stroke?.color || fillStyles.backgroundColor || "#FFFFFF";
    const strokeWidth = stroke?.width || 2;

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible pointer-events-none"
      >
        {shapeKind === "arrow" && (
          <defs>
            <marker
              id={`arrow_${element.id}`}
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 8 5 L 0 9 z" fill={strokeColor} />
            </marker>
          </defs>
        )}
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={stroke?.dashArray?.join(",")}
          markerEnd={shapeKind === "arrow" ? `url(#arrow_${element.id})` : undefined}
        />
      </svg>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        ...fillStyles,
        ...strokeStyle,
      }}
    />
  );
}

/**
 * Renders image assets with aspect-ratio preservation and corner radii.
 */
function renderImageElement(
  element: ImageElement,
  assetMap: Map<string, Asset>
): React.ReactNode {
  const asset = element.assetId ? assetMap.get(element.assetId) : undefined;
  const url = element.src || asset?.url || "";
  const objectFit = element.objectFit || "cover";
  const borderRadius = formatCornerRadius(element.cornerRadius);

  if (!url) {
    return (
      <div
        style={{ borderRadius }}
        className="w-full h-full bg-surface-elevated/40 border border-dashed border-border flex items-center justify-center text-text-muted text-[11px] font-mono select-none"
      >
        Image Asset
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={element.name || "Image"}
      style={{ objectFit, borderRadius }}
      className="w-full h-full pointer-events-none"
      draggable={false}
    />
  );
}

/**
 * Renders brand-aligned vector/raster logo marks.
 */
function renderLogoElement(
  element: LogoElement,
  assetMap: Map<string, Asset>
): React.ReactNode {
  const asset = element.assetId ? assetMap.get(element.assetId) : undefined;
  const url = element.src || asset?.url || "";
  const borderRadius = formatCornerRadius(element.cornerRadius);

  if (!url) {
    return (
      <div
        style={{ borderRadius }}
        className="w-full h-full bg-surface-elevated/40 border border-dashed border-accent/40 flex items-center justify-center text-accent text-[11px] font-mono select-none"
      >
        Logo
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={element.name || "Logo"}
      style={{
        objectFit: "contain",
        borderRadius,
        filter: element.colorTint ? `drop-shadow(0 0 0 ${element.colorTint})` : undefined,
      }}
      className="w-full h-full pointer-events-none"
      draggable={false}
    />
  );
}

/**
 * Renders video asset elements with autoplay and mute controls.
 */
function renderVideoElement(
  element: VideoElement,
  assetMap: Map<string, Asset>
): React.ReactNode {
  const asset = element.assetId ? assetMap.get(element.assetId) : undefined;
  const url = element.src || asset?.url || "";

  if (!url) {
    return (
      <div className="w-full h-full bg-surface-elevated/40 border border-dashed border-blue-500/40 flex items-center justify-center text-blue-400 text-[11px] font-mono select-none">
        Video Asset
      </div>
    );
  }

  return (
    <video
      src={url}
      style={{ objectFit: "cover" }}
      className="w-full h-full pointer-events-none"
      muted={element.muted ?? true}
      loop={element.loop ?? true}
      autoPlay
      playsInline
    />
  );
}

/**
 * Renders hierarchical element group containers.
 */
function renderGroupElement(): React.ReactNode {
  return <div className="w-full h-full relative" />;
}

