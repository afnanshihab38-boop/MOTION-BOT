/**
 * MOTION-BOT — Project Repository Test Suite
 * Validates application-level project operations, CRUD lifecycle, duplication,
 * multi-instance persistence, timestamp management, and validation enforcement.
 * Part of Phase 4.3: Application-Level Storage Operations.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { indexedDB } from "fake-indexeddb";

import {
  ProjectRepository,
  createProjectRepository,
  IndexedDBProjectStorageAdapter,
  StorageService,
  createStorageService,
} from "../services/storage";
import { createProject } from "../services/project/project-model";
import { createScene } from "../services/project/scene-model";
import { createTextElement } from "../services/element/element-model";
import { SAMPLE_DEV_PROJECT } from "../services/project/sample-project";
import { CURRENT_SCHEMA_VERSION, Project } from "../types/project";

/**
 * Creates an isolated ProjectRepository backed by an IndexedDB database.
 */
function createTestRepository(customDbName?: string): {
  repository: ProjectRepository;
  adapter: IndexedDBProjectStorageAdapter;
  dbName: string;
} {
  const dbName = customDbName ?? `test_repo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const adapter = new IndexedDBProjectStorageAdapter({
    dbName,
    dbVersion: 1,
    idbFactory: indexedDB,
  });
  const service = new StorageService(adapter);
  const repository = new ProjectRepository(service);

  return { repository, adapter, dbName };
}

test("Project Repository — createProject with options", async () => {
  const { repository, adapter } = createTestRepository();

  const result = await repository.createProject({
    name: "Summer Launch Video",
    width: 1920,
    height: 1080,
    fps: 30,
    metadata: { title: "Summer Launch", tags: ["promo", "2026"] },
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.ok(result.data.id.startsWith("proj_"));
    assert.equal(result.data.name, "Summer Launch Video");
    assert.equal(result.data.width, 1920);
    assert.equal(result.data.height, 1080);
    assert.equal(result.data.fps, 30);
    assert.equal(result.data.schemaVersion, CURRENT_SCHEMA_VERSION);
    assert.ok(result.data.createdAt);
    assert.ok(result.data.updatedAt);
  }

  await adapter.close();
});

test("Project Repository — createProject with existing Project instance", async () => {
  const { repository, adapter } = createTestRepository();

  const newProj = createProject({ name: "Direct Instance Creation" });
  const result = await repository.createProject(newProj);

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.id, newProj.id);
    assert.equal(result.data.name, "Direct Instance Creation");
  }

  await adapter.close();
});

test("Project Repository — createProject rejects invalid project data", async () => {
  const { repository, adapter } = createTestRepository();

  const corrupt = {
    id: "invalid_proj",
    name: "",
    schemaVersion: "invalid.version",
    width: -1920,
    height: 0,
    fps: -1,
    duration: -10,
    scenes: [],
    assets: [],
    metadata: { title: "" },
    createdAt: "invalid-date",
    updatedAt: "invalid-date",
  } as unknown as Project;

  const result = await repository.createProject(corrupt);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.code, "VALIDATION_FAILED");
  }

  await adapter.close();
});

test("Project Repository — getProject (Success & Missing)", async () => {
  const { repository, adapter } = createTestRepository();

  const created = await repository.createProject({ name: "Get Project Test" });
  assert.ok(created.success);

  // 1. Success
  const loaded = await repository.getProject(created.data.id);
  assert.equal(loaded.success, true);
  if (loaded.success) {
    assert.equal(loaded.data.id, created.data.id);
    assert.equal(loaded.data.name, "Get Project Test");
  }

  // 2. Missing
  const missing = await repository.getProject("missing-id-404");
  assert.equal(missing.success, false);
  if (!missing.success) {
    assert.equal(missing.error.code, "NOT_FOUND");
  }

  // 3. Empty ID
  const empty = await repository.getProject("");
  assert.equal(empty.success, false);
  if (!empty.success) {
    assert.equal(empty.error.code, "NOT_FOUND");
  }

  await adapter.close();
});

test("Project Repository — updateProject (Partial updates & validation)", async () => {
  const { repository, adapter } = createTestRepository();

  const created = await repository.createProject({ name: "Initial Project Name", width: 1080 });
  assert.ok(created.success);
  const originalId = created.data.id;
  const originalUpdatedAt = created.data.updatedAt;

  // 1. Valid update
  const updated = await repository.updateProject(originalId, {
    name: "Brand Revamp 2026",
    width: 2560,
  });

  assert.equal(updated.success, true);
  if (updated.success) {
    assert.equal(updated.data.id, originalId); // ID preserved
    assert.equal(updated.data.name, "Brand Revamp 2026");
    assert.equal(updated.data.width, 2560);
    assert.ok(updated.data.updatedAt >= originalUpdatedAt);
  }

  // 2. Non-existent ID returns NOT_FOUND
  const notFound = await repository.updateProject("does-not-exist", { name: "Foo" });
  assert.equal(notFound.success, false);
  if (!notFound.success) {
    assert.equal(notFound.error.code, "NOT_FOUND");
  }

  // 3. Invalid field returns VALIDATION_FAILED
  const invalid = await repository.updateProject(originalId, { fps: -60 });
  assert.equal(invalid.success, false);
  if (!invalid.success) {
    assert.equal(invalid.error.code, "VALIDATION_FAILED");
  }

  await adapter.close();
});

test("Project Repository — deleteProject", async () => {
  const { repository, adapter } = createTestRepository();

  const created = await repository.createProject({ name: "Project To Remove" });
  assert.ok(created.success);
  const projId = created.data.id;

  const hasBefore = await repository.hasProject(projId);
  assert.equal(hasBefore.success && hasBefore.data, true);

  // 1. Delete
  const deleted = await repository.deleteProject(projId);
  assert.equal(deleted.success, true);

  // 2. Existence check is false
  const hasAfter = await repository.hasProject(projId);
  assert.equal(hasAfter.success && hasAfter.data, false);

  // 3. Subsequent load is NOT_FOUND
  const loaded = await repository.getProject(projId);
  assert.equal(loaded.success, false);
  if (!loaded.success) {
    assert.equal(loaded.error.code, "NOT_FOUND");
  }

  await adapter.close();
});

test("Project Repository — listProjects with query options", async () => {
  const { repository, adapter } = createTestRepository();

  await repository.createProject({
    name: "Sneakers Promo",
    metadata: { title: "Sneakers Promo", tags: ["ecommerce", "footwear"] },
  });
  await repository.createProject({
    name: "Watch Commercial",
    metadata: { title: "Watch Commercial", tags: ["luxury", "watch"] },
  });
  await repository.createProject({
    name: "App Showcase",
    metadata: { title: "App Showcase", tags: ["tech", "ecommerce"] },
  });

  // 1. List all
  const all = await repository.listProjects();
  assert.equal(all.success, true);
  if (all.success) {
    assert.equal(all.data.total, 3);
    assert.equal(all.data.projects.length, 3);
  }

  // 2. Search query matching 'watch'
  const watchSearch = await repository.listProjects({ searchQuery: "watch" });
  assert.equal(watchSearch.success, true);
  if (watchSearch.success) {
    assert.equal(watchSearch.data.total, 1);
    assert.equal(watchSearch.data.projects[0].name, "Watch Commercial");
  }

  // 3. Tag filter matching 'ecommerce'
  const ecommerceFilter = await repository.listProjects({ tags: ["ecommerce"] });
  assert.equal(ecommerceFilter.success, true);
  if (ecommerceFilter.success) {
    assert.equal(ecommerceFilter.data.total, 2);
  }

  await adapter.close();
});

test("Project Repository — duplicateProject with regenerated IDs and clean isolation", async () => {
  const { repository, adapter } = createTestRepository();

  // Create an elaborate project with a scene and element
  const original = await repository.createProject(SAMPLE_DEV_PROJECT);
  assert.ok(original.success);
  const origId = original.data.id;
  const origSceneId = original.data.scenes[0].id;
  const origElementId = original.data.scenes[0].elements[0].id;

  // Duplicate the project with custom name
  const duplicated = await repository.duplicateProject(origId, "Duplicated Masterpiece");
  assert.equal(duplicated.success, true);
  if (duplicated.success) {
    const dup = duplicated.data;
    assert.notEqual(dup.id, origId);
    assert.equal(dup.name, "Duplicated Masterpiece");
    assert.equal(dup.metadata.title, "Duplicated Masterpiece");

    // Verify scene and element counts remain identical
    assert.equal(dup.scenes.length, original.data.scenes.length);
    assert.equal(dup.scenes[0].elements.length, original.data.scenes[0].elements.length);

    // Verify IDs were regenerated
    assert.notEqual(dup.scenes[0].id, origSceneId);
    assert.notEqual(dup.scenes[0].elements[0].id, origElementId);

    // Verify timestamps were updated
    assert.ok(dup.createdAt);
    assert.ok(dup.updatedAt);
  }

  // Verify original project is still unchanged in storage
  const reloadedOriginal = await repository.getProject(origId);
  assert.ok(reloadedOriginal.success);
  if (reloadedOriginal.success) {
    assert.equal(reloadedOriginal.data.id, origId);
    assert.equal(reloadedOriginal.data.name, SAMPLE_DEV_PROJECT.name);
    assert.equal(reloadedOriginal.data.scenes[0].id, origSceneId);
  }

  await adapter.close();
});

test("Project Repository — Persistence across separate application/database instances", async () => {
  const sharedDbName = `shared_db_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // ==========================================
  // INSTANCE A: Create and persist project
  // ==========================================
  const adapterA = new IndexedDBProjectStorageAdapter({
    dbName: sharedDbName,
    dbVersion: 1,
    idbFactory: indexedDB,
  });
  const repoA = new ProjectRepository(new StorageService(adapterA));

  const createdA = await repoA.createProject({
    name: "Cross-Instance Persistent Project",
    width: 3840,
    height: 2160,
    fps: 60,
    metadata: { title: "Cross-Instance", tags: ["persistence", "test"] },
  });
  assert.ok(createdA.success);
  const targetId = createdA.data.id;

  // Fully close instance A
  await adapterA.close();

  // ==========================================
  // INSTANCE B: Read project and update
  // ==========================================
  const adapterB = new IndexedDBProjectStorageAdapter({
    dbName: sharedDbName,
    dbVersion: 1,
    idbFactory: indexedDB,
  });
  const repoB = new ProjectRepository(new StorageService(adapterB));

  const loadedB = await repoB.getProject(targetId);
  assert.equal(loadedB.success, true);
  if (loadedB.success) {
    assert.equal(loadedB.data.id, targetId);
    assert.equal(loadedB.data.name, "Cross-Instance Persistent Project");
    assert.equal(loadedB.data.width, 3840);
    assert.equal(loadedB.data.height, 2160);
    assert.equal(loadedB.data.fps, 60);
  }

  // Modify in instance B
  const updatedB = await repoB.updateProject(targetId, {
    name: "Updated In Instance B",
  });
  assert.ok(updatedB.success);

  // Fully close instance B
  await adapterB.close();

  // ==========================================
  // INSTANCE C: Verify modification in third instance
  // ==========================================
  const adapterC = new IndexedDBProjectStorageAdapter({
    dbName: sharedDbName,
    dbVersion: 1,
    idbFactory: indexedDB,
  });
  const repoC = new ProjectRepository(new StorageService(adapterC));

  const loadedC = await repoC.getProject(targetId);
  assert.equal(loadedC.success, true);
  if (loadedC.success) {
    assert.equal(loadedC.data.id, targetId);
    assert.equal(loadedC.data.name, "Updated In Instance B");
  }

  // Clean up instance C
  await adapterC.close();
});
