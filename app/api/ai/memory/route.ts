/**
 * MOTION-BOT — Project Memory API Route Handler
 * Phase 7.6: Context Manager + Project-Scoped Memory
 *
 * REST endpoint for managing project-isolated memories.
 * Supports CRUD operations and relevance querying.
 */

import { NextRequest, NextResponse } from "next/server";
import { getProjectMemoryService } from "@/ai/memory/memory-service";
import { MemoryCategory, MemoryPriority } from "@/ai/memory/types";
import { LLMLogger } from "@/ai/logger";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId")?.trim();

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Query parameter 'projectId' is required." },
        { status: 400 }
      );
    }

    const memoryService = getProjectMemoryService();
    const query = searchParams.get("query")?.trim();
    const category = searchParams.get("category")?.trim() as MemoryCategory | undefined;
    const pinnedOnly = searchParams.get("pinned") === "true";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;

    let memories;
    if (query) {
      memories = await memoryService.getRelevantMemories(projectId, query, {
        limit: limit ?? 10,
        categoryFilter: category ? [category] : undefined,
      });
    } else {
      memories = await memoryService.listMemories(projectId, {
        category,
        pinnedOnly,
        limit,
      });
    }

    return NextResponse.json({
      success: true,
      projectId,
      count: memories.length,
      memories,
    });
  } catch (error) {
    LLMLogger.error(`Failed to retrieve project memories: ${error instanceof Error ? error.message : String(error)}`, {
      provider: "memory-api",
      model: "GET",
      errorCode: "GET_ERROR",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error retrieving memories." },
      { status: 500 }
    );
  }
}

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
    const content = (body.content || "").trim();

    if (!projectId || !content) {
      return NextResponse.json(
        { success: false, error: "Fields 'projectId' and 'content' are required." },
        { status: 400 }
      );
    }

    const memoryService = getProjectMemoryService();
    const memory = await memoryService.createMemory({
      projectId,
      content,
      category: body.category,
      tags: body.tags,
      priority: body.priority as MemoryPriority,
      pinned: body.pinned,
      source: body.source,
      metadata: body.metadata,
    });

    return NextResponse.json({ success: true, memory }, { status: 201 });
  } catch (error) {
    LLMLogger.error(`Failed to create project memory: ${error instanceof Error ? error.message : String(error)}`, {
      provider: "memory-api",
      model: "POST",
      errorCode: "POST_ERROR",
    });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create memory." },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Request body must be a valid JSON object." },
        { status: 400 }
      );
    }

    const id = (body.id || "").trim();
    const projectId = (body.projectId || "").trim();

    if (!id || !projectId) {
      return NextResponse.json(
        { success: false, error: "Fields 'id' and 'projectId' are required." },
        { status: 400 }
      );
    }

    const memoryService = getProjectMemoryService();
    const updated = await memoryService.updateMemory(id, projectId, {
      content: body.content,
      category: body.category,
      tags: body.tags,
      priority: body.priority,
      pinned: body.pinned,
      metadata: body.metadata,
    });

    return NextResponse.json({ success: true, memory: updated });
  } catch (error) {
    LLMLogger.error(`Failed to update project memory: ${error instanceof Error ? error.message : String(error)}`, {
      provider: "memory-api",
      model: "PATCH",
      errorCode: "PATCH_ERROR",
    });
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update memory." },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId")?.trim();
    const id = searchParams.get("id")?.trim();

    if (!projectId || !id) {
      return NextResponse.json(
        { success: false, error: "Query parameters 'projectId' and 'id' are required." },
        { status: 400 }
      );
    }

    const memoryService = getProjectMemoryService();
    const deleted = await memoryService.deleteMemory(id, projectId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: `Memory '${id}' not found for project '${projectId}'.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Memory deleted successfully." });
  } catch (error) {
    LLMLogger.error(`Failed to delete project memory: ${error instanceof Error ? error.message : String(error)}`, {
      provider: "memory-api",
      model: "DELETE",
      errorCode: "DELETE_ERROR",
    });
    return NextResponse.json(
      { success: false, error: "Internal server error deleting memory." },
      { status: 500 }
    );
  }
}
