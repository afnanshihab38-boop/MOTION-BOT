/**
 * MOTION-BOT — Storage Architecture & Abstraction Test Suite
 * Validates the storage abstraction layer, StorageService, ProjectStorageAdapter contracts,
 * in-memory reference implementation, error handling, query filtering, and cloud extensibility.
 * Part of Phase 4.1: Storage Architecture & Abstraction.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { createProject } from "../services/project/project-model";
import { createScene } from "../services/project/scene-model";
import { createTextElement, createShapeElement } from "../services/element/element-model";
import { createAsset } from "../services/asset/asset-model";
import { SAMPLE_DEV_PROJECT } from "../services/project/sample-project";

import {
  StorageService,
  createStorageService,
  MemoryProjectStorageAdapter,
  extractProjectSummary,
  filterAndSortSummaries,
  storageSuccess,
  storageFailure,
  isStorageSuccess,
  isStorageFailure,
} from "../services/storage";

import {
  Project,
  ProjectId,
} from "../types/project";

import {
  ProjectListResult,
  ProjectQueryOptions,
  ProjectStorageAdapter,
  StorageBackendType,
  StorageResult,
} from "../types/storage";

test("Storage Service — Instantiation and default adapter", () => {
  const service = new StorageService();
  assert.ok(service.currentAdapter instanceof MemoryProjectStorageAdapter);
  assert.equal(service.currentAdapter.name, "MemoryProjectStorageAdapter");
  assert.equal(service.currentAdapter.type, "memory");
});

test("Storage Service — Create project (Success & Conflict Prevention)", async () => {
  const service = createStorageService();
  const project = createProject({ name: "Brand Launch" });

  // 1. Initial creation succeeds
  const createResult = await service.createProject(project);
  assert.equal(createResult.success, true);
  if (createResult.success) {
    assert.equal(createResult.data.id, project.id);
    assert.equal(createResult.data.name, "Brand Launch");
  }

  // 2. Duplicate creation with same ID is rejected with ALREADY_EXISTS
  const duplicateResult = await service.createProject(project);
  assert.equal(duplicateResult.success, false);
  if (!duplicateResult.success) {
    assert.equal(duplicateResult.error.code, "ALREADY_EXISTS");
  }
});

test("Storage Service — Create project fails on invalid project structure", async () => {
  const service = createStorageService();
  const corruptProject = {
    id: "invalid-id",
    name: "",
    schemaVersion: "0.0.1", // invalid schema
    width: -100,
    height: 0,
    fps: 0,
    duration: -5,
    scenes: [],
    assets: [],
    metadata: { title: "" },
    createdAt: "invalid-date",
    updatedAt: "invalid-date",
  } as unknown as Project;

  const result = await service.createProject(corruptProject);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.code, "VALIDATION_FAILED");
    assert.ok(Array.isArray(result.error.details));
  }
});

test("Storage Service — Load project (Success & Not Found handling)", async () => {
  const service = createStorageService();
  const project = createProject({ name: "Holiday Sale" });
  await service.createProject(project);

  // 1. Existing project is loaded
  const loadResult = await service.loadProject(project.id);
  assert.equal(loadResult.success, true);
  if (loadResult.success) {
    assert.equal(loadResult.data.id, project.id);
    assert.equal(loadResult.data.name, "Holiday Sale");
  }

  // 2. Non-existent ID returns NOT_FOUND
  const notFoundResult = await service.loadProject("non-existent-id");
  assert.equal(notFoundResult.success, false);
  if (!notFoundResult.success) {
    assert.equal(notFoundResult.error.code, "NOT_FOUND");
  }

  // 3. Empty ID returns NOT_FOUND
  const emptyIdResult = await service.loadProject("");
  assert.equal(emptyIdResult.success, false);
  if (!emptyIdResult.success) {
    assert.equal(emptyIdResult.error.code, "NOT_FOUND");
  }
});

test("Storage Service — Immutability guarantee on load", async () => {
  const service = createStorageService();
  const project = createProject({ name: "Immutable Test" });
  await service.createProject(project);

  const load1 = await service.loadProject(project.id);
  assert.ok(load1.success);
  if (load1.success) {
    // Mutate the returned object directly in memory
    load1.data.name = "Mutated In Memory Directly";
  }

  // Subsequent load must still reflect pristine stored state
  const load2 = await service.loadProject(project.id);
  assert.ok(load2.success);
  if (load2.success) {
    assert.equal(load2.data.name, "Immutable Test");
  }
});

test("Storage Service — Save / Upsert project", async () => {
  const service = createStorageService();
  const project = createProject({ name: "Upsert Test" });

  // 1. Save new project (inserts)
  const save1 = await service.saveProject(project);
  assert.equal(save1.success, true);

  // 2. Save existing project (updates)
  const modified = { ...project, name: "Upsert Test Updated" };
  const save2 = await service.saveProject(modified);
  assert.equal(save2.success, true);
  if (save2.success) {
    assert.equal(save2.data.name, "Upsert Test Updated");
    assert.ok(save2.data.updatedAt);
  }

  const loaded = await service.loadProject(project.id);
  assert.ok(loaded.success);
  if (loaded.success) {
    assert.equal(loaded.data.name, "Upsert Test Updated");
  }
});

test("Storage Service — Update project partial fields", async () => {
  const service = createStorageService();
  const project = createProject({ name: "Original Title", width: 1080, height: 1920 });
  await service.createProject(project);

  // 1. Update valid fields
  const updateResult = await service.updateProject(project.id, {
    name: "Updated Title",
    width: 1920,
    height: 1080,
  });
  assert.equal(updateResult.success, true);
  if (updateResult.success) {
    assert.equal(updateResult.data.name, "Updated Title");
    assert.equal(updateResult.data.width, 1920);
    assert.equal(updateResult.data.height, 1080);
    assert.equal(updateResult.data.id, project.id);
  }

  // 2. Updating non-existent project returns NOT_FOUND
  const nonExistentResult = await service.updateProject("does-not-exist", { name: "Foo" });
  assert.equal(nonExistentResult.success, false);
  if (!nonExistentResult.success) {
    assert.equal(nonExistentResult.error.code, "NOT_FOUND");
  }

  // 3. Updating with invalid field values returns VALIDATION_FAILED
  const invalidUpdate = await service.updateProject(project.id, { width: -999 });
  assert.equal(invalidUpdate.success, false);
  if (!invalidUpdate.success) {
    assert.equal(invalidUpdate.error.code, "VALIDATION_FAILED");
  }
});

test("Storage Service — Delete project", async () => {
  const service = createStorageService();
  const project = createProject({ name: "To Delete" });
  await service.createProject(project);

  assert.ok((await service.hasProject(project.id)).success);
  const existsBefore = await service.hasProject(project.id);
  assert.equal(existsBefore.success && existsBefore.data, true);

  // 1. Delete existing project
  const deleteResult = await service.deleteProject(project.id);
  assert.equal(deleteResult.success, true);

  // 2. Has project is now false
  const hasResult = await service.hasProject(project.id);
  assert.equal(hasResult.success, true);
  if (hasResult.success) {
    assert.equal(hasResult.data, false);
  }

  // 3. Load returns NOT_FOUND
  const loadResult = await service.loadProject(project.id);
  assert.equal(loadResult.success, false);
  if (!loadResult.success) {
    assert.equal(loadResult.error.code, "NOT_FOUND");
  }

  // 4. Deleting already deleted project returns NOT_FOUND
  const deleteAgain = await service.deleteProject(project.id);
  assert.equal(deleteAgain.success, false);
  if (!deleteAgain.success) {
    assert.equal(deleteAgain.error.code, "NOT_FOUND");
  }
});

test("Storage Service — Check existence with hasProject and exists", async () => {
  const service = createStorageService();
  const project = createProject({ name: "Existence Check" });
  await service.createProject(project);

  const hasRes1 = await service.hasProject(project.id);
  const existsRes1 = await service.exists(project.id);
  assert.equal(hasRes1.success && hasRes1.data, true);
  assert.equal(existsRes1.success && existsRes1.data, true);

  const hasRes2 = await service.hasProject("random-id");
  const existsRes2 = await service.exists("random-id");
  assert.equal(hasRes2.success && hasRes2.data, false);
  assert.equal(existsRes2.success && existsRes2.data, false);

  const hasRes3 = await service.hasProject("");
  const existsRes3 = await service.exists("");
  assert.equal(hasRes3.success && hasRes3.data, false);
  assert.equal(existsRes3.success && existsRes3.data, false);
});

test("Storage Service — Extract Project Summary correctly aggregates counts", () => {
  const scene1 = createScene({ name: "Scene 1", duration: 3 });
  const textElem = createTextElement({ name: "Heading", text: "Motion" });
  const shapeElem = createShapeElement({ name: "Bg" });
  scene1.elements = [textElem, shapeElem];

  const scene2 = createScene({ name: "Scene 2", startTime: 3, duration: 3 });
  scene2.elements = [textElem];

  const asset1 = createAsset({
    name: "Logo",
    type: "image",
    source: "url",
    url: "https://example.com/logo.png",
  });

  const project = createProject({
    name: "Aggregated Project",
    scenes: [scene1, scene2],
    assets: [asset1],
    metadata: { title: "Aggregated Project", tags: ["tech", "promo"] },
  });

  const summary = extractProjectSummary(project);
  assert.equal(summary.id, project.id);
  assert.equal(summary.name, "Aggregated Project");
  assert.equal(summary.scenesCount, 2);
  assert.equal(summary.elementsCount, 3); // 2 in scene1 + 1 in scene2
  assert.equal(summary.assetsCount, 1);
  assert.deepEqual(summary.metadata.tags, ["tech", "promo"]);
});

test("Storage Service — List projects with search, filter, sort, and pagination", async () => {
  const service = createStorageService();

  const p1 = createProject({
    name: "Alpha Promo",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z",
    metadata: { title: "Alpha Promo", tags: ["commercial"] },
  });
  const p2 = createProject({
    name: "Beta Showcase",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-15T00:00:00.000Z",
    metadata: { title: "Beta Showcase", tags: ["social"] },
  });
  const p3 = createProject({
    name: "Gamma Reel",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-20T00:00:00.000Z",
    metadata: { title: "Gamma Reel", tags: ["commercial", "reel"] },
  });

  await service.createProject(p1);
  await service.createProject(p2);
  await service.createProject(p3);

  // 1. List all (default sort: updatedAt desc)
  const listAll = await service.listProjects();
  assert.ok(listAll.success);
  if (listAll.success) {
    assert.equal(listAll.data.total, 3);
    assert.equal(listAll.data.projects.length, 3);
    assert.equal(listAll.data.projects[0].name, "Gamma Reel");
    assert.equal(listAll.data.projects[1].name, "Beta Showcase");
    assert.equal(listAll.data.projects[2].name, "Alpha Promo");
  }

  // 2. Sort by name asc
  const sortNameAsc = await service.listProjects({ sortBy: "name", sortDirection: "asc" });
  assert.ok(sortNameAsc.success);
  if (sortNameAsc.success) {
    assert.equal(sortNameAsc.data.projects[0].name, "Alpha Promo");
    assert.equal(sortNameAsc.data.projects[1].name, "Beta Showcase");
    assert.equal(sortNameAsc.data.projects[2].name, "Gamma Reel");
  }

  // 3. Search query
  const searchBeta = await service.listProjects({ searchQuery: "beta" });
  assert.ok(searchBeta.success);
  if (searchBeta.success) {
    assert.equal(searchBeta.data.total, 1);
    assert.equal(searchBeta.data.projects[0].name, "Beta Showcase");
  }

  // 4. Tag filtering
  const tagFilter = await service.listProjects({ tags: ["commercial"] });
  assert.ok(tagFilter.success);
  if (tagFilter.success) {
    assert.equal(tagFilter.data.total, 2);
    const names = tagFilter.data.projects.map((p) => p.name);
    assert.ok(names.includes("Alpha Promo"));
    assert.ok(names.includes("Gamma Reel"));
  }

  // 5. Pagination (limit and offset)
  const page1 = await service.listProjects({ sortBy: "name", sortDirection: "asc", limit: 2, offset: 0 });
  assert.ok(page1.success);
  if (page1.success) {
    assert.equal(page1.data.total, 3);
    assert.equal(page1.data.projects.length, 2);
    assert.equal(page1.data.projects[0].name, "Alpha Promo");
    assert.equal(page1.data.projects[1].name, "Beta Showcase");
  }

  const page2 = await service.listProjects({ sortBy: "name", sortDirection: "asc", limit: 2, offset: 2 });
  assert.ok(page2.success);
  if (page2.success) {
    assert.equal(page2.data.total, 3);
    assert.equal(page2.data.projects.length, 1);
    assert.equal(page2.data.projects[0].name, "Gamma Reel");
  }
});

test("Storage Service — Saving and loading Phase 3 SAMPLE_DEV_PROJECT fixture", async () => {
  const service = createStorageService();

  const saveResult = await service.saveProject(SAMPLE_DEV_PROJECT);
  assert.equal(saveResult.success, true);

  const loadResult = await service.loadProject(SAMPLE_DEV_PROJECT.id);
  assert.equal(loadResult.success, true);
  if (loadResult.success) {
    assert.equal(loadResult.data.id, SAMPLE_DEV_PROJECT.id);
    assert.equal(loadResult.data.name, SAMPLE_DEV_PROJECT.name);
    assert.equal(loadResult.data.scenes.length, SAMPLE_DEV_PROJECT.scenes.length);
    assert.equal(loadResult.data.assets.length, SAMPLE_DEV_PROJECT.assets.length);
  }
});

test("Storage Service — Extensibility: Dynamic Adapter Swap (Future Cloud Mock)", async () => {
  // Simulates a future cloud storage adapter implementing ProjectStorageAdapter
  class MockCloudStorageAdapter implements ProjectStorageAdapter {
    readonly name = "MockCloudStorageAdapter";
    readonly type: StorageBackendType = "cloud";
    public calls: string[] = [];

    async isAvailable(): Promise<boolean> {
      return true;
    }

    async get(id: ProjectId): Promise<StorageResult<Project>> {
      this.calls.push(`get:${id}`);
      return storageFailure("NOT_FOUND", "Cloud project not found");
    }

    async create(project: Project): Promise<StorageResult<Project>> {
      this.calls.push(`create:${project.id}`);
      return storageSuccess(project);
    }

    async save(project: Project): Promise<StorageResult<Project>> {
      this.calls.push(`save:${project.id}`);
      return storageSuccess(project);
    }

    async update(id: ProjectId, updates: Partial<Project>): Promise<StorageResult<Project>> {
      this.calls.push(`update:${id}`);
      return storageFailure("NOT_FOUND", "Cannot update cloud project");
    }

    async delete(id: ProjectId): Promise<StorageResult<void>> {
      this.calls.push(`delete:${id}`);
      return storageSuccess(undefined);
    }

    async list(options?: ProjectQueryOptions): Promise<StorageResult<ProjectListResult>> {
      this.calls.push("list");
      return storageSuccess({ projects: [], total: 0 });
    }

    async exists(id: ProjectId): Promise<StorageResult<boolean>> {
      this.calls.push(`exists:${id}`);
      return storageSuccess(true);
    }
  }

  const cloudAdapter = new MockCloudStorageAdapter();
  const service = createStorageService();

  // Switch adapter to cloud adapter at runtime
  await service.setAdapter(cloudAdapter);
  assert.equal(service.currentAdapter.name, "MockCloudStorageAdapter");
  assert.equal(service.currentAdapter.type, "cloud");

  // Call operations through StorageService
  const project = createProject({ name: "Cloud Extensibility Test" });
  const createResult = await service.createProject(project);
  assert.equal(createResult.success, true);
  assert.ok(cloudAdapter.calls.includes(`create:${project.id}`));

  await service.hasProject(project.id);
  assert.ok(cloudAdapter.calls.includes(`exists:${project.id}`));

  await service.listProjects();
  assert.ok(cloudAdapter.calls.includes("list"));
});

test("Storage Result helpers — Type guards & structure", () => {
  const success = storageSuccess({ count: 42 });
  assert.equal(isStorageSuccess(success), true);
  assert.equal(isStorageFailure(success), false);
  if (isStorageSuccess(success)) {
    assert.equal(success.data.count, 42);
  }

  const failure = storageFailure("QUOTA_EXCEEDED", "Disk is full");
  assert.equal(isStorageSuccess(failure), false);
  assert.equal(isStorageFailure(failure), true);
  if (isStorageFailure(failure)) {
    assert.equal(failure.error.code, "QUOTA_EXCEEDED");
    assert.equal(failure.error.message, "Disk is full");
  }
});
