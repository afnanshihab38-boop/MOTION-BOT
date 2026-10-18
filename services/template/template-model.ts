/**
 * MOTION-BOT — Built-in Templates and Project Instantiation Service
 * Provides production-ready motion design templates, dynamic placeholder mapping,
 * and isolated project instantiation.
 * Part of Phase 8.5: Templates → Editable Projects.
 */

import { Template, TemplateId, TemplateCategory, TemplatePlaceholder } from "@/types/template";
import { Project } from "@/types/project";
import { Scene } from "@/types/scene";
import { MotionElement } from "@/types/element";
import {
  createProject,
  generateProjectId,
} from "@/services/project/project-model";
import {
  createScene,
  generateSceneId,
  alignScenesSequentially,
} from "@/services/project/scene-model";
import {
  createTextElement,
  createShapeElement,
  createImageElement,
  createLogoElement,
  generateElementId,
  DEFAULT_TRANSFORM,
} from "@/services/element/element-model";
import { createImageAsset, createLogoAsset } from "@/services/asset/asset-model";
import { addKeyframeToElement } from "@/services/timeline";
import { serializeProject, deserializeProject } from "@/services/project/project-serializer";
import { validateProjectDeep } from "@/services/project/project-validator";

// ============================================================================
// 1. BUILT-IN MOTION DESIGN TEMPLATES
// ============================================================================

/**
 * 1. Minimal Kinetic Typography (16:9, 1920x1080)
 */
function createMinimalKineticTypographyProject(): Project {
  let titleEl: MotionElement = createTextElement({
    id: "temp1_el_headline",
    name: "Kinetic Headline",
    text: "MAKE BOLD MOVES",
    fontSize: 72,
    fontWeight: 800,
    letterSpacing: -1,
    textAlign: "center",
    alignment: "center",
    color: "#FFFFFF",
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 360,
      y: 420,
      width: 1200,
      height: 120,
    },
    appearance: {
      opacity: 1,
      blendMode: "normal",
      fill: { type: "solid", color: "#FFFFFF" },
    },
  });

  // Slide-up and fade-in keyframes for headline
  titleEl = addKeyframeToElement(titleEl, "y", 0, 480, 30).element;
  titleEl = addKeyframeToElement(titleEl, "y", 1.2, 420, 30).element;
  titleEl = addKeyframeToElement(titleEl, "opacity", 0, 0, 30).element;
  titleEl = addKeyframeToElement(titleEl, "opacity", 0.8, 1, 30).element;

  let subtitleEl: MotionElement = createTextElement({
    id: "temp1_el_sub",
    name: "Subtitle Tagline",
    text: "Engineered for high-impact social and commercial campaigns",
    fontSize: 24,
    fontWeight: 500,
    textAlign: "center",
    alignment: "center",
    color: "#94A3B8",
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 460,
      y: 560,
      width: 1000,
      height: 60,
    },
    appearance: {
      opacity: 1,
      blendMode: "normal",
      fill: { type: "solid", color: "#94A3B8" },
    },
  });

  subtitleEl = addKeyframeToElement(subtitleEl, "opacity", 0, 0, 30).element;
  subtitleEl = addKeyframeToElement(subtitleEl, "opacity", 1.5, 1, 30).element;

  const accentBar = createShapeElement({
    id: "temp1_el_accent",
    name: "Accent Line",
    shapeKind: "rectangle",
    cornerRadius: 2,
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 880,
      y: 640,
      width: 160,
      height: 6,
    },
    appearance: {
      opacity: 1,
      blendMode: "normal",
      fill: { type: "solid", color: "#00F2FE" },
    },
  });

  const scene = createScene({
    id: "temp1_scene_1",
    name: "Kinetic Reveal",
    duration: 4.0,
    background: { type: "solid", color: "#08090C" },
    elements: [titleEl, subtitleEl, accentBar],
  });

  return createProject({
    id: "temp_proj_1",
    name: "Minimal Kinetic Typography",
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 4.0,
    scenes: [scene],
    assets: [],
  });
}

/**
 * 2. SaaS App Feature Showcase (16:9, 1920x1080)
 */
