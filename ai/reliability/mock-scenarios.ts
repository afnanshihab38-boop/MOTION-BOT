/**
 * MOTION-BOT — Deterministic Reliability Mock Scenarios
 * Phase 7.7: AI Output Validation + Reliability Layer
 *
 * Provides repeatable test fixtures for testing validation failure modes,
 * transient retry policies, and recovery mechanisms in mock/offline mode.
 */

export const MOCK_RELIABILITY_SCENARIOS = {
  // Valid JSON output
  validCreativeBrief: JSON.stringify({
    title: "Energetic Sneaker Launch",
    projectType: "ad",
    platform: "instagram",
    duration: 10,
    aspectRatio: "9:16",
    style: "bold-kinetic",
    tone: "energetic",
    subject: "AeroGlide Running Shoes",
    visualDirection: {
      palette: ["#FF5722", "#000000", "#FFFFFF"],
      theme: "high-contrast urban sportswear",
    },
    textContent: {
      headline: "Defy Gravity",
      subheadline: "All-New AeroGlide",
    },
    cta: {
      text: "Shop Now",
    },
    animationDirection: {
      pacing: "fast",
      motionIntensity: "dynamic",
    },
  }),

  // Markdown-wrapped with comments and trailing comma
  markdownWrappedWithComments: `
Here is the creative brief for your new video project:

\`\`\`json
{
  "title": "Minimal Watch Teaser", // Brand title
  "projectType": "teaser",
  "platform": "youtube",
  "duration": 15,
  "aspectRatio": "16:9",
  "style": "clean-luxury",
  "tone": "luxurious",
  "subject": "Chronos Precision Chronograph",
  "visualDirection": {
    "palette": ["#1A1A1A", "#D4AF37"],
    "theme": "dark minimalist luxury",
  },
  "textContent": {
    "headline": "Time Redefined",
  },
  "animationDirection": {
    "pacing": "smooth",
  },
}
\`\`\`

Hope you like it! Let me know if you want adjustments.
`,

  // Malformed JSON (unclosed syntax)
  malformedJson: `{"title": "Broken Json", "duration": 10, "scenes": [{"id": 1`,

  // Schema failure (missing required title & subject)
  missingRequiredSchemaFields: JSON.stringify({
    duration: 10,
    platform: "instagram",
    style: "modern",
  }),

  // Semantic failure (scene duration arithmetic error)
  semanticTimingErrorPlan: {
    id: "plan_error_1",
    version: "1.0.0",
    project: {
      title: "Timing Error Plan",
      version: "1.0.0",
      projectType: "ad",
      sourceBriefId: "brief_1",
    },
    canvas: {
      width: 1080,
      height: 1920,
      aspect_ratio: "9:16",
      fps: 30,
    },
    duration: 10,
    scenes: [
      {
        scene_id: "sc_1",
        start_time: 0,
        end_time: 5,
        duration: 8, // Arithmetic error: 5 - 0 !== 8
        purpose: "hook",
        background: { type: "solid", value: "#000000" },
        visual_elements: [],
        text_elements: [],
        entrance_animation: { type: "fade" },
        exit_animation: { type: "fade" },
        transition: { type: "none" },
        camera_motion: { type: "static" },
        audio_cues: [],
      },
    ],
    global_style: {
      palette: ["#000000"],
      typography: "Inter",
      theme: "dark",
      motion_pacing: "fast",
    },
    audio_direction: {
      music_mood: "energetic",
      tempo: "120bpm",
      genre: "electronic",
      sound_effects_enabled: true,
    },
    export_settings: {
      format: "mp4",
      resolution: "1080x1920",
      fps: 30,
      quality: "standard",
    },
    createdAt: new Date().toISOString(),
  },

  // Tool validation failure (unknown tool)
  unknownToolCall: {
    tool: "arbitrary_shell_exec",
    arguments: { command: "rm -rf /" },
  },

  // Cross-project violation
  crossProjectToolCall: {
    tool: "update_scene",
    arguments: {
      sceneId: "sc_1",
      projectId: "unauthorized_foreign_project_999",
      name: "Hacked Scene",
    },
  },
};
