/**
 * MOTION-BOT — Master End-to-End AI Agent API Route
 * Phase 7.8: End-to-End AI Agent Integration
 *
 * Backend endpoint for executing natural language motion design prompts
 * through the complete MotionBot AI pipeline.
 */

import { NextRequest, NextResponse } from "next/server";
import { getMotionBotAgent } from "@/ai/agent";
import { getLLMService } from "@/ai/llm-service";
import { AGENT_PROGRESS_LABELS } from "@/ai/agent/types";
import { Project } from "@/types/project";

export async function GET() {
  const llmService = getLLMService();
  const status = llmService.getStatus();

  return NextResponse.json({
    success: true,
    service: "motionbot-agent",
    status: "ready",
    version: "1.0.0",
    activeProvider: status.activeProvider,
    activeModel: status.model,
    mockMode: status.mockMode,
    isConfigured: status.isConfigured,
    supportedProgressStates: Object.keys(AGENT_PROGRESS_LABELS),
    progressLabels: AGENT_PROGRESS_LABELS,
  });
}

interface AgentRequestBody {
  prompt?: unknown;
  projectId?: unknown;
  initialProject?: unknown;
  provider?: unknown;
  userConfirmed?: unknown;
  readOnly?: unknown;
  toolRequests?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    let body: AgentRequestBody;
    try {
      body = (await req.json()) as AgentRequestBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CONFIG",
            message: "Request body must be valid JSON.",
            stage: "understanding_request",
          },
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CONFIG",
            message: "Request body cannot be empty.",
            stage: "understanding_request",
          },
        },
        { status: 400 }
      );
    }

    const { prompt, projectId, initialProject, provider, userConfirmed, readOnly, toolRequests } =
      body;

    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CONFIG",
            message: "Parameter 'prompt' is required and must be a non-empty string.",
            stage: "understanding_request",
          },
        },
        { status: 400 }
      );
    }

    const agent = getMotionBotAgent();
    const result = await agent.execute({
      prompt: prompt.trim(),
      projectId: typeof projectId === "string" ? projectId.trim() : undefined,
      initialProject:
        initialProject && typeof initialProject === "object"
          ? (initialProject as Project)
          : undefined,
      providerId: typeof provider === "string" ? provider.trim() : undefined,
      userConfirmed: Boolean(userConfirmed),
      readOnly: Boolean(readOnly),
      toolRequests: Array.isArray(toolRequests) ? toolRequests : undefined,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 422,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message,
          stage: "failed",
        },
      },
      { status: 500 }
    );
  }
}
