/**
 * MOTION-BOT — IndexedDB Storage Provider Test Suite
 * Validates local browser storage using IndexedDB through the Phase 4.1 abstraction layer.
 * Tests DB initialization, CRUD, duplicate detection, schema versioning, and missing project handling.
 * Part of Phase 4.2: Local Project Storage (IndexedDB).
 */

import assert from "node:assert/strict";
import test from "node:test";
import { indexedDB } from "fake-indexeddb";

import { createProject } from "../services/project/project-model";
import { createScene } from "../services/project/scene-model";
import { createTextElement } from "../services/element/element-model";
import { SAMPLE_DEV_PROJECT } from "../services/project/sample-project";
import { CURRENT_SCHEMA_VERSION, Project } from "../types/project";

import {
  IndexedDBProjectStorageAdapter,
  DEFAULT_DB_NAME,
  DEFAULT_DB_VERSION,
  PROJECTS_STORE_NAME,
} from "../services/storage/indexeddb-adapter";
import { StorageService } from "../services/storage/storage-service";

/**
 * Creates an isolated adapter instance with a unique database name to prevent cross-test interference.
 */
function createTestIDBAdapter(customDbName?: string): IndexedDBProjectStorageAdapter {
  const dbName = customDbName ?? `test_db_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  return new IndexedDBProjectStorageAdapter({
    dbName,
    dbVersion: 1,
    idbFactory: indexedDB,
  });
}

test("IndexedDB Storage — Database initialization & schema verification", async () => {
  const dbName = `test_init_${Date.now()}`;
  const adapter = createTestIDBAdapter(dbName);

  assert.equal(adapter.name, "IndexedDBProjectStorageAdapter");
  assert.equal(adapter.type, "indexeddb");

  // Adapter reports available when IDBFactory is provided
  const available = await adapter.isAvailable();
  assert.equal(available, true);

  // Initialize opens the database, creating the object store and indexes
  await adapter.initialize();

  // Inspect the raw IDB database to verify stores and indexes exist
  const rawDB = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  assert.ok(rawDB.objectStoreNames.contains(PROJECTS_STORE_NAME));

  const tx = rawDB.transaction(PROJECTS_STORE_NAME, "readonly");
  const store = tx.objectStore(PROJECTS_STORE_NAME);
  assert.equal(store.keyPath, "id");
  assert.ok(store.indexNames.contains("updatedAt"));
  assert.ok(store.indexNames.contains("createdAt"));
  assert.ok(store.indexNames.contains("name"));
  assert.ok(store.indexNames.contains("schemaVersion"));

  rawDB.close();
  await adapter.close();
});

test("IndexedDB Storage — Saving and loading a project", async () => {
  const adapter = createTestIDBAdapter();
  const service = new StorageService(adapter);

  const project = createProject({
    name: "Summer Campaign 2026",
    width: 1920,
    height: 1080,
    fps: 60,
  });

  // 1. Save project
  const saveResult = await service.saveProject(project);
  assert.equal(saveResult.success, true);
  if (saveResult.success) {
    assert.equal(saveResult.data.id, project.id);
    assert.equal(saveResult.data.name, "Summer Campaign 2026");
    assert.equal(saveResult.data.schemaVersion, CURRENT_SCHEMA_VERSION);
  }

  // 2. Load project
  const loadResult = await service.loadProject(project.id);
  assert.equal(loadResult.success, true);
  if (loadResult.success) {
    assert.equal(loadResult.data.id, project.id);
    assert.equal(loadResult.data.name, "Summer Campaign 2026");
    assert.equal(loadResult.data.width, 1920);
    assert.equal(loadResult.data.height, 1080);
    assert.equal(loadResult.data.fps, 60);
  }

  await adapter.close();
});

test("IndexedDB Storage — Create project fails on duplicate ID (ALREADY_EXISTS)", async () => {
  const adapter = createTestIDBAdapter();
  const service = new StorageService(adapter);

  const project = createProject({ name: "Unique Project" });

  const firstCreate = await service.createProject(project);
  assert.equal(firstCreate.success, true);

  // Attempting to create the exact same ID again must fail
  const duplicateCreate = await service.createProject(project);
  assert.equal(duplicateCreate.success, false);
  if (!duplicateCreate.success) {
    assert.equal(duplicateCreate.error.code, "ALREADY_EXISTS");
  }

  await adapter.close();
});

test("IndexedDB Storage — Missing project handling (NOT_FOUND)", async () => {
  const adapter = createTestIDBAdapter();
  const service = new StorageService(adapter);

  // 1. Load non-existent project
  const loadMissing = await service.loadProject("non-existent-proj-id");
  assert.equal(loadMissing.success, false);
  if (!loadMissing.success) {
    assert.equal(loadMissing.error.code, "NOT_FOUND");
  }

  // 2. Update non-existent project
  const updateMissing = await service.updateProject("non-existent-proj-id", { name: "New Name" });
  assert.equal(updateMissing.success, false);
  if (!updateMissing.success) {
    assert.equal(updateMissing.error.code, "NOT_FOUND");
  }

  // 3. Delete non-existent project
  const deleteMissing = await service.deleteProject("non-existent-proj-id");
  assert.equal(deleteMissing.success, false);
  if (!deleteMissing.success) {
    assert.equal(deleteMissing.error.code, "NOT_FOUND");
  }

  // 4. Exists returns false
  const existsMissing = await service.hasProject("non-existent-proj-id");
  assert.equal(existsMissing.success && existsMissing.data, false);

  await adapter.close();
});

test("IndexedDB Storage — Updating an existing project", async () => {
  const adapter = createTestIDBAdapter();
  const service = new StorageService(adapter);

  const project = createProject({ name: "Initial Title", width: 1080, height: 1920 });
  await service.createProject(project);

  // 1. Partial update
  const updateResult = await service.updateProject(project.id, {
    name: "Updated Title 2026",
    width: 3840,
    height: 2160,
  });

  assert.equal(updateResult.success, true);
  if (updateResult.success) {
    assert.equal(updateResult.data.id, project.id);
    assert.equal(updateResult.data.name, "Updated Title 2026");
    assert.equal(updateResult.data.width, 3840);
    assert.equal(updateResult.data.height, 2160);
  }

  // 2. Verify persistence on reload
  const reloaded = await service.loadProject(project.id);
  assert.equal(reloaded.success, true);
  if (reloaded.success) {
    assert.equal(reloaded.data.name, "Updated Title 2026");
    assert.equal(reloaded.data.width, 3840);
  }

  // 3. Update with invalid properties fails validation
  const invalidUpdate = await service.updateProject(project.id, { fps: -30 });
  assert.equal(invalidUpdate.success, false);
  if (!invalidUpdate.success) {
    assert.equal(invalidUpdate.error.code, "VALIDATION_FAILED");
  }

  await adapter.close();
});

test("IndexedDB Storage — Deleting a project", async () => {
  const adapter = createTestIDBAdapter();
  const service = new StorageService(adapter);

  const project = createProject({ name: "Project to delete" });
  await service.createProject(project);

  assert.equal((await service.hasProject(project.id)).success, true);

  // 1. Delete project
  const deleteResult = await service.deleteProject(project.id);
  assert.equal(deleteResult.success, true);

  // 2. Existence is false
  const existsAfter = await service.hasProject(project.id);
  assert.equal(existsAfter.success && existsAfter.data, false);

  // 3. Subsequent load is NOT_FOUND
  const loadDeleted = await service.loadProject(project.id);
  assert.equal(loadDeleted.success, false);
  if (!loadDeleted.success) {
    assert.equal(loadDeleted.error.code, "NOT_FOUND");
  }

  await adapter.close();
});

test("IndexedDB Storage — Listing projects with search, filter, and pagination", async () => {
  const adapter = createTestIDBAdapter();
  const service = new StorageService(adapter);

  const p1 = createProject({
    name: "Apple Ad 2026",
    metadata: { title: "Apple Ad", tags: ["tech", "commercial"] },
  });
  const p2 = createProject({
    name: "Nike Reel 2026",
    metadata: { title: "Nike Reel", tags: ["sports", "social"] },
  });
  const p3 = createProject({
    name: "Tesla Showcase",
    metadata: { title: "Tesla Showcase", tags: ["tech", "auto"] },
  });

  await service.createProject(p1);
  await service.createProject(p2);
  await service.createProject(p3);

  // 1. List all
  const listAll = await service.listProjects();
  assert.equal(listAll.success, true);
  if (listAll.success) {
    assert.equal(listAll.data.total, 3);
    assert.equal(listAll.data.projects.length, 3);
  }

  // 2. Search query matching 'nike'
  const searchNike = await service.listProjects({ searchQuery: "nike" });
  assert.equal(searchNike.success, true);
  if (searchNike.success) {
    assert.equal(searchNike.data.total, 1);
    assert.equal(searchNike.data.projects[0].name, "Nike Reel 2026");
  }

  // 3. Tag filter matching 'tech'
  const tagTech = await service.listProjects({ tags: ["tech"] });
  assert.equal(tagTech.success, true);
  if (tagTech.success) {
    assert.equal(tagTech.data.total, 2);
    const names = tagTech.data.projects.map((p) => p.name);
    assert.ok(names.includes("Apple Ad 2026"));
    assert.ok(names.includes("Tesla Showcase"));
  }

  // 4. Pagination
  const page1 = await service.listProjects({ sortBy: "name", sortDirection: "asc", limit: 2, offset: 0 });
  assert.equal(page1.success, true);
  if (page1.success) {
    assert.equal(page1.data.total, 3);
    assert.equal(page1.data.projects.length, 2);
    assert.equal(page1.data.projects[0].name, "Apple Ad 2026");
    assert.equal(page1.data.projects[1].name, "Nike Reel 2026");
  }

  await adapter.close();
});

test("IndexedDB Storage — Persisting full Phase 3 SAMPLE_DEV_PROJECT fixture", async () => {
  const adapter = createTestIDBAdapter();
  const service = new StorageService(adapter);

  // Save full complex fixture with text, shape, image elements and asset references
  const saveResult = await service.saveProject(SAMPLE_DEV_PROJECT);
  assert.equal(saveResult.success, true);

  // Load and verify structural fidelity
  const loadResult = await service.loadProject(SAMPLE_DEV_PROJECT.id);
  assert.equal(loadResult.success, true);
  if (loadResult.success) {
    assert.equal(loadResult.data.id, SAMPLE_DEV_PROJECT.id);
    assert.equal(loadResult.data.name, SAMPLE_DEV_PROJECT.name);
    assert.equal(loadResult.data.scenes.length, SAMPLE_DEV_PROJECT.scenes.length);
    assert.equal(loadResult.data.assets.length, SAMPLE_DEV_PROJECT.assets.length);

    // Verify elements in first scene
    const scene1 = loadResult.data.scenes[0];
    assert.equal(scene1.elements.length, SAMPLE_DEV_PROJECT.scenes[0].elements.length);
    const types = scene1.elements.map((e) => e.type);
    assert.ok(types.includes("text"));
    assert.ok(types.includes("shape"));
    assert.ok(types.includes("image"));
    assert.ok(types.includes("logo"));
  }

  await adapter.close();
});

test("IndexedDB Storage — Corrupted record validation rejection", async () => {
  const dbName = `test_corrupt_${Date.now()}`;
  const adapter = createTestIDBAdapter(dbName);
  await adapter.initialize();

  // Manually insert an invalid / corrupted record into the IndexedDB store
  const corruptRecord = {
    id: "corrupted-proj-123",
    name: "Corrupt",
    schemaVersion: "0.0.1", // Invalid schema version
    width: -500, // Invalid width
    height: 1080,
    fps: 0, // Invalid fps
    duration: -1,
    scenes: "not-an-array",
    assets: [],
    metadata: {},
    createdAt: "invalid-date",
    updatedAt: "invalid-date",
  };

  const rawDB = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  await new Promise<void>((resolve, reject) => {
    const tx = rawDB.transaction(PROJECTS_STORE_NAME, "readwrite");
    const store = tx.objectStore(PROJECTS_STORE_NAME);
    const req = store.put(corruptRecord);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  rawDB.close();

  // Attempt to load the corrupted record via adapter
  const loadResult = await adapter.get("corrupted-proj-123");
  assert.equal(loadResult.success, false);
  if (!loadResult.success) {
    assert.equal(loadResult.error.code, "VALIDATION_FAILED");
    assert.ok(loadResult.error.message.includes("corrupted"));
  }

  await adapter.close();
});
