/**
 * MOTION-BOT — Project Memory Store
 * Phase 7.6: Context Manager + Project-Scoped Memory
 *
 * Implements strict tenant-isolated project memory storage.
 * Enforces that no project can ever read, mutate, or query another project's memory.
 */

import { ProjectMemory } from "./types";

export interface ProjectMemoryStore {
  save(memory: ProjectMemory): Promise<void>;
  findById(id: string, projectId: string): Promise<ProjectMemory | null>;
  findByProject(projectId: string): Promise<ProjectMemory[]>;
  delete(id: string, projectId: string): Promise<boolean>;
  clearProject(projectId: string): Promise<void>;
  count(projectId: string): Promise<number>;
}

/**
 * In-Memory isolated project memory repository.
 * Keeps project buckets strictly partitioned by Project ID.
 */
export class InMemoryProjectMemoryStore implements ProjectMemoryStore {
  // Map of ProjectId -> (Map of MemoryId -> ProjectMemory)
  private readonly projectBuckets = new Map<string, Map<string, ProjectMemory>>();

  /**
   * Deep clones a memory to preserve immutability.
   */
  private clone(memory: ProjectMemory): ProjectMemory {
    return JSON.parse(JSON.stringify(memory));
  }

  public async save(memory: ProjectMemory): Promise<void> {
    if (!memory.projectId) {
      throw new Error("Cannot save memory without a valid projectId.");
    }
    if (!memory.id) {
      throw new Error("Cannot save memory without a valid id.");
    }

    let bucket = this.projectBuckets.get(memory.projectId);
    if (!bucket) {
      bucket = new Map();
      this.projectBuckets.set(memory.projectId, bucket);
    }

    bucket.set(memory.id, this.clone(memory));
  }

  public async findById(id: string, projectId: string): Promise<ProjectMemory | null> {
    if (!projectId || !id) return null;

    const bucket = this.projectBuckets.get(projectId);
    if (!bucket) return null;

    const record = bucket.get(id);
    return record ? this.clone(record) : null;
  }

  public async findByProject(projectId: string): Promise<ProjectMemory[]> {
    if (!projectId) return [];

    const bucket = this.projectBuckets.get(projectId);
    if (!bucket) return [];

    return Array.from(bucket.values()).map((m) => this.clone(m));
  }

  public async delete(id: string, projectId: string): Promise<boolean> {
    if (!projectId || !id) return false;

    const bucket = this.projectBuckets.get(projectId);
    if (!bucket) return false;

    return bucket.delete(id);
  }

  public async clearProject(projectId: string): Promise<void> {
    if (!projectId) return;
    this.projectBuckets.delete(projectId);
  }

  public async count(projectId: string): Promise<number> {
    const bucket = this.projectBuckets.get(projectId);
    return bucket ? bucket.size : 0;
  }

  /**
   * Clears all buckets (primarily used for test suite isolation).
   */
  public clearAll(): void {
    this.projectBuckets.clear();
  }
}

// Global default memory store instance
let defaultMemoryStoreInstance: ProjectMemoryStore | null = null;

export function getProjectMemoryStore(): ProjectMemoryStore {
  if (!defaultMemoryStoreInstance) {
    defaultMemoryStoreInstance = new InMemoryProjectMemoryStore();
  }
  return defaultMemoryStoreInstance;
}