function createSaaSShowcaseProject(): Project {
  const showcaseAsset = createImageAsset({
    id: "asset_saas_preview",
    name: "dashboard-analytics.png",
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    width: 1200,
    height: 700,
  });

  const logoAsset = createLogoAsset({
    id: "asset_saas_logo",
    name: "saas-brand-mark.svg",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='40' fill='%236366F1'/><path d='M35 50 L45 60 L65 40' stroke='white' stroke-width='8' fill='none'/></svg>",
    width: 160,
    height: 160,
  });

  // Scene 1: App Intro (2.5s)
  let logoLayer: MotionElement = createLogoElement({
    id: "temp2_el_logo",
    name: "App Brand Logo",
    assetId: logoAsset.id,
    src: logoAsset.url,
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 880,
      y: 180,
      width: 160,
      height: 160,
    },
  });
  logoLayer = addKeyframeToElement(logoLayer, "scaleX", 0, 0.7, 30).element;
  logoLayer = addKeyframeToElement(logoLayer, "scaleX", 1.0, 1.0, 30).element;
  logoLayer = addKeyframeToElement(logoLayer, "scaleY", 0, 0.7, 30).element;
  logoLayer = addKeyframeToElement(logoLayer, "scaleY", 1.0, 1.0, 30).element;

  const headerText = createTextElement({
    id: "temp2_el_head",
    name: "Hero Title",
    text: "THE INTELLIGENT WORKSPACE",
    fontSize: 48,
    fontWeight: 700,
    textAlign: "center",
    alignment: "center",
    color: "#FFFFFF",
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 460,
      y: 380,
      width: 1000,
      height: 80,
    },
  });

  const scene1 = createScene({
    id: "temp2_scene_1",
    name: "Scene 1 - Platform Intro",
    duration: 2.5,
    background: { type: "solid", color: "#0B0C10" },
    elements: [logoLayer, headerText],
  });

  // Scene 2: Feature & Showcase (3.5s)
  let previewLayer: MotionElement = createImageElement({
    id: "temp2_el_preview",
    name: "Dashboard Showcase",
    assetId: showcaseAsset.id,
    src: showcaseAsset.url,
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 460,
      y: 240,
      width: 1000,
      height: 560,
    },
    cornerRadius: 12,
  });
  previewLayer = addKeyframeToElement(previewLayer, "y", 0, 300, 30).element;
  previewLayer = addKeyframeToElement(previewLayer, "y", 1.5, 240, 30).element;

  const featureText = createTextElement({
    id: "temp2_el_cta",
    name: "Feature Callout",
    text: "Deploy in seconds. Scale without limits.",
    fontSize: 32,
    fontWeight: 600,
    textAlign: "center",
    alignment: "center",
    color: "#00F2FE",
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 460,
      y: 840,
      width: 1000,
      height: 60,
    },
  });

  const scene2 = createScene({
    id: "temp2_scene_2",
    name: "Scene 2 - Live Dashboard",
    duration: 3.5,
    background: { type: "solid", color: "#0B0C10" },
    elements: [previewLayer, featureText],
  });

  const alignedScenes = alignScenesSequentially([scene1, scene2]);

  return createProject({
    id: "temp_proj_2",
    name: "SaaS App Feature Showcase",
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 6.0,
    scenes: alignedScenes,
    assets: [showcaseAsset, logoAsset],
  });
}

/**
 * 3. E-Commerce Flash Sale Story (9:16, 1080x1920)
 */
