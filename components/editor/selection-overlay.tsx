"use client";

/**
 * MOTION-BOT — Selection Bounding Box & Transformation Handles Overlay
 * Renders the active element selection boundary, 8 directional resize handles,
 * and rotation handle in canvas coordinate space.
 * Part of Phase 5.1: Editor Architecture & Canvas Foundation.
 */

import * as React from "react";
import { ElementBounds, ResizeHandleId } from "@/types/editor";
import { cn } from "@/lib/utils";

export interface SelectionOverlayProps {
  bounds: ElementBounds | null;
  zoom?: number;
  isLocked?: boolean;
  anchorX?: number;
  anchorY?: number;
  onHandleMouseDown?: (handle: ResizeHandleId, event: React.MouseEvent) => void;
  onRotateMouseDown?: (event: React.MouseEvent) => void;
}

const HANDLE_SIZE = 8; // Screen px equivalent size for handles

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  bounds,
  zoom = 1.0,
  isLocked = false,
  anchorX,
  anchorY,
  onHandleMouseDown,
  onRotateMouseDown,
}) => {
  if (!bounds) return null;

  const { x, y, width, height, rotation } = bounds;

  // Scale handle dimensions inversely to zoom so they remain comfortable to grab
  const handlePx = Math.max(HANDLE_SIZE / zoom, 6);
  const halfHandle = handlePx / 2;

  const transformOrigin =
    typeof anchorX === "number" && typeof anchorY === "number"
      ? `${anchorX * 100}% ${anchorY * 100}%`
      : "center center";

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    transform: `rotate(${rotation}deg)`,
    transformOrigin,
    pointerEvents: "none",
  };

  const handles: { id: ResizeHandleId; left: number; top: number; cursor: string }[] = [
    { id: "nw", left: -halfHandle, top: -halfHandle, cursor: "nwse-resize" },
    { id: "n", left: width / 2 - halfHandle, top: -halfHandle, cursor: "ns-resize" },
    { id: "ne", left: width - halfHandle, top: -halfHandle, cursor: "nesw-resize" },
    { id: "e", left: width - halfHandle, top: height / 2 - halfHandle, cursor: "ew-resize" },
    { id: "se", left: width - halfHandle, top: height - halfHandle, cursor: "nwse-resize" },
    { id: "s", left: width / 2 - halfHandle, top: height - halfHandle, cursor: "ns-resize" },
    { id: "sw", left: -halfHandle, top: height - halfHandle, cursor: "nesw-resize" },
    { id: "w", left: -halfHandle, top: height / 2 - halfHandle, cursor: "ew-resize" },
  ];

  return (
    <div style={style} className="z-30">
      {/* Selection border ring */}
      <div
        className={cn(
          "absolute inset-0 border border-dashed pointer-events-none rounded-none",
          isLocked
            ? "border-amber-500/70 shadow-[0_0_0_1px_rgba(245,158,11,0.2)]"
            : "border-indigo-500 shadow-[0_0_0_1px_rgba(99,102,241,0.25)]"
        )}
      />

      {/* Resize handles (hidden when locked) */}
      {!isLocked &&
        handles.map(({ id, left: hLeft, top: hTop, cursor }) => (
          <div
            key={id}
            style={{
              position: "absolute",
              left: `${hLeft}px`,
              top: `${hTop}px`,
              width: `${handlePx}px`,
              height: `${handlePx}px`,
              cursor,
            }}
            className="pointer-events-auto bg-neutral-900 border border-indigo-400 rounded-none shadow-sm hover:scale-125 transition-transform"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onHandleMouseDown?.(id, e);
            }}
          />
        ))}

      {/* Rotation handle stem and handle (hidden when locked) */}
      {!isLocked && (
        <>
          <div
            style={{
              position: "absolute",
              left: `${width / 2}px`,
              top: `-${handlePx * 2}px`,
              width: "1px",
              height: `${handlePx * 2}px`,
            }}
            className="bg-indigo-400/60 pointer-events-none"
          />
          <div
            style={{
              position: "absolute",
              left: `${width / 2 - halfHandle}px`,
              top: `-${handlePx * 2.5}px`,
              width: `${handlePx}px`,
              height: `${handlePx}px`,
              cursor: "grab",
            }}
            className="pointer-events-auto rounded-full bg-indigo-500 border border-white shadow-sm hover:scale-125 transition-transform"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onRotateMouseDown?.(e);
            }}
          />
        </>
      )}

      {/* Dimension & angle indicator badge */}
      <div
        style={{
          position: "absolute",
          bottom: `-${handlePx * 3}px`,
          left: "50%",
          transform: "translateX(-50%)",
        }}
        className={cn(
          "pointer-events-none rounded px-1.5 py-0.5 text-[9px] font-mono shadow-sm whitespace-nowrap backdrop-blur-xs border",
          isLocked
            ? "bg-amber-950/80 border-amber-500/40 text-amber-200"
            : "bg-neutral-900/90 border-neutral-700 text-neutral-200"
        )}
      >
        {isLocked ? "🔒 Locked • " : ""}
        {Math.round(width)} × {Math.round(height)} px
        {rotation ? ` • ${Math.round(rotation)}°` : ""}
      </div>
    </div>
  );
};
