/**
 * MOTION-BOT — Brand Kit Data Architecture
 * Data definitions for brand design identities, color palettes, fonts, and assets.
 * Part of Phase 3.1: Data Architecture & Type System.
 */

/**
 * Unique identifier for a brand kit.
 */
export type BrandKitId = string;

/**
 * Semantic role of a brand palette color.
 */
export type BrandColorRole =
  | "primary"
  | "secondary"
  | "accent"
  | "background"
  | "surface"
  | "text";

/**
 * Individual color swatch in a brand palette.
 */
export interface BrandColor {
  id: string;
  name: string;
  hex: string;
  role: BrandColorRole;
}

/**
 * Brand typography font reference.
 */
export interface BrandFont {
  id: string;
  name: string;
  family: string;
  fallback: string;
  source: "google-fonts" | "custom" | "system";
  url?: string;
  weights: (number | string)[];
}

/**
 * Complete typography system for a brand.
 */
export interface BrandTypography {
  headingFont: BrandFont;
  bodyFont: BrandFont;
  accentFont?: BrandFont;
  monoFont?: BrandFont;
}

/**
 * Variant categorization for brand logos.
 */
export type BrandLogoVariant =
  | "light"
  | "dark"
  | "monochrome"
  | "icon"
  | "horizontal"
  | "stacked";

/**
 * Brand logo asset with variant metadata.
 */
export interface BrandLogo {
  id: string;
  name: string;
  assetId: string;
  variant: BrandLogoVariant;
  url: string;
  aspectRatio: number;
  width?: number;
  height?: number;
}

/**
 * Creative voice and copy guidelines for AI motion prompting.
 */
export interface BrandVoiceGuidelines {
  tone?: string;
  audience?: string;
  taglines?: string[];
  rules?: string[];
}

/**
 * Complete brand design identity kit.
 */
export interface BrandKit {
  id: BrandKitId;
  name: string;
  description?: string;
  colors: BrandColor[];
  typography: BrandTypography;
  logos: BrandLogo[];
  guidelines?: BrandVoiceGuidelines;
  createdAt: string;
  updatedAt: string;
}
