/**
 * MOTION-BOT — Render & Export Architecture Types
 * Data definitions and interfaces for preview evaluation, frame rendering,
 * and media export pipelines.
 * Part of Phase 8.8: Preview + Rendering + Export.
 */

import { Project } from "@/types/project";
import { Scene } from "@/types/scene";
import { Asset } from "@/types/asset";

/**
 * Supported output formats for rendering and export.
 */
export type ExportFormat = "png" | "jpeg" | "webp" | "webm" | "mp4" | "frames";

/**
 * Scope of content to export.
 */
export type ExportScope = "current-frame" | "current-scene" | "entire-project";

/**
 * Export quality presets.
 */
export type ExportQuality = "draft" | "standard" | "high" | "maximum";

/**
 * Strict progression states of the export pipeline.
 */
export type ExportProgressState =
  | "preparing"
  | "rendering"
  | "exporting"
  | "complete"
  | "failed";

/**
 * Progress notification snapshot dispatched during export lifecycle.
 */
export interface ExportProgress {
  state: ExportProgressState;
  currentFrame: number;
  totalFrames: number;
  percent: number; // 0 to 100
  message: string;
  error?: string;
  timeRemainingSec?: number;
}

/**
 * Configuration options for rendering and exporting.
 */
export interface ExportOptions {
  format: ExportFormat;
  scope: ExportScope;
  sceneId?: string;
  time?: number; // timestamp in seconds for still frame (defaults to current playhead)
  width?: number; // overrides project width if provided
  height?: number; // overrides project height if provided
  fps?: number; // overrides project fps if provided
  quality?: number; // 0.1 to 1.0 (defaults to 0.92)
  qualityPreset?: ExportQuality;
  backgroundColor?: string;
  filename?: string;
}

/**
 * Successful or failed result of an export operation.
 */
export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  filename: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  frameCount: number;
  blob?: Blob | null;
  dataUrl?: string;
  downloadUrl?: string;
  fileSizeBytes?: number;
  error?: string;
  warnings: string[];
  exportedAt: string; // ISO 8601
}

/**
 * Options for single frame rendering.
 */
export interface RenderFrameOptions {
  width: number;
  height: number;
  backgroundColor?: string;
  drawGuides?: boolean;
}

/**
 * Interface for canvas 2D drawing abstraction supporting browser and Node environments.
 */
export interface ICanvasContext2D {
  width: number;
  height: number;
  canvas: unknown;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angleRad: number): void;
  scale(x: number, y: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number
  ): void;
  roundRect?(
    x: number,
    y: number,
    w: number,
    h: number,
    radii?: number | number[]
  ): void;
  fill(): void;
  stroke(): void;
  fillText(text: string, x: number, y: number): void;
  strokeText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
  createLinearGradient(
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): { addColorStop(offset: number, color: string): void };
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number
  ): { addColorStop(offset: number, color: string): void };
  drawImage(image: unknown, dx: number, dy: number, dw?: number, dh?: number): void;
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  globalAlpha: number;
  globalCompositeOperation: string;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  setLineDash(segments: number[]): void;
}
