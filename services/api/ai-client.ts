/**
 * MOTION-BOT — Frontend AI Agent Client
 * Phase 8.1: AI Prompt -> Editor Integration
 *
 * Safe client-side API helper for communicating with the MotionBot backend agent.
 * Strictly guarantees that API keys and internal credentials remain backend-only.
 */

import { Project } from "@/types/project";
import { AgentExecutionResult, AgentProgressState } from "@/ai/agent/types";

export interface AgentStatusResponse {
  success: boolean;
  service: string;
  status: string;
  version: string;
  activeProvider: string;
  activeModel: string;
  mockMode: boolean;
  isConfigured: boolean;
  supportedProgressStates: string[];
  progressLabels: Record<string, string>;
}

export interface GenerateMotionPlanParams {
  prompt: string;
  projectId?: string;
  initialProject?: Project;
  provider?: string;
  userConfirmed?: boolean;
  readOnly?: boolean;
}

export interface ClientAgentResult {
  success: boolean;
  result?: AgentExecutionResult;
  userFriendlyError?: string;
  rawError?: unknown;
}

/**
 * Checks backend AI agent health and configuration status.
 */
export async function getAgentStatus(): Promise<AgentStatusResponse | null> {
  try {
    const res = await fetch("/api/ai/agent", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as AgentStatusResponse;
  } catch {
    return null;
  }
}

/**
 * Sends a natural language creative request to the MotionBot Agent.
 * Never exposes secrets; handles errors gracefully with user-friendly messages.
 */
export async function requestAgentMotionDesign(
  params: GenerateMotionPlanParams
): Promise<ClientAgentResult> {
  const trimmed = params.prompt.trim();
  if (!trimmed) {
    return {
      success: false,
      userFriendlyError: "Please enter a description for your motion design.",
    };
  }

  try {
    const response = await fetch("/api/ai/agent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: trimmed,
        projectId: params.projectId,
        initialProject: params.initialProject,
        provider: params.provider,
        userConfirmed: params.userConfirmed ?? false,
        readOnly: params.readOnly ?? false,
      }),
    });

    const data = (await response.json()) as AgentExecutionResult & {
      error?: { code?: string; message?: string; stage?: AgentProgressState };
    };

    if (response.ok && data.success) {
      return {
        success: true,
        result: data,
      };
    }

    // Determine clean user-facing error message
    let userFriendlyError =
      "MotionBot couldn't generate a valid motion plan. Your project hasn't been changed.";

    if (data.error?.code === "RATE_LIMIT") {
      userFriendlyError =
        "The AI service is temporarily busy. Please wait a moment and try again.";
    } else if (data.error?.code === "TIMEOUT") {
      userFriendlyError =
        "The generation took longer than expected. Please try again with a shorter prompt.";
    } else if (data.error?.code === "INVALID_CONFIG") {
      userFriendlyError = data.error.message || "Invalid prompt configuration.";
    } else if (data.error?.message) {
      userFriendlyError = `MotionBot was unable to complete the request: ${data.error.message}`;
    }

    return {
      success: false,
      userFriendlyError,
      rawError: data.error,
    };
  } catch (err) {
    return {
      success: false,
      userFriendlyError:
        "Unable to connect to the MotionBot AI service. Please check your network connection and try again.",
      rawError: err,
    };
  }
}

export interface ContextualEditClientParams {
  prompt: string;
  project: Project;
  activeSceneId?: string;
  selectedElementId?: string;
  timelineState?: { currentTime?: number; isPlaying?: boolean };
  provider?: string;
}

export interface ContextualEditClientResponse {
  success: boolean;
  proposal?: import("@/ai/contextual").ContextualEditProposal;
  userFriendlyError?: string;
  rawError?: unknown;
}

/**
 * Sends a natural language editing command to the contextual editing API.
 */
export async function requestContextualEdit(
  params: ContextualEditClientParams
): Promise<ContextualEditClientResponse> {
  const trimmed = params.prompt.trim();
  if (!trimmed) {
    return {
      success: false,
      userFriendlyError: "Please enter an editing command.",
    };
  }

  try {
    const response = await fetch("/api/ai/contextual-edit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: trimmed,
        project: params.project,
        activeSceneId: params.activeSceneId,
        selectedElementId: params.selectedElementId,
        timelineState: params.timelineState,
        provider: params.provider,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success && data.proposal) {
      return {
        success: true,
        proposal: data.proposal,
      };
    }

    let userFriendlyError = data.error?.message || "Failed to generate edit proposal.";
    return {
      success: false,
      userFriendlyError,
      rawError: data.error,
    };
  } catch (err) {
    return {
      success: false,
      userFriendlyError:
        "Unable to connect to the MotionBot contextual edit service. Please check your connection.",
      rawError: err,
    };
  }
}

