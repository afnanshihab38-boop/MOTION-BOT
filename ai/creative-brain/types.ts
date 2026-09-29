/**
 * MOTION-BOT — Creative Brain & Creative Brief Type System
 * Phase 7.3: MotionBot Creative Brain
 *
 * Validated domain models for converting natural language user requests
 * into structured, deterministic creative briefs for motion design.
 */

export type ProjectType =
  | "ad"
  | "social_clip"
  | "product_showcase"
  | "teaser"
  | "promo"
  | "explainer"
  | "announcement"
  | "brand_story"
  | "other";

export type PlatformType =
  | "instagram"
  | "tiktok"
  | "youtube_shorts"
  | "youtube"
  | "facebook"
  | "linkedin"
  | "twitter"
  | "web"
  | "general";

export type AspectRatioPreset = "9:16" | "16:9" | "1:1" | "4:5";

export type MotionPacing = "deliberate" | "smooth" | "fast" | "punchy" | "explosive";

export type MotionIntensity = "subtle" | "moderate" | "dynamic" | "extreme";

export type MusicTempo = "slow" | "medium" | "fast" | "very_fast";

export interface VisualDirection {
  palette?: string[];
  theme?: string;
  imagery?: string;
  typography?: string;
}

export interface TextContent {
  headline: string;
  subheadline?: string;
  bodyLines?: string[];
}

export interface CallToAction {
  text: string;
  urlOrHandle?: string;
}

export interface ColorDirection {
  primary?: string;
  secondary?: string;
  background?: string;
  accent?: string;
}

export interface MusicDirection {
  tempo?: MusicTempo;
  genre?: string;
  mood?: string;
}

export interface AnimationDirection {
  pacing: MotionPacing;
  transitionStyle?: string;
  kineticTypography?: boolean;
  motionIntensity?: MotionIntensity;
}

export interface RequiredAsset {
  type: "logo" | "image" | "video" | "mockup" | "audio";
  description: string;
  suggestedPlacement?: string;
  optional?: boolean;
}

export interface CreativeConstraints {
  maxDurationSeconds?: number;
  safeZoneAdvisory?: string;
  targetFps?: number;
}

/**
 * Validated internal representation of the AI's understanding of a creative request.
 */
export interface CreativeBrief {
  /** Unique brief identifier */
  id: string;
  /** Schema version */
  version: "1.0.0";
  /** Descriptive title for the project / brief */
  title: string;
  /** Primary category of project */
  projectType: ProjectType;
  /** Distribution channel / platform */
  platform: PlatformType;
  /** Composition duration in seconds (1 to 300) */
  duration: number;
  /** Canvas aspect ratio */
  aspectRatio: AspectRatioPreset;
  /** Visual design style / aesthetic */
  style: string;
  /** Emotional and tonal delivery */
  tone: string;
  /** Target audience description if specified or inferred */
  audience?: string;
  /** Main focal subject / brand / product */
  subject: string;
  /** Visual guidance, palette & typography */
  visualDirection: VisualDirection;
  /** Copywriting & kinetic text plan */
  textContent: TextContent;
  /** Call to action instruction */
  cta?: CallToAction;
  /** Color palette direction */
  colorDirection?: ColorDirection;
  /** Background score & music direction */
  musicDirection?: MusicDirection;
  /** Dynamic motion style & kinetics */
  animationDirection: AnimationDirection;
  /** Media assets required to execute the composition */
  assets?: RequiredAsset[];
  /** Technical and platform constraints */
  constraints?: CreativeConstraints;
  /** Timestamp when the brief was synthesized */
  createdAt: string;
}

export interface ClarificationRequest {
  issue: string;
  question: string;
  suggestedOptions?: string[];
}

export interface CreativeBrainAnalysis {
  /** Parameters explicitly mentioned by the user */
  explicitlyProvided: string[];
  /** Parameters filled in using sensible defaults */
  defaultsApplied: Record<string, string | number | boolean>;
  /** Assumptions made to fill gaps */
  assumptionsMade: string[];
  /** Contradictions detected in user input */
  contradictionsDetected?: string[];
  /** Indicates whether critical info is missing that requires user clarification */
  needsClarification: boolean;
  /** Structured clarification prompt for the user */
  clarificationRequest?: ClarificationRequest;
}

export interface CreativeBrainResult {
  /** Validated, normalized creative brief */
  brief: CreativeBrief;
  /** Metadata distinguishing explicit intent from defaults and contradictions */
  analysis: CreativeBrainAnalysis;
  /** Round-trip processing time in milliseconds */
  processingTimeMs: number;
  /** Model used for synthesis */
  model: string;
}

export interface CreativeBrainRequest {
  /** Raw natural language creative prompt from user */
  prompt: string;
  /** Optional existing project or brand context */
  projectContext?: {
    brandColors?: string[];
    brandName?: string;
    targetPlatform?: PlatformType;
    preferredAspectRatio?: AspectRatioPreset;
  };
  /** Optional project identifier for project-scoped memory and context (Phase 7.6) */
  projectId?: string;
  /** Optional relevant project memories to guide synthesis (Phase 7.6) */
  relevantMemories?: string[];
}
