/**
 * MOTION-BOT — Storage Architecture & Type System
 * Abstract storage contracts, error codes, query options, and operation results.
 * Part of Phase 4.1: Storage Architecture & Abstraction.
 */

import { Project, ProjectId, ProjectMetadata } from "./project";

/**
 * Standard storage operation error codes.
 */
export type StorageErrorCode =
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "VALIDATION_FAILED"
  | "SERIALIZATION_FAILED"
  | "DESERIALIZATION_FAILED"
  | "QUOTA_EXCEEDED"
  | "STORAGE_UNAVAILABLE"
  | "OPERATION_FAILED"
  | "CONCURRENCY_CONFLICT";

/**
 * Structured storage error descriptor.
 */
export interface StorageError {
  code: StorageErrorCode;
  message: string;
  details?: unknown;
  originalError?: unknown;
}

/**
 * Result pattern wrapper for all storage operations.
 * Eliminates unhandled promise rejections and guarantees typed responses.
 */
export type StorageResult<T> =
  | { success: true; data: T }
  | { success: false; error: StorageError };

/**
 * Lightweight project summary for dashboard listing, search, and navigation.
 * Avoids loading full scene hierarchies, element graphs, and keyframes into memory.
 */
export interface ProjectSummary {
  id: ProjectId;
  name: string;
  schemaVersion: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  scenesCount: number;
  elementsCount: number;
  assetsCount: number;
  metadata: ProjectMetadata;
  createdAt: string;
  updatedAt: string;
}

/**
 * Project query, filtering, sorting, and pagination parameters.
 */
export interface ProjectQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: "updatedAt" | "createdAt" | "name";
  sortDirection?: "asc" | "desc";
  searchQuery?: string;
  tags?: string[];
}

/**
 * Paginated list result for project queries.
 */
export interface ProjectListResult {
  projects: ProjectSummary[];
  total: number;
  limit?: number;
  offset?: number;
}

/**
 * Storage adapter backend classification.
 * Extensible for future cloud/hybrid syncing.
 */
export type StorageBackendType =
  | "memory"
  | "indexeddb"
  | "localstorage"
  | "cloud"
  | "custom";

/**
 * Low-level storage adapter interface.
 * Implemented by concrete storage drivers (Memory, IndexedDB, Cloud, etc.).
 */
export interface ProjectStorageAdapter {
  readonly name: string;
  readonly type: StorageBackendType;

  /**
   * Checks whether this storage backend is available in the current environment.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Optional lifecycle hooks.
   */
  initialize?(): Promise<void>;
  close?(): Promise<void>;

  /**
   * Retrieves a project by ID.
   */
  get(id: ProjectId): Promise<StorageResult<Project>>;

  /**
   * Creates a new project. Fails if a project with the same ID already exists.
   */
  create(project: Project): Promise<StorageResult<Project>>;

  /**
   * Saves/upserts a project. Overwrites existing record or inserts if new.
   */
  save(project: Project): Promise<StorageResult<Project>>;

  /**
   * Updates an existing project with partial fields.
   */
  update(id: ProjectId, updates: Partial<Project>): Promise<StorageResult<Project>>;

  /**
   * Deletes a project by ID.
   */
  delete(id: ProjectId): Promise<StorageResult<void>>;

  /**
   * Lists project summaries with optional filtering, sorting, and pagination.
   */
  list(options?: ProjectQueryOptions): Promise<StorageResult<ProjectListResult>>;

  /**
   * Checks if a project exists by ID.
   */
  exists(id: ProjectId): Promise<StorageResult<boolean>>;

  /**
   * Clears all stored projects (primarily for testing and resets).
   */
  clear?(): Promise<StorageResult<void>>;
}

/**
 * High-level Storage Service interface for application consumption.
 * Encapsulates adapter selection, validation, error normalization, and lifecycle.
 */
export interface IStorageService {
  readonly currentAdapter: ProjectStorageAdapter;

  createProject(project: Project): Promise<StorageResult<Project>>;
  saveProject(project: Project): Promise<StorageResult<Project>>;
  loadProject(id: ProjectId): Promise<StorageResult<Project>>;
  updateProject(id: ProjectId, updates: Partial<Project>): Promise<StorageResult<Project>>;
  deleteProject(id: ProjectId): Promise<StorageResult<void>>;
  listProjects(options?: ProjectQueryOptions): Promise<StorageResult<ProjectListResult>>;
  hasProject(id: ProjectId): Promise<StorageResult<boolean>>;
  exists(id: ProjectId): Promise<StorageResult<boolean>>;
  setAdapter(adapter: ProjectStorageAdapter): Promise<void>;
}
