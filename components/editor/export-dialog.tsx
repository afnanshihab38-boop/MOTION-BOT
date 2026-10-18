"use client";

/**
 * MOTION-BOT — Export Dialog Modal
 * Interactive modal for selecting formats (PNG, JPEG, WebP, WebM, Frames),
 * configuring resolution & scope, and observing deterministic state progressions:
 * Preparing -> Rendering -> Exporting -> Complete (or Failed).
 * Part of Phase 8.8: Preview + Rendering + Export.
 */

import * as React from "react";
import {
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
  Image as ImageIcon,
  Clock,
  Layers,
  Settings2,
  X,
  FileVideo,
  FileImage,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Project } from "@/types/project";
import {
  ExportFormat,
  ExportOptions,
  ExportProgress,
  ExportResult,
  ExportScope,
} from "@/services/render/types";
import {
  executeExport,
  downloadExportResult,
} from "@/services/render/export-pipeline";
import { sanitizeUserError } from "@/lib/error-sanitizer";
import { cn } from "@/lib/utils";

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  activeSceneId?: string;
  currentTime?: number;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  project,
  activeSceneId,
  currentTime = 0,
}) => {
  const [format, setFormat] = React.useState<ExportFormat>("png");
  const [scope, setScope] = React.useState<ExportScope>("entire-project");
  const [resolutionPreset, setResolutionPreset] = React.useState<"native" | "1080p" | "720p">("native");
  const [qualityPreset, setQualityPreset] = React.useState<"draft" | "high" | "maximum">("high");

  const [progress, setProgress] = React.useState<ExportProgress | null>(null);
  const [result, setResult] = React.useState<ExportResult | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);

  // Reset progress and results when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setProgress(null);
      setResult(null);
      setIsExporting(false);
    }
  }, [isOpen]);

  // Escape key handler
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isExporting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isExporting, onClose]);

  if (!isOpen) return null;

  // Resolve target dimensions
  let targetWidth = project.width;
  let targetHeight = project.height;
  if (resolutionPreset === "1080p") {
    if (project.width < project.height) {
      targetWidth = 1080;
      targetHeight = 1920;
    } else {
      targetWidth = 1920;
      targetHeight = 1080;
    }
  } else if (resolutionPreset === "720p") {
    if (project.width < project.height) {
      targetWidth = 720;
      targetHeight = 1280;
    } else {
      targetWidth = 1280;
      targetHeight = 720;
    }
  }

  // Calculate scope duration & frame count estimate
  let estimatedDuration = project.duration;
  if (scope === "current-frame") {
    estimatedDuration = 1 / project.fps;
  } else if (scope === "current-scene") {
    const sc = project.scenes.find((s) => s.id === activeSceneId) || project.scenes[0];
    estimatedDuration = sc?.duration ?? project.duration;
  }
  const estimatedFrames =
    scope === "current-frame" ? 1 : Math.max(1, Math.round(estimatedDuration * project.fps));

  // Quality numeric scale
  const qualityNumeric =
    qualityPreset === "draft" ? 0.6 : qualityPreset === "maximum" ? 1.0 : 0.92;

  // Trigger export
  const handleStartExport = async () => {
    setIsExporting(true);
    setResult(null);

    const exportOptions: ExportOptions = {
      format,
      scope,
      sceneId: activeSceneId,
      time: currentTime,
      width: targetWidth,
      height: targetHeight,
      fps: project.fps,
      quality: qualityNumeric,
      qualityPreset,
    };

    const res = await executeExport(project, exportOptions, (p) => {
      setProgress(p);
    });

    setResult(res);
    setIsExporting(false);
  };

  const handleDownload = () => {
    if (result && result.success) {
      downloadExportResult(result);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-elevated/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <h2 id="export-dialog-title" className="text-sm font-semibold text-text-primary">
                Export Motion Project
              </h2>
              <p className="text-xs text-text-muted">
                Render and export production-ready media from current project state.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            disabled={isExporting}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* STATE: IDLE / CONFIGURATION */}
          {!isExporting && !result && (
            <>
              {/* Format Selection */}
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-2">
                  Export Format
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormat("png");
                      if (scope === "entire-project") setScope("current-frame");
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all",
                      format === "png"
                        ? "border-accent bg-accent/10 text-accent font-semibold shadow-xs"
                        : "border-border bg-surface-elevated/50 text-text-secondary hover:text-text-primary hover:border-border-hover"
                    )}
                  >
                    <FileImage className="h-5 w-5 mb-1.5" />
                    <span className="text-xs">PNG Image</span>
                    <span className="text-[10px] text-text-muted font-normal">Lossless Still</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormat("jpeg");
                      if (scope === "entire-project") setScope("current-frame");
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all",
                      format === "jpeg"
                        ? "border-accent bg-accent/10 text-accent font-semibold shadow-xs"
                        : "border-border bg-surface-elevated/50 text-text-secondary hover:text-text-primary hover:border-border-hover"
                    )}
                  >
                    <ImageIcon className="h-5 w-5 mb-1.5" />
                    <span className="text-xs">JPEG Image</span>
                    <span className="text-[10px] text-text-muted font-normal">Compressed Still</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormat("webm");
                      if (scope === "current-frame") setScope("entire-project");
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all",
                      format === "webm"
                        ? "border-accent bg-accent/10 text-accent font-semibold shadow-xs"
                        : "border-border bg-surface-elevated/50 text-text-secondary hover:text-text-primary hover:border-border-hover"
                    )}
                  >
                    <FileVideo className="h-5 w-5 mb-1.5" />
                    <span className="text-xs">WebM Video</span>
                    <span className="text-[10px] text-text-muted font-normal">HTML5 Motion</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormat("frames");
                      if (scope === "current-frame") setScope("entire-project");
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all",
                      format === "frames"
                        ? "border-accent bg-accent/10 text-accent font-semibold shadow-xs"
                        : "border-border bg-surface-elevated/50 text-text-secondary hover:text-text-primary hover:border-border-hover"
                    )}
                  >
                    <Film className="h-5 w-5 mb-1.5" />
                    <span className="text-xs">Frame Sequence</span>
                    <span className="text-[10px] text-text-muted font-normal">PNG Sequence</span>
                  </button>
                </div>
              </div>

              {/* Scope Selection */}
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-2">
                  Render Scope
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setScope("entire-project")}
                    className={cn(
                      "px-3 py-2 text-xs rounded-md border font-medium transition-all text-center",
                      scope === "entire-project"
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-surface-elevated/40 text-text-secondary hover:text-text-primary"
                    )}
                  >
                    Entire Project
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope("current-scene")}
                    className={cn(
                      "px-3 py-2 text-xs rounded-md border font-medium transition-all text-center",
                      scope === "current-scene"
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-surface-elevated/40 text-text-secondary hover:text-text-primary"
                    )}
                  >
                    Active Scene
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope("current-frame")}
                    className={cn(
                      "px-3 py-2 text-xs rounded-md border font-medium transition-all text-center",
                      scope === "current-frame"
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-surface-elevated/40 text-text-secondary hover:text-text-primary"
                    )}
                  >
                    Current Frame
                  </button>
                </div>
              </div>

              {/* Resolution & Quality Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1.5">
                    Resolution
                  </label>
                  <select
                    value={resolutionPreset}
                    onChange={(e) => setResolutionPreset(e.target.value as "native" | "1080p" | "720p")}
                    className="w-full h-8 px-2 text-xs bg-surface-elevated border border-border rounded-md text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="native">
                      Project Native ({project.width}x{project.height})
                    </option>
                    <option value="1080p">Full HD 1080p</option>
                    <option value="720p">HD 720p</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1.5">
                    Quality
                  </label>
                  <select
                    value={qualityPreset}
                    onChange={(e) => setQualityPreset(e.target.value as "draft" | "high" | "maximum")}
                    className="w-full h-8 px-2 text-xs bg-surface-elevated border border-border rounded-md text-text-primary focus:outline-none focus:border-accent"
                  >
                    <option value="draft">Draft (Fast Render)</option>
                    <option value="high">High (Recommended)</option>
                    <option value="maximum">Maximum (Production)</option>
                  </select>
                </div>
              </div>

              {/* Summary Specs Card */}
              <div className="rounded-lg border border-border bg-surface-elevated/30 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-text-muted">
                  <Settings2 className="h-3.5 w-3.5" />
                  <span>
                    Resolution:{" "}
                    <strong className="text-text-primary font-mono font-medium">
                      {targetWidth}x{targetHeight}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-text-muted">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Duration:{" "}
                    <strong className="text-text-primary font-mono font-medium">
                      {estimatedDuration.toFixed(2)}s
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-text-muted">
                  <Layers className="h-3.5 w-3.5" />
                  <span>
                    Frames:{" "}
                    <strong className="text-text-primary font-mono font-medium">
                      {estimatedFrames} @ {project.fps} FPS
                    </strong>
                  </span>
                </div>
              </div>
            </>
          )}

          {/* STATE: PREPARING / RENDERING / EXPORTING */}
          {isExporting && progress && (
            <div className="py-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {progress.state === "preparing" ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-500/20 text-blue-300 uppercase tracking-wide">
                      Preparing
                    </span>
                  ) : progress.state === "rendering" ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 uppercase tracking-wide">
                      Rendering
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/20 text-amber-300 uppercase tracking-wide">
                      Exporting
                    </span>
                  )}
                  <span className="text-xs text-text-secondary">{progress.message}</span>
                </div>
                <span className="text-xs font-mono font-semibold text-text-primary">
                  {progress.percent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden border border-border">
                <div
                  className="h-full bg-gradient-to-r from-accent to-indigo-400 transition-all duration-150 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-text-muted font-mono">
                <span>
                  Frame {progress.currentFrame} of {progress.totalFrames}
                </span>
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin text-accent" />
                  Processing...
                </span>
              </div>
            </div>
          )}

          {/* STATE: COMPLETE */}
          {!isExporting && result && result.success && (
            <div className="py-5 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  Export Completed Successfully
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Output file ready:{" "}
                  <span className="font-mono text-text-primary font-medium">
                    {result.filename}
                  </span>
                </p>
              </div>

              <div className="rounded-lg border border-border bg-surface-elevated/30 p-3 max-w-sm mx-auto text-xs grid grid-cols-2 gap-2 text-left">
                <div>
                  <span className="text-text-muted block text-[10px]">FORMAT</span>
                  <span className="font-mono font-medium text-text-primary uppercase">
                    {result.format}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">RESOLUTION</span>
                  <span className="font-mono font-medium text-text-primary">
                    {result.width}x{result.height}
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">FRAMES RENDERED</span>
                  <span className="font-mono font-medium text-text-primary">
                    {result.frameCount} frames
                  </span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">DURATION</span>
                  <span className="font-mono font-medium text-text-primary">
                    {result.duration.toFixed(2)}s
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STATE: FAILED */}
          {!isExporting && result && !result.success && (
            <div className="py-5 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                <AlertCircle className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-rose-300">
                  Export Failed
                </h3>
                <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
                  {sanitizeUserError(result.error, "An unexpected error occurred during rendering.")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-border bg-surface-elevated/40 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isExporting}
          >
            {result?.success ? "Done" : "Cancel"}
          </Button>

          <div className="flex items-center gap-2">
            {result?.success ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setResult(null)}
                >
                  Export Another
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleDownload}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download {result.format.toUpperCase()}</span>
                </Button>
              </>
            ) : result && !result.success ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setResult(null)}
              >
                Try Again
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                disabled={isExporting}
                onClick={handleStartExport}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>
                  {format === "png" || format === "jpeg" || format === "webp"
                    ? "Render Still Frame"
                    : "Render & Export Video"}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
