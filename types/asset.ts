/**
 * MOTION-BOT — Asset Data Architecture
 * Framework-independent type definitions for media and project assets.
 * Part of Phase 3.1: Data Architecture & Type System.
 */

/**
 * Unique identifier for a media or graphic asset.
 */
export type AssetId = string;

/**
 * Supported asset media types.
 */
export type AssetType =
  | "image"
  | "video"
  | "audio"
  | "font"
  | "logo"
  | "svg"
  | "lottie";

/**
 * Provenance of the asset within MOTION-BOT.
 */
export type AssetSource =
  | "upload"
  | "ai-generated"
  | "library"
  | "brand-kit"
  | "url";

/**
 * Technical metadata for an asset.
 */
export interface AssetMetadata {
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  durationFrames?: number;
  fps?: number;
  aspectRatio?: number;
  sampleRate?: number;
  channels?: number;
  checksum?: string;
  originalFileName?: string;
  customFields?: Record<string, string | number | boolean | null>;
  [key: string]: unknown;
}

/**
 * Root asset entity representing imported, generated, or system media.
 */
export interface Asset {
  id: AssetId;
  name: string;
  type: AssetType;
  source: AssetSource;
  url: string;
  mimeType?: string; // Top-level convenience mapping
  width?: number; // Top-level convenience mapping
  height?: number; // Top-level convenience mapping
  duration?: number; // Top-level convenience duration in seconds
  thumbnailUrl?: string;
  metadata: AssetMetadata;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}
