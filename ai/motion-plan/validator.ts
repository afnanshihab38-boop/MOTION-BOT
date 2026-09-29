/**
 * MOTION-BOT — Structured Motion Plan Validator & Normalizer
 * Phase 7.4: Structured Motion Plan Generator
 *
 * Implements strict temporal correctness verification, controlled animation
 * vocabulary enforcement, creative brief fidelity checks, and safe fallback normalization.
 */

import {
  MotionPlan,
  MotionPlanScene,
  MotionPlanValidationResult,
  MotionPlanValidationIssue,
  ControlledAnimationType,
  CONTROLLED_ANIMATION_SET,
  ControlledTransitionType,
  CONTROLLED_TRANSITION_TYPES,
  CONTROLLED_TRANSITION_SET,
  ControlledCameraMotionType,
  CONTROLLED_CAMERA_MOTION_TYPES,
  CONTROLLED_CAMERA_MOTION_SET,
  VisualElementPlan,
  TextElementPlan,
  AudioCuePlan,
  AnimationSpec,
} from "./types";
import { CreativeBrief } from "../creative-brain/types";
import { DIMENSION_PRESETS } from "@/services/project/project-model";

export interface ValidationOptions {
  /** When true, issues with missing fields or vocabulary violations cause valid=false */
  strict?: boolean;
}

/**
 * Validates and normalizes raw LLM output or user input into a guaranteed-valid MotionPlan.
 */
