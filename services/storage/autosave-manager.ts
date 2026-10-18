/**
 * MOTION-BOT — Project Autosave & Recovery Infrastructure
 * Robust debounced autosave manager, state machine, concurrency guard, and recovery snapshot system.
 * Part of Phase 4.4: Project Autosave & Recovery Infrastructure.
 */

import { Project, ProjectId } from "@/types/project";
import { StorageError, StorageResult } from "@/types/storage";
import { cloneProject } from "@/services/project/project-serializer";
import { validateProjectDeep, formatValidationErrors } from "@/services/project/project-validator";
import { IProjectRepository, getProjectRepository } from "./project-repository";
import { storageFailure, storageSuccess } from "./storage-error";

/**
 * Storage synchronization states.
 */
export type AutosaveState =
  | "saved" // All changes safely persisted to storage
  | "saving" // Asynchronous save operation currently in flight
  | "unsaved" // In-memory project has pending changes awaiting debounced save
  | "error"; // Last save attempt failed; project remains safely in memory

/**
 * Snapshot descriptor of the autosave manager's health and sync status.
 */
export interface AutosaveStatus {
  state: AutosaveState;
  lastSavedAt: string | null;
  lastError: StorageError | null;
  hasUnsavedChanges: boolean;
  saveCount: number;
}

/**
 * Configuration options for the AutosaveManager.
 */
export interface AutosaveOptions {
  /** Debounce delay in milliseconds before committing to storage. Defaults to 1000ms. */
  debounceMs?: number;
  /** Maximum wait time in milliseconds before forcing a save even with continuous edits. Defaults to 10000ms. */
  maxWaitMs?: number;
  /** Initial status change listener callback. */
  onStatusChange?: (status: AutosaveStatus) => void;
  /** Repository instance to use for persistence. Defaults to global getProjectRepository(). */
  repository?: IProjectRepository;
}

export type AutosaveSubscriber = (status: AutosaveStatus) => void;

/**
 * Fast deterministic content comparison between two project objects,
 * ignoring volatile timestamp fields such as `updatedAt`.
 */
export function isProjectContentEqual(a: Project | null, b: Project | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.id !== b.id) return false;
  if (a.name !== b.name) return false;
  if (a.width !== b.width || a.height !== b.height) return false;
  if (a.fps !== b.fps || a.duration !== b.duration) return false;
  if (a.scenes?.length !== b.scenes?.length) return false;
  if (a.assets?.length !== b.assets?.length) return false;

  const aNorm = { ...a, updatedAt: undefined };
  const bNorm = { ...b, updatedAt: undefined };
  return JSON.stringify(aNorm) === JSON.stringify(bNorm);
}

/**
 * High-level manager coordinating debounced saves, concurrency queuing,
 * recovery snapshots, and sync state tracking.
 */
export class AutosaveManager {
  private readonly repository: IProjectRepository;
  private readonly debounceMs: number;
  private readonly maxWaitMs: number;

  private currentProject: Project | null = null;
  private lastSavedProject: Project | null = null;

  private state: AutosaveState = "saved";
  private lastSavedAt: string | null = null;
  private lastError: StorageError | null = null;
  private saveCount = 0;

  private debounceTimer: NodeJS.Timeout | null = null;
  private maxWaitTimer: NodeJS.Timeout | null = null;
  private isSaveInFlight = false;
  private queuedProjectToSave: Project | null = null;

  private readonly subscribers: Set<AutosaveSubscriber> = new Set();

  constructor(options?: AutosaveOptions) {
    this.repository = options?.repository ?? getProjectRepository();
    this.debounceMs = options?.debounceMs ?? 1000;
    this.maxWaitMs = options?.maxWaitMs ?? 10000;

    if (options?.onStatusChange) {
      this.subscribers.add(options.onStatusChange);
    }
  }

  /**
   * Initializes or loads the active project into the autosave manager.
   * Resets status to "saved" representing baseline synchronization.
   */
  loadProject(project: Project): void {
    this.clearTimers();
    this.currentProject = cloneProject(project);
    this.lastSavedProject = cloneProject(project);
    this.state = "saved";
    this.lastSavedAt = project.updatedAt || new Date().toISOString();
    this.lastError = null;
    this.queuedProjectToSave = null;
    this.notifySubscribers();
  }

  /**
   * Subscribes to status changes (saved, unsaved, saving, error).
   * Returns an unsubscribe function.
   */
  subscribe(subscriber: AutosaveSubscriber): () => void {
    this.subscribers.add(subscriber);
    subscriber(this.getStatus());
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  /**
   * Returns the current autosave status snapshot.
   */
  getStatus(): AutosaveStatus {
    return {
      state: this.state,
      lastSavedAt: this.lastSavedAt,
      lastError: this.lastError,
      hasUnsavedChanges: this.hasPendingChanges(),
      saveCount: this.saveCount,
    };
  }

  /**
   * Checks whether the in-memory project differs from the last saved project.
   */
  hasPendingChanges(): boolean {
    if (!this.currentProject || !this.lastSavedProject) {
      return false;
    }
    return this.state === "unsaved" || this.state === "saving" || this.state === "error";
  }

  /**
   * Returns the latest in-memory project (including unpersisted edits).
   */
  getLatestProject(): Project | null {
    return this.currentProject ? cloneProject(this.currentProject) : null;
  }

  /**
   * Returns the last successfully persisted project state.
   */
  getLastSavedProject(): Project | null {
    return this.lastSavedProject ? cloneProject(this.lastSavedProject) : null;
  }

  /**
   * Rolls back the in-memory project to the last successfully persisted checkpoint.
   */
  rollbackToLastSaved(): Project | null {
    if (!this.lastSavedProject) {
      return null;
    }

    this.clearTimers();
    this.currentProject = cloneProject(this.lastSavedProject);
    this.queuedProjectToSave = null;
    this.state = "saved";
    this.lastError = null;
    this.notifySubscribers();
    return cloneProject(this.currentProject);
  }

  /**
   * Notifies the manager that the project has been modified.
   * Updates in-memory project immediately and schedules a debounced persistent save.
   * Avoids excessive writes by ignoring changes that are content-equal to last saved state.
   */
  notifyChange(updatedProject: Project): void {
    // If the project content hasn't actually changed from last saved state, do not write
    if (this.lastSavedProject && isProjectContentEqual(updatedProject, this.lastSavedProject)) {
      this.currentProject = cloneProject(updatedProject);
      if (this.state === "unsaved") {
        this.state = "saved";
        this.clearTimers();
        this.notifySubscribers();
      }
      return;
    }

    this.currentProject = cloneProject(updatedProject);

    if (this.state !== "saving") {
      this.state = "unsaved";
    }

    this.notifySubscribers();

    // Schedule debounced save
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      if (this.maxWaitTimer) {
        clearTimeout(this.maxWaitTimer);
        this.maxWaitTimer = null;
      }
      void this.executeSave();
    }, this.debounceMs);

