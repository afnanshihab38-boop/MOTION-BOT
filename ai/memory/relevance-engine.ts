/**
 * MOTION-BOT — Memory Relevance & Conflict Resolution Engine
 * Phase 7.6: Context Manager + Project-Scoped Memory
 *
 * Deterministic semantic scoring, keyword matching, priority weighting,
 * and conflict resolution for project memories.
 */

import {
  ProjectMemory,
  MemoryCategory,
  RelevanceOptions,
  ScoredMemory,
} from "./types";

// Standard English stop words to filter out for keyword matching
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
  "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
  "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
  "hasn't", "have", "haven't", "having", "he", "her", "here", "hers", "herself",
  "him", "himself", "his", "how", "i", "if", "in", "into", "is", "isn't", "it",
  "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no",
  "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our",
  "ours", "ourselves", "out", "over", "own", "same", "she", "should", "shouldn't",
  "so", "some", "such", "than", "that", "the", "their", "theirs", "them",
  "themselves", "then", "there", "these", "they", "this", "those", "through", "to",
  "too", "under", "until", "up", "very", "was", "wasn't", "we", "were", "weren't",
  "what", "when", "where", "which", "while", "who", "whom", "why", "with", "won't",
  "would", "wouldn't", "you", "your", "yours", "yourself", "yourselves",
]);

// Topic keywords mapped to memory categories
const CATEGORY_KEYWORDS: Record<MemoryCategory, string[]> = {
  brand: ["brand", "logo", "color", "palette", "guideline", "identity", "trademark", "hex", "rgb", "tone"],
  visual_style: ["style", "aesthetic", "dark", "light", "minimal", "glassmorphism", "neon", "gradient", "look", "feel", "visual", "vibe"],
  animation_style: ["animation", "motion", "ease", "easing", "bounce", "spring", "speed", "snappy", "smooth", "transition", "kinetic", "dynamic"],
  typography: ["font", "typography", "typeface", "text", "heading", "sans", "serif", "inter", "roboto", "weight", "bold", "italic", "lettering"],
  requirement: ["require", "requirement", "must", "format", "resolution", "duration", "seconds", "platform", "instagram", "tiktok", "youtube", "aspect", "ratio"],
  creative_decision: ["decision", "approved", "chosen", "concept", "selected", "tagline", "slogan", "hook", "cta"],
  constraint: ["constraint", "avoid", "never", "limit", "do not", "don't", "forbidden", "prohibited", "max", "without"],
  asset_preference: ["asset", "image", "audio", "music", "video", "footage", "graphic", "illustration", "icon", "sfx"],
  general: ["note", "project", "info", "preference"],
};

/**
 * Tokenizes a string into normalized, unique keywords with stop words removed.
 */
export function extractKeywords(text: string): string[] {
  if (!text || typeof text !== "string") return [];

  const rawTokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);

  const filtered = rawTokens.filter((t) => !STOP_WORDS.has(t));
  return Array.from(new Set(filtered));
}

/**
 * Calculates a deterministic relevance score for a memory against a query string.
 */
export function scoreMemory(memory: ProjectMemory, query: string): ScoredMemory {
  const queryTokens = extractKeywords(query);
  const memoryTokens = extractKeywords(`${memory.content} ${memory.tags.join(" ")}`);
  const matchReasons: string[] = [];

  let score = 0.0;

  // 1. Pinned Boost
  if (memory.pinned) {
    score += 0.45;
    matchReasons.push("pinned");
  }

  // 2. Priority Weight
  switch (memory.priority) {
    case "critical":
      score += 0.35;
      matchReasons.push("critical-priority");
      break;
    case "high":
      score += 0.2;
      matchReasons.push("high-priority");
      break;
    case "medium":
      score += 0.1;
      break;
    case "low":
    default:
      break;
  }

  // 3. Direct Keyword Overlap
  if (queryTokens.length > 0 && memoryTokens.length > 0) {
    const memorySet = new Set(memoryTokens);
    let matchedCount = 0;

    for (const qToken of queryTokens) {
      if (memorySet.has(qToken)) {
        matchedCount++;
        matchReasons.push(`keyword:${qToken}`);
      } else {
        // Partial substring match for technical tokens (e.g. 'animat' in 'animation')
        for (const mToken of memoryTokens) {
          if (mToken.includes(qToken) || qToken.includes(mToken)) {
            matchedCount += 0.5;
            matchReasons.push(`partial:${qToken}~${mToken}`);
            break;
          }
        }
      }
    }

    const keywordRatio = matchedCount / Math.max(queryTokens.length, 1);
    score += Math.min(keywordRatio * 0.6, 0.6);
  }

  // 4. Category Semantic Relevance
  const categoryTerms = CATEGORY_KEYWORDS[memory.category] || [];
  for (const qToken of queryTokens) {
    if (categoryTerms.includes(qToken)) {
      score += 0.25;
      matchReasons.push(`category-intent:${memory.category}`);
      break;
    }
  }

  // 5. Source Trust
  if (memory.source === "project_setting" || memory.source === "ai_approved") {
    score += 0.1;
  }

  // Clamp score between 0.0 and 1.0
  const normalizedScore = Math.max(0.0, Math.min(1.0, Number(score.toFixed(3))));

  return {
    memory,
    score: normalizedScore,
    matchReasons: Array.from(new Set(matchReasons)),
  };
}

