/**
 * MOTION-BOT — Contextual AI Editing API Route
 * Phase 8.7: AI Contextual Editing
 *
 * Backend endpoint for receiving natural language edit commands
 * against current project context and generating safe, previewable proposals.
 */

import { NextRequest, NextResponse } from "next/server";
import { getContextualEditorService } from "@/ai/contextual";
import { TimelineContextState } from "@/ai/contextual/types";
import { Project } from "@/types/project";

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown> | null = null;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CONFIG",
            message: "Request body must be valid JSON.",
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
          },
        },
        { status: 400 }
      );
    }

    const { prompt, project, activeSceneId, selectedElementId, timelineState, provider } = body;

    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CONFIG",
            message: "Parameter 'prompt' is required and must be a non-empty string.",
          },
        },
        { status: 400 }
      );
    }

    if (!project || typeof project !== "object" || !Array.isArray((project as { scenes?: unknown }).scenes)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PROJECT",
            message: "A valid 'project' object with scenes is required.",
          },
        },
        { status: 400 }
      );
    }

    const service = getContextualEditorService();
    const proposal = await service.generateProposal({
      prompt: prompt.trim(),
      project: project as Project,
      activeSceneId: typeof activeSceneId === "string" ? activeSceneId : undefined,
      selectedElementId: typeof selectedElementId === "string" ? selectedElementId : undefined,
      timelineState: timelineState as TimelineContextState | undefined,
      provider: typeof provider === "string" ? provider : undefined,
    });

    return NextResponse.json({
      success: true,
      proposal,
    });
  } catch (err: unknown) {
    const errorObj = err as { message?: string; code?: string } | undefined;
    const message = errorObj?.message || "Failed to process contextual editing request.";
    const code = errorObj?.code || "CONTEXTUAL_EDIT_FAILED";

    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
        },
      },
      { status: 500 }
    );
  }
}
