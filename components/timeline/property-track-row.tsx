"use client";

/**
 * MOTION-BOT — Timeline Property Track Row
 * Sub-track row visualizing individual animated properties (Position, Scale, Rotation, Opacity)
 * and their keyframe nodes, consuming current values from the Phase 6 Motion Engine.
 * Part of Phase 7.2: Visual Timeline Interface.
 */

import * as React from "react";
import { defaultMotionEngine } from "@/engine";
import { MotionElement } from "@/types/element";
import { GroupedPropertyTrack } from "./types";
import { KeyframeNode } from "./keyframe-node";

export interface PropertyTrackRowProps {
  element: MotionElement;
  propertyGroup: GroupedPropertyTrack;
  pixelsPerSecond: number;
  currentTime: number;
  timelineWidth: number;
  selectedKeyframeId?: string | null;
  onSelectKeyframe?: (keyframeId: string, trackId?: string) => void;
}

export const PropertyTrackRow: React.FC<PropertyTrackRowProps> = ({
  element,
  propertyGroup,
  pixelsPerSecond,
  currentTime,
  timelineWidth,
  selectedKeyframeId,
  onSelectKeyframe,
}) => {
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
      {/* Left Column: Indented Property Label & Live Evaluated Value */}
      <div className="w-64 border-r border-border shrink-0 px-3 pl-8 flex items-center justify-between text-[11px] font-mono text-text-muted select-none">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-border-active">↳</span>
          <span className="truncate text-text-secondary">{propertyGroup.name}</span>
        </div>

        {evaluatedValueDisplay && (
          <span className="text-[10px] text-accent/80 font-mono shrink-0 bg-accent/10 px-1 py-0.2 rounded-xs">
            {evaluatedValueDisplay}
          </span>
        )}
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
            isSelected={kf.id === selectedKeyframeId}
            propertyName={propertyGroup.name}
            onClick={() => onSelectKeyframe?.(kf.id, propertyGroup.id)}
          />
        ))}
      </div>
    </div>
  );
};
