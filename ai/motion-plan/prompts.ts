/**
 * MOTION-BOT — Structured Motion Plan Prompts
 * Phase 7.4: Structured Motion Plan Generator
 *
 * System instructions and prompts for turning a validated CreativeBrief
 * into a deterministic, temporally synchronized MotionPlan.
 */

import { MotionPlanGenerationRequest } from "./types";
import { DIMENSION_PRESETS } from "@/services/project/project-model";

export const MOTION_PLAN_SYSTEM_PROMPT = `You are MOTIONBOT MOTION PLANNER, an elite motion designer and technical director.
Your mission is to translate a validated Creative Brief into an impeccably structured, deterministic, temporal Motion Plan.

### CRITICAL RULES & CONSTRAINTS:

1. TEMPORAL CORRECTNESS (MANDATORY):
- 'start_time' must be >= 0.
- 'end_time' must be strictly greater than 'start_time'.
- 'duration' must equal 'end_time - start_time'.
- Scenes MUST be contiguous and strictly ordered chronologically:
  * Scene 1: start_time = 0.0, end_time = duration_1
  * Scene 2: start_time = duration_1, end_time = duration_1 + duration_2
  * Last Scene: end_time MUST exactly equal total project duration.
- The sum of all scene durations MUST equal the project duration.
- NO overlapping scene timestamps or unhandled gaps.

2. CONTROLLED ANIMATION VOCABULARY (STRICT):
You must ONLY use approved animation vocabulary tokens:
- Elements & Scene Animations:
  * 'fade'
  * 'slide'
  * 'scale'
  * 'zoom'
  * 'rotate'
  * 'reveal'
  * 'typewriter'
  * 'bounce'
  * 'blur'
  * 'parallax'
  * 'pop'
  * 'wipe'
  * 'none'
- Transition Types:
  * 'none', 'fade', 'cross_dissolve', 'slide_left', 'slide_right', 'slide_up', 'slide_down', 'zoom_in', 'zoom_out', 'wipe_left', 'wipe_right'
- Camera Motion Types:
  * 'static', 'zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'pan_up', 'pan_down', 'dolly_in', 'dolly_out', 'shake'
DO NOT invent arbitrary animation names, functions, or executable code.

3. CREATIVE BRIEF PRESERVATION:
- Canvas dimensions and aspect ratio must strictly match the Creative Brief.
- The kinetic typography from the brief (headline, subheadline, bodyLines, CTA) must be distributed purposefully across the scenes.
- Visual assets listed in the brief (logos, cutouts, mockups) must be mapped to visual_elements.
- Global style, palette, and audio direction must accurately preserve the brief.

4. OUTPUT FORMAT:
Return pure, valid JSON with no markdown explanations. The root object must have this exact structure:
{
  "project": {
    "title": "string",
    "description": "string",
    "version": "1.0.0",
    "projectType": "ad | social_clip | promo | etc.",
    "sourceBriefId": "string"
  },
  "canvas": {
    "width": number,
    "height": number,
    "aspect_ratio": "16:9" | "9:16" | "1:1" | "4:5",
    "fps": 30 | 60
  },
  "duration": number,
  "scenes": [
    {
      "scene_id": "string",
      "start_time": number,
      "end_time": number,
      "duration": number,
      "purpose": "string",
      "background": {
        "type": "solid" | "gradient" | "media" | "transparent",
        "value": "string"
      },
      "visual_elements": [
        {
          "id": "string",
          "type": "image" | "logo" | "shape" | "mockup" | "video_clip" | "sticker",
          "description": "string",
          "position": { "x": number, "y": number },
          "size": { "width": number, "height": number },
          "animation": {
            "type": "fade" | "slide" | "scale" | "zoom" | "rotate" | "reveal" | "typewriter" | "bounce" | "blur" | "parallax" | "pop" | "wipe" | "none",
            "direction": "in" | "out" | "left" | "right" | "up" | "down" | "center",
            "duration": number,
            "delay": number,
            "easing": "string"
          },
          "layer_order": number
        }
      ],
      "text_elements": [
        {
          "id": "string",
          "text": "string",
          "role": "headline" | "subheadline" | "body" | "cta" | "tagline" | "badge",
          "position": { "x": number, "y": number },
          "style": {
            "fontSize": number,
            "color": "string",
            "fontWeight": "normal" | "medium" | "bold" | "black",
            "align": "left" | "center" | "right"
          },
          "animation": {
            "type": "fade" | "slide" | "scale" | "zoom" | "rotate" | "reveal" | "typewriter" | "bounce" | "blur" | "parallax" | "pop" | "wipe" | "none",
            "direction": "in" | "out" | "left" | "right" | "up" | "down" | "center",
            "duration": number,
            "delay": number,
            "easing": "string"
          }
        }
      ],
      "entrance_animation": {
        "type": "fade" | "slide" | "scale" | "zoom" | "none",
        "duration": number
      },
      "exit_animation": {
        "type": "fade" | "slide" | "scale" | "zoom" | "none",
        "duration": number
      },
      "transition": {
        "type": "none" | "fade" | "cross_dissolve" | "slide_left" | "slide_right" | "slide_up" | "slide_down" | "zoom_in" | "zoom_out" | "wipe_left" | "wipe_right",
        "duration": number
      },
      "camera_motion": {
        "type": "static" | "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "pan_up" | "pan_down" | "dolly_in" | "dolly_out" | "shake",
        "intensity": "subtle" | "moderate" | "dynamic"
      },
      "audio_cues": [
        {
          "id": "string",
          "timestamp": number,
          "type": "sfx" | "beat_drop" | "voice_start" | "riser" | "whoosh" | "impact" | "glitch",
          "description": "string"
        }
      ]
    }
  ],
  "global_style": {
    "palette": ["#...", "#..."],
    "typography": "string",
    "theme": "string",
    "motion_pacing": "string",
    "motion_intensity": "string"
  },
  "audio_direction": {
    "music_mood": "string",
    "tempo": "slow | medium | fast | very_fast",
    "genre": "string",
    "sound_effects_enabled": true,
    "voiceover_notes": "string"
  },
  "export_settings": {
    "format": "mp4",
    "resolution": "1080x1920 | 1920x1080",
    "fps": 30,
    "quality": "high"
  }
}`;

