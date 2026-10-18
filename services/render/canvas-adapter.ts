/**
 * MOTION-BOT — Canvas Adapter
 * Provides a unified Canvas 2D drawing abstraction that works reliably
 * in both browser DOM environments and Node.js / test environments.
 * Part of Phase 8.8: Preview + Rendering + Export.
 */

import { ICanvasContext2D } from "./types";

/**
 * Headless Canvas 2D Context implementation for Node.js / unit tests.
 * Accurately tracks transforms, paths, styles, and drawing operations.
 */
export class HeadlessCanvasContext2D implements ICanvasContext2D {
  public width: number;
  public height: number;
  public canvas: HeadlessCanvas;

  public fillStyle: unknown = "#000000";
  public strokeStyle: unknown = "#000000";
  public lineWidth: number = 1;
  public globalAlpha: number = 1;
  public globalCompositeOperation: string = "source-over";
  public font: string = "10px sans-serif";
  public textAlign: CanvasTextAlign = "left";
  public textBaseline: CanvasTextBaseline = "alphabetic";

  private transformStack: Array<{
    alpha: number;
    matrix: [number, number, number, number, number, number];
  }> = [];

  // Current transform matrix [a, b, c, d, e, f]
  private matrix: [number, number, number, number, number, number] = [1, 0, 0, 1, 0, 0];

  public operations: Array<{ type: string; args: unknown[] }> = [];

  constructor(canvas: HeadlessCanvas, width: number, height: number) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
  }

  public clearRect(x: number, y: number, w: number, h: number): void {
    this.operations.push({ type: "clearRect", args: [x, y, w, h] });
  }

  public fillRect(x: number, y: number, w: number, h: number): void {
    this.operations.push({
      type: "fillRect",
      args: [x, y, w, h, this.fillStyle, this.globalAlpha],
    });
  }

  public strokeRect(x: number, y: number, w: number, h: number): void {
    this.operations.push({
      type: "strokeRect",
      args: [x, y, w, h, this.strokeStyle, this.lineWidth, this.globalAlpha],
    });
  }

  public save(): void {
    this.transformStack.push({
      alpha: this.globalAlpha,
      matrix: [...this.matrix],
    });
    this.operations.push({ type: "save", args: [] });
  }

  public restore(): void {
    const prev = this.transformStack.pop();
    if (prev) {
      this.globalAlpha = prev.alpha;
      this.matrix = [...prev.matrix];
    }
    this.operations.push({ type: "restore", args: [] });
  }

  public translate(x: number, y: number): void {
    this.matrix[4] += this.matrix[0] * x + this.matrix[2] * y;
    this.matrix[5] += this.matrix[1] * x + this.matrix[3] * y;
    this.operations.push({ type: "translate", args: [x, y] });
  }

  public rotate(angleRad: number): void {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const a = this.matrix[0];
    const b = this.matrix[1];
    const c = this.matrix[2];
    const d = this.matrix[3];
    this.matrix[0] = a * cos + c * sin;
    this.matrix[1] = b * cos + d * sin;
    this.matrix[2] = a * -sin + c * cos;
    this.matrix[3] = b * -sin + d * cos;
    this.operations.push({ type: "rotate", args: [angleRad] });
  }

  public scale(x: number, y: number): void {
    this.matrix[0] *= x;
    this.matrix[1] *= x;
    this.matrix[2] *= y;
    this.matrix[3] *= y;
    this.operations.push({ type: "scale", args: [x, y] });
  }

  public beginPath(): void {
    this.operations.push({ type: "beginPath", args: [] });
  }

  public closePath(): void {
    this.operations.push({ type: "closePath", args: [] });
  }

  public moveTo(x: number, y: number): void {
    this.operations.push({ type: "moveTo", args: [x, y] });
  }

  public lineTo(x: number, y: number): void {
    this.operations.push({ type: "lineTo", args: [x, y] });
  }

  public arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ): void {
    this.operations.push({
      type: "arc",
      args: [x, y, radius, startAngle, endAngle],
    });
  }

  public ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number
  ): void {
    this.operations.push({
      type: "ellipse",
      args: [x, y, radiusX, radiusY, rotation, startAngle, endAngle],
    });
  }

  public roundRect(
    x: number,
    y: number,
    w: number,
    h: number,
    radii: number | number[] = 0
  ): void {
    this.operations.push({
      type: "roundRect",
      args: [x, y, w, h, radii],
    });
  }

  public fill(): void {
    this.operations.push({
      type: "fill",
      args: [this.fillStyle, this.globalAlpha],
    });
  }

  public stroke(): void {
    this.operations.push({
      type: "stroke",
      args: [this.strokeStyle, this.lineWidth, this.globalAlpha],
    });
  }

  public fillText(text: string, x: number, y: number): void {
    this.operations.push({
      type: "fillText",
      args: [text, x, y, this.fillStyle, this.font, this.textAlign, this.globalAlpha],
    });
  }

  public strokeText(text: string, x: number, y: number): void {
    this.operations.push({
      type: "strokeText",
      args: [text, x, y, this.strokeStyle, this.font, this.lineWidth, this.globalAlpha],
    });
  }

  public measureText(text: string): { width: number } {
    // Basic font size extraction heuristic from CSS font string
    const match = this.font.match(/(\d+(?:\.\d+)?)px/);
    const fontSize = match ? parseFloat(match[1]) : 16;
    // Approximating average character width to ~0.55 * fontSize
    return { width: text.length * fontSize * 0.55 };
  }

  public createLinearGradient(
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): { addColorStop(offset: number, color: string): void } {
    const stops: Array<{ offset: number; color: string }> = [];
    return {
      addColorStop: (offset: number, color: string) => {
        stops.push({ offset, color });
      },
    };
  }

  public createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number
  ): { addColorStop(offset: number, color: string): void } {
    const stops: Array<{ offset: number; color: string }> = [];
    return {
      addColorStop: (offset: number, color: string) => {
        stops.push({ offset, color });
      },
    };
  }

  public drawImage(image: unknown, dx: number, dy: number, dw?: number, dh?: number): void {
    this.operations.push({
      type: "drawImage",
      args: [image, dx, dy, dw, dh, this.globalAlpha],
    });
  }

  public setLineDash(segments: number[]): void {
    this.operations.push({ type: "setLineDash", args: [segments] });
  }
}