function createEcommerceFlashSaleProject(): Project {
  const heroProductAsset = createImageAsset({
    id: "asset_ecom_sneaker",
    name: "cyber-sneaker.png",
    url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
    width: 800,
    height: 800,
  });

  let productLayer: MotionElement = createImageElement({
    id: "temp3_el_product",
    name: "Featured Product",
    assetId: heroProductAsset.id,
    src: heroProductAsset.url,
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 190,
      y: 560,
      width: 700,
      height: 700,
    },
    cornerRadius: 24,
  });
  productLayer = addKeyframeToElement(productLayer, "rotation", 0, -8, 30).element;
  productLayer = addKeyframeToElement(productLayer, "rotation", 2.0, 5, 30).element;

  const saleBadge = createShapeElement({
    id: "temp3_el_badge",
    name: "Sale Badge Backdrop",
    shapeKind: "rectangle",
    cornerRadius: 30,
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 390,
      y: 380,
      width: 300,
      height: 80,
    },
    appearance: {
      opacity: 1,
      blendMode: "normal",
      fill: { type: "solid", color: "#EF4444" },
    },
  });

  const badgeText = createTextElement({
    id: "temp3_el_badge_text",
    name: "Discount Text",
    text: "50% OFF FLASH SALE",
    fontSize: 26,
    fontWeight: 900,
    textAlign: "center",
    alignment: "center",
    color: "#FFFFFF",
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 390,
      y: 405,
      width: 300,
      height: 40,
    },
  });

  const ctaText = createTextElement({
    id: "temp3_el_cta",
    name: "Swipe Up CTA",
    text: "SWIPE UP TO SHOP NOW",
    fontSize: 28,
    fontWeight: 700,
    textAlign: "center",
    alignment: "center",
    color: "#FFFFFF",
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 140,
      y: 1550,
      width: 800,
      height: 60,
    },
  });

  const scene = createScene({
    id: "temp3_scene_1",
    name: "Flash Sale Vertical Story",
    duration: 4.5,
    background: { type: "solid", color: "#0F172A" },
    elements: [saleBadge, badgeText, productLayer, ctaText],
  });

  return createProject({
    id: "temp_proj_3",
    name: "E-Commerce Flash Sale Story",
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 4.5,
    scenes: [scene],
    assets: [heroProductAsset],
  });
}

/**
 * 4. Clean Corporate Logo Ident (16:9, 1920x1080)
 */
function createCorporateLogoIdentProject(): Project {
  const logoAsset = createLogoAsset({
    id: "asset_corp_ident",
    name: "apex-ventures.svg",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><polygon points='60,15 105,95 15,95' fill='%2338BDF8'/><polygon points='60,40 90,95 30,95' fill='%230284C7'/></svg>",
    width: 220,
    height: 220,
  });

  let logoLayer: MotionElement = createLogoElement({
    id: "temp4_el_logo",
    name: "Corporate Mark",
    assetId: logoAsset.id,
    src: logoAsset.url,
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 850,
      y: 340,
      width: 220,
      height: 220,
    },
  });
  logoLayer = addKeyframeToElement(logoLayer, "opacity", 0, 0, 30).element;
  logoLayer = addKeyframeToElement(logoLayer, "opacity", 1.0, 1, 30).element;
  logoLayer = addKeyframeToElement(logoLayer, "y", 0, 380, 30).element;
  logoLayer = addKeyframeToElement(logoLayer, "y", 1.5, 340, 30).element;

  const companyName = createTextElement({
    id: "temp4_el_name",
    name: "Company Name",
    text: "APEX VENTURES",
    fontSize: 42,
    fontWeight: 800,
    letterSpacing: 4,
    textAlign: "center",
    alignment: "center",
    color: "#FFFFFF",
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 460,
      y: 590,
      width: 1000,
      height: 70,
    },
  });

  const tagline = createTextElement({
    id: "temp4_el_tagline",
    name: "Tagline",
    text: "INNOVATION BEYOND BOUNDARIES",
    fontSize: 18,
    fontWeight: 500,
    letterSpacing: 2,
    textAlign: "center",
    alignment: "center",
    color: "#64748B",
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 460,
      y: 670,
      width: 1000,
      height: 40,
    },
  });

  const scene = createScene({
    id: "temp4_scene_1",
    name: "Logo Ident Sequence",
    duration: 3.5,
    background: { type: "solid", color: "#030712" },
    elements: [logoLayer, companyName, tagline],
  });

  return createProject({
    id: "temp_proj_4",
    name: "Clean Corporate Logo Ident",
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 3.5,
    scenes: [scene],
    assets: [logoAsset],
  });
}

/**
 * 5. Instagram Reel Testimonial (9:16, 1080x1920)
 */