    // Schedule max-wait timer to ensure continuous edits eventually flush
    if (!this.maxWaitTimer && this.maxWaitMs > 0) {
      this.maxWaitTimer = setTimeout(() => {
        this.maxWaitTimer = null;
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
          this.debounceTimer = null;
        }
        void this.executeSave();
      }, this.maxWaitMs);
    }
  }

  /**
   * Immediately flushes any pending changes to storage.
   * Cancels debounce timers and ensures serialization safety.
   */
  async saveNow(): Promise<StorageResult<Project>> {
    this.clearTimers();

    if (!this.currentProject) {
      return storageFailure("OPERATION_FAILED", "No active project loaded in AutosaveManager.");
    }

    return await this.executeSave();
  }

  /**
   * Internal save execution pipeline with concurrency queueing.
   */
  private async executeSave(): Promise<StorageResult<Project>> {
    if (!this.currentProject) {
      return storageFailure("OPERATION_FAILED", "No project to save.");
    }

    // Concurrency guard: If a save is already in-flight, queue this project to save next
    if (this.isSaveInFlight) {
      this.queuedProjectToSave = cloneProject(this.currentProject);
      return storageSuccess(this.currentProject);
    }

    const projectToPersist = cloneProject(this.currentProject);

    // Pre-validate before writing
    const validation = validateProjectDeep(projectToPersist);
    if (!validation.valid) {
      this.state = "error";
      this.lastError = {
        code: "VALIDATION_FAILED",
        message: "Autosave rejected: in-memory project failed deep validation.",
        details: formatValidationErrors(validation.errors),
      };
      this.notifySubscribers();
      return storageFailure(this.lastError.code, this.lastError.message, this.lastError.details);
    }

    this.isSaveInFlight = true;
    this.state = "saving";
    this.notifySubscribers();

    try {
      let result: StorageResult<Project>;
      if (typeof this.repository.saveProject === "function") {
        result = await this.repository.saveProject(projectToPersist);
      } else {
        result = await this.repository.updateProject(projectToPersist.id, projectToPersist);
      }

      if (result.success) {
        this.lastSavedProject = cloneProject(result.data);
        this.lastSavedAt = result.data.updatedAt;
        this.lastError = null;
        this.saveCount += 1;

        // If changes were made while this save was in flight, check if queued differs from newly saved
        if (this.queuedProjectToSave) {
          if (isProjectContentEqual(this.queuedProjectToSave, this.lastSavedProject)) {
            this.queuedProjectToSave = null;
            this.state = "saved";
          } else {
            this.state = "unsaved";
          }
        } else {
          this.state = "saved";
        }

        this.notifySubscribers();

        // Process queued changes if any accumulated during save
        if (this.queuedProjectToSave) {
          const nextToSave = this.queuedProjectToSave;
          this.queuedProjectToSave = null;
          this.currentProject = nextToSave;
          this.isSaveInFlight = false;
          return await this.executeSave();
        }

        this.isSaveInFlight = false;
        return result;
      } else {
        // Save failed: Preserve in-memory project! Do NOT discard user data.
        this.state = "error";
        this.lastError = result.error;
        this.notifySubscribers();
        this.isSaveInFlight = false;
        return result;
      }
    } catch (err) {
      this.state = "error";
      this.lastError = {
        code: "OPERATION_FAILED",
        message: "Unexpected error during project autosave execution.",
        originalError: err instanceof Error ? { name: err.name, message: err.message } : err,
      };
      this.notifySubscribers();
      this.isSaveInFlight = false;
      return storageFailure(this.lastError.code, this.lastError.message, undefined, err);
    }
  }

  /**
   * Cleans up timers and active state.
   */
  dispose(): void {
    this.clearTimers();
    this.subscribers.clear();
    this.currentProject = null;
    this.lastSavedProject = null;
    this.queuedProjectToSave = null;
    this.isSaveInFlight = false;
  }

  private clearTimers(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }
  }

  private notifySubscribers(): void {
    const status = this.getStatus();
    for (const subscriber of this.subscribers) {
      try {
        subscriber(status);
      } catch (err) {
        console.error("AutosaveManager subscriber callback error:", err);
      }
    }
  }
}

/**
 * Factory for creating custom AutosaveManager instances.
 */
export function createAutosaveManager(options?: AutosaveOptions): AutosaveManager {
  return new AutosaveManager(options);
}
