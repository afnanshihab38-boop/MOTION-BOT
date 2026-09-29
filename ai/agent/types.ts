/**
 * MOTION-BOT — End-to-End AI Agent Integration Types
 * Phase 7.8: End-to-End AI Agent Integration
 *
 * Defines progress states, execution request/response contracts,
 * and orchestration telemetry for the MotionBot Agent.
 */

import { Project } from "@/types/project";
import { CreativeBrief } from "../creative-brain/types";
import { MotionPlan } from "../motion-plan/types";
import { ToolResult } from "../tools/types";

/**
 * Standard progression states for the end-to-end MotionBot AI agent pipeline.
 */
export type AgentProgressState =
  | "understanding_request"
  | "preparing_context"
  | "generating_creative_brief"
  | "generating_motion_plan"
  | "validating"
  | "applying_changes"
  | "completed"
  | "failed";

/**
 * Human-readable display labels for UI/telemetry compatibility.
 */
export const AGENT_PROGRESS_LABELS: Record<AgentProgressState, string> = {
  understanding_request: "understanding request",
  preparing_context: "preparing context",
  generating_creative_brief: "generating creative brief",
  generating_motion_plan: "generating motion plan",
  validating: "validating",
  applying_changes: "applying changes",
  completed: "completed",
  failed: "failed",
};

/**
 * Real-time event emitted as the agent advances through pipeline phases.
 */
export interface AgentProgressEvent {
  state: AgentProgressState;
  label: string;
  message: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

/**
 * Tool execution descriptor within the agent request or results.
 */
export interface AgentToolInvocation {
  tool: string;
  arguments?: Record<string, unknown>;
}

export interface AgentExecutedToolResult {
  tool: string;
  arguments: Record<string, unknown>;
  success: boolean;
  result?: unknown;
  error?: unknown;
  durationMs?: number;
}

/**
 * Input request for the complete MotionBot agent pipeline.
 */
export interface AgentExecutionRequest {
  /** The natural language prompt from the user */
  prompt: string;
  /** Project ID for context & memory scoping. Created if omitted. */
  projectId?: string;
  /** Base project state to mutate. Uses sample project or creates new one if omitted. */
  initialProject?: Project;
  /** Explicit provider override (e.g., 'openrouter' or 'mock') */
  providerId?: string;
  /** Whether the user confirmed high-impact/destructive tool actions */
  userConfirmed?: boolean;
  /** Restrict operations to read-only */
  readOnly?: boolean;
  /** Optional explicit tools to run in tandem */
  toolRequests?: AgentToolInvocation[];
  /** Progress notification callback */
  onProgress?: (event: AgentProgressEvent) => void | Promise<void>;
}

/**
 * Structured diagnostic error object returned upon agent pipeline failure.
 */
export interface AgentErrorDetails {
  code: string;
  message: string;
  stage: AgentProgressState;
  details?: unknown;
}

/**
 * Comprehensive structured output returned by the MotionBot Agent.
 */
export interface AgentExecutionResult {
  /** Whether the entire end-to-end pipeline completed successfully */
  success: boolean;
  /** Target project identifier */
  projectId: string;
  /** The original natural-language request */
  prompt: string;
  /** Synthesized creative brief */
  brief?: CreativeBrief;
  /** Synthesized structured motion plan */
  motionPlan?: MotionPlan;
  /** Final resulting project state (either updated or preserved snapshot) */
  finalProject: Project;
  /** Results of all tools executed during this turn */
  executedTools: AgentExecutedToolResult[];
  /** Chronological history of all pipeline stage events */
  progressSteps: AgentProgressEvent[];
  /** Total pipeline execution time in milliseconds */
  durationMs: number;
  /** Whether the original project state was restored/preserved on failure */
  preservedPreviousState: boolean;
  /** Error details if the pipeline failed at any stage */
  error?: AgentErrorDetails;
}
