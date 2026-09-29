/**
 * MOTION-BOT — Creative Brief Schema Validator & Normalizer
 * Phase 7.3: MotionBot Creative Brain
 *
 * Enforces strict structural integrity, parameter sanitization,
 * domain normalization, contradiction detection, and default attribution.
 */

import {
  CreativeBrief,
  CreativeBrainAnalysis,
  PlatformType,
  ProjectType,
  AspectRatioPreset,
  MotionPacing,
  MusicTempo,
  MotionIntensity,
  ClarificationRequest,
  ColorDirection,
  MusicDirection,
  RequiredAsset,
} from "./types";

export interface CreativeBriefValidationResult {
  isValid: boolean;
  brief: CreativeBrief;
  analysis: CreativeBrainAnalysis;
  errors: string[];
  warnings: string[];
}

const VALID_PLATFORMS: Set<PlatformType> = new Set([
  "instagram",
  "tiktok",
  "youtube_shorts",
  "youtube",
  "facebook",
  "linkedin",
  "twitter",
  "web",
  "general",
]);

const VALID_PROJECT_TYPES: Set<ProjectType> = new Set([
  "ad",
  "social_clip",
  "product_showcase",
  "teaser",
  "promo",
  "explainer",
  "announcement",
  "brand_story",
  "other",
]);

const VALID_ASPECT_RATIOS: Set<AspectRatioPreset> = new Set(["9:16", "16:9", "1:1", "4:5"]);

const VALID_PACINGS: Set<MotionPacing> = new Set(["deliberate", "smooth", "fast", "punchy", "explosive"]);

/**
 * Validates, sanitizes, and normalizes a raw creative brief output from the LLM.
 */
