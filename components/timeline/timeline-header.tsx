"use client";

/**
 * MOTION-BOT — Timeline Header Bar
 * Transport controls (Play, Pause, Stop, Step, Jump), SMPTE timecode display,
 * zoom controls, and playback parameters.
 * Part of Phase 7.2: Visual Timeline Interface.
 */

import * as React from "react";
import {
  Play,
  Pause,
  Square as StopIcon,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Repeat,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { formatTimecode } from "@/timeline";
import { TimelineHeaderProps } from "./types";

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  timelineState,
  timelineManager,
  sceneName,
  className,
}) => {
  const { isPlaying, duration, fps, timecode, loop, viewport } =
    timelineState;

  const totalTimecode = React.useMemo(() => {
    return formatTimecode(duration, fps);
  }, [duration, fps]);

  const handleZoomChange = React.useCallback(
    (value: number) => {
      if (typeof value === "number" && !isNaN(value)) {
        timelineManager.setZoom(value / 100);
      }
    },
    [timelineManager]
  );

  return (
    <div
      className={cn(
        "h-9 border-b border-border bg-surface-elevated/40 px-3 flex items-center justify-between shrink-0 select-none",
        className
      )}
    >
      {/* 1. Left Group: Transport Playback Controls & Timecode */}
      <div className="flex items-center gap-1.5">
        {/* Jump to start */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => timelineManager.jumpToStart()}
          aria-label="Jump to start"
          title="Jump to Start (Home)"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </Button>

        {/* Step backward 1 frame */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => timelineManager.stepBackward(1)}
          aria-label="Step backward 1 frame"
          title="Step Backward (Left Arrow)"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        {/* Play / Pause Toggle */}
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => (isPlaying ? timelineManager.pause() : timelineManager.play())}
          aria-label={isPlaying ? "Pause" : "Play"}
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          className="text-accent"
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" />
          )}
        </Button>

        {/* Stop button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => timelineManager.stop()}
          aria-label="Stop playback"
          title="Stop"
        >
          <StopIcon className="h-3 w-3 fill-current" />
        </Button>

        {/* Step forward 1 frame */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => timelineManager.stepForward(1)}
          aria-label="Step forward 1 frame"
          title="Step Forward (Right Arrow)"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        {/* Jump to end */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => timelineManager.jumpToEnd()}
          aria-label="Jump to end"
          title="Jump to End (End)"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </Button>

        <Divider orientation="vertical" className="h-4 mx-1" />

        {/* Timecode Readout & FPS Indicator */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-text-primary font-semibold tabular-nums">
            {timecode}
          </span>
          <span className="text-text-muted">/</span>
          <span className="text-text-muted tabular-nums">{totalTimecode}</span>
          <span className="rounded-xs bg-surface border border-border px-1 py-0.2 text-[10px] text-text-muted ml-1">
            {fps} FPS
          </span>
          {sceneName && (
            <span className="text-[11px] text-text-muted hidden md:inline ml-1">
              • {sceneName}
            </span>
          )}
        </div>
      </div>

      {/* 2. Right Group: Zoom Slider & Looping Controls */}
      <div className="flex items-center gap-3">
        {/* Timeline Zoom Slider */}
        <div className="flex items-center gap-1.5 text-text-muted">
          <ZoomOut className="h-3 w-3" />
          <div className="w-24">
            <Slider
              value={Math.round(viewport.zoom * 100)}
              min={25}
              max={300}
              step={5}
              onValueChange={handleZoomChange}
              aria-label="Timeline zoom"
            />
          </div>
          <ZoomIn className="h-3 w-3" />
          <span className="text-[10px] font-mono text-text-muted w-9 text-right tabular-nums">
            {Math.round(viewport.zoom * 100)}%
          </span>
        </div>

        <Divider orientation="vertical" className="h-4" />

        {/* Loop Playback Toggle */}
        <Button
          variant={loop ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={() => timelineManager.setLoop(!loop)}
          aria-label="Toggle loop playback"
          title={loop ? "Looping Enabled" : "Looping Disabled"}
          className={cn(loop && "text-accent border-accent/40")}
        >
          <Repeat className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
