/**
 * MOTION-BOT — Context Manager Types
 * Phase 7.6: Context Manager + Project-Scoped Memory
 *
 * Defines input contracts, layer hierarchies, budget specifications,
 * and structured output payloads for the agent's contextual synthesis.
 */

import { CreativeBrief } from "../creative-brain/types";
import { MotionPlan } from "../motion-plan/types";
import { Scene } from "@/types/scene";
import { Project } from "@/types/project";
import { RelevanceOptions, ProjectMemory } from "../memory/types";

/**
 * Priority ordering for context layers (from highest to lowest priority).
 */
export type ContextLayerName =
  | "system_security"
  | "current_project"
  | "current_task"
  | "motion_plan_scene"
  | "relevant_memory"
  | "tool_results"
  | "user_request";

export interface ContextBudgetOptions {
  maxCharacters?: number; // Maximum character budget (default: 16,000 ~ 4,000 tokens)
  maxTokens?: number; // Estimated token ceiling
  maxMemories?: number; // Maximum relevant memory items to include (default: 5)
  maxToolResultChars?: number; // Max characters allocated to tool outputs (default: 2,500)
}

export interface ContextToolResultInput {
  tool: string;
  result?: unknown;
  success?: boolean;
  error?: unknown;
}

export interface ContextInput {
  projectId: string;
  userRequest: string;
  systemInstruction?: string;
  securityRules?: string[];
  currentProject?: Project | Partial<Project>;
  currentTask?: string;
  currentCreativeBrief?: CreativeBrief;
  currentMotionPlan?: MotionPlan;
  currentScene?: Scene;
  toolResults?: ContextToolResultInput[];
  memoryOptions?: RelevanceOptions;
  budget?: ContextBudgetOptions;
}

export interface ContextMetadata {
  projectId: string;
  totalCharacters: number;
  estimatedTokens: number;
  layersIncluded: ContextLayerName[];
  memoriesIncludedCount: number;
  memoriesExcludedCount: number;
  truncatedLayers: ContextLayerName[];
  sanitizedSecretCount: number;
  createdAt: string;
}

export interface ConstructedContext {
  systemPrompt: string;
  userPrompt: string;
  metadata: ContextMetadata;
  memoriesUsed: ProjectMemory[];
}

export interface ContextDebugSummary {
  projectId: string;
  estimatedTokens: number;
  characterCount: number;
  layers: Array<{
    name: ContextLayerName;
    characterCount: number;
    truncated: boolean;
    preview: string;
  }>;
  sanitizedSecretCount: number;
  memoriesCount: number;
  timestamp: string;
}
