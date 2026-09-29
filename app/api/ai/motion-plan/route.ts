/**
 * MOTION-BOT — Structured Motion Plan API Route Handler
 * Phase 7.4: Structured Motion Plan Generator
 *
 * Backend API endpoint for translating validated Creative Briefs
 * into structured, temporally validated Motion Plans.
 */

import { NextRequest, NextResponse } from "next/server";
import { getMotionPlanService } from "@/ai/motion-plan";
import { getCreativeBrainService } from "@/ai/creative-brain";
import { CreativeBrief } from "@/ai/creative-brain/types";
import { LLMError } from "@/ai/llm-error";

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "motionbot-motion-plan",
    status: "ready",
    version: "1.0.0",
  });
}

interface MotionPlanRequestBody {
  brief?: unknown;
  prompt?: unknown;
  fps?: unknown;
  quality?: unknown;
  provider?: unknown;
  strict?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    let body: MotionPlanRequestBody;
    try {
      body = (await req.json()) as MotionPlanRequestBody;
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

    let brief = body.brief as CreativeBrief | undefined;

    // Optional pipeline convenience: if client passed a raw prompt instead of brief, synthesize brief first
    if (!brief && typeof body.prompt === "string" && body.prompt.trim().length > 0) {
      const creativeBrain = getCreativeBrainService();
      const brainResult = await creativeBrain.analyzeRequest(
        { prompt: body.prompt },
        typeof body.provider === "string" ? body.provider : undefined
      );
      brief = brainResult.brief;
    }

    if (!brief || typeof brief !== "object" || !brief.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CONFIG",
            message: "Field 'brief' (or a valid 'prompt') is required and must contain a valid CreativeBrief.",
          },
        },
        { status: 400 }
      );
    }

    const providerId = typeof body.provider === "string" ? body.provider : undefined;
    const fps = typeof body.fps === "number" ? body.fps : 30;
    const quality =
      body.quality && ["draft", "standard", "high", "production"].includes(String(body.quality))
        ? (String(body.quality) as "draft" | "standard" | "high" | "production")
        : "high";
    const strict = Boolean(body.strict);

    const service = getMotionPlanService();
    const result = await service.generateMotionPlan(
      {
        brief,
        fps,
        quality,
      },
      {
        providerId,
        strict,
      }
    );

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

    const message = err instanceof Error ? err.message : "Internal Motion Plan error";
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
