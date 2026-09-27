/**
 * MOTION-BOT — Template Data Architecture
 * Data definitions for motion templates, categories, and dynamic placeholders.
 * Part of Phase 3.1: Data Architecture & Type System.
 */

/**
 * Unique identifier for a motion template.
 */
export type TemplateId = string;

/**
 * Standard classification for commercial and social motion templates.
 */
export type TemplateCategory =
  | "social-ad"
  | "product-showcase"
  | "kinetic-typography"
  | "logo-reveal"
  | "e-commerce"
  | "testimonial"
  | "explainer"
  | "announcement"
  | "minimal";

/**
 * Supported data types for template variable replacement.
 */
export type PlaceholderType =
  | "text"
  | "image"
  | "logo"
  | "color"
  | "video";

/**
 * Dynamic placeholder slot in a template that can be customized by the user or AI.
 */
export interface TemplatePlaceholder {
  id: string;
  elementId: string;
  key: string;
  name: string;
  type: PlaceholderType;
  description?: string;
  defaultValue: string | number | boolean;
  required?: boolean;
}

/**
 * Reusable motion template specification with customizable placeholder variables.
 */
export interface Template {
  id: TemplateId;
  title: string;
  description: string;
  category: TemplateCategory;
  aspectRatio: string;
  width: number;
  height: number;
  durationFrames: number;
  fps: number;
  thumbnailUrl: string;
  previewVideoUrl?: string;
  placeholders: TemplatePlaceholder[];
  tags: string[];
  projectSnapshot: string; // Serialized JSON string of the underlying MotionProject
  createdAt: string;
  updatedAt: string;
}
