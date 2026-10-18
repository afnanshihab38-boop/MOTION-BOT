/**
 * MOTION-BOT — Application-Level Project Repository
 * Domain repository orchestrating project lifecycle, entity creation, cloning/duplication,
 * validation enforcement, and storage coordination.
 * Part of Phase 4.3: Application-Level Storage Operations.
 */

import { Project, ProjectId } from "@/types/project";
import {
  IStorageService,
  ProjectListResult,
  ProjectQueryOptions,
  StorageResult,
} from "@/types/storage";
import {
  createProject as createProjectModel,
  CreateProjectInput,
  generateProjectId,
} from "@/services/project/project-model";
import { cloneScene } from "@/services/project/scene-model";
import { cloneProject } from "@/services/project/project-serializer";
import { validateProjectDeep, formatValidationErrors } from "@/services/project/project-validator";
import { getStorageService } from "./storage-service";
import { storageFailure, storageSuccess } from "./storage-error";

/**
 * Contract for application-level project operations.
 */
export interface IProjectRepository {
  createProject(input?: CreateProjectInput | Project): Promise<StorageResult<Project>>;
  getProject(id: ProjectId): Promise<StorageResult<Project>>;
  saveProject?(project: Project): Promise<StorageResult<Project>>;
  updateProject(id: ProjectId, updates: Partial<Project>): Promise<StorageResult<Project>>;
  deleteProject(id: ProjectId): Promise<StorageResult<void>>;
  listProjects(options?: ProjectQueryOptions): Promise<StorageResult<ProjectListResult>>;
  hasProject(id: ProjectId): Promise<StorageResult<boolean>>;
  duplicateProject(id: ProjectId, newName?: string): Promise<StorageResult<Project>>;
}

/**
 * Application Project Repository.
 * Sits directly between UI/editor layers and the StorageService layer.
 */
export class ProjectRepository implements IProjectRepository {
  private readonly storage: IStorageService;

  constructor(storageService?: IStorageService) {
    this.storage = storageService ?? getStorageService();
  }

  /**
   * Creates a new project in the repository.
   * Accepts either an existing Project object or CreateProjectInput configuration.
   * Guarantees unique ID, valid schema, and timestamps before persistence.
   */
  async createProject(input?: CreateProjectInput | Project): Promise<StorageResult<Project>> {
    let project: Project;

    if (input && "schemaVersion" in input && "scenes" in input) {
      // Input is already a full Project instance
      project = cloneProject(input);
    } else {
      // Input is CreateProjectInput or empty
      project = createProjectModel(input as CreateProjectInput | undefined);
    }

    // Ensure valid timestamps
    const now = new Date().toISOString();
    if (!project.createdAt) project.createdAt = now;
    if (!project.updatedAt) project.updatedAt = now;

    // Validate project deep before attempting persistence
    const validation = validateProjectDeep(project);
    if (!validation.valid) {
      return storageFailure(
        "VALIDATION_FAILED",
        "Cannot create project: validation failed.",
        formatValidationErrors(validation.errors)
      );
    }

    return await this.storage.createProject(project);
  }

  /**
   * Retrieves an existing project by ID.
   */
  async getProject(id: ProjectId): Promise<StorageResult<Project>> {
    if (!id || typeof id !== "string" || id.trim() === "") {
      return storageFailure("NOT_FOUND", "Project ID must be a non-empty string.");
    }

    return await this.storage.loadProject(id);
  }

  /**
   * Saves or upserts a project in storage with deep validation.
   */
  async saveProject(project: Project): Promise<StorageResult<Project>> {
    return await this.storage.saveProject(project);
  }

  /**
   * Partially updates an existing project.
   * Protects the immutable project ID and auto-updates the updatedAt timestamp.
   * If the project is not found but complete project data is provided, safely upserts it.
   */
  async updateProject(id: ProjectId, updates: Partial<Project>): Promise<StorageResult<Project>> {
    if (!id || typeof id !== "string" || id.trim() === "") {
      return storageFailure("NOT_FOUND", "Project ID must be a non-empty string.");
    }

    const sanitizedUpdates = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    delete (sanitizedUpdates as { id?: string }).id;

    const result = await this.storage.updateProject(id, sanitizedUpdates);
    if (
      !result.success &&
      result.error.code === "NOT_FOUND" &&
      (updates as any).schemaVersion &&
      Array.isArray((updates as any).scenes)
    ) {
      return await this.storage.saveProject({
        ...(updates as Project),
        id,
        updatedAt: sanitizedUpdates.updatedAt,
      });
    }

    return result;
  }