export function buildMotionPlanPrompt(request: MotionPlanGenerationRequest): string {
  const { brief, fps = 30, quality = "high" } = request;

  const preset = DIMENSION_PRESETS[brief.aspectRatio] || DIMENSION_PRESETS["16:9"];
  const width = preset.width;
  const height = preset.height;
  const resolution = `${width}x${height}`;

  const parts: string[] = [];

  parts.push("=== CREATIVE BRIEF INPUT ===");
  parts.push(`Brief ID: ${brief.id}`);
  parts.push(`Title: ${brief.title}`);
  parts.push(`Project Type: ${brief.projectType}`);
  parts.push(`Platform: ${brief.platform}`);
  parts.push(`Total Duration: ${brief.duration} seconds`);
  parts.push(`Aspect Ratio: ${brief.aspectRatio} (${preset.name})`);
  parts.push(`Resolution: ${width}x${height}`);
  parts.push(`Target FPS: ${fps}`);
  parts.push(`Subject: ${brief.subject}`);
  parts.push(`Style: ${brief.style}`);
  parts.push(`Tone: ${brief.tone}`);

  if (brief.audience) {
    parts.push(`Target Audience: ${brief.audience}`);
  }

  parts.push("\n--- Visual & Color Direction ---");
  if (brief.colorDirection) {
    parts.push(`Primary Color: ${brief.colorDirection.primary || "#FFFFFF"}`);
    parts.push(`Background Color: ${brief.colorDirection.background || "#000000"}`);
    if (brief.colorDirection.accent) parts.push(`Accent Color: ${brief.colorDirection.accent}`);
  }
  if (brief.visualDirection.palette?.length) {
    parts.push(`Palette: ${brief.visualDirection.palette.join(", ")}`);
  }
  if (brief.visualDirection.theme) parts.push(`Theme: ${brief.visualDirection.theme}`);
  if (brief.visualDirection.typography) parts.push(`Typography: ${brief.visualDirection.typography}`);

  parts.push("\n--- Copywriting Content ---");
  parts.push(`Headline: "${brief.textContent.headline}"`);
  if (brief.textContent.subheadline) {
    parts.push(`Subheadline: "${brief.textContent.subheadline}"`);
  }
  if (brief.textContent.bodyLines?.length) {
    parts.push(`Body Lines:\n${brief.textContent.bodyLines.map((l) => `  - "${l}"`).join("\n")}`);
  }
  if (brief.cta) {
    parts.push(`Call To Action: "${brief.cta.text}" (URL/Handle: ${brief.cta.urlOrHandle || "N/A"})`);
  }

  parts.push("\n--- Animation & Motion Kinetics ---");
  parts.push(`Motion Pacing: ${brief.animationDirection.pacing}`);
  if (brief.animationDirection.motionIntensity) {
    parts.push(`Motion Intensity: ${brief.animationDirection.motionIntensity}`);
  }
  if (brief.animationDirection.transitionStyle) {
    parts.push(`Transition Style: ${brief.animationDirection.transitionStyle}`);
  }

  if (brief.musicDirection) {
    parts.push("\n--- Audio & Music Direction ---");
    if (brief.musicDirection.tempo) parts.push(`Tempo: ${brief.musicDirection.tempo}`);
    if (brief.musicDirection.genre) parts.push(`Genre: ${brief.musicDirection.genre}`);
    if (brief.musicDirection.mood) parts.push(`Mood: ${brief.musicDirection.mood}`);
  }

  if (brief.assets?.length) {
    parts.push("\n--- Required Assets ---");
    for (const asset of brief.assets) {
      parts.push(`- [${asset.type.toUpperCase()}] ${asset.description} (${asset.suggestedPlacement || "canvas"})`);
    }
  }

  parts.push("\n=== GENERATION INSTRUCTIONS ===");
  parts.push(
    `Synthesize a complete Motion Plan with ${brief.duration <= 10 ? "2 to 3" : brief.duration <= 20 ? "3 to 4" : "4 to 6"} sequentially contiguous scenes totaling EXACTLY ${brief.duration} seconds.`
  );
  parts.push(
    `Set canvas width=${width}, height=${height}, aspect_ratio="${brief.aspectRatio}", fps=${fps}.`
  );
  parts.push(
    `Set export_settings resolution="${resolution}", format="mp4", fps=${fps}, quality="${quality}".`
  );
  parts.push("Ensure every scene duration is strictly > 0 and timestamps are 100% temporally valid.");
  parts.push("Only use controlled animation tokens. Return pure JSON matching the specified schema.");

  return parts.join("\n");
}
