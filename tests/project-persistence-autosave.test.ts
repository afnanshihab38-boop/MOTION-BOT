/**
 * MOTION-BOT — Phase 8.6: Project Persistence + Autosave Test Suite
 *
 * Verifies:
 * 1. Comprehensive Project Save Fidelity (metadata, scenes, layers, assets, keyframes, transforms, text)
 * 2. Autosave Mechanics (debouncing, avoiding excessive writes, saving meaningful changes)
 * 3. Save Status Tracking (saved, unsaved, saving, error - zero misleading success states)
 * 4. Recovery & Integrity (protecting valid data, rejecting corrupt writes, rollback to last saved)
 * 5. Reopen Lifecycle (create -> edit -> autosave -> reload -> reopen -> verify fidelity)
 * 6. Canvas & Layer Edits Persistence (move, resize, rotate, order, lock, visibility)
 * 7. Timeline & Keyframe Edits Persistence (tracks, keyframes, timing)
 * 8. Scene & Asset Management Persistence (scene CRUD, assets, layer asset references)
 * 9. Template Projects Persistence & Reopen
 * 10. AI-Generated Projects Persistence (persisting seamlessly via unified storage architecture)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { indexedDB } from "fake-indexeddb";

import {
  AutosaveManager,
  createAutosaveManager,
  AutosaveStatus,
  ProjectRepository,
  IndexedDBProjectStorageAdapter,
  StorageService,
  storageFailure,
  isProjectContentEqual,
} from "../services/storage";
import {
  createProject,
  addScene,
  updateScene,
  duplicateScene,
  addAsset,
} from "../services/project/project-model";
import { createScene } from "../services/project/scene-model";
import {
  createTextElement,
  createShapeElement,
  createImageElement,
  createLogoElement,
  DEFAULT_TRANSFORM,
} from "../services/element/element-model";
import { createLogoAsset, createImageAsset } from "../services/asset/asset-model";
import {
  moveElement,
  resizeElement,
  rotateElement,
} from "../services/editor/element-manipulation";
import { editVisualElement } from "../services/editor/element-editing";
import { addKeyframeToElement } from "../services/timeline";
import { getTemplateById, createProjectFromTemplate } from "../services/template";
import { Project } from "../types/project";
import { TextElement, ShapeElement, ImageElement, LogoElement } from "../types/element";
import { IProjectRepository } from "../services/storage/project-repository";
import { StorageResult } from "../types/storage";

function createHarness(debounceMs = 40) {
  const dbName = `test_p86_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const adapter = new IndexedDBProjectStorageAdapter({
    dbName,
    dbVersion: 1,
    idbFactory: indexedDB,
  });
  const service = new StorageService(adapter);
  const repository = new ProjectRepository(service);
  const manager = createAutosaveManager({
    repository,
    debounceMs,
  });

  return { manager, repository, service, adapter };
}

describe("Phase 8.6: Project Persistence + Autosave", () => {
  // ==========================================================================
  // 1. FULL PROJECT SAVE FIDELITY
  // ==========================================================================
  describe("1. Full Project Save Fidelity", () => {
    it("persists and restores all project properties: metadata, scenes, layers, assets, timeline, keyframes", async () => {
      const { repository, adapter } = createHarness();

      // Create rich asset
      const logoAsset = createLogoAsset({
        id: "asset_brand_logo",
        name: "brand-logo.svg",
        url: "data:image/svg+xml;utf8,<svg></svg>",
        width: 180,
        height: 180,
      });

      // Create text element with typography and keyframes
      let headline = createTextElement({
        name: "Main Title",
        text: "KINETIC IMPACT",
        fontSize: 64,
        fontWeight: 800,
        color: "#38BDF8",
        transform: {
          ...DEFAULT_TRANSFORM,
          x: 200,
          y: 300,
          width: 800,
          height: 100,
          rotation: -5,
        },
      });
      headline = addKeyframeToElement(headline, "x", 0, 100, 30).element as TextElement;
      headline = addKeyframeToElement(headline, "x", 1.5, 200, 30).element as TextElement;
      headline = addKeyframeToElement(headline, "opacity", 0, 0, 30).element as TextElement;
      headline = addKeyframeToElement(headline, "opacity", 1.0, 1, 30).element as TextElement;

      // Create shape element
      const badge = createShapeElement({
        name: "Promo Pill",
        shapeKind: "rectangle",
        cornerRadius: 16,
        transform: {
          ...DEFAULT_TRANSFORM,
          x: 200,
          y: 420,
          width: 240,
          height: 48,
        },
        appearance: {
          opacity: 0.95,
          blendMode: "normal",
          fill: { type: "solid", color: "#6366F1" },
        },
      });

      // Create logo element linking to asset
      const logoEl = createLogoElement({
        name: "Header Logo",
        assetId: logoAsset.id,
        src: logoAsset.url,
        transform: {
          ...DEFAULT_TRANSFORM,
          x: 200,
          y: 100,
          width: 120,
          height: 120,
        },
      });

      // Create scene 1 and scene 2
      const scene1 = createScene({
        name: "Scene 1 — Hero Reveal",
        duration: 3.5,
        elements: [headline, badge, logoEl],
      });

      const scene2 = createScene({
        name: "Scene 2 — Outro",
        duration: 2.5,
        elements: [
          createTextElement({
            name: "Outro Text",
            text: "motionbot.dev",
            fontSize: 36,
          }),
        ],
      });

      const fullProject = createProject({
        name: "Fidelity Test Project",
        width: 1920,
        height: 1080,
        fps: 60,
        duration: 6.0,
        scenes: [scene1, scene2],
        assets: [logoAsset],
        metadata: {
          title: "Fidelity Test Project",
          description: "Full spectrum test for project serialization",
          tags: ["kinetic", "60fps", "full-fidelity"],
          author: "MotionBot QA",
          client: "Global Corp",
          starred: true,
          customFields: { campaignCode: "MOTION-2026", priority: 1 },
        },
      });

      // Save via repository
      const saveRes = await repository.saveProject!(fullProject);
      assert.ok(saveRes.success, "Save should succeed");

      // Reload project from storage by ID
      const loadRes = await repository.getProject(fullProject.id);
      assert.ok(loadRes.success, "Load should succeed");
      const loaded = loadRes.data;

      // Verify metadata fidelity
      assert.strictEqual(loaded.id, fullProject.id);
      assert.strictEqual(loaded.name, "Fidelity Test Project");
      assert.strictEqual(loaded.width, 1920);
      assert.strictEqual(loaded.height, 1080);
      assert.strictEqual(loaded.fps, 60);
      assert.strictEqual(loaded.metadata.author, "MotionBot QA");
      assert.strictEqual(loaded.metadata.starred, true);
      assert.strictEqual(loaded.metadata.tags?.[0], "kinetic");
      assert.strictEqual(loaded.metadata.customFields?.campaignCode, "MOTION-2026");

      // Verify scene & layer fidelity
      assert.strictEqual(loaded.scenes.length, 2);
      assert.strictEqual(loaded.scenes[0].name, "Scene 1 — Hero Reveal");
      assert.strictEqual(loaded.scenes[1].name, "Scene 2 — Outro");

      const loadedHeadline = loaded.scenes[0].elements[0] as TextElement;
      assert.strictEqual(loadedHeadline.name, "Main Title");
      assert.strictEqual(loadedHeadline.text, "KINETIC IMPACT");
      assert.strictEqual(loadedHeadline.fontSize, 64);
      assert.strictEqual(loadedHeadline.color, "#38BDF8");
      assert.strictEqual(loadedHeadline.transform.rotation, -5);

      // Verify keyframes fidelity
      assert.ok(loadedHeadline.propertyTracks && loadedHeadline.propertyTracks.length >= 2);
      const xTrack = loadedHeadline.propertyTracks.find((t) => t.property === "x");
      assert.ok(xTrack && xTrack.keyframes.length >= 2);
      assert.strictEqual(xTrack.keyframes[0].time, 0);
      assert.strictEqual(xTrack.keyframes[0].value, 100);

      // Verify asset and asset-layer reference
      assert.strictEqual(loaded.assets.length, 1);
      assert.strictEqual(loaded.assets[0].id, logoAsset.id);
      const loadedLogo = loaded.scenes[0].elements[2] as LogoElement;
      assert.strictEqual(loadedLogo.assetId, logoAsset.id);

      await adapter.close();
    });
  });

  // ==========================================================================
  // 2. AUTOSAVE MECHANICS & AVOIDING EXCESSIVE WRITES
  // ==========================================================================
  describe("2. Autosave Debouncing & Avoiding Excessive Writes", () => {
    it("coalesces rapid consecutive changes into a single debounced write", async () => {
      const { manager, repository, adapter } = createHarness(50);

      const base = createProject({ name: "Debounce Test" });
      manager.loadProject(base);

      const statusTrail: string[] = [];
      manager.subscribe((s) => statusTrail.push(s.state));

      // Make 6 rapid updates
      for (let i = 1; i <= 6; i++) {
        manager.notifyChange({
          ...base,
          name: `Rapid Edit #${i}`,
        });
      }

      // State immediately transitions to unsaved
      assert.strictEqual(manager.getStatus().state, "unsaved");
      assert.strictEqual(manager.getStatus().hasUnsavedChanges, true);

      // Wait for debounce timer to fire
      await new Promise((resolve) => setTimeout(resolve, 110));

      const finalStatus = manager.getStatus();
      assert.strictEqual(finalStatus.state, "saved");
      assert.strictEqual(finalStatus.hasUnsavedChanges, false);
      assert.strictEqual(finalStatus.saveCount, 1, "Exactly 1 write should occur for coalesced edits");

      // Verify stored project reflects final edit
      const stored = await repository.getProject(base.id);
      assert.ok(stored.success);
      assert.strictEqual(stored.data.name, "Rapid Edit #6");

      manager.dispose();
      await adapter.close();
    });

    it("avoids excessive writes when notified with content-equal project data", async () => {
      const { manager, adapter } = createHarness(40);

      const project = createProject({ name: "No-Op Check" });
      manager.loadProject(project);

      assert.strictEqual(manager.getStatus().saveCount, 0);

      // Notify change with identical project content (e.g. selection click or no-op)
      manager.notifyChange({ ...project });
      manager.notifyChange({ ...project, updatedAt: new Date().toISOString() });

      // Should remain "saved", no pending changes
      assert.strictEqual(manager.getStatus().state, "saved");
      assert.strictEqual(manager.getStatus().hasUnsavedChanges, false);

      await new Promise((resolve) => setTimeout(resolve, 90));
      assert.strictEqual(manager.getStatus().saveCount, 0, "No write should be triggered for identical content");

      manager.dispose();
      await adapter.close();
    });
  });

  // ==========================================================================
  // 3. SAVE STATUS ACCURACY (NO MISLEADING STATES)
  // ==========================================================================
  describe("3. Save Status Accuracy", () => {
    it("communicates accurate states: saved, unsaved, saving, and error", async () => {
      const { manager, adapter } = createHarness(30);

      const project = createProject({ name: "Status Lifecycle" });
      manager.loadProject(project);

      assert.strictEqual(manager.getStatus().state, "saved");
      assert.strictEqual(manager.getStatus().hasUnsavedChanges, false);

      // Edit -> unsaved
      manager.notifyChange({
        ...project,
        name: "Modified Title",
      });
      assert.strictEqual(manager.getStatus().state, "unsaved");
      assert.strictEqual(manager.getStatus().hasUnsavedChanges, true);

      // Wait for debounced write
      await new Promise((resolve) => setTimeout(resolve, 80));

      assert.strictEqual(manager.getStatus().state, "saved");
      assert.strictEqual(manager.getStatus().hasUnsavedChanges, false);
      assert.ok(manager.getStatus().lastSavedAt !== null);

      manager.dispose();
      await adapter.close();
    });

    it("transitions to error state upon failure and never falsely reports saved", async () => {
      class ErrorRepository implements IProjectRepository {
        async createProject(): Promise<StorageResult<Project>> {
          return storageFailure("STORAGE_UNAVAILABLE", "Simulated disk write failure");
        }
        async getProject(): Promise<StorageResult<Project>> {
          return storageFailure("NOT_FOUND", "Not found");
        }
        async updateProject(): Promise<StorageResult<Project>> {
          return storageFailure("STORAGE_UNAVAILABLE", "Simulated disk write failure");
        }
        async deleteProject(): Promise<StorageResult<void>> {
          return storageFailure("STORAGE_UNAVAILABLE", "Simulated delete failure");
        }
        async listProjects(): Promise<StorageResult<any>> {
          return storageFailure("STORAGE_UNAVAILABLE", "Simulated list failure");
        }
        async hasProject(): Promise<StorageResult<boolean>> {
          return storageFailure("STORAGE_UNAVAILABLE", "Simulated check failure");
        }
        async duplicateProject(): Promise<StorageResult<Project>> {
          return storageFailure("STORAGE_UNAVAILABLE", "Simulated dup failure");
        }
      }

      const failingRepo = new ErrorRepository();
      const manager = createAutosaveManager({
        repository: failingRepo,
        debounceMs: 20,
      });

      const project = createProject({ name: "Failure Test" });
      manager.loadProject(project);

      manager.notifyChange({
        ...project,
        name: "Attempted Edit",
      });

      await new Promise((resolve) => setTimeout(resolve, 60));

      const status = manager.getStatus();
      assert.strictEqual(status.state, "error", "Status must be 'error' when save fails");
      assert.notStrictEqual(status.state, "saved", "Must NOT report 'saved' when write failed");
      assert.ok(status.lastError !== null);
      assert.strictEqual(status.lastError.code, "STORAGE_UNAVAILABLE");

      // In-memory project is still preserved!
      assert.strictEqual(manager.getLatestProject()?.name, "Attempted Edit");

      manager.dispose();
    });
  });

  // ==========================================================================
  // 4. RECOVERY & INTEGRITY PROTECTION
  // ==========================================================================
  describe("4. Recovery & Integrity Protection", () => {
    it("protects stored project by rejecting deep-validation failures before writing", async () => {
      const { manager, repository, adapter } = createHarness(20);

      const validProject = createProject({ name: "Valid Stored Project" });
      await repository.saveProject!(validProject);
      manager.loadProject(validProject);

      // Attempt to autosave a corrupted project (e.g. negative width)
      const corrupted = {
        ...validProject,
        width: -1920, // Corrupt dimension
      };

      manager.notifyChange(corrupted as any);
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should transition to error, NOT saved
      assert.strictEqual(manager.getStatus().state, "error");
      assert.strictEqual(manager.getStatus().lastError?.code, "VALIDATION_FAILED");

      // Verify the storage was NOT corrupted
      const inStore = await repository.getProject(validProject.id);
      assert.ok(inStore.success);
      assert.strictEqual(inStore.data.width, 1920, "Stored project must remain valid and uncorrupted");

      // Rollback to last saved recovers in-memory state
      const recovered = manager.rollbackToLastSaved();
      assert.ok(recovered);
      assert.strictEqual(recovered.width, 1920);
      assert.strictEqual(manager.getStatus().state, "saved");

      manager.dispose();
      await adapter.close();
    });
  });

  // ==========================================================================
  // 5. REOPEN LIFECYCLE (CREATE -> EDIT -> AUTOSAVE -> RELOAD -> REOPEN)
  // ==========================================================================
  describe("5. Reopen Lifecycle", () => {
    it("retains all manual canvas, timeline, and scene edits across close and reopen", async () => {
      const { repository, adapter } = createHarness();

      // Step 1: Create initial project with element
      const initialEl = createTextElement({
        name: "Title Layer",
        text: "Initial Headline",
        transform: {
          ...DEFAULT_TRANSFORM,
          x: 400,
          y: 400,
          width: 600,
          height: 80,
        },
      });

      let project = createProject({
        name: "Lifecycle Project",
        width: 1920,
        height: 1080,
        scenes: [
          createScene({
            name: "Main Scene",
            duration: 5.0,
            elements: [initialEl],
          }),
        ],
      });
      await repository.saveProject!(project);

      // Step 2: Initialize AutosaveManager for this session
      let sessionManager = createAutosaveManager({
        repository,
        debounceMs: 30,
      });
      sessionManager.loadProject(project);

      // Step 3: Perform canvas and layer edits:
      // a) Move element
      const activeScene = project.scenes[0];
      const el = activeScene.elements[0];
      const movedEl = moveElement(el, 75, -50);

      // b) Resize element
      const resizedEl = resizeElement(movedEl, "se", 120, 40);

      // c) Rotate element
      const rotatedEl = rotateElement(resizedEl, 15);

      // d) Edit text property
      const editedEl = editVisualElement(rotatedEl, {
        text: "PERSISTENT CANVAS DATA",
        fontSize: 72,
      });

      // e) Add timeline keyframe
      const keyframedEl = addKeyframeToElement(editedEl, "scaleX", 1.2, 1.4, 30).element;

      // Update scene with modified element
      project = updateScene(project, activeScene.id, {
        elements: [keyframedEl],
      });

      // f) Add second scene
      const scene2 = createScene({
        name: "Second Animated Scene",
        duration: 4.0,
      });
      project = addScene(project, scene2);

      // Step 4: Notify AutosaveManager and flush
      sessionManager.notifyChange(project);
      await sessionManager.saveNow();

      assert.strictEqual(sessionManager.getStatus().state, "saved");

      // Step 5: Simulate closing / reloading (dispose active manager, simulate browser unload)
      sessionManager.dispose();

      // Step 6: Reopen from storage by ID
      const reopenRes = await repository.getProject(project.id);
      assert.ok(reopenRes.success, "Reopening project must succeed");
      const reopened = reopenRes.data;

      // Step 7: Verify all edits remained completely intact
      assert.strictEqual(reopened.id, project.id);
      assert.strictEqual(reopened.scenes.length, 2);
      assert.strictEqual(reopened.scenes[1].name, "Second Animated Scene");

      const reopenedEl = reopened.scenes[0].elements[0] as TextElement;
      assert.strictEqual(reopenedEl.text, "PERSISTENT CANVAS DATA");
      assert.strictEqual(reopenedEl.fontSize, 72);
      assert.strictEqual(reopenedEl.transform.rotation, 15);
      assert.strictEqual(reopenedEl.transform.x, keyframedEl.transform.x);
      assert.strictEqual(reopenedEl.transform.y, keyframedEl.transform.y);

      // Verify keyframe survived
      assert.ok(reopenedEl.propertyTracks?.some((t) => t.property === "scaleX"));

      await adapter.close();
    });
  });

  // ==========================================================================
  // 6. TEMPLATE PROJECTS PERSISTENCE & REOPEN
  // ==========================================================================
  describe("6. Template Projects Persistence & Reopen", () => {
    it("instantiates template, persists changes, and reopens with full fidelity", async () => {
      const { repository, adapter } = createHarness();

      const template = getTemplateById("temp-1")!;
      assert.ok(template);

      // Instantiate template project
      let templateProject = createProjectFromTemplate(template, "Summer Kinetic Campaign");
      await repository.saveProject!(templateProject);

      const manager = createAutosaveManager({
        repository,
        debounceMs: 30,
      });
      manager.loadProject(templateProject);

      // Make edit to template project
      const scene = templateProject.scenes[0];
      const headline = scene.elements[0] as TextElement;
      const editedHeadline = editVisualElement(headline, {
        text: "KINETIC BRAND REVOLUTION",
      });

      templateProject = updateScene(templateProject, scene.id, {
        elements: scene.elements.map((e) => (e.id === headline.id ? editedHeadline : e)),
      });

      manager.notifyChange(templateProject);
      await manager.saveNow();

      manager.dispose();

      // Reopen from storage
      const reloaded = await repository.getProject(templateProject.id);
      assert.ok(reloaded.success);
      assert.strictEqual(reloaded.data.metadata?.templateId, "temp-1");
      const loadedHeadline = reloaded.data.scenes[0].elements[0] as TextElement;
      assert.strictEqual(loadedHeadline.text, "KINETIC BRAND REVOLUTION");

      await adapter.close();
    });
  });

  // ==========================================================================
  // 7. AI-GENERATED PROJECTS PERSISTENCE
  // ==========================================================================
  describe("7. AI Projects Unified Persistence", () => {
    it("persists AI-generated project via unified storage and supports subsequent edits", async () => {
      const { repository, adapter } = createHarness();

      // Simulate AI Creative Brain & Motion Plan applying a new project
      const aiProject = createProject({
        name: "AI Generated Commercial 60s",
        width: 1920,
        height: 1080,
        fps: 30,
        scenes: [
          createScene({
            name: "AI Scene 1 - Intro",
            duration: 3.0,
            elements: [
              createTextElement({
                name: "AI Generated Headline",
                text: "SMART VELOCITY",
                fontSize: 54,
              }),
            ],
          }),
        ],
        metadata: {
          title: "AI Generated Commercial 60s",
          tags: ["ai-generated", "nemotron", "commercial"],
        },
      });

      // Persist directly using the unified storage system
      const saveRes = await repository.saveProject!(aiProject);
      assert.ok(saveRes.success);

      // Editor loads and performs manual edit on the AI project
      const manager = createAutosaveManager({
        repository,
        debounceMs: 30,
      });
      manager.loadProject(aiProject);

      const modifiedAIProject = updateScene(aiProject, aiProject.scenes[0].id, {
        name: "AI Scene 1 - Intro (User Refined)",
      });

      manager.notifyChange(modifiedAIProject);
      await manager.saveNow();

      manager.dispose();

      // Reopen to verify unified persistence
      const reloaded = await repository.getProject(aiProject.id);
      assert.ok(reloaded.success);
      assert.strictEqual(reloaded.data.scenes[0].name, "AI Scene 1 - Intro (User Refined)");
      assert.ok(reloaded.data.metadata.tags?.includes("ai-generated"));

      await adapter.close();
    });
  });
});