function createReelTestimonialProject(): Project {
  const avatarAsset = createImageAsset({
    id: "asset_avatar_sarah",
    name: "sarah-avatar.png",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    width: 240,
    height: 240,
  });

  const quoteBox = createShapeElement({
    id: "temp5_el_card",
    name: "Quote Card Backdrop",
    shapeKind: "rectangle",
    cornerRadius: 32,
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 90,
      y: 520,
      width: 900,
      height: 800,
    },
    appearance: {
      opacity: 1,
      blendMode: "normal",
      fill: { type: "solid", color: "#1E293B" },
    },
  });

  let stars: MotionElement = createTextElement({
    id: "temp5_el_stars",
    name: "Star Rating",
    text: "★★★★★",
    fontSize: 48,
    fontWeight: 700,
    textAlign: "center",
    alignment: "center",
    color: "#F59E0B",
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 140,
      y: 600,
      width: 800,
      height: 60,
    },
  });
  stars = addKeyframeToElement(stars, "scaleX", 0, 0.8, 30).element;
  stars = addKeyframeToElement(stars, "scaleX", 1.0, 1.1, 30).element;

  const quoteText = createTextElement({
    id: "temp5_el_quote",
    name: "Customer Quote",
    text: '"MotionBot cut our motion design turnaround from 3 days to 10 minutes."',
    fontSize: 40,
    fontWeight: 600,
    lineHeight: 1.3,
    textAlign: "center",
    alignment: "center",
    color: "#F8FAFC",
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 140,
      y: 720,
      width: 800,
      height: 300,
    },
  });

  const authorText = createTextElement({
    id: "temp5_el_author",
    name: "Author Name",
    text: "Sarah Jenkins",
    fontSize: 30,
    fontWeight: 700,
    textAlign: "center",
    alignment: "center",
    color: "#00F2FE",
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 140,
      y: 1060,
      width: 800,
      height: 45,
    },
  });

  const roleText = createTextElement({
    id: "temp5_el_role",
    name: "Author Role",
    text: "Head of Growth, Apex Cloud",
    fontSize: 22,
    fontWeight: 500,
    textAlign: "center",
    alignment: "center",
    color: "#94A3B8",
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 140,
      y: 1115,
      width: 800,
      height: 40,
    },
  });

  const scene = createScene({
    id: "temp5_scene_1",
    name: "Social Proof Reel",
    duration: 5.0,
    background: { type: "solid", color: "#0B0F19" },
    elements: [quoteBox, stars, quoteText, authorText, roleText],
  });

  return createProject({
    id: "temp_proj_5",
    name: "Instagram Reel Testimonial",
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 5.0,
    scenes: [scene],
    assets: [avatarAsset],
  });
}

/**
 * 6. Tech Spec Comparison (1:1, 1080x1080)
 */
function createTechSpecComparisonProject(): Project {
  const header = createTextElement({
    id: "temp6_el_head",
    name: "Metric Headline",
    text: "10X ACCELERATION",
    fontSize: 54,
    fontWeight: 900,
    textAlign: "center",
    alignment: "center",
    color: "#FFFFFF",
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 140,
      y: 180,
      width: 800,
      height: 80,
    },
  });

  const stat1Card = createShapeElement({
    id: "temp6_el_card1",
    name: "Metric 1 Card",
    shapeKind: "rectangle",
    cornerRadius: 20,
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 140,
      y: 320,
      width: 800,
      height: 150,
    },
    appearance: {
      opacity: 1,
      blendMode: "normal",
      fill: { type: "solid", color: "#1E1B4B" },
      stroke: { color: "#6366F1", width: 2 },
    },
  });

  let stat1Value: MotionElement = createTextElement({
    id: "temp6_el_val1",
    name: "Metric 1 Value",
    text: "99.99% Uptime",
    fontSize: 42,
    fontWeight: 800,
    textAlign: "center",
    alignment: "center",
    color: "#A5B4FC",
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 140,
      y: 370,
      width: 800,
      height: 60,
    },
  });
  stat1Value = addKeyframeToElement(stat1Value, "scaleX", 0, 0.9, 30).element;
  stat1Value = addKeyframeToElement(stat1Value, "scaleX", 1.2, 1.05, 30).element;

  const stat2Card = createShapeElement({
    id: "temp6_el_card2",
    name: "Metric 2 Card",
    shapeKind: "rectangle",
    cornerRadius: 20,
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 140,
      y: 520,
      width: 800,
      height: 150,
    },
    appearance: {
      opacity: 1,
      blendMode: "normal",
      fill: { type: "solid", color: "#0F172A" },
      stroke: { color: "#0EA5E9", width: 2 },
    },
  });

  const stat2Value = createTextElement({
    id: "temp6_el_val2",
    name: "Metric 2 Value",
    text: "< 0.4ms Latency",
    fontSize: 42,
    fontWeight: 800,
    textAlign: "center",
    alignment: "center",
    color: "#38BDF8",
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 140,
      y: 570,
      width: 800,
      height: 60,
    },
  });

  const footerCTA = createTextElement({
    id: "temp6_el_cta",
    name: "Bottom CTA",
    text: "BENCHMARK YOUR STACK TODAY",
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: 2,
    textAlign: "center",
    alignment: "center",
    color: "#64748B",
    transform: {
      ...DEFAULT_TRANSFORM,
      x: 140,
      y: 780,
      width: 800,
      height: 50,
    },
  });

  const scene = createScene({
    id: "temp6_scene_1",
    name: "Tech Comparison Square",
    duration: 4.0,
    background: { type: "solid", color: "#090A0F" },
    elements: [header, stat1Card, stat1Value, stat2Card, stat2Value, footerCTA],
  });

  return createProject({
    id: "temp_proj_6",
    name: "Tech Spec Comparison",
    width: 1080,
    height: 1080,
    fps: 30,
    duration: 4.0,
    scenes: [scene],
    assets: [],
  });
}

