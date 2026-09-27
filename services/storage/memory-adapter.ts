/**
 * MOTION-BOT — In-Memory Project Storage Adapter
 * Transient in-memory reference adapter for unit tests, SSR, and zero-dependency fallbacks.
 * Part of Phase 4.1: Storage Architecture & Abstraction.
 */

import { Project, ProjectId } from "@/types/project";
import {
  ProjectListResult,
  ProjectQueryOptions,
  ProjectStorageAdapter,
  StorageBackendType,
  StorageResult,
} from "@/types/storage";
import { storageFailure, storageSuccess } from "./storage-error";
import { extractProjectSummary, filterAndSortSummaries } from "./project-storage";
import { cloneProject } from "@/services/project/project-serializer";
import { formatValidationErrors, validateProjectDeep } from "@/services/project/project-validator";

/**
 * In-memory storage driver implementing the ProjectStorageAdapter contract.
 * Uses strict cloning to ensure in-memory records are immutable to outside mutations.
 */
export class MemoryProjectStorageAdapter implements ProjectStorageAdapter {
  readonly name = "MemoryProjectStorageAdapter";
  readonly type: StorageBackendType = "memory";

  private projects: Map<ProjectId, Project> = new Map();

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async initialize(): Promise<void> {
    // No-op for in-memory storage
  }

  async close(): Promise<void> {
    // No-op for in-memory storage
  }

  async get(id: ProjectId): Promise<StorageResult<Project>> {
    const existing = this.projects.get(id);
    if (!existing) {
      return storageFailure("NOT_FOUND", `Project with ID '${id}' was not found in storage.`);
    }

    return storageSuccess(cloneProject(existing));
  }

  async create(project: Project): Promise<StorageResult<Project>> {
    const validation = validateProjectDeep(project);
    if (!validation.valid) {
      return storageFailure(
        "VALIDATION_FAILED",
        "Project validation failed before creation.",
        formatValidationErrors(validation.errors)
      );
    }

    if (this.projects.has(project.id)) {
      return storageFailure(
        "ALREADY_EXISTS",
        `Cannot create project: A project with ID '${project.id}' already exists.`
      );
    }

    const cloned = cloneProject(project);
    this.projects.set(cloned.id, cloned);
    return storageSuccess(cloneProject(cloned));
  }

  async save(project: Project): Promise<StorageResult<Project>> {
    const validation = validateProjectDeep(project);
    if (!validation.valid) {
      return storageFailure(
        "VALIDATION_FAILED",
        "Project validation failed before saving.",
        formatValidationErrors(validation.errors)
      );
    }

    const cloned = cloneProject(project);
    this.projects.set(cloned.id, cloned);
    return storageSuccess(cloneProject(cloned));
  }

  async update(id: ProjectId, updates: Partial<Project>): Promise<StorageResult<Project>> {
    const existing = this.projects.get(id);
    if (!existing) {
      return storageFailure("NOT_FOUND", `Cannot update: Project with ID '${id}' not found.`);
    }

    const merged: Project = {
      ...cloneProject(existing),
      ...updates,
      id, // Preserve immutable identity
      updatedAt: updates.updatedAt ?? new Date().toISOString(),
    };

    const validation = validateProjectDeep(merged);
    if (!validation.valid) {
      return storageFailure(
        "VALIDATION_FAILED",
        "Updated project structure failed deep validation.",
        formatValidationErrors(validation.errors)
      );
    }

    this.projects.set(id, merged);
    return storageSuccess(cloneProject(merged));
  }

  async delete(id: ProjectId): Promise<StorageResult<void>> {
    if (!this.projects.has(id)) {
      return storageFailure("NOT_FOUND", `Cannot delete: Project with ID '${id}' not found.`);
    }

    this.projects.delete(id);
    return storageSuccess(undefined);
  }

  async list(options?: ProjectQueryOptions): Promise<StorageResult<ProjectListResult>> {
    const summaries = Array.from(this.projects.values()).map(extractProjectSummary);
    const result = filterAndSortSummaries(summaries, options);
    return storageSuccess(result);
  }

  async exists(id: ProjectId): Promise<StorageResult<boolean>> {
    return storageSuccess(this.projects.has(id));
  }

  async clear(): Promise<StorageResult<void>> {
    this.projects.clear();
    return storageSuccess(undefined);
  }
}
