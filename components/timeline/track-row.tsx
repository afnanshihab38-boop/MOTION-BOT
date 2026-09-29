"use client";

/**
 * MOTION-BOT — Timeline Element Track Row
 * Primary track row representing a motion element, its clip duration span,
 * expansion toggles for property sub-tracks, and keyframe summaries.
 * Part of Phase 7.2: Visual Timeline Interface.
 */

import * as React from "react";
import {
  ChevronRight,
  ChevronDown,
  Type,
  Square,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ElementTimelineTrack } from "./types";
import { PropertyTrackRow } from "./property-track-row";

export interface TrackRowProps {
  track: ElementTimelineTrack;
  pixelsPerSecond: number;
  timelineWidth: number;
  duration?: number;
  currentTime: number;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelectTrack: () => void;
  onToggleVisibility?: (elementId: string) => void;
  onToggleLock?: (elementId: string) => void;
  selectedKeyframeId?: string | null;
  onSelectKeyframe?: (keyframeId: string, trackId?: string) => void;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  pixelsPerSecond,
  timelineWidth,
  currentTime,
  isSelected,
  isExpanded,
  onToggleExpand,
  onSelectTrack,
  onToggleVisibility,
  onToggleLock,
  selectedKeyframeId,
  onSelectKeyframe,
}) => {
  // Select icon matching element type
  const ElementIcon = React.useMemo(() => {
    switch (track.type) {
      case "text":
        return Type;
      case "shape":
        return Square;
      case "image":
        return ImageIcon;
      case "logo":
        return Sparkles;
      default:
        return Layers;
    }
  }, [track.type]);

  const clipStartPx = Math.max(0, track.startSec * pixelsPerSecond);
  const clipWidthPx = Math.max(16, track.durationSec * pixelsPerSecond);
  const hasProperties = track.propertyGroups.length > 0;

  return (
    <div className="flex flex-col border-b border-border-subtle/50">
      {/* 1. Main Element Track Row */}
      <div
        onClick={onSelectTrack}
        className={cn(
          "h-8 flex items-stretch cursor-pointer select-none transition-colors duration-fast",
          isSelected
            ? "bg-surface-elevated text-text-primary"
            : "hover:bg-surface-elevated/40 text-text-secondary bg-[#08090C]"
        )}
      >
        {/* Left Column (w-64): Element Metadata & Controls */}
        <div className="w-64 border-r border-border shrink-0 px-2 flex items-center justify-between gap-1 overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Expand / Collapse Property Tracks Button */}
            {hasProperties ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                aria-label={isExpanded ? "Collapse property tracks" : "Expand property tracks"}
                className="p-0.5 text-text-muted hover:text-text-primary transition-colors shrink-0"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <div className="w-4 shrink-0" />
            )}

            {/* Element Type Icon */}
            <ElementIcon className="h-3.5 w-3.5 shrink-0 text-text-muted" />

            {/* Element Name */}
            <span className="truncate text-[12px] font-medium text-text-primary">
              {track.name}
            </span>

            {/* Active Animations Indicator Badge */}
            {track.isAnimated && (
              <span className="shrink-0 text-[9px] font-mono px-1 py-0.2 rounded-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {track.propertyGroups.length}
              </span>
            )}
          </div>

          {/* Visibility and Lock Toggles */}
          <div
            className="flex items-center gap-0.5 text-text-muted shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onToggleVisibility?.(track.elementId)}
              className="p-1 hover:text-text-primary transition-colors"
              aria-label={track.visible ? "Hide element" : "Show element"}
            >
              {track.visible ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3 text-text-muted/40" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onToggleLock?.(track.elementId)}
              className="p-1 hover:text-text-primary transition-colors"
              aria-label={track.locked ? "Unlock element" : "Lock element"}
            >
              {track.locked ? (
                <Lock className="h-3 w-3 text-warning" />
              ) : (
                <Unlock className="h-3 w-3 text-text-muted/40" />
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Track Clip Span & Keyframe Summary */}
        <div
          style={{ width: `${timelineWidth}px` }}
          className="relative shrink-0 flex items-center overflow-hidden"
        >
          {/* Visual Element Clip Span Bar */}
          <div
            style={{
              left: `${clipStartPx}px`,
              width: `${clipWidthPx}px`,
            }}
            className={cn(
              "absolute h-5 rounded-xs border flex items-center px-2 select-none overflow-hidden",
              isSelected
                ? "bg-accent/25 border-accent shadow-xs"
                : "bg-surface-elevated/70 border-border hover:border-border-active"
            )}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 mr-1.5"
              style={{ backgroundColor: track.color }}
            />
            <span className="text-[10px] font-medium truncate text-text-secondary">
              {track.name}
            </span>
          </div>

          {/* Keyframe Summary Nodes (Visible on main track bar when collapsed) */}
          {!isExpanded &&
            track.allKeyframeTimes.map((time, idx) => {
              const kfX = time * pixelsPerSecond;
              return (
                <div
                  key={`${track.elementId}-kf-${idx}-${time}`}
                  style={{ left: `${kfX}px` }}
                  title={`Keyframe at ${time.toFixed(2)}s`}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-accent border border-surface shadow-xs pointer-events-none z-10"
                />
              );
            })}
        </div>
      </div>

      {/* 2. Expanded Property Sub-Tracks (Position, Scale, Rotation, Opacity) */}
      {isExpanded &&
        track.propertyGroups.map((group) => (
          <PropertyTrackRow
            key={`${track.elementId}-${group.id}`}
            element={track.element}
            propertyGroup={group}
            pixelsPerSecond={pixelsPerSecond}
            currentTime={currentTime}
            timelineWidth={timelineWidth}
            selectedKeyframeId={selectedKeyframeId}
            onSelectKeyframe={onSelectKeyframe}
          />
        ))}
    </div>
  );
};
