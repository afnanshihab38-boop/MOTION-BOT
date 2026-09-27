/**
 * MOTION-BOT — IndexedDB Project Storage Adapter
 * Robust local browser persistence implementation of ProjectStorageAdapter.
 * Stores complete MOTIONBOT Project models with deep validation, indexing, and error handling.
 * Part of Phase 4.2: Local Project Storage (IndexedDB).
 */

import { Project, ProjectId } from "@/types/project";
import {
  ProjectListResult,
  ProjectQueryOptions,
  ProjectStorageAdapter,
  StorageBackendType,
  StorageErrorCode,
  StorageResult,
} from "@/types/storage";
import { storageFailure, storageSuccess } from "./storage-error";
import { extractProjectSummary, filterAndSortSummaries } from "./project-storage";
import { cloneProject } from "@/services/project/project-serializer";
import { formatValidationErrors, validateProjectDeep } from "@/services/project/project-validator";

/**
 * Standard configuration options for the IndexedDB storage adapter.
 */
export interface IndexedDBAdapterOptions {
  /** Database name. Defaults to "motionbot_db". */
  dbName?: string;
  /** Schema version of the IndexedDB database. Defaults to 1. */
  dbVersion?: number;
  /** Optional custom IDBFactory instance (e.g. for testing with fake-indexeddb). */
  idbFactory?: IDBFactory;
}

export const DEFAULT_DB_NAME = "motionbot_db";
export const DEFAULT_DB_VERSION = 1;
export const PROJECTS_STORE_NAME = "projects";

/**
 * Maps standard IndexedDB DOMException names to MOTIONBOT StorageErrorCode.
 */
function mapIDBErrorToStorageCode(error: unknown): StorageErrorCode {
  if (error && typeof error === "object" && "name" in error) {
    const errName = (error as { name?: string }).name;
    if (errName === "QuotaExceededError") return "QUOTA_EXCEEDED";
    if (errName === "ConstraintError") return "ALREADY_EXISTS";
    if (errName === "NotFoundError") return "NOT_FOUND";
    if (errName === "AbortError") return "OPERATION_FAILED";
  }
  return "OPERATION_FAILED";
}

/**
 * IndexedDB storage provider implementing the ProjectStorageAdapter contract.
 * Stores fully-formed, validated Project objects under the "projects" object store.
 */
export class IndexedDBProjectStorageAdapter implements ProjectStorageAdapter {
  readonly name = "IndexedDBProjectStorageAdapter";
  readonly type: StorageBackendType = "indexeddb";

  private readonly dbName: string;
  private readonly dbVersion: number;
  private readonly idbFactory?: IDBFactory;

  private cachedDB: IDBDatabase | null = null;
  private pendingOpenPromise: Promise<IDBDatabase> | null = null;

  constructor(options?: IndexedDBAdapterOptions) {
    this.dbName = options?.dbName ?? DEFAULT_DB_NAME;
    this.dbVersion = options?.dbVersion ?? DEFAULT_DB_VERSION;
    this.idbFactory = options?.idbFactory;
  }

  /**
   * Retrieves the active IDBFactory instance from options or global environment.
   */
  private getFactory(): IDBFactory | undefined {
    return (
      this.idbFactory ??
      (typeof globalThis !== "undefined" ? (globalThis.indexedDB as IDBFactory | undefined) : undefined)
    );
  }

  /**
   * Verifies if IndexedDB is available in the execution environment.
   */
  async isAvailable(): Promise<boolean> {
    const factory = this.getFactory();
    return typeof factory !== "undefined" && typeof factory.open === "function";
  }