  /**
   * Deletes a project by ID from storage.
   */
  async deleteProject(id: ProjectId): Promise<StorageResult<void>> {
    if (!id || typeof id !== "string" || id.trim() === "") {
      return storageFailure("NOT_FOUND", "Project ID must be a non-empty string.");
    }

    return await this.storage.deleteProject(id);
  }

  /**
   * Lists project summaries with optional filtering, search, and pagination.
   */
  async listProjects(options?: ProjectQueryOptions): Promise<StorageResult<ProjectListResult>> {
    return await this.storage.listProjects(options);
  }

  /**
   * Checks whether a project with the given ID exists.
   */
  async hasProject(id: ProjectId): Promise<StorageResult<boolean>> {
    return await this.storage.hasProject(id);
  }

  /**
   * Duplicates an existing project.
   * Generates a new unique project ID, assigns the new name (or "${original.name} (Copy)"),
   * refreshes timestamps, and regenerates IDs for all scenes and elements.
   */
  async duplicateProject(id: ProjectId, newName?: string): Promise<StorageResult<Project>> {
    const existingResult = await this.getProject(id);
    if (!existingResult.success) {
      return existingResult;
    }

    const source = existingResult.data;
    const newProjectId = generateProjectId();
    const now = new Date().toISOString();
    const resolvedName = newName ?? `${source.name} (Copy)`;

    // Clone scenes with regenerated unique IDs
    const clonedScenes = source.scenes.map((scene, sceneIndex) => {
      const newSceneId = `scene_${sceneIndex + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const sceneClone = cloneScene(scene);
      sceneClone.id = newSceneId;

      // Regenerate element IDs inside the scene
      sceneClone.elements = sceneClone.elements.map((el, elIndex) => {
        const newElId = `el_${elIndex + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        return {
          ...el,
          id: newElId,
          // Re-link animations if any
          animations: el.animations.map((anim, animIndex) => {
            const baseAnim = {
              ...anim,
              id: `anim_${animIndex + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              targetElementId: newElId,
            };

            if ("keyframes" in anim && Array.isArray((anim as { keyframes: unknown[] }).keyframes)) {
              return {
                ...baseAnim,
                keyframes: (anim as { keyframes: { id: string }[] }).keyframes.map((kf, kfIndex) => ({
                  ...kf,
                  id: `kf_${kfIndex + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                })),
              };
            }

            return baseAnim;
          }),
        };
      });

      return sceneClone;
    });

    const duplicatedProject: Project = {
      ...cloneProject(source),
      id: newProjectId,
      name: resolvedName,
      scenes: clonedScenes,
      metadata: {
        ...source.metadata,
        title: resolvedName,
      },
      createdAt: now,
      updatedAt: now,
    };

    // Validate the duplicated project before saving
    const validation = validateProjectDeep(duplicatedProject);
    if (!validation.valid) {
      return storageFailure(
        "VALIDATION_FAILED",
        "Duplicated project failed deep validation.",
        formatValidationErrors(validation.errors)
      );
    }

    return await this.storage.createProject(duplicatedProject);
  }
}

/**
 * Factory for creating custom ProjectRepository instances.
 */
export function createProjectRepository(storageService?: IStorageService): ProjectRepository {
  return new ProjectRepository(storageService);
}

/**
 * Default global singleton instance of ProjectRepository.
 */
let defaultProjectRepositoryInstance: ProjectRepository | null = null;

export function getProjectRepository(): ProjectRepository {
  if (!defaultProjectRepositoryInstance) {
    defaultProjectRepositoryInstance = new ProjectRepository();
  }
  return defaultProjectRepositoryInstance;
}
