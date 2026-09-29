"use client";

/**
 * MOTION-BOT — Timeline Playhead Indicator & Drag Controller
 * Full-height vertical line tracking the exact current playback time across all track lanes,
 * with an interactive draggable grab area for smooth scrubbing across tracks.
 * Part of Phase 7.2 & 7.3: Visual Timeline Interface & Interactive Time Navigation.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { calculateScrubTime, formatTimeAndFrame } from "@/timeline";

export interface PlayheadProps {
  currentTime: number;
  pixelsPerSecond: number;
  duration?: number;
  fps?: number;
  onSeek?: (time: number) => void;
  timelineWidth?: number;
  className?: string;
}

export const Playhead: React.FC<PlayheadProps> = ({
  currentTime,
  pixelsPerSecond,
  duration = 10,
  fps = 30,
  onSeek,
  timelineWidth = 600,
  className,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const playheadRef = React.useRef<HTMLDivElement>(null);
  const isDraggingRef = React.useRef(false);

  const leftPx = Math.max(0, currentTime * pixelsPerSecond);

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 || !onSeek) return;
      e.preventDefault();
      e.stopPropagation();

      isDraggingRef.current = true;
      setIsDragging(true);

      const parentEl = playheadRef.current?.parentElement;
      if (!parentEl) return;
      const parentRect = parentEl.getBoundingClientRect();

      const updatePosition = (clientX: number) => {
        const targetTime = calculateScrubTime({
          clientX,
          containerLeft: parentRect.left,
          scrollLeft: 0,
          pixelsPerSecond,
          duration,
          fps,
          snapToFrames: true,
        });
        onSeek(targetTime);
      };

      updatePosition(e.clientX);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!isDraggingRef.current) return;
        moveEvent.preventDefault();
        updatePosition(moveEvent.clientX);
      };

      const handlePointerUp = () => {
        isDraggingRef.current = false;
        setIsDragging(false);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [onSeek, pixelsPerSecond, duration, fps]
  );

  return (
    <div
      ref={playheadRef}
      style={{ left: `${leftPx}px` }}
      aria-hidden="true"
      className={cn(
        "absolute top-0 bottom-0 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none",
        className
      )}
    >
      {/* Draggable vertical hit corridor */}
      <div
        onPointerDown={handlePointerDown}
        className={cn(
          "w-5 h-full pointer-events-auto cursor-ew-resize flex flex-col items-center group",
          isDragging && "cursor-grabbing"
        )}
        title={`Drag playhead: ${formatTimeAndFrame(currentTime, fps)}`}
      >
        {/* Playhead hairline vertical beam */}
        <div
          className={cn(
            "w-px h-full bg-accent transition-all duration-fast",
            isDragging
              ? "w-0.5 shadow-[0_0_12px_rgba(99,102,241,0.8)] bg-accent"
              : "group-hover:w-0.5 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
          )}
        />
      </div>

      {/* Floating Scrub Badge when dragged from playhead line */}
      {isDragging && (
        <div
          style={{
            left: `${Math.max(30, Math.min(timelineWidth - 30, leftPx))}px`,
          }}
          className="fixed bottom-12 z-50 -translate-x-1/2 pointer-events-none px-2 py-1 rounded bg-surface-elevated/95 border border-accent/50 shadow-xl text-[10px] font-mono text-accent font-bold tracking-wider backdrop-blur-md"
        >
          {formatTimeAndFrame(currentTime, fps)}
        </div>
      )}
    </div>
  );
};
