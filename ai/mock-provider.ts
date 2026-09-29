/**
 * MOTION-BOT — Deterministic Mock LLM Provider
 * Phase 7.2: LLM Provider Foundation
 *
 * Provides safe, deterministic responses for development, offline environments,
 * and test suites without requiring external network connectivity or paid API keys.
 */

import { BaseLLMProvider, NormalizedLLMRequest, RawProviderExecutionResult } from "./provider";
import { LLMError } from "./llm-error";

export interface MockProviderOptions {
  model?: string;
  simulatedDelayMs?: number;
  customTextResponse?: string;
  customJsonResponse?: Record<string, unknown>;
  simulateError?: LLMError;
}

export class MockLLMProvider extends BaseLLMProvider {
  public readonly id = "mock";
  public readonly name = "Mock Development Provider";
  public readonly defaultModel: string;

  private options: MockProviderOptions;

  constructor(options: MockProviderOptions = {}) {
    super();
    this.options = options;
    this.defaultModel = options.model || "mock-motion-v1";
  }

  public isConfigured(): boolean {
    return true;
  }

  public setOptions(options: Partial<MockProviderOptions>): void {
    this.options = { ...this.options, ...options };
  }

  public async executeGeneration(
    normalized: NormalizedLLMRequest
  ): Promise<RawProviderExecutionResult> {
    if (this.options.simulatedDelayMs && this.options.simulatedDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.options.simulatedDelayMs));
    }

    if (this.options.simulateError) {
      throw this.options.simulateError;
    }

    // If custom text response is provided (e.g. for testing malformed non-JSON recovery), return it directly
    if (this.options.customTextResponse) {
      return {
        text: this.options.customTextResponse,
        model: normalized.model,
        finishReason: "stop",
        usage: {
          promptTokens: 25,
          completionTokens: 20,
          totalTokens: 45,
        },
        raw: { mock: true },
      };
    }

    // Structured JSON response simulation
    if (normalized.responseFormat?.type === "json_object") {
      let jsonPayload = this.options.customJsonResponse;

      if (!jsonPayload) {
        const userMsg = normalized.messages.find((m) => m.role === "user");
        const userContent = typeof userMsg?.content === "string" ? userMsg.content : JSON.stringify(userMsg?.content || "");

        // Isolate actual user text below the schema prompt marker if present
        const requestMarker = "--- USER CREATIVE REQUEST ---";
        const actualUserText = userContent.includes(requestMarker)
          ? userContent.split(requestMarker)[1] || ""
          : userContent;
        const lower = actualUserText.toLowerCase();

        const systemMsg = normalized.messages.find((m) => m.role === "system");
        const systemContent = typeof systemMsg?.content === "string" ? systemMsg.content : "";

        // Detect Motion Plan requests
        const isMotionPlanRequest =
          userContent.includes("=== CREATIVE BRIEF INPUT ===") ||
          userContent.includes("MOTION PLAN") ||
          userContent.includes("MOTION_PLAN") ||
          Boolean(systemContent.includes("MOTION PLANNER"));

        if (isMotionPlanRequest) {
          const matchBriefId = userContent.match(/Brief ID:\s*([^\r\n]+)/);
          const matchTitle = userContent.match(/Title:\s*([^\r\n]+)/);
          const matchDuration = userContent.match(/Total Duration:\s*([0-9.]+)/);
          const matchAspect = userContent.match(/Aspect Ratio:\s*([0-9:]+)/);
          const matchRes = userContent.match(/Resolution:\s*([0-9]+)x([0-9]+)/);
          const matchFps = userContent.match(/Target FPS:\s*([0-9]+)/);
          const matchHeadline = userContent.match(/Headline:\s*"([^"]+)"/);
          const matchSubheadline = userContent.match(/Subheadline:\s*"([^"]+)"/);
          const matchCta = userContent.match(/Call To Action:\s*"([^"]+)"/);

          const parsedBriefId = matchBriefId ? matchBriefId[1].trim() : "brief_mock_default";
          const parsedTitle = matchTitle ? matchTitle[1].trim() : "Motion Design Ad";
          const totalDur = matchDuration ? parseFloat(matchDuration[1]) : 10;
          const parsedAspect = matchAspect ? matchAspect[1].trim() : "9:16";
          const parsedWidth = matchRes ? parseInt(matchRes[1], 10) : parsedAspect === "16:9" ? 1920 : 1080;
          const parsedHeight = matchRes ? parseInt(matchRes[2], 10) : parsedAspect === "16:9" ? 1080 : 1920;
          const parsedFps = matchFps ? parseInt(matchFps[1], 10) : 30;
          const parsedHeadline = matchHeadline ? matchHeadline[1].trim() : "UNLEASH SPEED";
          const parsedSubheadline = matchSubheadline ? matchSubheadline[1].trim() : "Engineered for pure velocity";
          const parsedCta = matchCta ? matchCta[1].trim() : "Shop Now";

          const scene1Dur = Number((totalDur * 0.35).toFixed(2));
          const scene2Dur = Number((totalDur * 0.35).toFixed(2));
          const scene3Dur = Number((totalDur - scene1Dur - scene2Dur).toFixed(2));

          jsonPayload = {
            project: {
              title: parsedTitle,
              description: `Motion plan synthesized for ${parsedTitle}`,
              version: "1.0.0",
              projectType: "ad",
              sourceBriefId: parsedBriefId,
            },
            canvas: {
              width: parsedWidth,
              height: parsedHeight,
              aspect_ratio: parsedAspect,
              fps: parsedFps,
            },
            duration: totalDur,
            scenes: [
              {
                scene_id: "scene_1",
                start_time: 0,
                end_time: scene1Dur,
                duration: scene1Dur,
                purpose: "hook",
                background: { type: "solid", value: "#000000" },
                visual_elements: [
                  {
                    id: "elem_1_logo",
                    type: "logo",
                    description: "Brand mark vector",
                    position: { x: 50, y: 25 },
                    animation: { type: "scale", duration: 0.5, easing: "spring" },
                    layer_order: 1,
                  },
                ],
                text_elements: [
                  {
                    id: "text_1_headline",
                    text: parsedHeadline,
                    role: "headline",
                    position: { x: 50, y: 50 },
                    style: { fontSize: 52, color: "#FFFFFF", fontWeight: "bold", align: "center" },
                    animation: { type: "reveal", duration: 0.6, easing: "easeOut" },
                  },
                ],
                entrance_animation: { type: "fade", duration: 0.4 },
                exit_animation: { type: "slide", duration: 0.3 },
                transition: { type: "cross_dissolve", duration: 0.4 },
                camera_motion: { type: "zoom_in", intensity: "dynamic" },
                audio_cues: [
                  { id: "cue_1", timestamp: 0, type: "whoosh", description: "Opening whoosh hit" },
                ],
              },
              {
                scene_id: "scene_2",
                start_time: scene1Dur,
                end_time: Number((scene1Dur + scene2Dur).toFixed(2)),
                duration: scene2Dur,
                purpose: "feature_highlight",
                background: { type: "solid", value: "#111111" },
                visual_elements: [
                  {
                    id: "elem_2_hero",
                    type: "image",
                    description: "Hero product angle",
                    position: { x: 50, y: 40 },
                    animation: { type: "zoom", duration: 0.6, easing: "easeOut" },
                    layer_order: 1,
                  },
                ],
                text_elements: [
                  {
                    id: "text_2_subheadline",
                    text: parsedSubheadline,
                    role: "subheadline",
                    position: { x: 50, y: 70 },
                    style: { fontSize: 32, color: "#FF3B30", fontWeight: "medium", align: "center" },
                    animation: { type: "slide", direction: "up", duration: 0.5, easing: "easeOut" },
                  },
                ],
                entrance_animation: { type: "zoom", duration: 0.4 },
                exit_animation: { type: "fade", duration: 0.3 },
                transition: { type: "slide_left", duration: 0.4 },
                camera_motion: { type: "pan_left", intensity: "moderate" },
                audio_cues: [
                  {
                    id: "cue_2",
                    timestamp: scene1Dur,
                    type: "beat_drop",
                    description: "Bass drop synchronization",
                  },
                ],
              },
              {
                scene_id: "scene_3",
                start_time: Number((scene1Dur + scene2Dur).toFixed(2)),
                end_time: totalDur,
                duration: scene3Dur,
                purpose: "call_to_action",
                background: { type: "solid", value: "#000000" },
                visual_elements: [],
                text_elements: [
                  {
                    id: "text_3_cta",
                    text: parsedCta,
                    role: "cta",
                    position: { x: 50, y: 50 },
                    style: { fontSize: 48, color: "#FFFFFF", fontWeight: "bold", align: "center" },
                    animation: { type: "bounce", duration: 0.6, easing: "spring" },
                  },
                ],
                entrance_animation: { type: "fade", duration: 0.3 },
                exit_animation: { type: "fade", duration: 0.3 },
                transition: { type: "none", duration: 0 },
                camera_motion: { type: "static" },
                audio_cues: [
                  {
                    id: "cue_3",
                    timestamp: Number((scene1Dur + scene2Dur).toFixed(2)),
                    type: "impact",
                    description: "Final CTA impact",
                  },
                ],
              },
            ],
            global_style: {
              palette: ["#FF3B30", "#000000", "#FFFFFF"],
              typography: "Inter, sans-serif",
              theme: "high-energy kinetic motion",
              motion_pacing: "explosive",
              motion_intensity: "dynamic",
            },
            audio_direction: {
              music_mood: "punchy, driving rhythm",
              tempo: "fast",
              genre: "hybrid electronic trap",
              sound_effects_enabled: true,
            },
            export_settings: {
              format: "mp4",
              resolution: `${parsedWidth}x${parsedHeight}`,
              fps: parsedFps,
              quality: "high",
            },
          };
        } else {
          const isCreativeBriefRequest =
            userContent.includes("CREATIVE BRIEF") ||
            userContent.includes("CREATIVE REQUEST") ||
            userContent.includes("creative brief") ||
            lower.includes("ad") ||
            lower.includes("video") ||
            lower.includes("commercial");

          if (isCreativeBriefRequest) {
            const isSneaker = lower.includes("sneaker") || lower.includes("shoe");
            const isTikTok = lower.includes("tiktok");
            const isYouTube = lower.includes("youtube") && !lower.includes("shorts");
            const isShorts = lower.includes("shorts");
            const isInstagram = lower.includes("instagram") || lower.includes("reels") || (!isTikTok && !isYouTube && !isShorts);
            const hasContradiction = lower.includes("contradict") || (lower.includes("60") && lower.includes("5-second"));

            const platform = isTikTok ? "tiktok" : isShorts ? "youtube_shorts" : isYouTube ? "youtube" : "instagram";
            const aspectRatio = isYouTube ? "16:9" : "9:16";
            const duration =
              lower.includes("15-second") || lower.includes("15s") || lower.includes("15 second")
                ? 15
                : lower.includes("30-second") || lower.includes("30s") || lower.includes("30 second")
                ? 30
                : lower.includes("5-second") || lower.includes("5s")
                ? 5
                : 10;
            const subject = isSneaker ? "AeroGlide Performance Sneaker" : "Next-Gen Product Showcase";

            jsonPayload = {
              brief: {
                title: `${subject} — ${duration}s ${platform.toUpperCase()} Ad`,
                projectType: "ad",
                platform,
              duration,
              aspectRatio,
              style: "bold-kinetic",
              tone: lower.includes("calm") ? "professional" : "energetic",
              audience: isSneaker ? "Athletes and sneaker enthusiasts" : "Modern digital consumers",
              subject,
              visualDirection: {
                palette: ["#FF3B30", "#000000", "#FFFFFF"],
                theme: "high-energy kinetic motion",
                imagery: "hero product angles with fast cuts",
                typography: "bold condensed kinetic sans-serif",
              },
              textContent: {
                headline: isSneaker ? "UNLEASH SPEED" : "EXPERIENCE THE FUTURE",
                subheadline: isSneaker ? "Engineered for pure velocity" : "Built for performance",
                bodyLines: ["Ultra-responsive cushioning", "Instant momentum"],
              },
              cta: {
                text: "Shop Now",
                urlOrHandle: "@aeroglide",
              },
              colorDirection: {
                primary: "#FF3B30",
                secondary: "#1A1A1A",
                background: "#000000",
                accent: "#FFD60A",
              },
              musicDirection: {
                tempo: "fast",
                genre: "hybrid electronic trap",
                mood: "punchy, driving rhythm",
              },
              animationDirection: {
                pacing: "explosive",
                transitionStyle: "dynamic snap whip-pan",
                kineticTypography: true,
                motionIntensity: "dynamic",
              },
              assets: [
                { type: "image", description: "Product hero photography transparent cutout" },
                { type: "logo", description: "Brand vector mark" },
              ],
              constraints: {
                maxDurationSeconds: 60,
                safeZoneAdvisory: "Center focus 80% to clear social UI buttons",
              },
            },
            analysis: {
              explicitlyProvided: [
                `platform: ${platform}`,
                `duration: ${duration}s`,
                ...(isSneaker ? ["subject: sneaker"] : []),
              ],
              defaultsApplied: {
                aspectRatio,
                style: "bold-kinetic",
              },
              assumptionsMade: [
                `Assumed ${aspectRatio} aspect ratio standard for ${platform}`,
              ],
              contradictionsDetected: hasContradiction
                ? ["Requested conflicting timing constraints in single composition"]
                : [],
              needsClarification: false,
              clarificationRequest: null,
            },
          };
        } else {
          // Standard motion design preview (Phase 7.2 default)
          jsonPayload = {
            title: "Kinetic Brand Introduction",
            theme: "energetic-modern",
            estimatedDuration: 5.0,
            scenes: [
              {
                id: "scene-1",
                name: "Intro Hook",
                duration: 2.5,
                elements: [
                  { type: "text", content: "NEXT GENERATION MOTION", animation: "popIn" },
                  { type: "shape", kind: "rectangle", animation: "fadeIn" },
                ],
              },
              {
                id: "scene-2",
                name: "Call to Action",
                duration: 2.5,
                elements: [
                  { type: "text", content: "Create In Seconds", animation: "slideUp" },
                  { type: "logo", animation: "scaleUp" },
                ],
              },
            ],
          };
        }
        }
      }

      return {
        text: JSON.stringify(jsonPayload, null, 2),
        model: normalized.model,
        finishReason: "stop",
        usage: {
          promptTokens: 42,
          completionTokens: 88,
          totalTokens: 130,
        },
        raw: { mock: true, payload: jsonPayload },
      };
    }

    // Default text response simulation
    const text =
      this.options.customTextResponse ||
      `[MOCK MODE] MotionBot AI Creative System response: Ready to generate kinetic motion composition.`;

    return {
      text,
      model: normalized.model,
      finishReason: "stop",
      usage: {
        promptTokens: 25,
        completionTokens: 20,
        totalTokens: 45,
      },
      raw: { mock: true },
    };
  }
}
