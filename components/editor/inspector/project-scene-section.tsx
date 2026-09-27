"use client";

/**
 * MOTION-BOT — Project & Scene Overview Inspector Section
 * Displays current project settings and active scene information when no element is selected.
 * Part of Phase 5.5: Properties / Inspector Panel.
 */

import * as React from "react";
import { Film, Monitor, Clock, Layers, Palette } from "lucide-react";
import { Project } from "@/types/project";
import { Scene, SceneBackground } from "@/types/scene";
import { Input } from "@/components/ui/input";
import { Divider } from "@/components/ui/divider";

export interface ProjectSceneSectionProps {
  project?: Project;
  activeScene?: Scene;
  onUpdateSceneBackground?: (bg: SceneBackground) => void;
}

export const ProjectSceneSection: React.FC<ProjectSceneSectionProps> = ({
  project,
  activeScene,
  onUpdateSceneBackground,
}) => {
  const width = project?.width ?? 1920;
  const height = project?.height ?? 1080;
  const fps = project?.fps ?? 30;
  const duration = activeScene?.duration ?? project?.duration ?? 5.0;
  const durationFrames = activeScene?.durationFrames ?? Math.round(duration * fps);
  const elementsCount = activeScene?.elements?.length ?? 0;

  // Compute aspect ratio string
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const aspectW = width / divisor;
  const aspectH = height / divisor;
  const aspectRatio = `${aspectW}:${aspectH}`;

  const currentBgColor =
    activeScene?.background?.type === "solid"
      ? activeScene.background.color || "#000000"
      : "#000000";

  return (
    <div className="p-3.5 space-y-4 text-text-primary" data-testid="project-scene-inspector">
      {/* Composition Overview Header */}
      <div>
        <div className="flex items-center gap-1.5 text-text-secondary text-[11px] font-medium uppercase tracking-wider mb-1">
          <Film className="h-3 w-3 text-accent" />
          <span>Active Composition</span>
        </div>
        <p className="text-small font-semibold text-text-primary truncate">
          {project?.name || "Untitled Motion Project"}
        </p>
        <p className="text-[11px] text-text-muted mt-0.5 truncate">
          Scene: {activeScene?.name || "Scene 1"}
        </p>
      </div>

      <Divider />

      {/* Canvas Dimensions & Aspect Ratio */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-text-secondary text-[11px] font-medium">
          <Monitor className="h-3 w-3 text-text-muted" />
          <span>Stage Dimensions</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-xs bg-surface-elevated/40 border border-border">
            <span className="text-[10px] text-text-muted block">Resolution</span>
            <span className="text-[12px] font-mono font-medium text-text-primary">
              {width} × {height}
            </span>
          </div>
          <div className="p-2 rounded-xs bg-surface-elevated/40 border border-border">
            <span className="text-[10px] text-text-muted block">Aspect Ratio</span>
            <span className="text-[12px] font-mono font-medium text-text-primary">
              {aspectRatio}
            </span>
          </div>
        </div>
      </div>

      {/* Frame Rate & Duration */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-text-secondary text-[11px] font-medium">
          <Clock className="h-3 w-3 text-text-muted" />
          <span>Timing & Playback</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-xs bg-surface-elevated/40 border border-border">
            <span className="text-[10px] text-text-muted block">Frame Rate</span>
            <span className="text-[12px] font-mono font-medium text-text-primary">
              {fps} fps
            </span>
          </div>
          <div className="p-2 rounded-xs bg-surface-elevated/40 border border-border">
            <span className="text-[10px] text-text-muted block">Duration</span>
            <span className="text-[12px] font-mono font-medium text-text-primary">
              {duration.toFixed(1)}s ({durationFrames}f)
            </span>
          </div>
        </div>
      </div>

      <Divider />

      {/* Scene Background Color */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-text-secondary text-[11px] font-medium">
          <Palette className="h-3 w-3 text-text-muted" />
          <span>Scene Background</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-xs border border-border shadow-xs shrink-0"
            style={{ backgroundColor: currentBgColor }}
          />
          <Input
            value={currentBgColor}
            onChange={(e) =>
              onUpdateSceneBackground?.({
                type: "solid",
                color: e.target.value,
              })
            }
            className="font-mono text-[11px]"
            placeholder="#000000"
          />
        </div>
      </div>

      {/* Elements Count */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-text-secondary text-[11px] font-medium">
          <Layers className="h-3 w-3 text-text-muted" />
          <span>Elements in Scene</span>
        </div>
        <div className="p-2 rounded-xs bg-surface-elevated/40 border border-border text-[11px] text-text-secondary">
          <span className="font-mono font-medium text-text-primary">{elementsCount}</span>{" "}
          {elementsCount === 1 ? "element" : "elements"} on stage
        </div>
      </div>
    </div>
  );
};
