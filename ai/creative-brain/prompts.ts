/**
 * MOTION-BOT — Creative Brain Prompt Engineering Architecture
 * Phase 7.3: MotionBot Creative Brain
 *
 * Modular, versioned prompts separating system instructions, schema definition,
 * user request formatting, and project context injection.
 */

import { CreativeBrainRequest } from "./types";

export const CREATIVE_BRAIN_SYSTEM_PROMPT = `You are the MOTION-BOT Creative Director AI.
Your job is to understand a user's natural-language creative request and convert it into a structured, production-ready creative brief for automated motion design and video synthesis.

GUIDELINES & PRINCIPLES:
1. UNDERSTAND USER INTENT: Accurately extract the subject, platform, duration, tone, style, copy, CTA, and visual direction.
2. AVOID HALLUCINATION: Do NOT invent specific third-party assets, URLs, or claims the user did not specify.
3. DISTINGUISH EXPLICIT VS DEFAULTS:
   - If the user explicitly specifies a field (e.g. "10 seconds", "TikTok", "urgent"), mark it as explicitly provided.
   - If a non-critical field is omitted, supply an industry-standard sensible default:
     * Platform omitted -> default to "general" or "instagram", aspect ratio "16:9" or "9:16".
     * Duration omitted -> default to 10 seconds for ads / social clips.
     * Tone omitted -> default to "energetic" for ads, "professional" for explainers.
     * Music omitted -> match the tone and pacing.
4. DETECT CONTRADICTIONS:
   - Identify conflicting parameters (e.g. "Make a 60-second Instagram story" where standard stories are 15s, or "A 3-second explainer with 5 paragraphs of text").
   - If a contradiction is detected, list it in "contradictionsDetected".
5. CLARIFICATION HANDLING:
   - For missing non-critical information, apply sensible defaults without asking questions.
   - Only set "needsClarification": true if the request is fundamentally incomprehensible, lacks any subject/product, or contains unresolvable contradictions.

OUTPUT REQUIREMENTS:
You MUST respond with valid JSON matching the exact schema below. Do NOT output conversational preamble or postscript.`;

export const CREATIVE_BRIEF_SCHEMA_PROMPT = `Return a JSON object with this exact structure:
{
  "brief": {
    "title": "Short descriptive title of the ad/video",
    "projectType": "ad" | "social_clip" | "product_showcase" | "teaser" | "promo" | "explainer" | "announcement" | "brand_story" | "other",
    "platform": "instagram" | "tiktok" | "youtube_shorts" | "youtube" | "facebook" | "linkedin" | "twitter" | "web" | "general",
    "duration": <number of seconds, e.g. 10>,
    "aspectRatio": "9:16" | "16:9" | "1:1" | "4:5",
    "style": "Visual style description (e.g. bold-kinetic, modern-minimal, high-contrast)",
    "tone": "Emotional tone (e.g. energetic, professional, luxurious, playful)",
    "audience": "Target audience description if provided or inferred",
    "subject": "Core product, brand, or topic being showcased",
    "visualDirection": {
      "palette": ["#hex1", "#hex2"],
      "theme": "Visual theme description",
      "imagery": "Visual imagery guidance",
      "typography": "Typography guidance"
    },
    "textContent": {
      "headline": "Punchy main hook",
      "subheadline": "Secondary supporting copy",
      "bodyLines": ["Key feature 1", "Key feature 2"]
    },
    "cta": {
      "text": "Call to action button or text (e.g. Shop Now, Learn More)",
      "urlOrHandle": "Optional URL or handle if provided"
    },
    "colorDirection": {
      "primary": "Primary color",
      "secondary": "Secondary color",
      "background": "Background color tone",
      "accent": "Accent color"
    },
    "musicDirection": {
      "tempo": "slow" | "medium" | "fast" | "very_fast",
      "genre": "Genre description (e.g. electronic, trap beat, cinematic)",
      "mood": "Music mood description"
    },
    "animationDirection": {
      "pacing": "deliberate" | "smooth" | "fast" | "punchy" | "explosive",
      "transitionStyle": "Transition style description",
      "kineticTypography": true,
      "motionIntensity": "subtle" | "moderate" | "dynamic" | "extreme"
    },
    "assets": [
      {
        "type": "logo" | "image" | "video" | "mockup" | "audio",
        "description": "Asset description",
        "suggestedPlacement": "Placement guidance"
      }
    ],
    "constraints": {
      "maxDurationSeconds": <number>,
      "safeZoneAdvisory": "Safe zone guidance for platform UI overlays"
    }
  },
  "analysis": {
    "explicitlyProvided": ["list of parameters explicitly mentioned in user request"],
    "defaultsApplied": {
      "paramName": "defaultValue"
    },
    "assumptionsMade": ["list of reasoned assumptions"],
    "contradictionsDetected": ["list of contradictions, or empty array if none"],
    "needsClarification": false,
    "clarificationRequest": null
  }
}`;

/**
 * Builds the complete structured generation prompt combining instructions,
 * schema, user request, and optional project context.
 */
export function buildCreativeBrainPrompt(request: CreativeBrainRequest): string {
  const parts: string[] = [
    CREATIVE_BRIEF_SCHEMA_PROMPT,
    "",
    "--- USER CREATIVE REQUEST ---",
    request.prompt.trim(),
  ];

  if (request.projectContext) {
    parts.push("");
    parts.push("--- PROJECT & BRAND CONTEXT ---");
    if (request.projectContext.brandName) {
      parts.push(`Brand Name: ${request.projectContext.brandName}`);
    }
    if (request.projectContext.brandColors && request.projectContext.brandColors.length > 0) {
      parts.push(`Brand Colors: ${request.projectContext.brandColors.join(", ")}`);
    }
    if (request.projectContext.targetPlatform) {
      parts.push(`Preferred Platform: ${request.projectContext.targetPlatform}`);
    }
    if (request.projectContext.preferredAspectRatio) {
      parts.push(`Preferred Aspect Ratio: ${request.projectContext.preferredAspectRatio}`);
    }
  }

  if (request.relevantMemories && request.relevantMemories.length > 0) {
    parts.push("");
    parts.push("--- RELEVANT PROJECT MEMORY ---");
    request.relevantMemories.forEach((mem) => parts.push(`- ${mem}`));
  }

  return parts.join("\n");
}
