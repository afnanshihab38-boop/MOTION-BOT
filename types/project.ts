/**
 * MOTION-BOT — Project Data Architecture
 * Root data model and source-of-truth contract for MOTION-BOT projects.
 * Part of Phase 3.1: Data Architecture & Type System.
 */

import { Scene } from "./scene";
import { Asset } from "./asset";
import { TimelineStructure } from "./timeline";

/**
 * Current official schema version of the MOTION-BOT project format.
 * Enables deterministic migration pathways in future phases.
 */
export const CURRENT_SCHEMA_VERSION = "1.0.0";

/**
 * Unique identifier for a project.
 */
export type ProjectId = string;

/**
 * Output dimensions and canvas aspect ratio specification.
 */
export interface ProjectDimensions {
  width: number;
  height: number;
  aspectRatio: string; // e.g. "16:9", "9:16", "1:1", "4:5"
}

/**
 * Global project composition and playback settings.
 */
export interface ProjectSettings {
  width: number;
  height: number;
  fps: number; // typically 30 or 60
  durationFrames: number;
  backgroundColor: string;
}

/**
 * Project metadata for organizational and administrative tracking.
 * Extensible while maintaining strong typing for core fields.
 */
export interface ProjectMetadata {
  title: string;
  description?: string;
  tags?: string[];
  author?: string;
  thumbnailUrl?: string;
  templateId?: string;
  starred?: boolean;
  client?: string;
  category?: string;
  customFields?: Record<string, string | number | boolean | null>;
  [key: string]: unknown;
}

/**
 * Concrete Project Data Structure.
 * Core source-of-truth project model containing explicit dimensions, timing,
 * scenes, assets, and metadata.
 */
export interface Project {
  id: ProjectId;
  name: string;
  schemaVersion: string;
  width: number;
  height: number;
  fps: number;
  duration: number; // Duration in seconds
  scenes: Scene[];
  assets: Asset[];
  metadata: ProjectMetadata;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

/**
 * Root Motion Project Data Model.
 * Includes extended studio composition settings, multi-track timeline,
 * and brand kit references.
 */
export interface MotionProject extends Project {
  settings: ProjectSettings;
  timeline: TimelineStructure;
  brandKitId?: string;
}

