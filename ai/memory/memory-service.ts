/**
 * MOTION-BOT — Project Memory Management Service
 * Phase 7.6: Context Manager + Project-Scoped Memory
 *
 * Exposes high-level validated operations for creating, reading, updating,
 * deleting, and ranking project-scoped memories with zero cross-tenant contamination.
 */

import {
  ProjectMemory,
  CreateMemoryInput,
  UpdateMemoryInput,
  ListMemoriesOptions,
  RelevanceOptions,
  MemoryCategory,
  MemoryPriority,
} from "./types";
import { ProjectMemoryStore, getProjectMemoryStore } from "./memory-store";
import { rankMemories } from "./relevance-engine";

const VALID_CATEGORIES: Set<MemoryCategory> = new Set([
  "brand",
  "visual_style",
  "animation_style",
  "typography",
  "requirement",
  "creative_decision",
  "constraint",
  "asset_preference",
  "general",
]);

const VALID_PRIORITIES: Set<MemoryPriority> = new Set([
  "low",
  "medium",
  "high",
  "critical",
]);

export class ProjectMemoryService {
  private readonly store: ProjectMemoryStore;

  constructor(store?: ProjectMemoryStore) {
    this.store = store || getProjectMemoryStore();
  }

  /**
   * Generates a deterministic unique ID for memory entries.
   */
  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Creates a new memory record strictly bound to a project.
   */
  public async createMemory(input: CreateMemoryInput): Promise<ProjectMemory> {
    if (!input || typeof input !== "object") {
      throw new Error("Memory input must be a valid object.");
    }

    const projectId = (input.projectId || "").trim();
    if (!projectId) {
      throw new Error("Cannot create memory: 'projectId' is required.");
    }

    const content = (input.content || "").trim();
    if (!content) {
      throw new Error("Cannot create memory: 'content' must not be empty.");
    }

    if (content.length > 2000) {
      throw new Error("Memory content exceeds maximum limit of 2000 characters.");
    }

    const category = input.category && VALID_CATEGORIES.has(input.category)
      ? input.category
      : "general";

    const priority = input.priority && VALID_PRIORITIES.has(input.priority)
      ? input.priority
      : "medium";

    const now = new Date().toISOString();

    const record: ProjectMemory = {
      id: this.generateId(),
      projectId,
      content,
      category,
      tags: Array.isArray(input.tags)
        ? Array.from(new Set(input.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean)))
        : [],
      priority,
      pinned: Boolean(input.pinned),
      source: input.source || "user",
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ? { ...input.metadata } : undefined,
    };

    await this.store.save(record);
    return record;
  }

  /**
   * Retrieves a single memory by ID, strictly enforcing project isolation.
   */
  public async getMemory(id: string, projectId: string): Promise<ProjectMemory | null> {
    if (!id || !projectId) return null;
    return this.store.findById(id.trim(), projectId.trim());
  }

  /**
   * Updates an existing memory record, preserving project scoping.
   */
  public async updateMemory(
    id: string,
    projectId: string,
    updates: UpdateMemoryInput
  ): Promise<ProjectMemory> {
    const trimmedId = (id || "").trim();
    const trimmedProjectId = (projectId || "").trim();

    if (!trimmedId || !trimmedProjectId) {
      throw new Error("Both 'id' and 'projectId' are required to update a memory.");
    }

    const existing = await this.store.findById(trimmedId, trimmedProjectId);
    if (!existing) {
      throw new Error(`Memory '${trimmedId}' not found for project '${trimmedProjectId}'.`);
    }

    if (updates.content !== undefined) {
      const content = updates.content.trim();
      if (!content) {
        throw new Error("Memory content cannot be empty.");
      }
      if (content.length > 2000) {
        throw new Error("Memory content exceeds maximum limit of 2000 characters.");
      }
      existing.content = content;
    }

    if (updates.category && VALID_CATEGORIES.has(updates.category)) {
      existing.category = updates.category;
    }

    if (updates.priority && VALID_PRIORITIES.has(updates.priority)) {
      existing.priority = updates.priority;
    }

    if (updates.pinned !== undefined) {
      existing.pinned = Boolean(updates.pinned);
    }

    if (Array.isArray(updates.tags)) {
      existing.tags = Array.from(
        new Set(updates.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))
      );
    }

    if (updates.metadata) {
      existing.metadata = {
        ...existing.metadata,
        ...updates.metadata,
      };
    }

    existing.updatedAt = new Date().toISOString();

    await this.store.save(existing);
    return existing;
  }

  /**
   * Deletes a memory record. Returns true if removed, false otherwise.
   */
  public async deleteMemory(id: string, projectId: string): Promise<boolean> {
    const trimmedId = (id || "").trim();
    const trimmedProjectId = (projectId || "").trim();
    if (!trimmedId || !trimmedProjectId) return false;

    return this.store.delete(trimmedId, trimmedProjectId);
  }

  /**
   * Lists all memories for a project with optional filtering and pagination.
   */
  public async listMemories(
    projectId: string,
    options?: ListMemoriesOptions
  ): Promise<ProjectMemory[]> {
    const trimmedProjectId = (projectId || "").trim();
    if (!trimmedProjectId) return [];

    let memories = await this.store.findByProject(trimmedProjectId);

    if (options?.category) {
      memories = memories.filter((m) => m.category === options.category);
    }

    if (options?.pinnedOnly) {
      memories = memories.filter((m) => m.pinned);
    }

    if (options?.tags && options.tags.length > 0) {
      const filterTags = new Set(options.tags.map((t) => t.toLowerCase()));
      memories = memories.filter((m) => m.tags.some((t) => filterTags.has(t)));
    }

    // Sort by updated timestamp descending
    memories.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });

    const offset = Math.max(0, options?.offset ?? 0);
    const limit = options?.limit ? Math.max(1, options.limit) : memories.length;

    return memories.slice(offset, offset + limit);
  }

  /**
   * Retrieves relevant memories for a user query or task intent,
   * applying deterministic ranking and conflict resolution.
   */
  public async getRelevantMemories(
    projectId: string,
    query: string,
    options?: RelevanceOptions
  ): Promise<ProjectMemory[]> {
    const trimmedProjectId = (projectId || "").trim();
    if (!trimmedProjectId) return [];

    const allProjectMemories = await this.store.findByProject(trimmedProjectId);
    if (allProjectMemories.length === 0) return [];

    return rankMemories(allProjectMemories, query, options);
  }

  /**
   * Wipes all memories belonging to a single project.
   */
  public async clearProjectMemories(projectId: string): Promise<void> {
    const trimmedProjectId = (projectId || "").trim();
    if (!trimmedProjectId) return;
    await this.store.clearProject(trimmedProjectId);
  }
}

// Global default memory service singleton
let defaultMemoryServiceInstance: ProjectMemoryService | null = null;

export function getProjectMemoryService(): ProjectMemoryService {
  if (!defaultMemoryServiceInstance) {
    defaultMemoryServiceInstance = new ProjectMemoryService();
  }
  return defaultMemoryServiceInstance;
}
