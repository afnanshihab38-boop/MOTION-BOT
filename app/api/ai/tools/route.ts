/**
 * MOTION-BOT — Agent Tool Execution API Route
 * Phase 7.5: Agent Tool / Action Layer
 *
 * Backend endpoint for inspecting available tools and executing
 * validated, permission-controlled motion design tools.
 */

import { NextRequest, NextResponse } from "next/server";
import { getToolService } from "@/ai/tools";

export async function GET() {
  const toolService = getToolService();
  const tools = toolService.getAvailableTools();

  return NextResponse.json({
    success: true,
    service: "motionbot-agent-tools",
    status: "ready",
    count: tools.length,
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      classification: t.classification,
      permissionLevel: t.permissionLevel,
      requiresConfirmation: t.requiresConfirmation,
      parameters: t.parameters,
    })),
  });
}

interface ToolRequestBody {
  tool?: unknown;
  arguments?: unknown;
  userConfirmed?: unknown;
  readOnly?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    let body: ToolRequestBody;
    try {
      body = (await req.json()) as ToolRequestBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          tool: "unknown",
          data: null,
          error: {
            code: "MALFORMED_ARGUMENTS",
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
          tool: "unknown",
          data: null,
          error: {
            code: "MALFORMED_ARGUMENTS",
            message: "Request body cannot be empty.",
          },
        },
        { status: 400 }
      );
    }

    const toolName = typeof body.tool === "string" ? body.tool.trim() : "";
    if (!toolName) {
      return NextResponse.json(
        {
          success: false,
          tool: "unknown",
          data: null,
          error: {
            code: "UNKNOWN_TOOL",
            message: "Field 'tool' is required.",
          },
        },
        { status: 400 }
      );
    }

    const toolArgs =
      body.arguments && typeof body.arguments === "object" && !Array.isArray(body.arguments)
        ? (body.arguments as Record<string, unknown>)
        : {};

    const toolService = getToolService();
    const result = await toolService.executeTool(
      {
        tool: toolName,
        arguments: toolArgs,
      },
      {
        userConfirmed: Boolean(body.userConfirmed),
        readOnly: Boolean(body.readOnly),
      }
    );

    const httpStatus = result.success
      ? 200
      : result.error?.code === "PERMISSION_DENIED" || result.error?.code === "CONFIRMATION_REQUIRED"
      ? 403
      : result.error?.code === "UNKNOWN_TOOL" || result.error?.code === "INVALID_ARGUMENTS"
      ? 400
      : 500;

    return NextResponse.json(result, { status: httpStatus });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        tool: "unknown",
        data: null,
        error: {
          code: "EXECUTION_ERROR",
          message,
        },
      },
      { status: 500 }
    );
  }
}