// ============================================================================
// 2. TEMPLATE SPECIFICATIONS REPOSITORY
// ============================================================================

export const BUILTIN_TEMPLATES: Template[] = [
  {
    id: "temp-1",
    title: "Minimal Kinetic Typography",
    description: "High-impact bold typography transitions with staggered word reveals and vibrant accent lines.",
    category: "kinetic-typography",
    aspectRatio: "16:9",
    width: 1920,
    height: 1080,
    durationFrames: 120,
    fps: 30,
    thumbnailUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
    tags: ["typography", "kinetic", "minimal", "bold", "16:9"],
    placeholders: [
      {
        id: "ph-1-1",
        elementId: "temp1_el_headline",
        key: "headline",
        name: "Headline Text",
        type: "text",
        defaultValue: "MAKE BOLD MOVES",
        required: true,
      },
      {
        id: "ph-1-2",
        elementId: "temp1_el_sub",
        key: "subtitle",
        name: "Subtitle Text",
        type: "text",
        defaultValue: "Engineered for high-impact social and commercial campaigns",
      },
    ],
    projectSnapshot: serializeProject(createMinimalKineticTypographyProject()),
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "temp-2",
    title: "SaaS App Feature Showcase",
    description: "Floating device mockups with smooth UI zoom, multi-scene pacing, and brand callout animations.",
    category: "product-showcase",
    aspectRatio: "16:9",
    width: 1920,
    height: 1080,
    durationFrames: 180,
    fps: 30,
    thumbnailUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80",
    tags: ["saas", "product", "software", "dashboard", "16:9", "multi-scene"],
    placeholders: [
      {
        id: "ph-2-1",
        elementId: "temp2_el_head",
        key: "headline",
        name: "Hero Title",
        type: "text",
        defaultValue: "THE INTELLIGENT WORKSPACE",
        required: true,
      },
      {
        id: "ph-2-2",
        elementId: "temp2_el_cta",
        key: "callout",
        name: "Feature Callout",
        type: "text",
        defaultValue: "Deploy in seconds. Scale without limits.",
      },
    ],
    projectSnapshot: serializeProject(createSaaSShowcaseProject()),
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "temp-3",
    title: "E-Commerce Flash Sale Story",
    description: "Vertical product highlight with animated discount badges, energetic rotation, and swipe CTA.",
    category: "social-ad",
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    durationFrames: 135,
    fps: 30,
    thumbnailUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
    tags: ["ecommerce", "sale", "story", "tiktok", "reels", "9:16"],
    placeholders: [
      {
        id: "ph-3-1",
        elementId: "temp3_el_badge_text",
        key: "discount",
        name: "Discount Text",
        type: "text",
        defaultValue: "50% OFF FLASH SALE",
        required: true,
      },
      {
        id: "ph-3-2",
        elementId: "temp3_el_cta",
        key: "cta",
        name: "Call To Action",
        type: "text",
        defaultValue: "SWIPE UP TO SHOP NOW",
      },
    ],
    projectSnapshot: serializeProject(createEcommerceFlashSaleProject()),
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "temp-4",
    title: "Clean Corporate Logo Ident",
    description: "Sleek geometric line reveal with subtle lighting, smooth scale-in, and professional brand layout.",
    category: "logo-reveal",
    aspectRatio: "16:9",
    width: 1920,
    height: 1080,
    durationFrames: 105,
    fps: 30,
    thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
    tags: ["logo", "corporate", "branding", "reveal", "16:9"],
    placeholders: [
      {
        id: "ph-4-1",
        elementId: "temp4_el_name",
        key: "companyName",
        name: "Company Name",
        type: "text",
        defaultValue: "APEX VENTURES",
        required: true,
      },
      {
        id: "ph-4-2",
        elementId: "temp4_el_tagline",
        key: "tagline",
        name: "Tagline",
        type: "text",
        defaultValue: "INNOVATION BEYOND BOUNDARIES",
      },
    ],
    projectSnapshot: serializeProject(createCorporateLogoIdentProject()),
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "temp-5",
    title: "Instagram Reel Testimonial",
    description: "Dynamic quote card transition with star rating animations and bold social proof styling.",
    category: "testimonial",
    aspectRatio: "9:16",
    width: 1080,
    height: 1920,
    durationFrames: 150,
    fps: 30,
    thumbnailUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    tags: ["testimonial", "review", "social", "reels", "9:16"],
    placeholders: [
      {
        id: "ph-5-1",
        elementId: "temp5_el_quote",
        key: "quote",
        name: "Customer Quote",
        type: "text",
        defaultValue: '"MotionBot cut our motion design turnaround from 3 days to 10 minutes."',
        required: true,
      },
      {
        id: "ph-5-2",
        elementId: "temp5_el_author",
        key: "author",
        name: "Author Name",
        type: "text",
        defaultValue: "Sarah Jenkins",
      },
    ],
    projectSnapshot: serializeProject(createReelTestimonialProject()),
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "temp-6",
    title: "Tech Spec Comparison",
    description: "Square grid layout with animated metric cards, high-contrast badges, and product highlights.",
    category: "product-showcase",
    aspectRatio: "1:1",
    width: 1080,
    height: 1080,
    durationFrames: 120,
    fps: 30,
    thumbnailUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
    tags: ["tech", "benchmark", "square", "instagram", "1:1"],
    placeholders: [
      {
        id: "ph-6-1",
        elementId: "temp6_el_head",
        key: "headline",
        name: "Metric Headline",
        type: "text",
        defaultValue: "10X ACCELERATION",
        required: true,
      },
      {
        id: "ph-6-2",
        elementId: "temp6_el_val1",
        key: "stat1",
        name: "Metric 1 Value",
        type: "text",
        defaultValue: "99.99% Uptime",
      },
    ],
    projectSnapshot: serializeProject(createTechSpecComparisonProject()),
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  },
];