export function validateAndNormalizeMotionPlan(
  raw: unknown,
  sourceBrief: CreativeBrief,
  options: ValidationOptions = {}
): MotionPlanValidationResult {
  const errors: MotionPlanValidationIssue[] = [];
  const warnings: MotionPlanValidationIssue[] = [];

  const rawObj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  // ---------------------------------------------------------------------------
  // 1. PROJECT METADATA & CANVAS
  // ---------------------------------------------------------------------------
  const rawProject = (rawObj.project && typeof rawObj.project === "object"
    ? rawObj.project
    : {}) as Record<string, unknown>;

  const title =
    typeof rawProject.title === "string" && rawProject.title.trim().length > 0
      ? rawProject.title.trim()
      : sourceBrief.title || "Motion Composition";

  const description =
    typeof rawProject.description === "string"
      ? rawProject.description.trim()
      : `Motion plan synthesized for ${sourceBrief.subject}`;

  const projectType =
    typeof rawProject.projectType === "string" && rawProject.projectType.trim().length > 0
      ? rawProject.projectType.trim()
      : sourceBrief.projectType || "ad";

  const rawCanvas = (rawObj.canvas && typeof rawObj.canvas === "object"
    ? rawObj.canvas
    : {}) as Record<string, unknown>;

  const briefPreset = DIMENSION_PRESETS[sourceBrief.aspectRatio] || DIMENSION_PRESETS["16:9"];

  const width = typeof rawCanvas.width === "number" && rawCanvas.width > 0 ? rawCanvas.width : briefPreset.width;
  const height =
    typeof rawCanvas.height === "number" && rawCanvas.height > 0 ? rawCanvas.height : briefPreset.height;
  const aspect_ratio =
    typeof rawCanvas.aspect_ratio === "string" && rawCanvas.aspect_ratio.trim().length > 0
      ? rawCanvas.aspect_ratio.trim()
      : sourceBrief.aspectRatio;

  const fps = typeof rawCanvas.fps === "number" && [24, 30, 60].includes(rawCanvas.fps) ? rawCanvas.fps : 30;

  if (!rawObj.canvas && options.strict) {
    errors.push({
      field: "canvas",
      message: "Required field 'canvas' is missing from motion plan.",
      severity: "error",
    });
  }

  // ---------------------------------------------------------------------------
  // 2. PROJECT DURATION
  // ---------------------------------------------------------------------------
  let duration =
    typeof rawObj.duration === "number" && !isNaN(rawObj.duration) && rawObj.duration > 0
      ? rawObj.duration
      : sourceBrief.duration;

  if (rawObj.duration !== undefined && typeof rawObj.duration !== "number") {
    errors.push({
      field: "duration",
      message: "Project duration must be a valid number.",
      severity: "error",
      value: rawObj.duration,
    });
  } else if (typeof rawObj.duration === "number" && rawObj.duration <= 0) {
    errors.push({
      field: "duration",
      message: "Project duration must be strictly greater than 0.",
      severity: "error",
      value: rawObj.duration,
    });
  }

  // Check duration bounds
  if (duration <= 0) {
    duration = sourceBrief.duration || 10;
  }

  // ---------------------------------------------------------------------------
  // 3. SCENES VALIDATION & TEMPORAL CORRECTNESS
  // ---------------------------------------------------------------------------
  const rawScenes = Array.isArray(rawObj.scenes) ? rawObj.scenes : [];

  if (rawScenes.length === 0) {
    if (options.strict || rawObj.scenes !== undefined) {
      errors.push({
        field: "scenes",
        message: "Motion plan must contain at least one scene.",
        severity: "error",
      });
    }
  }

  const normalizedScenes: MotionPlanScene[] = [];
  let currentTimeCursor = 0.0;

  for (let i = 0; i < rawScenes.length; i++) {
    const rawScene = (rawScenes[i] && typeof rawScenes[i] === "object"
      ? rawScenes[i]
      : {}) as Record<string, unknown>;

    const sceneFieldPrefix = `scenes[${i}]`;
    const scene_id =
      typeof rawScene.scene_id === "string" && rawScene.scene_id.trim().length > 0
        ? rawScene.scene_id.trim()
        : `scene_${i + 1}`;

    const purpose =
      typeof rawScene.purpose === "string" && rawScene.purpose.trim().length > 0
        ? rawScene.purpose.trim()
        : i === 0
        ? "hook"
        : i === rawScenes.length - 1
        ? "call_to_action"
        : "content_presentation";

    // Validate timestamps
    const rawStartTime = rawScene.start_time;
    const rawEndTime = rawScene.end_time;
    const rawDuration = rawScene.duration;

    let startTime = typeof rawStartTime === "number" && !isNaN(rawStartTime) ? rawStartTime : -1;
    let endTime = typeof rawEndTime === "number" && !isNaN(rawEndTime) ? rawEndTime : -1;
    let sceneDuration = typeof rawDuration === "number" && !isNaN(rawDuration) ? rawDuration : -1;

    // Temporal Rule 1: start_time >= 0
    if (rawStartTime !== undefined) {
      if (typeof rawStartTime !== "number" || isNaN(rawStartTime)) {
        errors.push({
          field: `${sceneFieldPrefix}.start_time`,
          message: `Scene '${scene_id}' start_time must be a valid number.`,
          severity: "error",
          value: rawStartTime,
        });
      } else if (rawStartTime < 0) {
        errors.push({
          field: `${sceneFieldPrefix}.start_time`,
          message: `Scene '${scene_id}' start_time cannot be negative (${rawStartTime}s).`,
          severity: "error",
          value: rawStartTime,
        });
      }
    }

    // Temporal Rule 2: end_time > start_time
    if (rawEndTime !== undefined) {
      if (typeof rawEndTime !== "number" || isNaN(rawEndTime)) {
        errors.push({
          field: `${sceneFieldPrefix}.end_time`,
          message: `Scene '${scene_id}' end_time must be a valid number.`,
          severity: "error",
          value: rawEndTime,
        });
      } else if (startTime >= 0 && rawEndTime <= startTime) {
        errors.push({
          field: `${sceneFieldPrefix}.end_time`,
          message: `Scene '${scene_id}' end_time (${rawEndTime}s) must be strictly greater than start_time (${startTime}s).`,
          severity: "error",
          value: rawEndTime,
        });
      }
    }

    // Temporal Rule 3: duration > 0 and fits within project
    if (rawDuration !== undefined) {
      if (typeof rawDuration !== "number" || isNaN(rawDuration) || rawDuration <= 0) {
        errors.push({
          field: `${sceneFieldPrefix}.duration`,
          message: `Scene '${scene_id}' duration must be positive and non-zero.`,
          severity: "error",
          value: rawDuration,
        });
      }
    }

    // Check for impossible timestamps exceeding project duration
    if (startTime > duration + 0.001) {
      errors.push({
        field: `${sceneFieldPrefix}.start_time`,
        message: `Scene '${scene_id}' start_time (${startTime}s) exceeds project duration (${duration}s).`,
        severity: "error",
        value: startTime,
      });
    }

    if (endTime > duration + 0.05) {
      errors.push({
        field: `${sceneFieldPrefix}.end_time`,
        message: `Scene '${scene_id}' end_time (${endTime}s) exceeds project duration (${duration}s).`,
        severity: "error",
        value: endTime,
      });
    }

    // Auto-normalize if timestamps were absent or malformed in non-strict mode
    if (startTime < 0 || isNaN(startTime)) {
      startTime = currentTimeCursor;
    }
    if (sceneDuration <= 0 || isNaN(sceneDuration)) {
      if (endTime > startTime) {
        sceneDuration = endTime - startTime;
      } else {
        const remainingScenes = Math.max(1, rawScenes.length - i);
        sceneDuration = Math.max(1, Number(((duration - currentTimeCursor) / remainingScenes).toFixed(2)));
      }
    }
    if (endTime <= startTime || isNaN(endTime)) {
      endTime = Number((startTime + sceneDuration).toFixed(2));
    } else {
      sceneDuration = Number((endTime - startTime).toFixed(2));
    }

    // Update cursor for sequence checking
    currentTimeCursor = endTime;

    // Validate background
    const rawBg = (rawScene.background && typeof rawScene.background === "object"
      ? rawScene.background
      : {}) as Record<string, unknown>;
    const bgType = ["solid", "gradient", "media", "transparent"].includes(String(rawBg.type))
      ? (String(rawBg.type) as "solid" | "gradient" | "media" | "transparent")
      : "solid";
    const bgValue =
      typeof rawBg.value === "string" && rawBg.value.trim().length > 0
        ? rawBg.value.trim()
        : sourceBrief.colorDirection?.background || "#0A0A0A";

    // Validate entrance & exit animations
    const entrance_animation = validateAnimationSpec(
      rawScene.entrance_animation,
      `${sceneFieldPrefix}.entrance_animation`,
      "fade",
      errors,
      warnings,
      options.strict
    );

    const exit_animation = validateAnimationSpec(
      rawScene.exit_animation,
      `${sceneFieldPrefix}.exit_animation`,
      "fade",
      errors,
      warnings,
      options.strict
    );

    // Validate transition
    const rawTransition = (rawScene.transition && typeof rawScene.transition === "object"
      ? rawScene.transition
      : {}) as Record<string, unknown>;

    let transType: ControlledTransitionType = "none";
    const rawTransType = String(rawTransition.type || "none").toLowerCase().replace(/-/g, "_");
    if (CONTROLLED_TRANSITION_SET.has(rawTransType)) {
      transType = rawTransType as ControlledTransitionType;
    } else {
      if (options.strict && rawTransition.type) {
        errors.push({
          field: `${sceneFieldPrefix}.transition.type`,
          message: `Invalid transition type '${rawTransition.type}'. Must be one of: ${CONTROLLED_TRANSITION_TYPES.join(", ")}`,
          severity: "error",
          value: rawTransition.type,
        });
      } else if (rawTransition.type) {
        warnings.push({
          field: `${sceneFieldPrefix}.transition.type`,
          message: `Transition type '${rawTransition.type}' unknown. Normalized to 'fade'.`,
          severity: "warning",
          value: rawTransition.type,
        });
        transType = "fade";
      }
    }

    const transDuration =
      typeof rawTransition.duration === "number" && rawTransition.duration > 0
        ? Math.min(1.5, Math.max(0.1, rawTransition.duration))
        : transType === "none"
        ? 0
        : 0.5;

    // Validate camera motion
    const rawCamera = (rawScene.camera_motion && typeof rawScene.camera_motion === "object"
      ? rawScene.camera_motion
      : {}) as Record<string, unknown>;

    let camType: ControlledCameraMotionType = "static";
    const rawCamType = String(rawCamera.type || "static").toLowerCase().replace(/-/g, "_");
    if (CONTROLLED_CAMERA_MOTION_SET.has(rawCamType)) {
      camType = rawCamType as ControlledCameraMotionType;
    } else {
      if (options.strict && rawCamera.type) {
        errors.push({
          field: `${sceneFieldPrefix}.camera_motion.type`,
          message: `Invalid camera motion '${rawCamera.type}'. Must be one of: ${CONTROLLED_CAMERA_MOTION_TYPES.join(", ")}`,
          severity: "error",
          value: rawCamera.type,
        });
      } else if (rawCamera.type) {
        warnings.push({
          field: `${sceneFieldPrefix}.camera_motion.type`,
          message: `Camera motion '${rawCamera.type}' unknown. Normalized to 'static'.`,
          severity: "warning",
          value: rawCamera.type,
        });
        camType = "static";
      }
    }

    const camIntensity = ["subtle", "moderate", "dynamic"].includes(String(rawCamera.intensity))
      ? (String(rawCamera.intensity) as "subtle" | "moderate" | "dynamic")
      : "moderate";

    // Validate visual elements
    const rawVisuals = Array.isArray(rawScene.visual_elements) ? rawScene.visual_elements : [];
    const visual_elements: VisualElementPlan[] = [];

    for (let v = 0; v < rawVisuals.length; v++) {
      const rv = (rawVisuals[v] && typeof rawVisuals[v] === "object" ? rawVisuals[v] : {}) as Record<
        string,
        unknown
      >;
      const elemPrefix = `${sceneFieldPrefix}.visual_elements[${v}]`;

      const veType = ["image", "logo", "shape", "mockup", "video_clip", "sticker"].includes(
        String(rv.type)
      )
        ? (String(rv.type) as VisualElementPlan["type"])
        : "shape";

      const anim = validateAnimationSpec(
        rv.animation,
        `${elemPrefix}.animation`,
        "scale",
        errors,
        warnings,
        options.strict
      );

      const rawPos = (rv.position && typeof rv.position === "object" ? rv.position : {}) as Record<
        string,
        unknown
      >;
      const posX = typeof rawPos.x === "number" ? rawPos.x : 50;
      const posY = typeof rawPos.y === "number" ? rawPos.y : 50;

      visual_elements.push({
        id: typeof rv.id === "string" && rv.id.trim() ? rv.id.trim() : `elem_${i + 1}_v${v + 1}`,
        type: veType,
        description: typeof rv.description === "string" ? rv.description : `${veType} asset`,
        position: { x: posX, y: posY },
        size:
          rv.size && typeof rv.size === "object"
            ? {
                width: Number((rv.size as { width?: number }).width) || 300,
                height: Number((rv.size as { height?: number }).height) || 300,
              }
            : undefined,
        animation: anim,
        layer_order: typeof rv.layer_order === "number" ? rv.layer_order : v + 1,
      });
    }

    // Validate text elements
    const rawTexts = Array.isArray(rawScene.text_elements) ? rawScene.text_elements : [];
    const text_elements: TextElementPlan[] = [];

    for (let t = 0; t < rawTexts.length; t++) {
      const rt = (rawTexts[t] && typeof rawTexts[t] === "object" ? rawTexts[t] : {}) as Record<
        string,
        unknown
      >;
      const textPrefix = `${sceneFieldPrefix}.text_elements[${t}]`;

      const role = ["headline", "subheadline", "body", "cta", "tagline", "badge"].includes(
        String(rt.role)
      )
        ? (String(rt.role) as TextElementPlan["role"])
        : t === 0
        ? "headline"
        : "body";

      const text =
        typeof rt.text === "string" && rt.text.trim().length > 0
          ? rt.text.trim()
          : role === "headline"
          ? sourceBrief.textContent.headline
          : role === "cta" && sourceBrief.cta
          ? sourceBrief.cta.text
          : "Motion Kinetic Text";

      const anim = validateAnimationSpec(
        rt.animation,
        `${textPrefix}.animation`,
        role === "headline" ? "reveal" : "fade",
        errors,
        warnings,
        options.strict
      );

      const rawPos = (rt.position && typeof rt.position === "object" ? rt.position : {}) as Record<
        string,
        unknown
      >;
      const posX = typeof rawPos.x === "number" ? rawPos.x : 50;
      const posY = typeof rawPos.y === "number" ? rawPos.y : role === "headline" ? 40 : 60;

      const rawStyle = (rt.style && typeof rt.style === "object" ? rt.style : {}) as Record<
        string,
        unknown
      >;

      text_elements.push({
        id: typeof rt.id === "string" && rt.id.trim() ? rt.id.trim() : `text_${i + 1}_t${t + 1}`,
        text,
        role,
        position: { x: posX, y: posY },
        style: {
          fontSize: typeof rawStyle.fontSize === "number" ? rawStyle.fontSize : role === "headline" ? 56 : 28,
          color:
            typeof rawStyle.color === "string" && rawStyle.color.trim()
              ? rawStyle.color.trim()
              : sourceBrief.colorDirection?.primary || "#FFFFFF",
          fontWeight: ["normal", "medium", "bold", "black"].includes(String(rawStyle.fontWeight))
            ? (String(rawStyle.fontWeight) as "normal" | "medium" | "bold" | "black")
            : role === "headline"
            ? "bold"
            : "normal",
          align: ["left", "center", "right"].includes(String(rawStyle.align))
            ? (String(rawStyle.align) as "left" | "center" | "right")
            : "center",
        },
        animation: anim,
      });
    }

    // Validate audio cues
    const rawAudio = Array.isArray(rawScene.audio_cues) ? rawScene.audio_cues : [];
    const audio_cues: AudioCuePlan[] = [];

    for (let a = 0; a < rawAudio.length; a++) {
      const ra = (rawAudio[a] && typeof rawAudio[a] === "object" ? rawAudio[a] : {}) as Record<
        string,
        unknown
      >;
      const cueType = ["sfx", "beat_drop", "voice_start", "riser", "whoosh", "impact", "glitch"].includes(
        String(ra.type)
      )
        ? (String(ra.type) as AudioCuePlan["type"])
        : "sfx";

      audio_cues.push({
        id: typeof ra.id === "string" && ra.id.trim() ? ra.id.trim() : `cue_${i + 1}_a${a + 1}`,
        timestamp: typeof ra.timestamp === "number" ? ra.timestamp : startTime,
        type: cueType,
        description: typeof ra.description === "string" ? ra.description : "Sound effect hit",
      });
    }

    normalizedScenes.push({
      scene_id,
      start_time: startTime,
      end_time: endTime,
      duration: sceneDuration,
      purpose,
      background: {
        type: bgType,
        value: bgValue,
      },
      visual_elements,
      text_elements,
      entrance_animation,
      exit_animation,
      transition: {
        type: transType,
        duration: transDuration,
      },
      camera_motion: {
        type: camType,
        intensity: camIntensity,
      },
      audio_cues,
    });
  }

  // If no scenes were parsed at all, generate default structured scenes derived from brief
  if (normalizedScenes.length === 0) {
    const generated = generateFallbackScenes(sourceBrief, duration);
    normalizedScenes.push(...generated);
  }

  // ---------------------------------------------------------------------------
  // 4. TEMPORAL CONTINUITY & DURATION MISMATCH CHECK
  // ---------------------------------------------------------------------------
  // Sort scenes deterministically by start_time
  normalizedScenes.sort((a, b) => a.start_time - b.start_time);

  // Check total composition coverage
  const lastScene = normalizedScenes[normalizedScenes.length - 1];
  if (lastScene) {
    const totalSceneDuration = lastScene.end_time;
    if (Math.abs(totalSceneDuration - duration) > 0.1) {
      if (options.strict) {
        errors.push({
          field: "scenes",
          message: `Total scenes duration (${totalSceneDuration}s) does not match project duration (${duration}s).`,
          severity: "error",
          value: { totalSceneDuration, projectDuration: duration },
        });
      } else {
        warnings.push({
          field: "scenes",
          message: `Total scenes duration (${totalSceneDuration}s) adjusted to match project duration (${duration}s).`,
          severity: "warning",
          value: { totalSceneDuration, projectDuration: duration },
        });
        // Normalize the last scene end_time so it strictly matches duration
        lastScene.end_time = duration;
        lastScene.duration = Number((lastScene.end_time - lastScene.start_time).toFixed(2));
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 5. GLOBAL STYLE & AUDIO DIRECTION
  // ---------------------------------------------------------------------------
  const rawGlobalStyle = (rawObj.global_style && typeof rawObj.global_style === "object"
    ? rawObj.global_style
    : {}) as Record<string, unknown>;

  const palette = Array.isArray(rawGlobalStyle.palette) && rawGlobalStyle.palette.length > 0
    ? (rawGlobalStyle.palette as string[])
    : sourceBrief.visualDirection?.palette?.length
    ? sourceBrief.visualDirection.palette
    : ["#FFFFFF", "#0A0A0A", sourceBrief.colorDirection?.primary || "#FF3B30"];

  const typography =
    typeof rawGlobalStyle.typography === "string" && rawGlobalStyle.typography.trim()
      ? rawGlobalStyle.typography.trim()
      : sourceBrief.visualDirection?.typography || "Inter, sans-serif";

  const theme =
    typeof rawGlobalStyle.theme === "string" && rawGlobalStyle.theme.trim()
      ? rawGlobalStyle.theme.trim()
      : sourceBrief.style || "modern kinetic";

  const motion_pacing =
    typeof rawGlobalStyle.motion_pacing === "string" && rawGlobalStyle.motion_pacing.trim()
      ? rawGlobalStyle.motion_pacing.trim()
      : sourceBrief.animationDirection?.pacing || "fast";

  const rawAudioDir = (rawObj.audio_direction && typeof rawObj.audio_direction === "object"
    ? rawObj.audio_direction
    : {}) as Record<string, unknown>;

  const music_mood =
    typeof rawAudioDir.music_mood === "string" && rawAudioDir.music_mood.trim()
      ? rawAudioDir.music_mood.trim()
      : sourceBrief.musicDirection?.mood || "energetic and punchy";

  const tempo =
    typeof rawAudioDir.tempo === "string" && rawAudioDir.tempo.trim()
      ? rawAudioDir.tempo.trim()
      : sourceBrief.musicDirection?.tempo || "fast";

  const genre =
    typeof rawAudioDir.genre === "string" && rawAudioDir.genre.trim()
      ? rawAudioDir.genre.trim()
      : sourceBrief.musicDirection?.genre || "electronic";

  const rawExport = (rawObj.export_settings && typeof rawObj.export_settings === "object"
    ? rawObj.export_settings
    : {}) as Record<string, unknown>;

  const export_settings = {
    format: ["mp4", "webm", "gif"].includes(String(rawExport.format))
      ? (String(rawExport.format) as "mp4" | "webm" | "gif")
      : ("mp4" as const),
    resolution:
      typeof rawExport.resolution === "string" && rawExport.resolution.trim()
        ? rawExport.resolution.trim()
        : `${width}x${height}`,
    fps: typeof rawExport.fps === "number" ? rawExport.fps : fps,
    quality: ["draft", "standard", "high", "production"].includes(String(rawExport.quality))
      ? (String(rawExport.quality) as "draft" | "standard" | "high" | "production")
      : ("high" as const),
  };

  const plan: MotionPlan = {
    id: typeof rawObj.id === "string" && rawObj.id.trim() ? rawObj.id.trim() : `plan_${Date.now()}`,
    version: "1.0.0",
    project: {
      title,
      description,
      version: "1.0.0",
      projectType,
      sourceBriefId: sourceBrief.id,
    },
    canvas: {
      width,
      height,
      aspect_ratio,
      fps,
    },
    duration,
    scenes: normalizedScenes,
    global_style: {
      palette,
      typography,
      theme,
      motion_pacing,
      motion_intensity: sourceBrief.animationDirection?.motionIntensity || "moderate",
    },
    audio_direction: {
      music_mood,
      tempo,
      genre,
      sound_effects_enabled: true,
      voiceover_notes: typeof rawAudioDir.voiceover_notes === "string" ? rawAudioDir.voiceover_notes : undefined,
    },
    export_settings,
    createdAt: typeof rawObj.createdAt === "string" ? rawObj.createdAt : new Date().toISOString(),
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    plan,
  };
}

/**
 * Validates an animation specification against the controlled animation vocabulary.
 */
function validateAnimationSpec(
  rawSpec: unknown,
  fieldPath: string,
  fallbackType: ControlledAnimationType,
  errors: MotionPlanValidationIssue[],
  warnings: MotionPlanValidationIssue[],
  strict?: boolean
): AnimationSpec {
  const spec = (rawSpec && typeof rawSpec === "object" ? rawSpec : {}) as Record<string, unknown>;

  let type: ControlledAnimationType = fallbackType;
  const rawType = String(spec.type || fallbackType).toLowerCase().replace(/-/g, "_");

  // Map common compound words like "fade_in" -> "fade", "slide_up" -> "slide"
  const normalizedToken = rawType.startsWith("fade")
    ? "fade"
    : rawType.startsWith("slide")
    ? "slide"
    : rawType.startsWith("scale")
    ? "scale"
    : rawType.startsWith("zoom")
    ? "zoom"
    : rawType;

  if (CONTROLLED_ANIMATION_SET.has(normalizedToken)) {
    type = normalizedToken as ControlledAnimationType;
  } else {
    if (strict && spec.type) {
      errors.push({
        field: `${fieldPath}.type`,
        message: `Invalid animation type '${spec.type}'. Must be one of controlled vocabulary: ${Array.from(CONTROLLED_ANIMATION_SET).join(", ")}`,
        severity: "error",
        value: spec.type,
      });
    } else if (spec.type) {
      warnings.push({
        field: `${fieldPath}.type`,
        message: `Animation type '${spec.type}' not in controlled vocabulary. Clamped to '${fallbackType}'.`,
        severity: "warning",
        value: spec.type,
      });
      type = fallbackType;
    }
  }

  const duration =
    typeof spec.duration === "number" && spec.duration > 0
      ? Number(spec.duration.toFixed(2))
      : 0.5;

  const delay =
    typeof spec.delay === "number" && spec.delay >= 0
      ? Number(spec.delay.toFixed(2))
      : 0;

  return {
    type,
    direction: ["in", "out", "left", "right", "up", "down", "center"].includes(String(spec.direction))
      ? (String(spec.direction) as AnimationSpec["direction"])
      : undefined,
    duration,
    delay,
    easing: typeof spec.easing === "string" ? spec.easing : "easeOut",
  };
}

/**
 * Fallback generator when LLM generates empty scenes or needs structured reconstruction.
 */
function generateFallbackScenes(brief: CreativeBrief, totalDuration: number): MotionPlanScene[] {
  const numScenes = totalDuration <= 8 ? 2 : totalDuration <= 18 ? 3 : 4;
  const sceneDur = Number((totalDuration / numScenes).toFixed(2));
  const scenes: MotionPlanScene[] = [];

  const headline = brief.textContent.headline;
  const subheadline = brief.textContent.subheadline;
  const ctaText = brief.cta?.text || "Learn More";

  for (let i = 0; i < numScenes; i++) {
    const isFirst = i === 0;
    const isLast = i === numScenes - 1;
    const startTime = Number((i * sceneDur).toFixed(2));
    const endTime = isLast ? totalDuration : Number(((i + 1) * sceneDur).toFixed(2));
    const currentDur = Number((endTime - startTime).toFixed(2));

    const purpose = isFirst ? "hook" : isLast ? "call_to_action" : "feature_highlight";

    const textElements: TextElementPlan[] = [];
    if (isFirst) {
      textElements.push({
        id: `text_1_headline`,
        text: headline,
        role: "headline",
        position: { x: 50, y: 45 },
        style: { fontSize: 52, color: brief.colorDirection?.primary || "#FFFFFF", fontWeight: "bold", align: "center" },
        animation: { type: "reveal", duration: 0.6, easing: "easeOut" },
      });
      if (subheadline) {
        textElements.push({
          id: `text_1_sub`,
          text: subheadline,
          role: "subheadline",
          position: { x: 50, y: 65 },
          style: { fontSize: 26, color: "#CCCCCC", fontWeight: "normal", align: "center" },
          animation: { type: "fade", duration: 0.5, delay: 0.3, easing: "easeOut" },
        });
      }
    } else if (isLast) {
      textElements.push({
        id: `text_${i + 1}_cta`,
        text: ctaText,
        role: "cta",
        position: { x: 50, y: 50 },
        style: { fontSize: 44, color: "#FFFFFF", fontWeight: "bold", align: "center" },
        animation: { type: "bounce", duration: 0.6, easing: "spring" },
      });
    } else {
      const bodyLine = brief.textContent.bodyLines?.[0] || brief.subject;
      textElements.push({
        id: `text_${i + 1}_body`,
        text: bodyLine,
        role: "body",
        position: { x: 50, y: 55 },
        style: { fontSize: 32, color: "#FFFFFF", fontWeight: "medium", align: "center" },
        animation: { type: "slide", direction: "up", duration: 0.5, easing: "easeOut" },
      });
    }

    const visualElements: VisualElementPlan[] = [];
    if (brief.assets?.length) {
      const asset = brief.assets[i % brief.assets.length];
      visualElements.push({
        id: `elem_${i + 1}_asset`,
        type: asset.type === "logo" ? "logo" : "image",
        description: asset.description,
        position: { x: 50, y: isFirst ? 25 : 35 },
        animation: { type: "scale", duration: 0.7, easing: "spring" },
        layer_order: 1,
      });
    }

    scenes.push({
      scene_id: `scene_${i + 1}`,
      start_time: startTime,
      end_time: endTime,
      duration: currentDur,
      purpose,
      background: {
        type: "solid",
        value: brief.colorDirection?.background || "#000000",
      },
      visual_elements: visualElements,
      text_elements: textElements,
      entrance_animation: { type: isFirst ? "fade" : "zoom", duration: 0.4 },
      exit_animation: { type: isLast ? "fade" : "slide", duration: 0.4 },
      transition: { type: isLast ? "none" : "cross_dissolve", duration: 0.4 },
      camera_motion: { type: isFirst ? "zoom_in" : "pan_left", intensity: "moderate" },
      audio_cues: [
        {
          id: `cue_${i + 1}`,
          timestamp: startTime,
          type: isFirst ? "whoosh" : isLast ? "impact" : "sfx",
          description: `${purpose} sound cue`,
        },
      ],
    });
  }

  return scenes;
}