/**
 * Resolves conflicting or contradictory memories deterministically.
 * Rule: When two memories target identical category and narrow subject,
 * the newer updated timestamp or higher priority takes precedence.
 */
export function resolveMemoryConflicts(memories: ProjectMemory[]): ProjectMemory[] {
  if (memories.length <= 1) return memories;

  const result: ProjectMemory[] = [];
  const categoryMap = new Map<string, ProjectMemory>();

  // Sort memories primarily by priority weight, then by recency (newest first)
  const priorityRank: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  const sorted = [...memories].sort((a, b) => {
    const pDiff = (priorityRank[b.priority] || 1) - (priorityRank[a.priority] || 1);
    if (pDiff !== 0) return pDiff;

    const timeA = new Date(a.updatedAt || a.createdAt).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt).getTime();
    return timeB - timeA;
  });

  for (const mem of sorted) {
    // Determine subject key (e.g. brand:primary_color or category + specific tag)
    const primaryTag = mem.tags[0] ? `:${mem.tags[0].toLowerCase()}` : "";
    const subjectKey = `${mem.category}${primaryTag}`;

    if (!categoryMap.has(subjectKey)) {
      categoryMap.set(subjectKey, mem);
      result.push(mem);
    } else {
      // Conflicting entry detected — the sorted order already picked the superior one.
      // If the existing one has different core content, we allow non-overlapping entries
      const existing = categoryMap.get(subjectKey)!;
      const existingKeywords = new Set(extractKeywords(existing.content));
      const currentKeywords = extractKeywords(mem.content);

      // Measure overlap: if memories share key topics (>= 2 overlapping keywords or >= 35% overlap),
      // it is a revision/contradiction -> suppress the older/lower-priority memory.
      const overlap = currentKeywords.filter((k) => existingKeywords.has(k)).length;
      const overlapRatio = currentKeywords.length > 0 ? overlap / currentKeywords.length : 0;

      if (overlap < 2 && overlapRatio < 0.35) {
        // Distinct requirement within the same category
        result.push(mem);
      }
    }
  }

  return result;
}

/**
 * Ranks and filters project memories based on relevance options.
 */
export function rankMemories(
  memories: ProjectMemory[],
  query: string,
  options?: RelevanceOptions
): ProjectMemory[] {
  const limit = options?.limit ?? 5;
  const minScore = options?.minScore ?? 0.15;
  const includePinned = options?.includePinned ?? true;
  const categoryFilter = options?.categoryFilter;

  // Filter by category if requested
  let pool = memories;
  if (categoryFilter && categoryFilter.length > 0) {
    const filterSet = new Set(categoryFilter);
    pool = pool.filter((m) => filterSet.has(m.category));
  }

  // First resolve any internal contradictions
  const deduplicated = resolveMemoryConflicts(pool);

  // Score each memory
  const scored = deduplicated.map((m) => scoreMemory(m, query));

  // Filter by minimum score or pinned flag
  const qualified = scored.filter((item) => {
    if (includePinned && item.memory.pinned) return true;
    return item.score >= minScore;
  });

  // Sort descending by score, then by recency
  qualified.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const timeA = new Date(a.memory.updatedAt || a.memory.createdAt).getTime();
    const timeB = new Date(b.memory.updatedAt || b.memory.createdAt).getTime();
    return timeB - timeA;
  });

  return qualified.slice(0, limit).map((item) => item.memory);
}
