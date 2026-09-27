/**
 * MOTION-BOT — High-Level Storage Service
 * Central storage coordinator providing a unified API for project persistence,
 * validation enforcement, and pluggable storage backend management.
 * Part of Phase 4.1: Storage Architecture & Abstraction.
 */

import { Project, ProjectId } from "@/types/project";
import {
  IStorageService,
  ProjectListResult,
  ProjectQueryOptions,
  ProjectStorageAdapter,
  StorageResult,
} from "@/types/storage";
import { MemoryProjectStorageAdapter } from "./memory-adapter";
import { IndexedDBProjectStorageAdapter } from "./indexeddb-adapter";
import { storageFailure, storageSuccess } from "./storage-error";
import { validateProjectDeep, formatValidationErrors } from "@/services/project/project-validator";

/**
 * High-level service managing all project persistence operations.
 * Decouples application UI, editor, and workflow layers from concrete storage drivers
 * (IndexedDB, Memory, Cloud, etc.).
 */
export class StorageService implements IStorageService {
  private adapter: ProjectStorageAdapter;

  constructor(initialAdapter?: ProjectStorageAdapter) {
    if (initialAdapter) {
      this.adapter = initialAdapter;
    } else if (typeof globalThis !== "undefined" && typeof globalThis.indexedDB !== "undefined") {
      this.adapter = new IndexedDBProjectStorageAdapter();
    } else {
      this.adapter = new MemoryProjectStorageAdapter();
    }
  }

  /**
   * Returns the currently active storage adapter instance.
   */
  get currentAdapter(): ProjectStorageAdapter {
    return this.adapter;
  }

  /**
   * Swaps the active storage backend at runtime.
   * Initializes the new adapter if an initialize hook is defined.
   */
  async setAdapter(adapter: ProjectStorageAdapter): Promise<void> {
    const isAvailable = await adapter.isAvailable();
    if (!isAvailable) {
      throw new Error(`Storage adapter '${adapter.name}' is not available in the current environment.`);
    }

    if (this.adapter.close) {
      await this.adapter.close();
    }

    if (adapter.initialize) {
      await adapter.initialize();
    }

    this.adapter = adapter;
  }

  /**
   * Creates a new project in storage.
   * Performs deep validation and guarantees that an existing project is not overwritten.
   */
  async createProject(project: Project): Promise<StorageResult<Project>> {
    try {
      const validation = validateProjectDeep(project);
      if (!validation.valid) {
        return storageFailure(
          "VALIDATION_FAILED",
          "Cannot create project: validation failed.",
          formatValidationErrors(validation.errors)
        );
      }

      return await this.adapter.create(project);
    } catch (err) {
      return storageFailure(
        "OPERATION_FAILED",
        "An unexpected error occurred while creating the project.",
        undefined,
        err
      );
    }
  }

  /**
   * Saves or upserts a project in storage.
   * Automatically refreshes updatedAt timestamp if not explicitly modified,
   * validates integrity, and commits via the active adapter.
   */
  async saveProject(project: Project): Promise<StorageResult<Project>> {
    try {
      const projectToSave: Project = {
        ...project,
        updatedAt: new Date().toISOString(),
      };

      const validation = validateProjectDeep(projectToSave);
      if (!validation.valid) {
        return storageFailure(
          "VALIDATION_FAILED",
          "Cannot save project: deep validation failed.",
          formatValidationErrors(validation.errors)
        );
      }

      return await this.adapter.save(projectToSave);
    } catch (err) {
      return storageFailure(
        "OPERATION_FAILED",
        "An unexpected error occurred while saving the project.",
        undefined,
        err
      );
    }
  }

  /**
   * Loads a project by ID from the active adapter.
   */
  async loadProject(id: ProjectId): Promise<StorageResult<Project>> {
    try {
      if (!id || typeof id !== "string" || id.trim() === "") {
        return storageFailure("NOT_FOUND", "A valid non-empty project ID must be provided.");
      }

      return await this.adapter.get(id);
    } catch (err) {
      return storageFailure(
        "OPERATION_FAILED",
        `An unexpected error occurred while loading project '${id}'.`,
        undefined,
        err
      );
    }
  }

  /**
   * Partially updates an existing project in storage.
   */
  async updateProject(id: ProjectId, updates: Partial<Project>): Promise<StorageResult<Project>> {
    try {
      if (!id || typeof id !== "string" || id.trim() === "") {
        return storageFailure("NOT_FOUND", "A valid non-empty project ID must be provided.");
      }

      return await this.adapter.update(id, updates);
    } catch (err) {
      return storageFailure(
        "OPERATION_FAILED",
        `An unexpected error occurred while updating project '${id}'.`,
        undefined,
        err
      );
    }
  }

  /**
   * Deletes a project by ID from storage.
   */
  async deleteProject(id: ProjectId): Promise<StorageResult<void>> {
    try {
      if (!id || typeof id !== "string" || id.trim() === "") {
        return storageFailure("NOT_FOUND", "A valid non-empty project ID must be provided.");
      }

      return await this.adapter.delete(id);
    } catch (err) {
      return storageFailure(
        "OPERATION_FAILED",
        `An unexpected error occurred while deleting project '${id}'.`,
        undefined,
        err
      );
    }
  }

  /**
   * Lists project summaries with optional filtering, sorting, and pagination.
   */
  async listProjects(options?: ProjectQueryOptions): Promise<StorageResult<ProjectListResult>> {
    try {
      return await this.adapter.list(options);
    } catch (err) {
      return storageFailure(
        "OPERATION_FAILED",
        "An unexpected error occurred while listing projects.",
        undefined,
        err
      );
    }
  }

  /**
   * Checks whether a project with the given ID exists in storage.
   */
  async hasProject(id: ProjectId): Promise<StorageResult<boolean>> {
    try {
      if (!id || typeof id !== "string" || id.trim() === "") {
        return storageSuccess(false);
      }

      return await this.adapter.exists(id);
    } catch (err) {
      return storageFailure(
        "OPERATION_FAILED",
        `An unexpected error occurred while checking existence for project '${id}'.`,
        undefined,
        err
      );
    }
  }

  /**
   * Alias for hasProject to satisfy exists(id) naming convention.
   */
  async exists(id: ProjectId): Promise<StorageResult<boolean>> {
    return this.hasProject(id);
  }

  /**
   * Clears all stored projects if supported by the active adapter.
   */
  async clearAll(): Promise<StorageResult<void>> {
    try {
      if (this.adapter.clear) {
        return await this.adapter.clear();
      }
      return storageFailure("OPERATION_FAILED", "The active storage adapter does not support clear.");
    } catch (err) {
      return storageFailure(
        "OPERATION_FAILED",
        "An unexpected error occurred while clearing storage.",
        undefined,
        err
      );
    }
  }
}

/**
 * Factory for creating custom StorageService instances.
 */
export function createStorageService(adapter?: ProjectStorageAdapter): StorageService {
  return new StorageService(adapter);
}

/**
 * Default global singleton instance of the StorageService.
 */
let defaultStorageServiceInstance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (!defaultStorageServiceInstance) {
    defaultStorageServiceInstance = new StorageService();
  }
  return defaultStorageServiceInstance;
}