// ============================================================================
// 3. REPOSITORY QUERY HELPERS
// ============================================================================

/**
 * Returns all available built-in templates.
 */
export function getAllTemplates(): Template[] {
  return BUILTIN_TEMPLATES;
}

/**
 * Finds a template by its unique ID.
 */
export function getTemplateById(id: string): Template | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id);
}

/**
 * Filters templates by category, aspect ratio, or search query.
 */
export function queryTemplates(options?: {
  category?: string;
  aspectRatio?: string;
  search?: string;
}): Template[] {
  let results = [...BUILTIN_TEMPLATES];

  if (options?.category && options.category !== "all") {
    const cat = options.category.toLowerCase().replace(/\s+/g, "-");
    results = results.filter((t) =>
      t.category.toLowerCase().replace(/\s+/g, "-") === cat ||
      t.tags.includes(cat)
    );
  }

  if (options?.aspectRatio && options.aspectRatio !== "all") {
    results = results.filter((t) => t.aspectRatio === options.aspectRatio);
  }

  if (options?.search && options.search.trim()) {
    const q = options.search.trim().toLowerCase();
    results = results.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }

  return results;
}

// ============================================================================
// 4. TEMPLATE → EDITABLE PROJECT FACTORY (TEMPLATE ISOLATION GUARANTEED)
// ============================================================================

