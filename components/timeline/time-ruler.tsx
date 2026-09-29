"use client";

/**
 * MOTION-BOT — Time Ruler Component
 * Precision timecode ruler with second/sub-second ticks, work area shading, and interactive scrubbing.
 * Part of Phase 7.2 & 7.3: Visual Timeline Interface & Interactive Time Navigation.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { TimeRulerProps } from "./types";
import { calculateScrubTime, formatTimeAndFrame } from "@/timeline";

export const TimeRuler: React.FC<TimeRulerProps> = ({
  duration,
  currentTime,
  pixelsPerSecond,
  fps = 30,
  inPoint,
  outPoint,
  timelineWidth,
  onSeek,
}) => {
  const rulerRef = React.useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = React.useState(false);
  const isDraggingRef = React.useRef(false);

  // Dynamic tick step based on zoom scale
  const { tickStep, labelStep } = React.useMemo(() => {
    if (pixelsPerSecond >= 160) {
      return { tickStep: 0.25, labelStep: 1 };
    }
    if (pixelsPerSecond >= 80) {
      return { tickStep: 0.5, labelStep: 1 };
    }
    if (pixelsPerSecond >= 40) {
      return { tickStep: 1, labelStep: 2 };
    }
    return { tickStep: 2, labelStep: 5 };
  }, [pixelsPerSecond]);

  // Generate tick markers
  const ticks = React.useMemo(() => {
    const items: Array<{ time: number; isMajor: boolean; label?: string }> = [];
    const totalSteps = Math.ceil(duration / tickStep);

    for (let i = 0; i <= totalSteps; i++) {
      const time = Number((i * tickStep).toFixed(4));
      if (time > duration + 1e-4) break;

      const isMajor = Math.abs(time % labelStep) < 1e-4 || Math.abs((time % labelStep) - labelStep) < 1e-4;
      const label = isMajor ? `${Math.round(time)}s` : undefined;

      items.push({ time, isMajor, label });
    }

    return items;
  }, [duration, tickStep, labelStep]);

  // Handle pointer coordinate conversion to project time
  const handleSeekFromClientX = React.useCallback(
    (clientX: number) => {
      const el = rulerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const targetTime = calculateScrubTime({
        clientX,
        containerLeft: rect.left,
        scrollLeft: 0, // rect.left of this element already shifts with scroll
        pixelsPerSecond,
        duration,
        fps,
        snapToFrames: true,
      });
      onSeek(targetTime);
    },
    [duration, pixelsPerSecond, fps, onSeek]
  );

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      isDraggingRef.current = true;
      setIsScrubbing(true);
      handleSeekFromClientX(e.clientX);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!isDraggingRef.current) return;
        moveEvent.preventDefault();
        handleSeekFromClientX(moveEvent.clientX);
      };

      const handlePointerUp = () => {
        isDraggingRef.current = false;
        setIsScrubbing(false);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [handleSeekFromClientX]
  );

  const playheadX = currentTime * pixelsPerSecond;

  return (
    <div
      ref={rulerRef}
      onPointerDown={handlePointerDown}
      style={{ width: `${timelineWidth}px` }}
      role="slider"
      aria-label="Timeline Time Ruler"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={currentTime}
      className={cn(
        "h-7 border-b border-border bg-surface-elevated/70 relative select-none cursor-pointer overflow-hidden",
        isScrubbing && "cursor-ew-resize"
      )}
    >
      {/* Work Area Shading (inPoint to outPoint) */}
      <div
        className="absolute inset-y-0 bg-accent/5 pointer-events-none border-x border-accent/20"
        style={{
          left: `${inPoint * pixelsPerSecond}px`,
          width: `${Math.max(0, (outPoint - inPoint) * pixelsPerSecond)}px`,
        }}
      />

      {/* Tick Marks & Labels */}
      {ticks.map((tick) => {
        const xPos = tick.time * pixelsPerSecond;
        return (
          <div
            key={tick.time}
            style={{ left: `${xPos}px` }}
            className="absolute bottom-0 flex flex-col items-center pointer-events-none"
          >
            {tick.label && (
              <span className="text-[10px] font-mono text-text-muted mb-0.5 -translate-x-1/2">
                {tick.label}
              </span>
            )}
            <span
              className={cn(
                "w-px bg-border",
                tick.isMajor ? "h-2.5 bg-border-active" : "h-1.5 opacity-60"
              )}
            />
          </div>
        );
      })}

      {/* Top Playhead Marker / Scrubber Cap */}
      <div
        style={{ left: `${playheadX}px` }}
        className="absolute top-0 bottom-0 pointer-events-none -translate-x-1/2 flex flex-col items-center z-30"
        title={`Current Time: ${formatTimeAndFrame(currentTime, fps)}`}
      >
        <div
          className={cn(
            "w-3.5 h-3.5 bg-accent rotate-45 -translate-y-1 shadow-sm transition-transform",
            isScrubbing && "scale-125"
          )}
        />
        <div className="w-0.5 flex-1 bg-accent" />
      </div>

      {/* Active Scrubbing Tooltip Indicator */}
      {isScrubbing && (
        <div
          style={{ left: `${Math.max(40, Math.min(timelineWidth - 40, playheadX))}px` }}
          className="absolute top-1 z-40 -translate-x-1/2 pointer-events-none px-1.5 py-0.5 rounded bg-surface border border-accent/40 shadow-md text-[9px] font-mono text-accent font-semibold tracking-wider whitespace-nowrap"
        >
          {formatTimeAndFrame(currentTime, fps)}
        </div>
      )}
    </div>
  );
};
