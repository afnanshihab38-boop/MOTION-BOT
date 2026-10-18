"use client";

/**
 * MOTION-BOT — Timeline Property Track Row
 * Sub-track row visualizing individual animated properties (Position, Scale, Rotation, Opacity)
 * and their keyframe nodes, consuming current values from the Phase 6 Motion Engine.
 * Part of Phase 7.2: Visual Timeline Interface.
 */

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { defaultMotionEngine } from "@/engine";
import { MotionElement } from "@/types/element";
import { AnimatableProperty } from "@/types/animation";
import { GroupedPropertyTrack } from "./types";
import { KeyframeNode } from "./keyframe-node";

export interface PropertyTrackRowProps {
  element: MotionElement;
  propertyGroup: GroupedPropertyTrack;
  pixelsPerSecond: number;
  currentTime: number;
  fps?: number;
  timelineWidth: number;
  selectedKeyframeId?: string | null;
  onSelectKeyframe?: (keyframeId: string, trackId?: string) => void;
  onAddKeyframe?: (elementId: string, property: AnimatableProperty, time: number) => void;
  onDeleteKeyframe?: (elementId: string, keyframeId: string) => void;
  onMoveKeyframe?: (elementId: string, keyframeId: string, newTime: number) => void;
}

export const PropertyTrackRow: React.FC<PropertyTrackRowProps> = ({
  element,
  propertyGroup,
  pixelsPerSecond,
  currentTime,
  fps = 30,
  timelineWidth,
  selectedKeyframeId,
  onSelectKeyframe,
  onAddKeyframe,
  onDeleteKeyframe,
  onMoveKeyframe,
}) => {
  // Check if selected keyframe belongs to this property group
  const selectedKeyframe = React.useMemo(() => {
    if (!selectedKeyframeId) return null;
    return propertyGroup.keyframes.find((k) => k.id === selectedKeyframeId) || null;
  }, [propertyGroup.keyframes, selectedKeyframeId]);

  const handleAddKeyframeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAddKeyframe) return;
    // Add keyframe for each primary property in this group
    for (const prop of propertyGroup.properties) {
      onAddKeyframe(element.id, prop, currentTime);
    }
  };

  const handleDeleteSelectedKeyframe = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedKeyframe && onDeleteKeyframe) {
      onDeleteKeyframe(element.id, selectedKeyframe.id);
    }
  };

  // Consume evaluated property value directly from Phase 6 Motion Engine (never recalculating)
  const evaluatedValueDisplay = React.useMemo(() => {
    switch (propertyGroup.category) {
      case "position": {
        const x = defaultMotionEngine.evaluateProperty<number>(element, "x", currentTime);
        const y = defaultMotionEngine.evaluateProperty<number>(element, "y", currentTime);
        const valX = typeof x === "number" ? Math.round(x) : Math.round(element.transform?.x ?? 0);
        const valY = typeof y === "number" ? Math.round(y) : Math.round(element.transform?.y ?? 0);
        return `${valX}, ${valY}`;
      }
      case "scale": {
        const sx = defaultMotionEngine.evaluateProperty<number>(element, "scaleX", currentTime);
        const valSx = typeof sx === "number" ? sx : (element.transform?.scaleX ?? 1);
        return `${valSx.toFixed(2)}×`;
      }
      case "rotation": {
        const rot = defaultMotionEngine.evaluateProperty<number>(element, "rotation", currentTime);
        const valRot = typeof rot === "number" ? Math.round(rot) : Math.round(element.transform?.rotation ?? 0);
        return `${valRot}°`;
      }
      case "opacity": {
        const op = defaultMotionEngine.evaluateProperty<number>(element, "opacity", currentTime);
        const valOp = typeof op === "number" ? op : (element.appearance?.opacity ?? 1);
        return `${Math.round(valOp * 100)}%`;
      }
      case "dimensions": {
        const w = defaultMotionEngine.evaluateProperty<number>(element, "width", currentTime);
        const h = defaultMotionEngine.evaluateProperty<number>(element, "height", currentTime);
        const valW = typeof w === "number" ? Math.round(w) : Math.round(element.transform?.width ?? 0);
        const valH = typeof h === "number" ? Math.round(h) : Math.round(element.transform?.height ?? 0);
        return `${valW}×${valH}`;
      }
      default:
        return null;
    }
  }, [element, propertyGroup.category, currentTime]);

  return (
    <div className="h-6 flex items-stretch border-b border-border-subtle/30 bg-[#07080B] hover:bg-surface-elevated/20 transition-colors">
      {/* Left Column: Indented Property Label, Live Value & Add/Delete buttons */}
      <div className="w-64 border-r border-border shrink-0 px-3 pl-8 flex items-center justify-between text-[11px] font-mono text-text-muted select-none">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-border-active">↳</span>
          <span className="truncate text-text-secondary">{propertyGroup.name}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {evaluatedValueDisplay && (
            <span className="text-[10px] text-accent/80 font-mono shrink-0 bg-accent/10 px-1 py-0.2 rounded-xs">
              {evaluatedValueDisplay}
            </span>
          )}

          {/* Delete keyframe button if one is selected in this group */}
          {selectedKeyframe && (
            <button
              type="button"
              onClick={handleDeleteSelectedKeyframe}
              title={`Delete keyframe at ${selectedKeyframe.time.toFixed(2)}s`}
              className="p-0.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
              aria-label="Delete keyframe"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}

          {/* Add keyframe button at current playhead */}
          <button
            type="button"
            onClick={handleAddKeyframeClick}
            title={`Add keyframe at ${currentTime.toFixed(2)}s`}
            className="p-0.5 text-text-muted hover:text-accent hover:bg-accent/20 rounded transition-colors"
            aria-label="Add keyframe"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Right Column: Keyframe Lane */}
      <div
        style={{ width: `${timelineWidth}px` }}
        className="relative shrink-0 overflow-hidden"
      >
        {propertyGroup.keyframes.map((kf) => (
          <KeyframeNode
            key={kf.id}
            keyframe={kf}
            pixelsPerSecond={pixelsPerSecond}
            fps={fps}
            isSelected={kf.id === selectedKeyframeId}
            propertyName={propertyGroup.name}
            onClick={() => onSelectKeyframe?.(kf.id, propertyGroup.id)}
            onMoveKeyframe={(_, newTime) => onMoveKeyframe?.(element.id, kf.id, newTime)}
            onCommitMove={(_, finalTime) => onMoveKeyframe?.(element.id, kf.id, finalTime)}
          />
        ))}
      </div>
    </div>
  );
};