/**
 * Headless Canvas instance for server-side or test environments.
 */
export class HeadlessCanvas {
  public width: number;
  public height: number;
  private context: HeadlessCanvasContext2D;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.context = new HeadlessCanvasContext2D(this, width, height);
  }

  public getContext(contextId: "2d"): ICanvasContext2D {
    return this.context;
  }

  public toDataURL(type: string = "image/png", quality?: number): string {
    // Return a valid mock data URL with embedded dimension and operation metadata
    const opsCount = this.context.operations.length;
    return `data:${type};base64,iVBORw0KGgoAAAANSUhEUgAA${Buffer.from(
      JSON.stringify({
        w: this.width,
        h: this.height,
        ops: opsCount,
        format: type,
        q: quality,
      })
    ).toString("base64")}`;
  }

  public toBlob(
    callback: (blob: Blob | null) => void,
    type: string = "image/png",
    quality?: number
  ): void {
    const dataUrl = this.toDataURL(type, quality);
    if (typeof Blob !== "undefined") {
      const blob = new Blob([dataUrl], { type });
      callback(blob);
    } else {
      callback(null);
    }
  }
}

/**
 * Creates an appropriate canvas instance for the current execution environment.
 * Prefers HTMLCanvasElement in DOM, OffscreenCanvas if available, and HeadlessCanvas otherwise.
 */
export function createRenderCanvas(
  width: number,
  height: number
): {
  canvas: HTMLCanvasElement | HeadlessCanvas;
  ctx: ICanvasContext2D;
} {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));

  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    const canvas = document.createElement("canvas");
    canvas.width = safeWidth;
    canvas.height = safeHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      const adapterCtx = ctx as unknown as ICanvasContext2D;
      adapterCtx.width = safeWidth;
      adapterCtx.height = safeHeight;
      return { canvas, ctx: adapterCtx };
    }
  }

  // Fallback to HeadlessCanvas
  const headless = new HeadlessCanvas(safeWidth, safeHeight);
  return {
    canvas: headless,
    ctx: headless.getContext("2d"),
  };
}

/**
 * Safely converts a canvas to a data URL across environments.
 */
export function canvasToDataURL(
  canvas: HTMLCanvasElement | HeadlessCanvas,
  format: "image/png" | "image/jpeg" | "image/webp" = "image/png",
  quality: number = 0.92
): string {
  if ("toDataURL" in canvas && typeof canvas.toDataURL === "function") {
    return canvas.toDataURL(format, quality);
  }
  return "";
}

/**
 * Safely converts a canvas to a Blob across environments.
 */
export async function canvasToBlob(
  canvas: HTMLCanvasElement | HeadlessCanvas,
  format: "image/png" | "image/jpeg" | "image/webp" = "image/png",
  quality: number = 0.92
): Promise<Blob | null> {
  if ("toBlob" in canvas && typeof canvas.toBlob === "function") {
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), format, quality);
    });
  }

  // Fallback: create blob from data URL
  const dataUrl = canvasToDataURL(canvas, format, quality);
  if (dataUrl && typeof Blob !== "undefined") {
    const parts = dataUrl.split(",");
    const byteString =
      typeof atob !== "undefined"
        ? atob(parts[1])
        : Buffer.from(parts[1], "base64").toString("binary");
    const mimeString = parts[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }

  return null;
}