export function validateAndNormalizeCreativeBrief(
  raw: unknown,
  originalUserPrompt: string
): CreativeBriefValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const defaultsApplied: Record<string, string | number | boolean> = {};
  const assumptionsMade: string[] = [];
  const contradictionsDetected: string[] = [];

  const rawObj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rawBrief = (rawObj.brief && typeof rawObj.brief === "object" ? rawObj.brief : rawObj) as Record<string, unknown>;
  const rawAnalysis = (rawObj.analysis && typeof rawObj.analysis === "object" ? rawObj.analysis : {}) as Record<string, unknown>;

  // 1. Subject validation
  let subject = typeof rawBrief?.subject === "string" ? rawBrief.subject.trim() : "";
  if (!subject) {
    // Attempt fallback from prompt or title
    if (rawBrief?.title && typeof rawBrief.title === "string") {
      subject = rawBrief.title.trim();
      defaultsApplied["subject"] = subject;
      assumptionsMade.push(`Inferred subject from title: "${subject}"`);
    } else {
      errors.push("Missing required field: 'subject'");
      subject = "Creative Motion Project";
    }
  }

  // 2. Platform normalization
  let platform: PlatformType = "general";
  const rawPlatform = String(rawBrief?.platform || "").toLowerCase().trim();
  if (VALID_PLATFORMS.has(rawPlatform as PlatformType)) {
    platform = rawPlatform as PlatformType;
  } else if (rawPlatform.includes("insta") || rawPlatform.includes("reel") || rawPlatform.includes("story")) {
    platform = "instagram";
  } else if (rawPlatform.includes("tiktok")) {
    platform = "tiktok";
  } else if (rawPlatform.includes("shorts")) {
    platform = "youtube_shorts";
  } else if (rawPlatform.includes("youtube") || rawPlatform.includes("yt")) {
    platform = "youtube";
  } else if (rawPlatform.includes("linkedin")) {
    platform = "linkedin";
  } else if (rawPlatform.includes("facebook") || rawPlatform.includes("fb")) {
    platform = "facebook";
  } else if (rawPlatform.includes("twitter") || rawPlatform.includes("x")) {
    platform = "twitter";
  } else {
    platform = "general";
    defaultsApplied["platform"] = "general";
    assumptionsMade.push("Platform not explicitly specified; applied 'general'");
  }

  // 3. Aspect Ratio normalization
  let aspectRatio: AspectRatioPreset = "16:9";
  const rawAspect = String(rawBrief?.aspectRatio || "").trim();
  if (VALID_ASPECT_RATIOS.has(rawAspect as AspectRatioPreset)) {
    aspectRatio = rawAspect as AspectRatioPreset;
  } else if (rawAspect.includes("vertical") || rawAspect.includes("9:16")) {
    aspectRatio = "9:16";
  } else if (rawAspect.includes("square") || rawAspect.includes("1:1")) {
    aspectRatio = "1:1";
  } else if (rawAspect.includes("4:5") || rawAspect.includes("portrait")) {
    aspectRatio = "4:5";
  } else if (platform === "tiktok" || platform === "youtube_shorts" || platform === "instagram") {
    aspectRatio = "9:16";
    defaultsApplied["aspectRatio"] = "9:16";
    assumptionsMade.push(`Platform '${platform}' defaults to vertical '9:16'`);
  } else {
    aspectRatio = "16:9";
    defaultsApplied["aspectRatio"] = "16:9";
    assumptionsMade.push("Aspect ratio defaulted to standard landscape '16:9'");
  }

  // Check contradiction: Shorts / TikTok with horizontal 16:9
  if ((platform === "tiktok" || platform === "youtube_shorts") && rawAspect === "16:9") {
    contradictionsDetected.push(`${platform} is a vertical-first video platform, but 16:9 landscape was requested`);
  }

  // 4. Duration validation & clamping
  let duration = typeof rawBrief.duration === "number" ? rawBrief.duration : parseFloat(String(rawBrief.duration || ""));
  if (isNaN(duration) || duration <= 0) {
    duration = 10;
    defaultsApplied["duration"] = 10;
    assumptionsMade.push("Duration omitted; defaulted to 10 seconds");
  } else if (duration > 300) {
    warnings.push(`Duration of ${duration}s exceeded max limit; clamped to 300s`);
    duration = 300;
  } else if (duration < 1) {
    duration = 1;
  }

  // 5. Project Type normalization
  let projectType: ProjectType = "ad";
  const rawType = String(rawBrief.projectType || "").toLowerCase().trim();
  if (VALID_PROJECT_TYPES.has(rawType as ProjectType)) {
    projectType = rawType as ProjectType;
  } else {
    projectType = "ad";
    defaultsApplied["projectType"] = "ad";
  }

  // 6. Style & Tone
  const style = typeof rawBrief.style === "string" && rawBrief.style.trim() ? rawBrief.style.trim() : "modern-kinetic";
  if (!rawBrief.style) {
    defaultsApplied["style"] = style;
  }

  const tone = typeof rawBrief.tone === "string" && rawBrief.tone.trim() ? rawBrief.tone.trim() : "energetic";
  if (!rawBrief.tone) {
    defaultsApplied["tone"] = tone;
  }

  // 7. Title
  const title = typeof rawBrief.title === "string" && rawBrief.title.trim()
    ? rawBrief.title.trim()
    : `${subject} — ${tone} ${projectType.toUpperCase()}`;

  // 8. Text Content validation
  const rawTextContent = (rawBrief.textContent && typeof rawBrief.textContent === "object" ? rawBrief.textContent : {}) as Record<string, unknown>;
  let headline = typeof rawTextContent.headline === "string" ? rawTextContent.headline.trim() : "";
  if (!headline) {
    headline = subject.toUpperCase();
    defaultsApplied["textContent.headline"] = headline;
  }

  const subheadline = typeof rawTextContent.subheadline === "string" ? rawTextContent.subheadline.trim() : undefined;
  const rawBodyLines = rawTextContent.bodyLines;
  const bodyLines = Array.isArray(rawBodyLines)
    ? (rawBodyLines.filter((l: unknown) => typeof l === "string" && l.trim().length > 0) as string[])
    : undefined;

  // 9. Animation Direction
  const rawAnim = (rawBrief.animationDirection && typeof rawBrief.animationDirection === "object" ? rawBrief.animationDirection : {}) as Record<string, unknown>;
  let pacing: MotionPacing = "fast";
  const rawPacing = String(rawAnim.pacing || "").toLowerCase().trim();
  if (VALID_PACINGS.has(rawPacing as MotionPacing)) {
    pacing = rawPacing as MotionPacing;
  } else {
    pacing = tone.includes("calm") || tone.includes("luxury") ? "smooth" : "fast";
    defaultsApplied["animationDirection.pacing"] = pacing;
  }

  // 10. Call to Action (CTA)
  let cta = undefined;
  const rawCta = rawBrief.cta && typeof rawBrief.cta === "object" ? (rawBrief.cta as Record<string, unknown>) : undefined;
  if (rawCta) {
    const ctaText = typeof rawCta.text === "string" ? rawCta.text.trim() : "";
    if (ctaText) {
      cta = {
        text: ctaText,
        urlOrHandle: typeof rawCta.urlOrHandle === "string" ? rawCta.urlOrHandle.trim() : undefined,
      };
    }
  }

  // 11. Analysis merge
  const explicitSet = new Set<string>(
    Array.isArray(rawAnalysis.explicitlyProvided)
      ? (rawAnalysis.explicitlyProvided.filter((e: unknown) => typeof e === "string") as string[])
      : []
  );

  // Auto-detect explicit mentions from original prompt
  const lowerPrompt = originalUserPrompt.toLowerCase();
  if (lowerPrompt.includes("instagram") || lowerPrompt.includes("reels") || lowerPrompt.includes("ig")) explicitSet.add("platform: instagram");
  if (lowerPrompt.includes("tiktok")) explicitSet.add("platform: tiktok");
  if (lowerPrompt.includes("shorts")) explicitSet.add("platform: youtube_shorts");
  if (lowerPrompt.includes("youtube")) explicitSet.add("platform: youtube");
  if (lowerPrompt.includes("10-second") || lowerPrompt.includes("10 second") || lowerPrompt.includes("10s")) explicitSet.add("duration: 10s");
  if (lowerPrompt.includes("15-second") || lowerPrompt.includes("15 second") || lowerPrompt.includes("15s")) explicitSet.add("duration: 15s");
  if (lowerPrompt.includes("30-second") || lowerPrompt.includes("30 second") || lowerPrompt.includes("30s")) explicitSet.add("duration: 30s");
  if (lowerPrompt.includes("energetic")) explicitSet.add("tone: energetic");
  if (lowerPrompt.includes("sneaker")) explicitSet.add("subject: sneaker");

  const rawContradictions = Array.isArray(rawAnalysis.contradictionsDetected) ? (rawAnalysis.contradictionsDetected as string[]) : [];
  const combinedContradictions = [
    ...rawContradictions,
    ...contradictionsDetected,
  ];

  // Critical clarification check
  const trimmedPrompt = originalUserPrompt.trim();
  const isGibberishOrEmpty = trimmedPrompt.length < 3 || !/[a-zA-Z]/.test(trimmedPrompt);
  const needsClarification = Boolean(rawAnalysis.needsClarification || isGibberishOrEmpty);

  const rawClarification = (rawAnalysis.clarificationRequest && typeof rawAnalysis.clarificationRequest === "object"
    ? (rawAnalysis.clarificationRequest as Record<string, unknown>)
    : undefined);

  let clarificationRequest: ClarificationRequest | undefined = undefined;
  if (rawClarification && typeof rawClarification.issue === "string" && typeof rawClarification.question === "string") {
    clarificationRequest = {
      issue: rawClarification.issue,
      question: rawClarification.question,
      suggestedOptions: Array.isArray(rawClarification.suggestedOptions)
        ? (rawClarification.suggestedOptions.filter((s: unknown) => typeof s === "string") as string[])
        : undefined,
    };
  }

  if (isGibberishOrEmpty && !clarificationRequest) {
    clarificationRequest = {
      issue: "The creative request is empty or contains insufficient details.",
      question: "What product, brand, or message would you like to create a motion design for?",
      suggestedOptions: [
        "10-second energetic sneaker commercial for Instagram Reels",
        "15-second product launch teaser with bold typography",
        "30-second SaaS explainer video for LinkedIn",
      ],
    };
  }

  const rawVisual = (rawBrief.visualDirection && typeof rawBrief.visualDirection === "object" ? rawBrief.visualDirection : {}) as Record<string, unknown>;
  const rawPalette = Array.isArray(rawVisual.palette) ? (rawVisual.palette.filter((p: unknown) => typeof p === "string") as string[]) : undefined;

  const brief: CreativeBrief = {
    id: `brief-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    version: "1.0.0",
    title,
    projectType,
    platform,
    duration,
    aspectRatio,
    style,
    tone,
    audience: typeof rawBrief.audience === "string" ? rawBrief.audience.trim() : undefined,
    subject,
    visualDirection: {
      palette: rawPalette,
      theme: typeof rawVisual.theme === "string" ? rawVisual.theme : "high-energy commercial staging",
      imagery: typeof rawVisual.imagery === "string" ? rawVisual.imagery : undefined,
      typography: typeof rawVisual.typography === "string" ? rawVisual.typography : "bold sans-serif kinetic type",
    },
    textContent: {
      headline,
      subheadline,
      bodyLines,
    },
    cta,
    colorDirection: rawBrief.colorDirection && typeof rawBrief.colorDirection === "object" ? (rawBrief.colorDirection as ColorDirection) : undefined,
    musicDirection: rawBrief.musicDirection && typeof rawBrief.musicDirection === "object" ? (rawBrief.musicDirection as MusicDirection) : undefined,
    animationDirection: {
      pacing,
      transitionStyle: typeof rawAnim.transitionStyle === "string" ? rawAnim.transitionStyle : "kinetic snap cut",
      kineticTypography: typeof rawAnim.kineticTypography === "boolean" ? rawAnim.kineticTypography : true,
      motionIntensity: (typeof rawAnim.motionIntensity === "string" && ["subtle", "moderate", "dynamic", "extreme"].includes(rawAnim.motionIntensity))
        ? (rawAnim.motionIntensity as MotionIntensity)
        : "dynamic",
    },
    assets: Array.isArray(rawBrief.assets) ? (rawBrief.assets as RequiredAsset[]) : undefined,
    constraints: {
      maxDurationSeconds: 300,
      safeZoneAdvisory: platform === "tiktok" || platform === "instagram" ? "Keep critical copy inside center 80% to avoid UI icons" : undefined,
      targetFps: 60,
    },
    createdAt: new Date().toISOString(),
  };

  const analysis: CreativeBrainAnalysis = {
    explicitlyProvided: Array.from(explicitSet),
    defaultsApplied: {
      ...((rawAnalysis.defaultsApplied && typeof rawAnalysis.defaultsApplied === "object" ? rawAnalysis.defaultsApplied : {}) as Record<string, string | number | boolean>),
      ...defaultsApplied,
    },
    assumptionsMade: [
      ...(Array.isArray(rawAnalysis.assumptionsMade) ? (rawAnalysis.assumptionsMade as string[]) : []),
      ...assumptionsMade,
    ],
    contradictionsDetected: combinedContradictions.length > 0 ? combinedContradictions : undefined,
    needsClarification,
    clarificationRequest: clarificationRequest || undefined,
  };

  return {
    isValid: errors.length === 0,
    brief,
    analysis,
    errors,
    warnings,
  };
}
