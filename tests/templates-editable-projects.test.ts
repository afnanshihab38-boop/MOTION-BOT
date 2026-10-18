/**
 * MOTION-BOT — Phase 8.5: Templates → Editable Projects Test Suite
 *
 * Verifies:
 * 1. Template catalog, metadata, previews, and categories
 * 2. Template instantiation (createProjectFromTemplate) with deep ID regeneration
 * 3. Template isolation: edits on instantiated projects do NOT mutate original templates or peer projects
 * 4. End-to-End Template 1: Minimal Kinetic Typography (temp-1) -> Use -> Edit -> Save -> Reopen
 * 5. End-to-End Template 2: SaaS App Showcase (temp-2, multi-scene + assets) -> Use -> Edit -> Save -> Reopen
 * 6. End-to-End Template 3: E-Commerce Flash Sale (temp-3, 9:16 vertical) -> Use -> Edit -> Save -> Reopen
 * 7. Canvas manipulation (move, resize, rotate), text editing, layer reordering, keyframes on template projects
 * 8. AI context compatibility with template-derived projects
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BUILTIN_TEMPLATES,
  getAllTemplates,
  getTemplateById,
  queryTemplates,
  createProjectFromTemplate,
} from "../services/template";
import {
  moveElement,
  resizeElement,
  rotateElement,
} from "../services/editor/element-manipulation";
import { editVisualElement } from "../services/editor/element-editing";
import {
  addScene,
  updateScene,
  duplicateScene,
} from "../services/project/project-model";
import { createScene } from "../services/project/scene-model";
import { createTextElement } from "../services/element/element-model";
import { addKeyframeToElement } from "../services/timeline";
import {
  serializeProject,
  deserializeProject,
} from "../services/project/project-serializer";
import { validateProjectDeep } from "../services/project/project-validator";
import { ContextManager } from "../ai/context/context-manager";
import { TextElement, ShapeElement } from "../types/element";

describe("Phase 8.5: Templates → Editable Projects", () => {
  // ==========================================================================
  // 1. TEMPLATE CATALOG & PREVIEW VERIFICATION
  // ==========================================================================
  describe("1. Template Catalog & Previews", () => {
    it("provides all 6 high-quality built-in templates", () => {
      const templates = getAllTemplates();
      assert.strictEqual(templates.length, 6);

      const ids = templates.map((t) => t.id);
      assert.ok(ids.includes("temp-1"));
      assert.ok(ids.includes("temp-2"));
      assert.ok(ids.includes("temp-3"));
      assert.ok(ids.includes("temp-4"));
      assert.ok(ids.includes("temp-5"));
      assert.ok(ids.includes("temp-6"));
    });

    it("includes required preview metadata for every template", () => {
      for (const template of BUILTIN_TEMPLATES) {
        assert.ok(template.id, "Template must have an id");
        assert.ok(template.title, "Template must have a title");
        assert.ok(template.description, "Template must have a description");
        assert.ok(template.category, "Template must have a category");
        assert.ok(["16:9", "9:16", "1:1"].includes(template.aspectRatio), "Valid aspect ratio");
        assert.ok(template.width > 0 && template.height > 0, "Valid dimensions");
        assert.ok(template.durationFrames > 0, "Duration frames must be positive");
        assert.ok(template.fps >= 24, "FPS must be standard framerate");
        assert.ok(template.thumbnailUrl.length > 0, "Thumbnail URL must be present");
        assert.ok(Array.isArray(template.tags) && template.tags.length > 0);
        assert.ok(Array.isArray(template.placeholders) && template.placeholders.length > 0);
        assert.ok(typeof template.projectSnapshot === "string" && template.projectSnapshot.length > 0);
      }
    });

    it("filters and searches templates accurately", () => {
      const socialAdTemplates = queryTemplates({ category: "social-ad" });
      assert.ok(socialAdTemplates.length >= 1);
      assert.strictEqual(socialAdTemplates[0].category, "social-ad");

      const searchResults = queryTemplates({ search: "kinetic" });
      assert.ok(searchResults.length >= 1);
      assert.strictEqual(searchResults[0].id, "temp-1");

      const notFound = getTemplateById("non-existent-template-id");
      assert.strictEqual(notFound, undefined);
    });
  });

  // ==========================================================================
  // 2. TEMPLATE ISOLATION & ID REGENERATION
  // ==========================================================================
  describe("2. Template Isolation & ID Regeneration", () => {
    it("generates a new unique project ID and fresh entity IDs upon instantiation", () => {
      const template = getTemplateById("temp-1")!;
      const project1 = createProjectFromTemplate(template);
      const project2 = createProjectFromTemplate(template);

      // Projects have unique IDs
      assert.ok(project1.id.startsWith("proj_"));
      assert.ok(project2.id.startsWith("proj_"));
      assert.notStrictEqual(project1.id, project2.id);

      // Scene IDs are distinct
      assert.notStrictEqual(project1.scenes[0].id, project2.scenes[0].id);

      // Layer/Element IDs are distinct
      const p1ElIds = project1.scenes[0].elements.map((e) => e.id);
      const p2ElIds = project2.scenes[0].elements.map((e) => e.id);
      for (const id of p1ElIds) {
        assert.ok(!p2ElIds.includes(id), `Element ID ${id} must not collide across projects`);
      }

      // Metadata records source template
      assert.strictEqual(project1.metadata?.templateId, "temp-1");
      assert.strictEqual(project2.metadata?.templateId, "temp-1");
    });

    it("preserves template immutability when an instantiated project is edited", () => {
      const template = getTemplateById("temp-1")!;
      const parsedBase = deserializeProject(template.projectSnapshot);
      assert.ok(parsedBase.success);

      const originalSceneCount = parsedBase.project.scenes.length;
      const originalLayerCount = parsedBase.project.scenes[0].elements.length;
      const originalFirstLayerName = parsedBase.project.scenes[0].elements[0].name;

      // Instantiate project
      let project = createProjectFromTemplate(template);

      // Mutate project deeply
      const headlineEl = project.scenes[0].elements[0];
      const movedHeadline = moveElement(headlineEl, 200, 300);
      const editedHeadline = editVisualElement(movedHeadline, { name: "MUTATED HEADLINE NAME" });

      project = updateScene(project, project.scenes[0].id, {
        elements: [editedHeadline],
      });

      // Add a scene to the instantiated project
      const extraScene = createScene({ name: "Brand New Scene", duration: 3.0 });
      project = addScene(project, extraScene);

      // Verify the instantiated project was modified
      assert.strictEqual(project.scenes.length, 2);
      assert.strictEqual(project.scenes[0].elements.length, 1);
      assert.strictEqual(project.scenes[0].elements[0].name, "MUTATED HEADLINE NAME");

      // Verify BUILTIN_TEMPLATE was NEVER mutated
      const reFetched = getTemplateById("temp-1")!;
      const reFetchedParsed = deserializeProject(reFetched.projectSnapshot);
      assert.ok(reFetchedParsed.success);
      assert.strictEqual(reFetchedParsed.project.scenes.length, originalSceneCount);
      assert.strictEqual(reFetchedParsed.project.scenes[0].elements.length, originalLayerCount);
      assert.strictEqual(reFetchedParsed.project.scenes[0].elements[0].name, originalFirstLayerName);
    });
  });

  // ==========================================================================
  // 3. TEMPLATE 1: MINIMAL KINETIC TYPOGRAPHY (temp-1)
  // Flow: Template -> Use Template -> New Project -> Edit -> Save -> Reopen
  // ==========================================================================
  describe("3. Template 1: Minimal Kinetic Typography (temp-1)", () => {
    it("completes full cycle: Use -> Edit (move, resize, edit text, keyframe, reorder, scene) -> Save -> Reopen", () => {
      // 1. Template
      const template = getTemplateById("temp-1");
      assert.ok(template);

      // 2. Use Template -> New Project
      let project = createProjectFromTemplate(template, "My Custom Kinetic Campaign");
      assert.strictEqual(project.name, "My Custom Kinetic Campaign");
      assert.strictEqual(project.width, 1920);
      assert.strictEqual(project.height, 1080);
      assert.strictEqual(project.scenes.length, 1);

      const scene = project.scenes[0];
      assert.strictEqual(scene.elements.length, 3); // headline, subtitle, accent bar
      const headline = scene.elements.find((e) => e.name === "Kinetic Headline") as TextElement;
      const subtitle = scene.elements.find((e) => e.name === "Subtitle Tagline") as TextElement;
      const accentBar = scene.elements.find((e) => e.name === "Accent Line") as ShapeElement;
      assert.ok(headline && subtitle && accentBar);

      // Verify initial keyframe tracks exist
      const totalKf = (headline.propertyTracks || []).flatMap((t) => t.keyframes).length;
      assert.ok(totalKf >= 4, `Expected at least 4 keyframes on headline, got ${totalKf}`);

      // 3. Edit:
      // a) Move headline
      const movedHeadline = moveElement(headline, 50, -40);
      assert.strictEqual(movedHeadline.transform.x, headline.transform.x + 50);
      assert.strictEqual(movedHeadline.transform.y, headline.transform.y - 40);

      // b) Resize accent bar
      const resizedAccent = resizeElement(accentBar, "se", 80, 4);
      assert.ok(resizedAccent.transform.width > 0);

      // c) Edit text content
      const editedText = editVisualElement(movedHeadline, {
        text: "UNLEASH THE FUTURE",
        fontSize: 84,
      }) as TextElement;
      assert.strictEqual(editedText.text, "UNLEASH THE FUTURE");
      assert.strictEqual(editedText.fontSize, 84);

      // d) Add keyframe to text element
      const withNewKeyframe = addKeyframeToElement(editedText, "scaleX", 2.0, 1.25, 30).element;
      assert.ok(withNewKeyframe.propertyTracks?.some((t) => t.property === "scaleX"));

      // e) Reorder layers: move accent line to the top
      let updatedScene = updateScene(project, scene.id, {
        elements: [resizedAccent, withNewKeyframe, subtitle],
      }).scenes[0];
      assert.strictEqual(updatedScene.elements[0].id, resizedAccent.id);

      // f) Add scene to project
      const outroScene = createScene({
        name: "Outro CTA",
        duration: 3.0,
        elements: [
          createTextElement({
            name: "Outro Link",
            text: "motionbot.dev",
            fontSize: 48,
          }),
        ],
      });
      project = updateScene(project, updatedScene.id, updatedScene);
      project = addScene(project, outroScene);
      assert.strictEqual(project.scenes.length, 2);

      // 4. Save (serialize)
      const serialized = serializeProject(project);
      assert.ok(typeof serialized === "string" && serialized.length > 0);

      // 5. Reopen (deserialize)
      const reopenResult = deserializeProject(serialized);
      assert.ok(reopenResult.success);
      const reopened = reopenResult.project;

      assert.strictEqual(reopened.id, project.id);
      assert.strictEqual(reopened.name, "My Custom Kinetic Campaign");
      assert.strictEqual(reopened.scenes.length, 2);

      // Verify edits persisted
      const reopenedScene1 = reopened.scenes[0];
      assert.strictEqual(reopenedScene1.elements[0].id, resizedAccent.id);
      const reopenedHeadline = reopenedScene1.elements.find((e) => e.name === "Kinetic Headline") as TextElement;
      assert.strictEqual(reopenedHeadline.text, "UNLEASH THE FUTURE");
      assert.strictEqual(reopenedHeadline.fontSize, 84);

      // Deep schema & semantic validation passes
      const validation = validateProjectDeep(reopened);
      assert.ok(validation.valid, `Validation failed: ${validation.errors.map(e => e.message).join(", ")}`);
    });
  });

  // ==========================================================================
  // 4. TEMPLATE 2: SAAS FEATURE SHOWCASE (temp-2)
  // Multi-scene + Assets + Media Layers
  // ==========================================================================
  describe("4. Template 2: SaaS Feature Showcase (temp-2)", () => {
    it("completes full cycle: Use -> Edit (assets, rotation, duplicate scene, rename) -> Save -> Reopen", () => {
      const template = getTemplateById("temp-2");
      assert.ok(template);

      // Use Template
      let project = createProjectFromTemplate(template, "Acme AI Analytics Pitch");
      assert.strictEqual(project.scenes.length, 2);
      assert.strictEqual(project.assets.length, 2); // logo SVG and showcase image

      // Verify assets are registered and layers reference them
      const logoAsset = project.assets.find((a) => a.type === "logo");
      const imageAsset = project.assets.find((a) => a.type === "image");
      assert.ok(logoAsset && imageAsset);

      const scene1 = project.scenes[0];
      const scene2 = project.scenes[1];
      assert.strictEqual(scene1.name, "Scene 1 - Platform Intro");
      assert.strictEqual(scene2.name, "Scene 2 - Live Dashboard");

      const previewLayer = scene2.elements.find((e) => e.name === "Dashboard Showcase")!;
      assert.ok(previewLayer);

      // Edit 1: Rotate showcase image layer
      const rotatedPreview = rotateElement(previewLayer, 6);
      assert.strictEqual(rotatedPreview.transform.rotation, 6);

      // Edit 2: Edit CTA text in Scene 2
      const ctaLayer = scene2.elements.find((e) => e.name === "Feature Callout") as TextElement;
      const editedCta = editVisualElement(ctaLayer, {
        text: "Experience zero latency AI workflows today.",
        color: "#38BDF8",
      }) as TextElement;
      assert.strictEqual(editedCta.text, "Experience zero latency AI workflows today.");

      // Update Scene 2
      project = updateScene(project, scene2.id, {
        elements: [rotatedPreview, editedCta],
      });

      // Edit 3: Duplicate Scene 1
      project = duplicateScene(project, scene1.id);
      assert.strictEqual(project.scenes.length, 3);
      const duplicatedScene = project.scenes[1]; // inserted right after scene1
      assert.strictEqual(duplicatedScene.name, "Scene 1 - Platform Intro (Copy)");

      // Edit 4: Rename duplicated scene
      project = updateScene(project, duplicatedScene.id, {
        name: "Scene 1B - Extended Value Proposition",
      });
      assert.strictEqual(project.scenes[1].name, "Scene 1B - Extended Value Proposition");

      // Save & Reopen
      const json = serializeProject(project);
      const reopenResult = deserializeProject(json);
      assert.ok(reopenResult.success);
      const reopened = reopenResult.project;

      assert.strictEqual(reopened.scenes.length, 3);
      assert.strictEqual(reopened.assets.length, 2);
      assert.strictEqual(reopened.scenes[1].name, "Scene 1B - Extended Value Proposition");
      assert.strictEqual(
        (reopened.scenes[2].elements[0]).transform.rotation,
        6
      );

      const validation = validateProjectDeep(reopened);
      assert.ok(validation.valid, `Validation failed: ${validation.errors.map(e => e.message).join(", ")}`);
    });
  });

  // ==========================================================================
  // 5. TEMPLATE 3: E-COMMERCE FLASH SALE STORY (temp-3)
  // Vertical 9:16 (1080x1920) + Placeholders + Promotional Elements
  // ==========================================================================
  describe("5. Template 3: E-Commerce Flash Sale (temp-3)", () => {
    it("completes full cycle: Use with placeholders -> Edit -> Save -> Reopen", () => {
      const template = getTemplateById("temp-3");
      assert.ok(template);
      assert.strictEqual(template.aspectRatio, "9:16");
      assert.strictEqual(template.width, 1080);
      assert.strictEqual(template.height, 1920);

      // Use Template with custom placeholder overrides
      let project = createProjectFromTemplate("temp-3", "Black Friday Cyber Sale", {
        discount: "CYBER MONDAY 80% OFF",
        cta: "TAP TO CLAIM DEAL",
      });

      assert.strictEqual(project.name, "Black Friday Cyber Sale");
      assert.strictEqual(project.width, 1080);
      assert.strictEqual(project.height, 1920);

      const scene = project.scenes[0];
      const discountEl = scene.elements.find((e) => e.name === "Discount Text") as TextElement;
      const ctaEl = scene.elements.find((e) => e.name === "Swipe Up CTA") as TextElement;
      assert.strictEqual(discountEl.text, "CYBER MONDAY 80% OFF");
      assert.strictEqual(ctaEl.text, "TAP TO CLAIM DEAL");

      // Edit: Move product layer and resize badge
      const productLayer = scene.elements.find((e) => e.name === "Featured Product")!;
      const movedProduct = moveElement(productLayer, 0, -50);
      assert.strictEqual(movedProduct.transform.y, productLayer.transform.y - 50);

      const badgeLayer = scene.elements.find((e) => e.name === "Sale Badge Backdrop") as ShapeElement;
      const resizedBadge = resizeElement(badgeLayer, "e", 40, 0);

      project = updateScene(project, scene.id, {
        elements: scene.elements.map((el) => {
          if (el.id === productLayer.id) return movedProduct;
          if (el.id === badgeLayer.id) return resizedBadge;
          return el;
        }),
      });

      // Save & Reopen
      const saved = serializeProject(project);
      const reopenResult = deserializeProject(saved);
      assert.ok(reopenResult.success);
      const loaded = reopenResult.project;

      assert.strictEqual(loaded.width, 1080);
      assert.strictEqual(loaded.height, 1920);
      const loadedDiscount = loaded.scenes[0].elements.find((e) => e.name === "Discount Text") as TextElement;
      assert.strictEqual(loadedDiscount.text, "CYBER MONDAY 80% OFF");

      const validation = validateProjectDeep(loaded);
      assert.ok(validation.valid, `Validation failed: ${validation.errors.map(e => e.message).join(", ")}`);
    });
  });

  // ==========================================================================
  // 6. AI COMPATIBILITY WITH TEMPLATE PROJECTS
  // ==========================================================================
  describe("6. AI Context System Compatibility", () => {
    it("successfully formats template-instantiated projects into AI context", async () => {
      const project = createProjectFromTemplate("temp-2", "AI Analysis Test Project");
      const contextManager = new ContextManager();

      const context = await contextManager.buildContext({
        projectId: project.id,
        userRequest: "Change the headline to highlight speed and make the animation smoother",
        currentProject: project,
      });

      assert.ok(context.systemPrompt.length > 0);
      assert.ok(context.userPrompt.includes("AI Analysis Test Project"));
      assert.ok(context.userPrompt.includes("1920x1080"));
      assert.ok(context.userPrompt.includes("Total Scenes: 2"));
      assert.ok(context.metadata.layersIncluded.includes("current_project"));

      // Security check: no token or secret leak
      assert.strictEqual(context.metadata.sanitizedSecretCount, 0);
    });
  });
});
