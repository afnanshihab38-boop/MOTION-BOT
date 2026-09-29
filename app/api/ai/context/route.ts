/**
 * MOTION-BOT — Context Construction & Inspection API Route
 * Phase 7.6: Context Manager + Project-Scoped Memory
 *
 * REST endpoint for constructing, inspecting, and auditing agent context.
 */

import { NextRequest, NextResponse } from "next/server";
import { getContextManager } from "@/ai/context/context-manager";
import { LLMLogger } from "@/ai/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Request body must be a valid JSON object." },
        { status: 400 }
      );
    }

    const projectId = (body.projectId || "").trim();
    const userRequest = (body.userRequest || "").trim();

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Field 'projectId' is required." },
        { status: 400 }
      );
    }

    if (!userRequest) {
      return NextResponse.json(
        { success: false, error: "Field 'userRequest' is required." },
        { status: 400 }
      );
    }

    const contextManager = getContextManager();
    const inspectOnly = body.inspectOnly === true;

    if (inspectOnly) {
      const debugSummary = await contextManager.inspectContext({
        projectId,
        userRequest,
        systemInstruction: body.systemInstruction,
        securityRules: body.securityRules,
        currentProject: body.currentProject,
        currentTask: body.currentTask,
        currentCreativeBrief: body.currentCreativeBrief,
        currentMotionPlan: body.currentMotionPlan,
        currentScene: body.currentScene,
        toolResults: body.toolResults,
        budget: body.budget,
        memoryOptions: body.memoryOptions,
      });

      return NextResponse.json({ success: true, debugSummary });
    }

    const constructed = await contextManager.buildContext({
      projectId,
      userRequest,
      systemInstruction: body.systemInstruction,
      securityRules: body.securityRules,
      currentProject: body.currentProject,
      currentTask: body.currentTask,
      currentCreativeBrief: body.currentCreativeBrief,
      currentMotionPlan: body.currentMotionPlan,
      currentScene: body.currentScene,
      toolResults: body.toolResults,
      budget: body.budget,
      memoryOptions: body.memoryOptions,
    });

    return NextResponse.json({
      success: true,
      context: {
        systemPrompt: constructed.systemPrompt,
        userPrompt: constructed.userPrompt,
        metadata: constructed.metadata,
      },
    });
  } catch (error) {
    LLMLogger.error(`Failed to construct or inspect AI context: ${error instanceof Error ? error.message : String(error)}`, {
      provider: "context-api",
      model: "POST",
      errorCode: "CONTEXT_ERROR",
    });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error." },
      { status: 400 }
    );
  }
}
