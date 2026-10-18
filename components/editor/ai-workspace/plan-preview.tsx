"use client";

/**
 * MOTION-BOT — Structured Creative Plan Preview Component
 * Phase 8.1: AI Prompt -> Editor Integration
 *
 * Displays a concise, structured preview of validated creative decisions
 * and scene sequences before modifying the active project.
 * Never exposes private chain-of-thought or raw internal logs.
 */

import * as React from "react";
import {
  Sparkles,
  RotateCcw,
  Edit3,
  Clock,
  Film,
  Type,
  Palette,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StructuredPlanPreviewData } from "./types";

export interface PlanPreviewProps {
  data: StructuredPlanPreviewData;
  onApply: () => void;
  onRegenerate: () => void;
  onEditPrompt: () => void;
  isApplying?: boolean;
}

export const PlanPreview: React.FC<PlanPreviewProps> = ({
  data,
  onApply,
  onRegenerate,
  onEditPrompt,
  isApplying = false,
}) => {
  return (
    <div className="flex flex-col h-full overflow-hidden text-text-primary text-xs select-none">
      {/* Header banner */}
      <div className="p-3 border-b border-border bg-accent/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-xs bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-wider text-accent uppercase font-semibold">
              Validated Creative Plan
            </div>
            <div className="text-small font-semibold text-text-primary truncate max-w-[200px]" title={data.title}>
              {data.title || "Untitled Motion Plan"}
            </div>
          </div>
        </div>
        <span className="rounded-xs bg-surface border border-border px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
          Ready
        </span>
      </div>

      {/* Structured Parameters Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xs border border-border bg-surface-elevated/40 p-2 space-y-1">
            <div className="flex items-center gap-1.5 text-text-muted text-[10px] font-mono uppercase">
              <Clock className="h-3 w-3 text-accent" />
              <span>Duration</span>
            </div>
            <div className="text-xs font-semibold text-text-primary">
              {data.durationSec}s • {data.fps} FPS
            </div>
          </div>

          <div className="rounded-xs border border-border bg-surface-elevated/40 p-2 space-y-1">
            <div className="flex items-center gap-1.5 text-text-muted text-[10px] font-mono uppercase">
              <Film className="h-3 w-3 text-accent" />
              <span>Scenes</span>
            </div>
            <div className="text-xs font-semibold text-text-primary">
              {data.scenesCount} {data.scenesCount === 1 ? "Scene" : "Scenes"} ({data.aspectRatio})
            </div>
          </div>
        </div>

        {/* Style & Visual Direction */}
        <div className="space-y-1.5 rounded-xs border border-border bg-surface-elevated/20 p-2.5">
          <div className="text-[10px] font-mono uppercase text-text-muted flex items-center justify-between">
            <span>Visual Style</span>
            <span className="text-accent font-semibold">{data.style}</span>
          </div>
          <div className="text-[11px] text-text-secondary leading-relaxed">
            Dynamic spring physics, high-contrast dark aesthetic with kinetic brand reveals.
          </div>
        </div>

        {/* Typography & Motion Direction */}
        <div className="space-y-2 rounded-xs border border-border bg-surface-elevated/20 p-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-muted flex items-center gap-1.5">
              <Type className="h-3 w-3 text-accent" />
              <span>Typography</span>
            </span>
            <span className="font-mono text-text-primary font-medium">{data.typography}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-muted flex items-center gap-1.5">
              <Layers className="h-3 w-3 text-accent" />
              <span>Motion Curves</span>
            </span>
            <span className="font-mono text-text-primary font-medium">{data.motionStyle}</span>
          </div>
        </div>

        {/* Color Palette Swatches */}
        {data.colorPalette && data.colorPalette.length > 0 && (
          <div className="space-y-2 rounded-xs border border-border bg-surface-elevated/20 p-2.5">
            <div className="text-[10px] font-mono uppercase text-text-muted flex items-center gap-1.5">
              <Palette className="h-3 w-3 text-accent" />
              <span>Color Direction</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {data.colorPalette.map((color, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-xs border border-border bg-surface"
                >
                  <span
                    className="h-3 w-3 rounded-full border border-border shadow-xs"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-mono text-[10px] text-text-secondary">{color}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scene Sequence Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-text-muted">
            <span>Scene Sequence</span>
            <span>{data.elementsCount} Motion Elements</span>
          </div>
          <div className="space-y-1.5">
            {data.scenes.map((scene, idx) => (
              <div
                key={scene.id || idx}
                className="flex items-center justify-between p-2 rounded-xs border border-border bg-surface hover:bg-surface-elevated/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-accent font-semibold">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[11px] font-medium text-text-primary">
                    {scene.name.replace(/^Scene\s*\d+\s*[—\-:]\s*/i, "")}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-text-muted">{scene.duration}s</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-3 border-t border-border bg-surface shrink-0 space-y-2">
        <Button
          variant="primary"
          size="sm"
          className="w-full gap-2 font-semibold shadow-subtle text-xs"
          onClick={onApply}
          disabled={isApplying}
        >
          {isApplying ? (
            <>
              <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
              <span>Applying Plan to Project...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Apply to Project</span>
            </>
          )}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-xs text-text-secondary"
            onClick={onRegenerate}
            disabled={isApplying}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Regenerate</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-xs text-text-secondary"
            onClick={onEditPrompt}
            disabled={isApplying}
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit Prompt</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
