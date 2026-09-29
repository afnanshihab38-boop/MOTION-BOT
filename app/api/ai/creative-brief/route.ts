/**
 * MOTION-BOT — Creative Brain API Route Handler
 * Phase 7.3: MotionBot Creative Brain
 *
 * Backend API endpoint for translating natural-language creative requests
 * into structured, validated creative briefs.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCreativeBrainService, CreativeBrainRequest } from "@/ai/creative-brain";
import { LLMError } from "@/ai/llm-error";

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "motionbot-creative-brain",
    status: "ready",
    version: "1.0.0",
  });
}

interface CreativeBriefRequestBody {
  prompt?: unknown;
  projectContext?: unknown;
  provider?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    let body: CreativeBriefRequestBody;
    try {
      body = (await req.json()) as CreativeBriefRequestBody;
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

    const { prompt, projectContext, provider } = body;

    if (typeof prompt !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CONFIG",
            message: "Field 'prompt' is required and must be a string.",
          },
        },
        { status: 400 }
      );
    }

    const requestPayload: CreativeBrainRequest = {
      prompt,
      projectContext:
        projectContext && typeof projectContext === "object"
          ? (projectContext as CreativeBrainRequest["projectContext"])
          : undefined,
    };

    const providerId = typeof provider === "string" ? provider : undefined;
    const service = getCreativeBrainService();
    const result = await service.analyzeRequest(requestPayload, providerId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    if (err instanceof LLMError) {
      let httpStatus = err.statusCode || 500;
      if (err.code === "AUTHENTICATION_ERROR") httpStatus = 401;
      else if (err.code === "PERMISSION_DENIED") httpStatus = 403;
      else if (err.code === "RATE_LIMIT_EXCEEDED") httpStatus = 429;
      else if (err.code === "TIMEOUT") httpStatus = 504;
      else if (err.code === "MISSING_API_KEY") httpStatus = 503;
      else if (err.code === "INVALID_CONFIG") httpStatus = 400;
      else if (err.code === "JSON_PARSE_ERROR") httpStatus = 502;

      return NextResponse.json(
        {
          success: false,
          error: err.toClientSafeObject(),
        },
        { status: httpStatus }
      );
    }

    const message = err instanceof Error ? err.message : "Internal Creative Brain error";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PROVIDER_ERROR",
          message,
        },
      },
      { status: 500 }
    );
  }
}
