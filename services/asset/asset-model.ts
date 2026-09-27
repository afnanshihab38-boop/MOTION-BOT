/**
 * MOTION-BOT — Concrete Asset Model Implementation
 * Pure factory, validation, and reference resolution functions for Assets.
 * Part of Phase 3.3: Element & Asset Model.
 */

import { Asset, AssetType, AssetSource, AssetMetadata } from "@/types/asset";
import { MotionElement } from "@/types/element";
import { isMediaElement } from "../element/element-model";

/**
 * Input arguments for creating a new Asset.
 */
export interface CreateAssetInput {
  id?: string;
  name: string;
  type: AssetType;
  source?: AssetSource;
  url: string;
  thumbnailUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  durationFrames?: number;
  fps?: number;
  tags?: string[];
  metadata?: Partial<AssetMetadata>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Generates a unique asset identifier.
 */
export function generateAssetId(type: AssetType = "image"): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `asset_${type}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `asset_${type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Pure factory to construct a concrete Asset entity with relevant metadata.
 */
export function createAsset(input: CreateAssetInput): Asset {
  const now = new Date().toISOString();
  const id = input.id || generateAssetId(input.type);
  const source: AssetSource = input.source || "upload";

  const defaultMimeTypes: Record<AssetType, string> = {
    image: "image/png",
    video: "video/mp4",
    audio: "audio/mp3",
    font: "font/woff2",
    logo: "image/svg+xml",
    svg: "image/svg+xml",
    lottie: "application/json",
  };

  const mimeType = input.mimeType || input.metadata?.mimeType || defaultMimeTypes[input.type] || "application/octet-stream";
  const sizeBytes = input.sizeBytes !== undefined ? input.sizeBytes : input.metadata?.sizeBytes || 0;

  // Build metadata containing only properties relevant to this asset type
  const metadata: AssetMetadata = {
    mimeType,
    sizeBytes,
    originalFileName: input.metadata?.originalFileName || input.name,
    ...input.metadata,
  };

  if (input.width !== undefined || input.metadata?.width !== undefined) {
    metadata.width = input.width ?? input.metadata?.width;
  }
  if (input.height !== undefined || input.metadata?.height !== undefined) {
    metadata.height = input.height ?? input.metadata?.height;
  }
  if (input.durationSeconds !== undefined || input.metadata?.durationSeconds !== undefined) {
    metadata.durationSeconds = input.durationSeconds ?? input.metadata?.durationSeconds;
  }
  if (input.durationFrames !== undefined || input.metadata?.durationFrames !== undefined) {
    metadata.durationFrames = input.durationFrames ?? input.metadata?.durationFrames;
  }
  if (input.fps !== undefined || input.metadata?.fps !== undefined) {
    metadata.fps = input.fps ?? input.metadata?.fps;
  }
  if (metadata.width && metadata.height) {
    metadata.aspectRatio = metadata.width / metadata.height;
  }

  return {
    id,
    name: input.name,
    type: input.type,
    source,
    url: input.url,
    thumbnailUrl: input.thumbnailUrl,
    mimeType,
    width: metadata.width,
    height: metadata.height,
    duration: metadata.durationSeconds,
    metadata,
    tags: input.tags ? [...input.tags] : [],
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}

/**
 * Specialized factory for Image assets.
 */
export function createImageAsset(
  input: Omit<CreateAssetInput, "type"> & { width?: number; height?: number }
): Asset {
  return createAsset({
    ...input,
    type: "image",
    mimeType: input.mimeType || "image/png",
  });
}

/**
 * Specialized factory for Video assets.
 */
export function createVideoAsset(
  input: Omit<CreateAssetInput, "type"> & {
    width?: number;
    height?: number;
    durationSeconds?: number;
  }
): Asset {
  return createAsset({
    ...input,
    type: "video",
    mimeType: input.mimeType || "video/mp4",
  });
}

/**
 * Specialized factory for Audio assets.
 */
export function createAudioAsset(
  input: Omit<CreateAssetInput, "type"> & { durationSeconds?: number }
): Asset {
  return createAsset({
    ...input,
    type: "audio",
    mimeType: input.mimeType || "audio/mp3",
  });
}

/**
 * Specialized factory for Font assets.
 */
export function createFontAsset(
  input: Omit<CreateAssetInput, "type"> & { fontFamily?: string }
): Asset {
  return createAsset({
    ...input,
    type: "font",
    mimeType: input.mimeType || "font/woff2",
  });
}

/**
 * Specialized factory for Logo assets.
 */
export function createLogoAsset(
  input: Omit<CreateAssetInput, "type"> & { width?: number; height?: number }
): Asset {
  return createAsset({
    ...input,
    type: "logo",
    mimeType: input.mimeType || "image/svg+xml",
  });
}

/**
 * Validates an Asset entity.
 */
export function validateAsset(asset: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!asset || typeof asset !== "object") {
    return { valid: false, errors: ["Asset must be a non-null object"] };
  }

  const a = asset as Partial<Asset>;

  if (!a.id || typeof a.id !== "string") {
    errors.push("Asset requires a valid string id");
  }

  if (!a.name || typeof a.name !== "string" || a.name.trim() === "") {
    errors.push("Asset requires a non-empty name");
  }

  const validTypes: AssetType[] = ["image", "video", "audio", "font", "logo", "svg", "lottie"];
  if (!a.type || !validTypes.includes(a.type)) {
    errors.push(`Asset type must be one of: ${validTypes.join(", ")}`);
  }

  if (!a.url || typeof a.url !== "string") {
    errors.push("Asset requires a valid url");
  }

  if (!a.metadata || typeof a.metadata !== "object") {
    errors.push("Asset requires a metadata object");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// -----------------------------------------------------------------------------
// ASSET REFERENCE RESOLUTION (Element -> Asset)
// -----------------------------------------------------------------------------

/**
 * Resolves the underlying Asset referenced by a media element (Image, Logo, Video, Audio).
 * Guarantees elements maintain only asset references without embedding duplicate payloads.
 */
export function resolveAssetForElement(
  element: MotionElement,
  assets: Asset[]
): Asset | undefined {
  if (!isMediaElement(element)) {
    return undefined;
  }
  return assets.find((asset) => asset.id === element.assetId);
}

/**
 * Checks if a specific asset is currently referenced by any element in a list.
 */
export function isAssetReferenced(
  assetId: string,
  elements: MotionElement[]
): boolean {
  return elements.some(
    (el) => isMediaElement(el) && el.assetId === assetId
  );
}

/**
 * Returns all assets that are currently referenced by elements in a composition.
 */
export function getReferencedAssets(
  elements: MotionElement[],
  assets: Asset[]
): Asset[] {
  const referencedIds = new Set<string>();

  for (const el of elements) {
    if (isMediaElement(el)) {
      referencedIds.add(el.assetId);
    }
  }

  return assets.filter((asset) => referencedIds.has(asset.id));
}

/**
 * Returns all assets in a project that are currently unreferenced (candidates for cleanup).
 */
export function getUnreferencedAssets(
  assets: Asset[],
  elements: MotionElement[]
): Asset[] {
  const referencedIds = new Set<string>();

  for (const el of elements) {
    if (isMediaElement(el)) {
      referencedIds.add(el.assetId);
    }
  }

  return assets.filter((asset) => !referencedIds.has(asset.id));
}
