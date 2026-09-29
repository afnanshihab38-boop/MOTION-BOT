/**
 * MOTION-BOT — AI Generation API Endpoint
 * Phase 7.2: LLM Provider Foundation
 *
 * Server-side route handler for testing and executing LLM requests through
 * the provider abstraction layer without exposing secrets to the client.
 */

import { NextRequest, NextResponse } from "next/server";
import { getLLMService, LLMError, LLMGenerationRequest } from "@/ai";

export async function GET() {
  try {
    const service = getLLMService();
    const status = service.getStatus();
    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve LLM status";
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

interface GenerateRequestBody {
  prompt?: unknown;
  messages?: unknown;
  systemInstruction?: unknown;
  model?: unknown;
  temperature?: unknown;
  maxTokens?: unknown;
  stopSequences?: unknown;
  responseFormat?: unknown;
  timeoutMs?: unknown;
  provider?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    let body: GenerateRequestBody;
    try {
      body = (await req.json()) as GenerateRequestBody;
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

    const {
      prompt,
      messages,
      systemInstruction,
      model,
      temperature,
      maxTokens,
      stopSequences,
      responseFormat,
      timeoutMs,
      provider,
    } = body;

    // Validate that either prompt or messages exists
    if (!prompt && (!Array.isArray(messages) || messages.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CONFIG",
            message: "Must provide either 'prompt' (string) or 'messages' (array).",
          },
        },
        { status: 400 }
      );
    }

    const requestPayload: LLMGenerationRequest = {
      prompt: typeof prompt === "string" ? prompt : undefined,
      messages: Array.isArray(messages) ? messages : undefined,
      systemInstruction: typeof systemInstruction === "string" ? systemInstruction : undefined,
      model: typeof model === "string" ? model : undefined,
      temperature: typeof temperature === "number" ? temperature : undefined,
      maxTokens: typeof maxTokens === "number" ? maxTokens : undefined,
      stopSequences: Array.isArray(stopSequences) ? stopSequences : undefined,
      responseFormat:
        responseFormat &&
        typeof responseFormat === "object" &&
        "type" in responseFormat &&
        (responseFormat.type === "text" || responseFormat.type === "json_object")
          ? (responseFormat as LLMGenerationRequest["responseFormat"])
          : undefined,
      timeoutMs: typeof timeoutMs === "number" ? timeoutMs : undefined,
    };

    const service = getLLMService();
    const providerId = typeof provider === "string" ? provider : undefined;
    const result = await service.generate(requestPayload, providerId);

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

    const message = err instanceof Error ? err.message : "Internal AI generation error";
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
