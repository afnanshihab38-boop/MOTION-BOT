/**
 * MOTION-BOT — AI Output Validation & Reliability Layer Types
 * Phase 7.7: AI Output Validation + Reliability Layer
 *
 * Defines contracts for multi-stage validation, semantic audits,
 * resilient parsing, retry policies, and atomic state recovery.
 */

import { Project } from "@/types/project";
import { ToolPermissionLevel, ToolClassification } from "../tools/types";

export type ValidationStage =
  | "parse"
  | "schema"
  | "semantic"
  | "safety_permission";

export type ValidationSeverity = "error" | "warning";

export type ValidationTargetType =
  | "creative_brief"
  | "motion_plan"
  | "tool_call"
  | "scene"
  | "generic_json";

export interface ValidationIssue {
  stage: ValidationStage;
  code: string;
  message: string;
  path?: string;
  severity: ValidationSeverity;
  fatal: boolean;
}

export interface ValidationPipelineResult<T = unknown> {
  valid: boolean;
  data?: T;
  issues: ValidationIssue[];
  rawInput?: unknown;
  stageFailed?: ValidationStage;
  executionAllowed: boolean;
}

export interface ReliabilityContext {
  projectId?: string;
  expectedDuration?: number;
  availableAssets?: string[];
  sessionPermission?: ToolPermissionLevel;
  allowDestructive?: boolean;
  currentProject?: Project;
}

export interface RetryPolicy {
  maxRetries: number; // Max retry count (default: 2, max: 3)
  initialDelayMs: number; // Base delay in ms (default: 250ms)
  maxDelayMs: number; // Cap delay (default: 2000ms)
  backoffFactor: number; // Multiplier (default: 2)
  retryableStatuses?: number[]; // e.g. [429, 500, 502, 503, 504]
}

export interface AtomicExecutionResult<T = unknown> {
  success: boolean;
  result?: T;
  error?: string;
  rolledBack: boolean;
  preservedState?: Project;
  issues: ValidationIssue[];
}
