/**
 * MOTION-BOT — Development & Testing Project Fixture
 * Sample valid project demonstrating:
 *   Project
 *    ├── Scene
 *    │    ├── Text
 *    │    ├── Shape
 *    │    └── Image
 *    └── Assets
 *
 * Clearly marked as TEST/DEVELOPMENT DATA ONLY.
 * Part of Phase 3.5: Validation, Serialization & Architecture Lock.
 */

import { Project, CURRENT_SCHEMA_VERSION } from "@/types/project";
import { createImageAsset, createLogoAsset } from "../asset/asset-model";
import { createTextElement, createShapeElement, createImageElement, createLogoElement } from "../element/element-model";
import { createAnimation, createKeyframe } from "../animation/animation-model";
import { createScene } from "./scene-model";

/**
 * Creates a valid sample motion design project for testing and local development.
 * Contains Project -> Scenes -> Elements (Text, Shape, Image, Logo) -> Assets.
 */
export function createSampleProject(): Project {
  // 1. Create Assets
  const logoAsset = createLogoAsset({
    id: "asset_logo_dev",
    name: "motionbot-logo.svg",
    url: "https://assets.motionbot.dev/logo.svg",
    width: 200,
    height: 200,
  });

  const heroAsset = createImageAsset({
    id: "asset_hero_dev",
    name: "hero-showcase.png",
    url: "https://assets.motionbot.dev/showcase.png",
    width: 1200,
    height: 800,
  });

  // 2. Create Elements for Scene 1
  const bgShape = createShapeElement({
    id: "el_card_shape",
    name: "Background Backdrop",
    shapeKind: "rectangle",
    cornerRadius: 12,
    transform: {
      x: 960,
      y: 540,
      width: 1100,
      height: 700,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    },
    appearance: {
      opacity: 0.95,
      blendMode: "normal",
      fill: { type: "solid", color: "#111319" },
      stroke: { color: "#2B303C", width: 1.5 },
    },
  });

  const logoEl = createLogoElement({
    id: "el_brand_logo",
    name: "Brand Logo Mark",
    assetId: "asset_logo_dev",
    transform: {
      x: 960,
      y: 340,
      width: 120,
      height: 120,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    },
  });

  const headlineText = createTextElement({
    id: "el_headline_text",
    name: "Headline Text",
    content: "Instant Motion Graphics with AI",
    fontFamily: "Outfit",
    fontSize: 56,
    fontWeight: 700,
    alignment: "center",
    color: "#FFFFFF",
    transform: {
      x: 960,
      y: 470,
      width: 900,
      height: 80,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    },
    propertyTracks: [
      createAnimation("opacity", [
        createKeyframe(0.0, 0, "linear"),
        createKeyframe(0.6, 1, "easeOut"),
      ]),
      createAnimation("y", [
        createKeyframe(0.0, 500, "easeOut"),
        createKeyframe(0.8, 470, "easeInOut"),
      ]),
    ],
  });

  const heroImage = createImageElement({
    id: "el_hero_image",
    name: "App Showcase Mockup",
    assetId: "asset_hero_dev",
    aspectRatio: 1200 / 800,
    objectFit: "contain",
    cornerRadius: 8,
    transform: {
      x: 960,
      y: 680,
      width: 600,
      height: 400,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    },
    appearance: {
      opacity: 1,
      blendMode: "normal",
      fill: { type: "none" },
    },
  });

  // 3. Assemble Scene
  const scene1 = createScene({
    id: "scene_hook_01",
    name: "Scene 1 — Product Introduction",
    order: 0,
    startTime: 0,
    duration: 5.0,
    background: {
      type: "solid",
      color: "#08090C",
    },
    elements: [bgShape, heroImage, logoEl, headlineText],
    metadata: {
      description: "Hook sequence showcasing headline text and product hero image",
      colorTag: "#00F0FF",
      customFields: {
        stage: "hook",
        voiceoverDuration: 4.5,
      },
    },
  });

  // 4. Assemble Project
  return {
    id: "proj_sample_dev_fixture",
    name: "Sample Commercial Comp [DEV FIXTURE]",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 5.0,
    scenes: [scene1],
    assets: [logoAsset, heroAsset],
    metadata: {
      title: "Sample Commercial Comp [DEV FIXTURE]",
      description: "Development fixture demonstrating Text, Shape, Image, Logo, and Animation data structures.",
      author: "MOTION-BOT Dev System",
      tags: ["dev-fixture", "test", "social-ad"],
      starred: true,
      customFields: {
        isTestFixture: true,
      },
    },
    createdAt: "2026-09-27T12:00:00.000Z",
    updatedAt: "2026-09-27T12:00:00.000Z",
  };
}

/**
 * Pre-instantiated constant test fixture.
 */
export const SAMPLE_DEV_PROJECT: Project = createSampleProject();
