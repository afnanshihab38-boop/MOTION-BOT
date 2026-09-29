/**
 * MOTION-BOT — Project-Scoped Memory Types
 * Phase 7.6: Context Manager + Project-Scoped Memory
 *
 * Defines domain entities, metadata, categories, priorities, and input/output
 * specifications for project-isolated memories.
 */

export type MemoryCategory =
  | "brand"
  | "visual_style"
  | "animation_style"
  | "typography"
  | "requirement"
  | "creative_decision"
  | "constraint"
  | "asset_preference"
  | "general";

export type MemoryPriority = "low" | "medium" | "high" | "critical";

export type MemorySource = "user" | "ai_approved" | "project_setting" | "system";

/**
 * Concrete Project Memory record.
 * Must always be associated with a specific projectId to enforce total tenant isolation.
 */
export interface ProjectMemory {
  id: string;
  projectId: string;
  content: string;
  category: MemoryCategory;
  tags: string[];
  priority: MemoryPriority;
  pinned: boolean;
  source: MemorySource;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  metadata?: Record<string, unknown>;
}

export interface CreateMemoryInput {
  projectId: string;
  content: string;
  category?: MemoryCategory;
  tags?: string[];
  priority?: MemoryPriority;
  pinned?: boolean;
  source?: MemorySource;
  metadata?: Record<string, unknown>;
}

export interface UpdateMemoryInput {
  content?: string;
  category?: MemoryCategory;
  tags?: string[];
  priority?: MemoryPriority;
  pinned?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ListMemoriesOptions {
  category?: MemoryCategory;
  tags?: string[];
  pinnedOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface RelevanceOptions {
  limit?: number; // Max memories to return (default: 5)
  minScore?: number; // Minimum relevance score threshold (0.0 to 1.0, default: 0.15)
  includePinned?: boolean; // Always include pinned memories (default: true)
  categoryFilter?: MemoryCategory[];
}

export interface ScoredMemory {
  memory: ProjectMemory;
  score: number;
  matchReasons: string[];
}