  /**
   * Safe asynchronous connection pooling to the MOTIONBOT IndexedDB database.
   * Creates object store and indexes on upgrade if not already existing.
   */
  private async getDB(): Promise<IDBDatabase> {
    if (this.cachedDB) {
      return this.cachedDB;
    }

    if (this.pendingOpenPromise) {
      return this.pendingOpenPromise;
    }

    const factory = this.getFactory();
    if (!factory) {
      throw new Error("IndexedDB is not supported in the current environment.");
    }

    this.pendingOpenPromise = new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const request = factory.open(this.dbName, this.dbVersion);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(PROJECTS_STORE_NAME)) {
            const store = db.createObjectStore(PROJECTS_STORE_NAME, { keyPath: "id" });
            store.createIndex("updatedAt", "updatedAt", { unique: false });
            store.createIndex("createdAt", "createdAt", { unique: false });
            store.createIndex("name", "name", { unique: false });
            store.createIndex("schemaVersion", "schemaVersion", { unique: false });
          }
        };

        request.onsuccess = () => {
          const db = request.result;

          db.onversionchange = () => {
            db.close();
            this.cachedDB = null;
          };

          db.onclose = () => {
            this.cachedDB = null;
          };

          this.cachedDB = db;
          this.pendingOpenPromise = null;
          resolve(db);
        };

        request.onerror = () => {
          this.pendingOpenPromise = null;
          reject(request.error ?? new Error("Failed to open IndexedDB database."));
        };

        request.onblocked = () => {
          // Keep waiting for blocking connections to close
        };
      } catch (err) {
        this.pendingOpenPromise = null;
        reject(err);
      }
    });

    return this.pendingOpenPromise;
  }

  /**
   * Explicit initialization hook.
   */
  async initialize(): Promise<void> {
    await this.getDB();
  }

  /**
   * Closes active database connection.
   */
  async close(): Promise<void> {
    if (this.cachedDB) {
      this.cachedDB.close();
      this.cachedDB = null;
    }
    this.pendingOpenPromise = null;
  }

  /**
   * Retrieves a project by ID from IndexedDB.
   */
  async get(id: ProjectId): Promise<StorageResult<Project>> {
    try {
      const db = await this.getDB();

      return await new Promise<StorageResult<Project>>((resolve) => {
        const tx = db.transaction(PROJECTS_STORE_NAME, "readonly");
        const store = tx.objectStore(PROJECTS_STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          const result = request.result;
          if (!result) {
            resolve(storageFailure("NOT_FOUND", `Project with ID '${id}' was not found in IndexedDB.`));
            return;
          }

          // Deep validation of retrieved record to prevent corrupted state from entering app
          const validation = validateProjectDeep(result);
          if (!validation.valid) {
            resolve(
              storageFailure(
                "VALIDATION_FAILED",
                `Stored project '${id}' is corrupted or failed schema validation.`,
                formatValidationErrors(validation.errors)
              )
            );
            return;
          }

          resolve(storageSuccess(cloneProject(result as Project)));
        };

        request.onerror = () => {
          resolve(
            storageFailure(
              mapIDBErrorToStorageCode(request.error),
              `Failed to retrieve project '${id}' from IndexedDB.`,
              undefined,
              request.error
            )
          );
        };
      });
    } catch (err) {
      return storageFailure(
        "STORAGE_UNAVAILABLE",
        "IndexedDB is unavailable or failed to initialize.",
        undefined,
        err
      );
    }
  }

  /**
   * Creates a new project in IndexedDB.
   * Atomically rejects if a record with the same ID already exists.
   */
  async create(project: Project): Promise<StorageResult<Project>> {
    try {
      const validation = validateProjectDeep(project);
      if (!validation.valid) {
        return storageFailure(
          "VALIDATION_FAILED",
          "Cannot create project: validation failed.",
          formatValidationErrors(validation.errors)
        );
      }

      const db = await this.getDB();
      const cloned = cloneProject(project);

      return await new Promise<StorageResult<Project>>((resolve) => {
        const tx = db.transaction(PROJECTS_STORE_NAME, "readwrite");
        const store = tx.objectStore(PROJECTS_STORE_NAME);
        const request = store.add(cloned);

        request.onsuccess = () => {
          resolve(storageSuccess(cloneProject(cloned)));
        };

        request.onerror = (event) => {
          event.preventDefault(); // Prevent abort from bubbling
          const err = request.error;
          const code = err?.name === "ConstraintError" ? "ALREADY_EXISTS" : mapIDBErrorToStorageCode(err);
          const message =
            code === "ALREADY_EXISTS"
              ? `Cannot create project: ID '${project.id}' already exists in IndexedDB.`
              : `Failed to create project '${project.id}' in IndexedDB.`;

          resolve(storageFailure(code, message, undefined, err));
        };
      });
    } catch (err) {
      return storageFailure(
        "STORAGE_UNAVAILABLE",
        "IndexedDB is unavailable or failed to initialize.",
        undefined,
        err
      );
    }
  }

  /**
   * Saves or upserts a project in IndexedDB.
   */
  async save(project: Project): Promise<StorageResult<Project>> {
    try {
      const validation = validateProjectDeep(project);
      if (!validation.valid) {
        return storageFailure(
          "VALIDATION_FAILED",
          "Cannot save project: validation failed.",
          formatValidationErrors(validation.errors)
        );
      }

      const db = await this.getDB();
      const cloned = cloneProject(project);

      return await new Promise<StorageResult<Project>>((resolve) => {
        const tx = db.transaction(PROJECTS_STORE_NAME, "readwrite");
        const store = tx.objectStore(PROJECTS_STORE_NAME);
        const request = store.put(cloned);

        request.onsuccess = () => {
          resolve(storageSuccess(cloneProject(cloned)));
        };

        request.onerror = () => {
          const err = request.error;
          resolve(
            storageFailure(
              mapIDBErrorToStorageCode(err),
              `Failed to save project '${project.id}' in IndexedDB.`,
              undefined,
              err
            )
          );
        };
      });
    } catch (err) {
      return storageFailure(
        "STORAGE_UNAVAILABLE",
        "IndexedDB is unavailable or failed to initialize.",
        undefined,
        err
      );
    }
  }

  /**
   * Partially updates an existing project in IndexedDB.
   */
  async update(id: ProjectId, updates: Partial<Project>): Promise<StorageResult<Project>> {
    try {
      const db = await this.getDB();

      return await new Promise<StorageResult<Project>>((resolve) => {
        const tx = db.transaction(PROJECTS_STORE_NAME, "readwrite");
        const store = tx.objectStore(PROJECTS_STORE_NAME);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const existing = getRequest.result as Project | undefined;
          if (!existing) {
            resolve(storageFailure("NOT_FOUND", `Cannot update: Project with ID '${id}' not found.`));
            return;
          }

          const merged: Project = {
            ...existing,
            ...updates,
            id, // Protect immutable identity
            updatedAt: updates.updatedAt ?? new Date().toISOString(),
          };

          const validation = validateProjectDeep(merged);
          if (!validation.valid) {
            resolve(
              storageFailure(
                "VALIDATION_FAILED",
                "Updated project failed deep validation.",
                formatValidationErrors(validation.errors)
              )
            );
            return;
          }

          const putRequest = store.put(merged);

          putRequest.onsuccess = () => {
            resolve(storageSuccess(cloneProject(merged)));
          };

          putRequest.onerror = () => {
            const err = putRequest.error;
            resolve(
              storageFailure(
                mapIDBErrorToStorageCode(err),
                `Failed to write updated project '${id}' to IndexedDB.`,
                undefined,
                err
              )
            );
          };
        };

        getRequest.onerror = () => {
          resolve(
            storageFailure(
              mapIDBErrorToStorageCode(getRequest.error),
              `Failed to read project '${id}' for update in IndexedDB.`,
              undefined,
              getRequest.error
            )
          );
        };
      });
    } catch (err) {
      return storageFailure(
        "STORAGE_UNAVAILABLE",
        "IndexedDB is unavailable or failed to initialize.",
        undefined,
        err
      );
    }
  }

  /**
   * Deletes a project by ID from IndexedDB.
   */
  async delete(id: ProjectId): Promise<StorageResult<void>> {
    try {
      const db = await this.getDB();

      return await new Promise<StorageResult<void>>((resolve) => {
        const tx = db.transaction(PROJECTS_STORE_NAME, "readwrite");
        const store = tx.objectStore(PROJECTS_STORE_NAME);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          if (!getRequest.result) {
            resolve(storageFailure("NOT_FOUND", `Cannot delete: Project with ID '${id}' not found.`));
            return;
          }

          const deleteRequest = store.delete(id);
          deleteRequest.onsuccess = () => {
            resolve(storageSuccess(undefined));
          };
          deleteRequest.onerror = () => {
            resolve(
              storageFailure(
                mapIDBErrorToStorageCode(deleteRequest.error),
                `Failed to delete project '${id}' from IndexedDB.`,
                undefined,
                deleteRequest.error
              )
            );
          };
        };

        getRequest.onerror = () => {
          resolve(
            storageFailure(
              mapIDBErrorToStorageCode(getRequest.error),
              `Failed to verify existence of project '${id}' before deletion.`,
              undefined,
              getRequest.error
            )
          );
        };
      });
    } catch (err) {
      return storageFailure(
        "STORAGE_UNAVAILABLE",
        "IndexedDB is unavailable or failed to initialize.",
        undefined,
        err
      );
    }
  }

  /**
   * Lists project summaries with optional filtering, sorting, and pagination.
   */
  async list(options?: ProjectQueryOptions): Promise<StorageResult<ProjectListResult>> {
    try {
      const db = await this.getDB();

      return await new Promise<StorageResult<ProjectListResult>>((resolve) => {
        const tx = db.transaction(PROJECTS_STORE_NAME, "readonly");
        const store = tx.objectStore(PROJECTS_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const records = (request.result ?? []) as Project[];
          // Map to summaries, ignoring malformed records if any
          const summaries = records
            .filter((p) => p && typeof p === "object" && typeof p.id === "string")
            .map(extractProjectSummary);

          const result = filterAndSortSummaries(summaries, options);
          resolve(storageSuccess(result));
        };

        request.onerror = () => {
          resolve(
            storageFailure(
              mapIDBErrorToStorageCode(request.error),
              "Failed to list projects from IndexedDB.",
              undefined,
              request.error
            )
          );
        };
      });
    } catch (err) {
      return storageFailure(
        "STORAGE_UNAVAILABLE",
        "IndexedDB is unavailable or failed to initialize.",
        undefined,
        err
      );
    }
  }

  /**
   * Checks whether a project with the given ID exists in IndexedDB.
   */
  async exists(id: ProjectId): Promise<StorageResult<boolean>> {
    try {
      const db = await this.getDB();

      return await new Promise<StorageResult<boolean>>((resolve) => {
        const tx = db.transaction(PROJECTS_STORE_NAME, "readonly");
        const store = tx.objectStore(PROJECTS_STORE_NAME);
        const request = store.count(id);

        request.onsuccess = () => {
          resolve(storageSuccess(request.result > 0));
        };

        request.onerror = () => {
          resolve(
            storageFailure(
              mapIDBErrorToStorageCode(request.error),
              `Failed to check existence for project '${id}'.`,
              undefined,
              request.error
            )
          );
        };
      });
    } catch (err) {
      return storageFailure(
        "STORAGE_UNAVAILABLE",
        "IndexedDB is unavailable or failed to initialize.",
        undefined,
        err
      );
    }
  }

  /**
   * Clears all stored projects from IndexedDB.
   */
  async clear(): Promise<StorageResult<void>> {
    try {
      const db = await this.getDB();

      return await new Promise<StorageResult<void>>((resolve) => {
        const tx = db.transaction(PROJECTS_STORE_NAME, "readwrite");
        const store = tx.objectStore(PROJECTS_STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          resolve(storageSuccess(undefined));
        };

        request.onerror = () => {
          resolve(
            storageFailure(
              mapIDBErrorToStorageCode(request.error),
              "Failed to clear IndexedDB projects store.",
              undefined,
              request.error
            )
          );
        };
      });
    } catch (err) {
      return storageFailure(
        "STORAGE_UNAVAILABLE",
        "IndexedDB is unavailable or failed to initialize.",
        undefined,
        err
      );
    }
  }
}
