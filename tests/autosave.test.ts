/**
 * MOTION-BOT — Autosave & Recovery Infrastructure Test Suite
 * Validates save scheduling, debouncing, concurrency safety, state transitions,
 * failed save handling, and recovery rollback mechanisms.
 * Part of Phase 4.4: Project Autosave & Recovery Infrastructure.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { indexedDB } from "fake-indexeddb";

import {
  AutosaveManager,
  createAutosaveManager,
  AutosaveStatus,
  ProjectRepository,
  IndexedDBProjectStorageAdapter,
  StorageService,
  storageFailure,
  storageSuccess,
} from "../services/storage";
import { createProject } from "../services/project/project-model";
import { Project, ProjectId } from "../types/project";
import { IProjectRepository } from "../services/storage/project-repository";
import { StorageResult, ProjectListResult, ProjectQueryOptions } from "../types/storage";

function createTestHarness(debounceMs = 50) {
  const dbName = `test_autosave_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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

  return { manager, repository, adapter };
}

test("Autosave — Initialization and status inspection", async () => {
  const { manager, repository, adapter } = createTestHarness();

  const createRes = await repository.createProject({ name: "Initial Project" });
  assert.ok(createRes.success);
  const project = createRes.data;

  manager.loadProject(project);

  const status = manager.getStatus();
  assert.equal(status.state, "saved");
  assert.equal(status.hasUnsavedChanges, false);
  assert.equal(status.lastError, null);
  assert.equal(status.saveCount, 0);

  const latest = manager.getLatestProject();
  assert.equal(latest?.id, project.id);
  assert.equal(latest?.name, "Initial Project");

  manager.dispose();
  await adapter.close();
});

test("Autosave — Debouncing coalesces rapid edits into a single save", async () => {
  const { manager, repository, adapter } = createTestHarness(60);

  const createRes = await repository.createProject({ name: "Coalesce Test" });
  assert.ok(createRes.success);
  const project = createRes.data;

  manager.loadProject(project);

  const statusHistory: string[] = [];
  manager.subscribe((s) => statusHistory.push(s.state));

  // Perform 5 rapid consecutive changes within debounce window
  for (let i = 1; i <= 5; i++) {
    manager.notifyChange({
      ...project,
      name: `Rapid Edit ${i}`,
    });
  }

  // Immediate status should be unsaved
  assert.equal(manager.getStatus().state, "unsaved");
  assert.equal(manager.getStatus().hasUnsavedChanges, true);

  // Wait for debounce timeout to trigger save
  await new Promise((resolve) => setTimeout(resolve, 120));

  // Final status should be saved
  const finalStatus = manager.getStatus();
  assert.equal(finalStatus.state, "saved");
  assert.equal(finalStatus.hasUnsavedChanges, false);
  assert.equal(finalStatus.saveCount, 1); // Exactly 1 save executed despite 5 changes

  // Verify stored project in repository matches the final edit
  const reloaded = await repository.getProject(project.id);
  assert.ok(reloaded.success);
  if (reloaded.success) {
    assert.equal(reloaded.data.name, "Rapid Edit 5");
  }

  manager.dispose();
  await adapter.close();
});

test("Autosave — saveNow immediately flushes pending changes", async () => {
  const { manager, repository, adapter } = createTestHarness(5000); // 5s debounce

  const createRes = await repository.createProject({ name: "Save Now Test" });
  assert.ok(createRes.success);
  const project = createRes.data;

  manager.loadProject(project);

  manager.notifyChange({
    ...project,
    name: "Immediate Flush Target",
  });

  assert.equal(manager.getStatus().state, "unsaved");

  // Force immediate save without waiting 5 seconds
  const saveResult = await manager.saveNow();
  assert.equal(saveResult.success, true);
  if (saveResult.success) {
    assert.equal(saveResult.data.name, "Immediate Flush Target");
  }

  assert.equal(manager.getStatus().state, "saved");
  assert.equal(manager.getStatus().saveCount, 1);

  // Verify database record
  const reloaded = await repository.getProject(project.id);
  assert.ok(reloaded.success);
  if (reloaded.success) {
    assert.equal(reloaded.data.name, "Immediate Flush Target");
  }

  manager.dispose();
  await adapter.close();
});

test("Autosave — Failed save transitions to error state and preserves in-memory project", async () => {
  // Create a mock repository that rejects updates
  class FailingRepository implements IProjectRepository {
    async createProject(): Promise<StorageResult<Project>> {
      throw new Error("Not implemented");
    }
    async getProject(): Promise<StorageResult<Project>> {
      throw new Error("Not implemented");
    }
    async updateProject(): Promise<StorageResult<Project>> {
      return storageFailure("QUOTA_EXCEEDED", "Disk storage quota exceeded.");
    }
    async deleteProject(): Promise<StorageResult<void>> {
      throw new Error("Not implemented");
    }
    async listProjects(): Promise<StorageResult<ProjectListResult>> {
      throw new Error("Not implemented");
    }
    async hasProject(): Promise<StorageResult<boolean>> {
      return storageSuccess(true);
    }
    async duplicateProject(): Promise<StorageResult<Project>> {
      throw new Error("Not implemented");
    }
  }

  const failingRepo = new FailingRepository();
  const manager = createAutosaveManager({
    repository: failingRepo,
    debounceMs: 50,
  });

  const project = createProject({ name: "Precious User Work" });
  manager.loadProject(project);

  manager.notifyChange({
    ...project,
    name: "Critical Unsaved Edit",
  });

  // Wait for debounce save attempt
  await new Promise((resolve) => setTimeout(resolve, 100));

  const status = manager.getStatus();
  assert.equal(status.state, "error");
  assert.equal(status.lastError?.code, "QUOTA_EXCEEDED");
  assert.equal(status.hasUnsavedChanges, true);

  // CRITICAL CHECK: In-memory project was NOT destroyed or reverted!
  const latestInMemory = manager.getLatestProject();
  assert.equal(latestInMemory?.name, "Critical Unsaved Edit");

  manager.dispose();
});

test("Autosave — Recovery behavior (rollback to last saved state)", async () => {
  const { manager, repository, adapter } = createTestHarness(50);

  const createRes = await repository.createProject({ name: "Stable Baseline" });
  assert.ok(createRes.success);
  const project = createRes.data;

  manager.loadProject(project);

  // Apply edits
  manager.notifyChange({
    ...project,
    name: "Unwanted Experimental Edits",
  });

  assert.equal(manager.getStatus().state, "unsaved");
  assert.equal(manager.getLatestProject()?.name, "Unwanted Experimental Edits");
  assert.equal(manager.getLastSavedProject()?.name, "Stable Baseline");

  // Rollback to last saved state
  const recovered = manager.rollbackToLastSaved();
  assert.equal(recovered?.name, "Stable Baseline");

  // Status is restored to clean saved baseline
  const status = manager.getStatus();
  assert.equal(status.state, "saved");
  assert.equal(status.hasUnsavedChanges, false);
  assert.equal(manager.getLatestProject()?.name, "Stable Baseline");

  manager.dispose();
  await adapter.close();
});

test("Autosave — Concurrency safety: queuing saves while save is already in-flight", async () => {
  let resolveSave: ((val: StorageResult<Project>) => void) | null = null;

  class DelayedRepository implements IProjectRepository {
    private innerRepo: IProjectRepository;
    public saveInvocations = 0;

    constructor(inner: IProjectRepository) {
      this.innerRepo = inner;
    }

    async createProject(input?: unknown): Promise<StorageResult<Project>> {
      return this.innerRepo.createProject(input as any);
    }
    async getProject(id: ProjectId): Promise<StorageResult<Project>> {
      return this.innerRepo.getProject(id);
    }
    async updateProject(id: ProjectId, updates: Partial<Project>): Promise<StorageResult<Project>> {
      this.saveInvocations++;
      if (this.saveInvocations === 1) {
        // Delay the first save until manually resolved
        return new Promise((resolve) => {
          resolveSave = (res) => {
            void this.innerRepo.updateProject(id, updates).then(resolve);
          };
        });
      }
      return this.innerRepo.updateProject(id, updates);
    }
    async deleteProject(id: ProjectId): Promise<StorageResult<void>> {
      return this.innerRepo.deleteProject(id);
    }
    async listProjects(options?: ProjectQueryOptions): Promise<StorageResult<ProjectListResult>> {
      return this.innerRepo.listProjects(options);
    }
    async hasProject(id: ProjectId): Promise<StorageResult<boolean>> {
      return this.innerRepo.hasProject(id);
    }
    async duplicateProject(id: ProjectId, newName?: string): Promise<StorageResult<Project>> {
      return this.innerRepo.duplicateProject(id, newName);
    }
  }

  const { repository: realRepo, adapter } = createTestHarness();
  const delayedRepo = new DelayedRepository(realRepo);
  const manager = createAutosaveManager({
    repository: delayedRepo,
    debounceMs: 20,
  });

  const created = await realRepo.createProject({ name: "Initial State" });
  assert.ok(created.success);
  manager.loadProject(created.data);

  // Trigger first edit -> starts in-flight save
  manager.notifyChange({ ...created.data, name: "Edit 1 In-Flight" });

  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(manager.getStatus().state, "saving");

  // While save is in-flight, push another edit
  manager.notifyChange({ ...created.data, name: "Edit 2 Queued" });

  // Resolve the first in-flight save
  assert.equal(typeof resolveSave, "function");
  (resolveSave as any)(storageSuccess({ ...created.data, name: "Edit 1 In-Flight" }));

  // Wait for queued save to complete
  await new Promise((resolve) => setTimeout(resolve, 60));

  // State should be fully saved with Edit 2
  assert.equal(manager.getStatus().state, "saved");
  assert.equal(delayedRepo.saveInvocations, 2);

  const reloaded = await realRepo.getProject(created.data.id);
  assert.ok(reloaded.success);
  if (reloaded.success) {
    assert.equal(reloaded.data.name, "Edit 2 Queued");
  }

  manager.dispose();
  await adapter.close();
});
