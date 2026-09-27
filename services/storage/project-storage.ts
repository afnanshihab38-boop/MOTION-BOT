/**
 * MOTION-BOT — Project Storage Helpers & Abstraction Utilities
 * Functions for project metadata extraction, summary generation, and query filtering.
 * Part of Phase 4.1: Storage Architecture & Abstraction.
 */

import { Project } from "@/types/project";
import { ProjectListResult, ProjectQueryOptions, ProjectSummary } from "@/types/storage";

/**
 * Extracts a lightweight ProjectSummary from a full Project model.
 * Computes scene, element, and asset counts without retaining full data graphs.
 */
export function extractProjectSummary(project: Project): ProjectSummary {
  const scenesCount = Array.isArray(project.scenes) ? project.scenes.length : 0;
  const elementsCount = Array.isArray(project.scenes)
    ? project.scenes.reduce((sum, s) => sum + (Array.isArray(s.elements) ? s.elements.length : 0), 0)
    : 0;
  const assetsCount = Array.isArray(project.assets) ? project.assets.length : 0;

  return {
    id: project.id,
    name: project.name,
    schemaVersion: project.schemaVersion,
    width: project.width,
    height: project.height,
    fps: project.fps,
    duration: project.duration,
    scenesCount,
    elementsCount,
    assetsCount,
    metadata: { ...project.metadata },
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

/**
 * Filters, sorts, and paginates a list of ProjectSummary items in memory.
 * Can be used by in-memory adapters and as a reference fallback for local storage drivers.
 */
export function filterAndSortSummaries(
  summaries: ProjectSummary[],
  options?: ProjectQueryOptions
): ProjectListResult {
  let filtered = [...summaries];

  // Text search query matching name, metadata title, description, or tags
  if (options?.searchQuery && options.searchQuery.trim().length > 0) {
    const q = options.searchQuery.trim().toLowerCase();
    filtered = filtered.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchTitle = typeof p.metadata.title === "string" && p.metadata.title.toLowerCase().includes(q);
      const matchDesc = typeof p.metadata.description === "string" && p.metadata.description.toLowerCase().includes(q);
      const matchTags = Array.isArray(p.metadata.tags) && p.metadata.tags.some((t) => t.toLowerCase().includes(q));
      return matchName || matchTitle || matchDesc || matchTags;
    });
  }

  // Tag filter matching any specified tag
  if (options?.tags && options.tags.length > 0) {
    const requiredTags = options.tags.map((t) => t.toLowerCase());
    filtered = filtered.filter((p) => {
      if (!Array.isArray(p.metadata.tags)) return false;
      const projectTags = p.metadata.tags.map((t) => t.toLowerCase());
      return requiredTags.some((tag) => projectTags.includes(tag));
    });
  }

  // Sort
  const sortBy = options?.sortBy ?? "updatedAt";
  const direction = options?.sortDirection ?? "desc";
  const multiplier = direction === "asc" ? 1 : -1;

  filtered.sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name) * multiplier;
    }
    if (sortBy === "createdAt") {
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      return (timeA - timeB) * multiplier;
    }
    // Default to updatedAt
    const timeA = new Date(a.updatedAt).getTime() || 0;
    const timeB = new Date(b.updatedAt).getTime() || 0;
    return (timeA - timeB) * multiplier;
  });

  const total = filtered.length;
  const offset = typeof options?.offset === "number" && options.offset >= 0 ? options.offset : 0;
  const limit = typeof options?.limit === "number" && options.limit > 0 ? options.limit : undefined;

  const paginated = limit !== undefined ? filtered.slice(offset, offset + limit) : filtered.slice(offset);

  return {
    projects: paginated,
    total,
    limit,
    offset,
  };
}
