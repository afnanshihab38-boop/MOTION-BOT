/**
 * MOTION-BOT — Element & Asset Model Test Suite
 * Validates concrete element types, common properties, asset references,
 * asset metadata specialization, and reference resolution.
 * Part of Phase 3.3: Element & Asset Model.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  createTextElement,
  createImageElement,
  createShapeElement,
  createLogoElement,
  createVideoElement,
  createAudioElement,
  createGroupElement,
  validateElement,
  getElementBounds,
  isMediaElement,
  getElementAssetId,
  updateElementTransform,
  updateElementAppearance,
  setElementLock,
  setElementVisibility,
  setElementZIndex,
} from "../services/element/element-model";

import {
  createAsset,
  createImageAsset,
  createVideoAsset,
  createAudioAsset,
  createFontAsset,
  createLogoAsset,
  validateAsset,
  resolveAssetForElement,
  isAssetReferenced,
  getReferencedAssets,
  getUnreferencedAssets,
} from "../services/asset/asset-model";

test("Element Model — Common element properties consistency across all types", () => {
  const elements = [
    createTextElement({ name: "Text 1" }),
    createImageElement({ name: "Img 1", assetId: "asset_img_01" }),
    createShapeElement({ name: "Shape 1" }),
    createLogoElement({ name: "Logo 1", assetId: "asset_logo_01" }),
    createVideoElement({ name: "Video 1", assetId: "asset_vid_01" }),
    createAudioElement({ name: "Audio 1", assetId: "asset_aud_01" }),
    createGroupElement({ name: "Group 1", childrenIds: ["el_1", "el_2"] }),
  ];

  for (const el of elements) {
    // Check common properties existence and valid types
    assert.ok(typeof el.id === "string" && el.id.length > 0, `Missing id on ${el.type}`);
    assert.ok(typeof el.type === "string", `Missing type on ${el.type}`);
    assert.ok(typeof el.visible === "boolean", `Missing visible on ${el.type}`);
    assert.ok(typeof el.locked === "boolean", `Missing locked on ${el.type}`);
    assert.ok(typeof el.zIndex === "number", `Missing zIndex on ${el.type}`);
    assert.ok(typeof el.startFrame === "number", `Missing startFrame on ${el.type}`);
    assert.ok(typeof el.durationFrames === "number", `Missing durationFrames on ${el.type}`);

    // Transform consistency
    assert.ok(typeof el.transform.x === "number");
    assert.ok(typeof el.transform.y === "number");
    assert.ok(typeof el.transform.width === "number");
    assert.ok(typeof el.transform.height === "number");
    assert.ok(typeof el.transform.rotation === "number");
    assert.ok(typeof el.transform.scaleX === "number");
    assert.ok(typeof el.transform.scaleY === "number");

    // Appearance consistency
    assert.ok(typeof el.appearance.opacity === "number");
    assert.ok(typeof el.appearance.blendMode === "string");
    assert.ok(typeof el.appearance.fill === "object");

    // Validation
    const validation = validateElement(el);
    assert.equal(validation.valid, true, `Validation failed for ${el.type}: ${validation.errors.join(", ")}`);
  }
});

test("Text Element — Specialized kinetic typography properties", () => {
  const textEl = createTextElement({
    name: "Headline",
    content: "Generate High-Impact Ads",
    fontFamily: "Outfit",
    fontSize: 64,
    fontWeight: 800,
    lineHeight: 1.15,
    letterSpacing: -1.5,
    alignment: "center",
    color: "#00F0FF",
  });

  assert.equal(textEl.type, "text");
  assert.equal(textEl.content, "Generate High-Impact Ads");
  assert.equal(textEl.text, "Generate High-Impact Ads");
  assert.equal(textEl.fontFamily, "Outfit");
  assert.equal(textEl.fontSize, 64);
  assert.equal(textEl.fontWeight, 800);
  assert.equal(textEl.lineHeight, 1.15);
  assert.equal(textEl.letterSpacing, -1.5);
  assert.equal(textEl.alignment, "center");
  assert.equal(textEl.textAlign, "center");
  assert.equal(textEl.color, "#00F0FF");
  assert.equal(textEl.appearance.fill.color, "#00F0FF");
});

test("Shape Element — Shape kind variants and procedural properties", () => {
  const rect = createShapeElement({
    shapeKind: "rectangle",
    cornerRadius: 8,
  });
  assert.equal(rect.shapeKind, "rectangle");
  assert.equal(rect.cornerRadius, 8);

  const circle = createShapeElement({
    shapeKind: "circle",
  });
  assert.equal(circle.shapeKind, "circle");

  const line = createShapeElement({
    shapeKind: "line",
  });
  assert.equal(line.shapeKind, "line");
});

test("Group Element — Hierarchical grouping representation", () => {
  const group = createGroupElement({
    name: "CTA Card Group",
    childrenIds: ["el_button_bg", "el_button_label", "el_icon"],
    clipChildren: true,
  });

  assert.equal(group.type, "group");
  assert.equal(group.childrenIds.length, 3);
  assert.ok(group.childrenIds.includes("el_button_bg"));
  assert.equal(group.clipChildren, true);
});

test("Asset Model — Specialized asset creation and metadata", () => {
  const imageAsset = createImageAsset({
    id: "asset_hero_img",
    name: "hero-photo.png",
    url: "https://cdn.example.com/hero.png",
    width: 1920,
    height: 1080,
    sizeBytes: 1024000,
  });

  assert.equal(imageAsset.type, "image");
  assert.equal(imageAsset.width, 1920);
  assert.equal(imageAsset.height, 1080);
  assert.equal(imageAsset.metadata.aspectRatio, 1920 / 1080);
  assert.equal(validateAsset(imageAsset).valid, true);

  const videoAsset = createVideoAsset({
    id: "asset_broll_vid",
    name: "background-loop.mp4",
    url: "https://cdn.example.com/loop.mp4",
    width: 1920,
    height: 1080,
    durationSeconds: 15.0,
    fps: 30,
  });

  assert.equal(videoAsset.type, "video");
  assert.equal(videoAsset.duration, 15.0);
  assert.equal(videoAsset.metadata.durationSeconds, 15.0);
  assert.equal(validateAsset(videoAsset).valid, true);

  const audioAsset = createAudioAsset({
    id: "asset_soundtrack",
    name: "cinematic-synth.mp3",
    url: "https://cdn.example.com/synth.mp3",
    durationSeconds: 60.0,
  });

  assert.equal(audioAsset.type, "audio");
  assert.equal(audioAsset.duration, 60.0);
  assert.equal(validateAsset(audioAsset).valid, true);

  const fontAsset = createFontAsset({
    id: "asset_brand_font",
    name: "Outfit-Bold.woff2",
    url: "https://cdn.example.com/outfit-bold.woff2",
  });

  assert.equal(fontAsset.type, "font");
  assert.equal(fontAsset.mimeType, "font/woff2");
  assert.equal(validateAsset(fontAsset).valid, true);

  const logoAsset = createLogoAsset({
    id: "asset_brand_logo",
    name: "acme-logo.svg",
    url: "https://cdn.example.com/logo.svg",
    width: 400,
    height: 100,
  });

  assert.equal(logoAsset.type, "logo");
  assert.equal(logoAsset.mimeType, "image/svg+xml");
  assert.equal(validateAsset(logoAsset).valid, true);
});

test("Architecture Rule — Element references Asset via assetId without embedding asset payloads", () => {
  // 1. Create independent assets
  const logoAsset = createLogoAsset({
    id: "asset_brand_logo_123",
    name: "MotionBot Logo",
    url: "https://assets.motionbot.com/logo.svg",
    width: 256,
    height: 256,
  });

  const bannerAsset = createImageAsset({
    id: "asset_banner_456",
    name: "Header Banner",
    url: "https://assets.motionbot.com/banner.jpg",
    width: 1200,
    height: 600,
  });

  const unusedAsset = createImageAsset({
    id: "asset_unused_789",
    name: "Unused Asset",
    url: "https://assets.motionbot.com/unused.jpg",
  });

  const assetRegistry = [logoAsset, bannerAsset, unusedAsset];

  // 2. Create elements referencing asset IDs
  const logoElement = createLogoElement({
    assetId: "asset_brand_logo_123",
    name: "Header Logo",
  });

  const imageElement = createImageElement({
    assetId: "asset_banner_456",
    name: "Hero Image",
  });

  const textElement = createTextElement({
    text: "Editable Ad Title",
  });

  // 3. Verify media detection and assetId retrieval
  assert.equal(isMediaElement(logoElement), true);
  assert.equal(isMediaElement(imageElement), true);
  assert.equal(isMediaElement(textElement), false);
  assert.equal(getElementAssetId(logoElement), "asset_brand_logo_123");
  assert.equal(getElementAssetId(textElement), undefined);

  // 4. Resolve element's asset from asset registry
  const resolvedLogo = resolveAssetForElement(logoElement, assetRegistry);
  assert.ok(resolvedLogo);
  assert.equal(resolvedLogo?.id, "asset_brand_logo_123");
  assert.equal(resolvedLogo?.url, "https://assets.motionbot.com/logo.svg");

  const resolvedImage = resolveAssetForElement(imageElement, assetRegistry);
  assert.ok(resolvedImage);
  assert.equal(resolvedImage?.id, "asset_banner_456");

  // 5. Query reference status across composition elements
  const elements = [logoElement, imageElement, textElement];
  assert.equal(isAssetReferenced("asset_brand_logo_123", elements), true);
  assert.equal(isAssetReferenced("asset_banner_456", elements), true);
  assert.equal(isAssetReferenced("asset_unused_789", elements), false);

  const referenced = getReferencedAssets(elements, assetRegistry);
  assert.equal(referenced.length, 2);
  assert.ok(referenced.find((a) => a.id === "asset_brand_logo_123"));
  assert.ok(referenced.find((a) => a.id === "asset_banner_456"));

  const unreferenced = getUnreferencedAssets(assetRegistry, elements);
  assert.equal(unreferenced.length, 1);
  assert.equal(unreferenced[0].id, "asset_unused_789");
});

test("State Safety & Immutability — Element transform, appearance, and property updates", () => {
  const original = createTextElement({
    name: "Base Title",
    text: "Original Text",
    transform: { x: 100, y: 100, width: 300, height: 60, rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0.5, anchorY: 0.5 },
  });

  // Bounds
  const bounds = getElementBounds(original);
  assert.equal(bounds.x, 100);
  assert.equal(bounds.width, 300);

  // Update transform immutably
  const moved = updateElementTransform(original, { x: 250, y: 350 });
  assert.equal(original.transform.x, 100); // untouched
  assert.equal(moved.transform.x, 250);
  assert.equal(moved.transform.y, 350);
  assert.notEqual(original, moved);

  // Update appearance immutably
  const stylized = updateElementAppearance(moved, { opacity: 0.8 });
  assert.equal(moved.appearance.opacity, 1); // untouched
  assert.equal(stylized.appearance.opacity, 0.8);

  // Lock & visibility immutably
  const locked = setElementLock(stylized, true);
  assert.equal(stylized.locked, false);
  assert.equal(locked.locked, true);

  const hidden = setElementVisibility(locked, false);
  assert.equal(locked.visible, true);
  assert.equal(hidden.visible, false);

  const layered = setElementZIndex(hidden, 10);
  assert.equal(hidden.zIndex, 0);
  assert.equal(layered.zIndex, 10);
});
