"use client";

/**
 * MOTION-BOT — Timeline Keyframe Node
 * Interactive diamond visual representation of keyframes on timeline tracks.
 * Supports clicking to select and dragging horizontally to move keyframes in time.
 * Part of Phase 7.2 & 8.3: Visual Timeline Interface & Keyframe Editing.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { KeyframeNodeProps } from "./types";

export const KeyframeNode: React.FC<KeyframeNodeProps> = ({
  keyframe,
  pixelsPerSecond,
  isSelected = false,
  propertyName,
  fps = 30,
  onClick,
  onMoveKeyframe,
  onCommitMove,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const dragRef = React.useRef({
    startX: 0,
    startTime: keyframe.time,
    hasMoved: false,
    currentTime: keyframe.time,
  });

  const leftPx = Math.max(0, keyframe.time * pixelsPerSecond);
  const easingStr =
    typeof keyframe.easing === "string"
      ? keyframe.easing
      : keyframe.easing?.type || "linear";

  const tooltipText = `${propertyName ? `${propertyName}: ` : ""}${keyframe.time.toFixed(2)}s | Val: ${keyframe.value} | ${easingStr}`;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    // Select on down
    onClick?.(e as unknown as React.MouseEvent);

    dragRef.current = {
      startX: e.clientX,
      startTime: keyframe.time,
      hasMoved: false,
      currentTime: keyframe.time,
    };
    setIsDragging(true);

    const handlePointerMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      const deltaX = moveEv.clientX - dragRef.current.startX;
      if (Math.abs(deltaX) > 2) {
        dragRef.current.hasMoved = true;
      }
      const rawTime = Math.max(0, dragRef.current.startTime + deltaX / pixelsPerSecond);
      const safeFps = Math.max(1, fps);
      const snappedTime = Math.round(rawTime * safeFps) / safeFps;
      dragRef.current.currentTime = snappedTime;
      onMoveKeyframe?.(keyframe.id, snappedTime);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);

      if (dragRef.current.hasMoved && onCommitMove) {
        onCommitMove(keyframe.id, dragRef.current.currentTime);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  return (
    <div
      style={{ left: `${leftPx}px` }}
      onPointerDown={handlePointerDown}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      title={tooltipText}
      role="button"
      tabIndex={0}
      aria-label={`Keyframe at ${keyframe.time}s`}
      className={cn(
        "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20",
        "w-2.5 h-2.5 rotate-45 cursor-ew-resize",
        "transition-transform duration-fast hover:scale-125 select-none",
        isSelected
          ? "bg-text-primary border border-accent ring-2 ring-accent/60 scale-125 z-30"
          : "bg-accent/80 hover:bg-accent border border-surface shadow-xs",
        isDragging && "scale-150 ring-2 ring-white z-40 cursor-grabbing"
      )}
    />
  );
};
