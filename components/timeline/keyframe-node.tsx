"use client";

/**
 * MOTION-BOT — Timeline Keyframe Node
 * Interactive diamond visual representation of keyframes on timeline tracks.
 * Part of Phase 7.2: Visual Timeline Interface.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { KeyframeNodeProps } from "./types";

export const KeyframeNode: React.FC<KeyframeNodeProps> = ({
  keyframe,
  pixelsPerSecond,
  isSelected = false,
  propertyName,
  onClick,
}) => {
  const leftPx = Math.max(0, keyframe.time * pixelsPerSecond);
  const easingStr =
    typeof keyframe.easing === "string"
      ? keyframe.easing
      : keyframe.easing?.type || "linear";

  const tooltipText = `${propertyName ? `${propertyName}: ` : ""}${keyframe.time.toFixed(2)}s | Val: ${keyframe.value} | ${easingStr}`;

  return (
    <div
      style={{ left: `${leftPx}px` }}
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
        "w-2.5 h-2.5 rotate-45 cursor-pointer",
        "transition-transform duration-fast hover:scale-125 select-none",
        isSelected
          ? "bg-text-primary border border-accent ring-2 ring-accent/60 scale-125 z-30"
          : "bg-accent/80 hover:bg-accent border border-surface shadow-xs"
      )}
    />
  );
};