/**
 * Instantiates a brand new, fully editable, independent Project from a Template.
 *
 * Guarantees:
 * 1. Independent fresh Project ID (`proj_...`)
 * 2. Deep-cloned scenes with fresh Scene IDs
 * 3. Deep-cloned elements with fresh Element IDs
 * 4. Deep-cloned keyframes and tracks with fresh IDs
 * 5. Isolated assets linked into project.assets
 * 6. Preserves animation, typography, layout, and timing
 * 7. ZERO mutation to the source template (100% template isolation)
 */
export function createProjectFromTemplate(
  templateOrId: Template | TemplateId,
  customTitle?: string,
  placeholderOverrides?: Record<string, string | number | boolean>
): Project {
  const template =
    typeof templateOrId === "string"
      ? getTemplateById(templateOrId)
      : templateOrId;

  if (!template) {
    throw new Error(`Template not found: ${String(templateOrId)}`);
  }

  // 1. Deserialize the template snapshot
  const parsed = deserializeProject(template.projectSnapshot);
  if (!parsed.success) {
    throw new Error(`Corrupted template project snapshot for ${template.id}: ${parsed.errors.join(", ")}`);
  }

  const baseProject = parsed.project;
  const newProjectId = generateProjectId();
  const now = new Date().toISOString();

  // 2. Deeply re-map all scene, element, and keyframe IDs to guarantee isolation
  const clonedScenes: Scene[] = baseProject.scenes.map((scene, sIdx) => {
    const newSceneId = generateSceneId();

    const clonedElements: MotionElement[] = scene.elements.map((el, eIdx) => {
      const newElementId = generateElementId(el.type);

      // Re-map property tracks & keyframe IDs if present
      const clonedTracks = el.propertyTracks
        ? el.propertyTracks.map((track) => ({
            ...track,
            id: `track_${track.property}_${Math.random().toString(36).slice(2, 7)}`,
            keyframes: track.keyframes.map((kf) => ({
              ...kf,
              id: `kf_${Math.random().toString(36).slice(2, 7)}`,
            })),
          }))
        : [];

      // Check if any placeholder override applies to this element
      let elementWithOverrides = { ...el };
      if (placeholderOverrides) {
        const matchingPh = template.placeholders.find(
          (ph) => ph.elementId === el.id || (placeholderOverrides[ph.key] !== undefined && ph.elementId === el.id)
        );
        if (matchingPh && placeholderOverrides[matchingPh.key] !== undefined) {
          const val = placeholderOverrides[matchingPh.key];
          if (elementWithOverrides.type === "text" && typeof val === "string") {
            elementWithOverrides = {
              ...elementWithOverrides,
              text: val,
            };
          }
        }
      }

      return {
        ...elementWithOverrides,
        id: newElementId,
        propertyTracks: clonedTracks,
      } as MotionElement;
    });

    return {
      ...scene,
      id: newSceneId,
      order: sIdx,
      elements: clonedElements,
    };
  });

  // 3. Deep-clone assets to project.assets
  const clonedAssets = baseProject.assets.map((asset) => ({
    ...asset,
    metadata: { ...asset.metadata },
  }));

  // 4. Construct the new editable Project
  const newProject: Project = {
    id: newProjectId,
    name: customTitle || template.title,
    schemaVersion: baseProject.schemaVersion,
    width: template.width,
    height: template.height,
    fps: template.fps,
    duration: baseProject.duration,
    scenes: clonedScenes,
    assets: clonedAssets,
    metadata: {
      ...baseProject.metadata,
      title: customTitle || template.title,
      description: template.description,
      templateId: template.id,
      tags: [...template.tags],
    },
    createdAt: now,
    updatedAt: now,
  };

  // 5. Validation check
  const validation = validateProjectDeep(newProject);
  if (!validation.valid) {
    throw new Error(`Generated template project failed validation: ${validation.errors.map(e => e.message).join(", ")}`);
  }

  return newProject;
}
