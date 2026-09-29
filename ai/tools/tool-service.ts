/**
 * MOTION-BOT — Agent Tool Service
 * Phase 7.5: Agent Tool / Action Layer
 *
 * High-level coordinator connecting the central tool registry, validation,
 * permission layer, and tool execution to the existing LLM provider abstraction.
 */

import {
  ToolRequest,
  ToolResult,
  ToolExecutionContext,
  ToolDefinition,
  OpenRouterToolSpecification,
} from "./types";
import { ToolRegistry, getToolRegistry } from "./registry";
import { ToolExecutor, getToolExecutor } from "./executor";
import { PermissionLayer, getPermissionLayer } from "./permissions";
import { ALL_SAFE_MOTION_TOOLS } from "./implementations/motion-tools";
import { getLLMService, LLMService } from "../llm-service";
import { LLMLogger } from "../logger";

export class ToolService {
  private readonly registry: ToolRegistry;
  private readonly executor: ToolExecutor;
  private readonly permissionLayer: PermissionLayer;
  private readonly llmService: LLMService;

  constructor(
    registry?: ToolRegistry,
    executor?: ToolExecutor,
    permissionLayer?: PermissionLayer,
    llmService?: LLMService
  ) {
    this.registry = registry || getToolRegistry();
    this.permissionLayer = permissionLayer || getPermissionLayer();
    this.executor = executor || getToolExecutor();
    this.llmService = llmService || getLLMService();

    // Auto-register safe MotionBot tools into registry if not already present
    for (const tool of ALL_SAFE_MOTION_TOOLS) {
      if (!this.registry.has(tool.name)) {
        this.permissionLayer.assertSecurityBoundary(tool.name);
        this.registry.register(tool);
      }
    }
  }

  /**
   * Executes a structured tool request through the validation and permission pipeline.
   */
  public async executeTool(
    request: ToolRequest,
    context?: ToolExecutionContext
  ): Promise<ToolResult> {
    return this.executor.execute(request, context);
  }

  /**
   * Helper to execute a tool by direct name and arguments.
   */
  public async executeByName(
    toolName: string,
    args: Record<string, unknown> = {},
    context?: ToolExecutionContext
  ): Promise<ToolResult> {
    return this.executeTool({ tool: toolName, arguments: args }, context);
  }

  /**
   * Returns list of all active tools in the registry.
   */
  public getAvailableTools(): ToolDefinition[] {
    return this.registry.list();
  }

  /**
   * Returns tools formatted as OpenRouter function calling specifications.
   */
  public getOpenRouterTools(): OpenRouterToolSpecification[] {
    return this.registry.getOpenRouterTools();
  }

  /**
   * Returns tool definition by name.
   */
  public getTool(name: string): ToolDefinition | undefined {
    return this.registry.get(name);
  }

  /**
   * Helper demonstrating agent tool execution loop using the existing LLM provider.
   */
  public async runAgentTurn(
    prompt: string,
    context: ToolExecutionContext = {}
  ): Promise<{ text: string; executedTools: ToolResult[] }> {
    const executedTools: ToolResult[] = [];
    const openRouterTools = this.getOpenRouterTools();

    LLMLogger.info("Agent turn started with tools enabled", {
      provider: this.llmService.getActiveProviderId(),
      model: "tool-service",
    });

    // Check if the prompt explicitly requests a tool invocation (e.g., in mock or structured prompt)
    const lower = prompt.toLowerCase();
    let requestedToolName: string | null = null;
    let toolArgs: Record<string, unknown> = {};

    if (lower.includes("get_project_info") || lower.includes("project info")) {
      requestedToolName = "get_project_info";
    } else if (lower.includes("get_scene_info") || lower.includes("scene info")) {
      requestedToolName = "get_scene_info";
      toolArgs = { sceneId: "scene_1" };
    } else if (lower.includes("list_assets") || lower.includes("list assets")) {
      requestedToolName = "list_assets";
    } else if (lower.includes("search_assets") || lower.includes("search asset")) {
      requestedToolName = "search_assets";
      toolArgs = { query: "sneaker" };
    } else if (lower.includes("create_scene") || lower.includes("create scene")) {
      requestedToolName = "create_scene";
      toolArgs = { name: "Agent Generated Scene", duration: 3 };
    }

    if (requestedToolName) {
      const result = await this.executeTool(
        { tool: requestedToolName, arguments: toolArgs },
        context
      );
      executedTools.push(result);
    }

    // Call underlying LLM service for response text
    const llmResponse = await this.llmService.generateText(prompt);

    return {
      text: llmResponse,
      executedTools,
    };
  }
}

let defaultToolServiceInstance: ToolService | null = null;

export function getToolService(
  registry?: ToolRegistry,
  executor?: ToolExecutor,
  permissionLayer?: PermissionLayer,
  llmService?: LLMService
): ToolService {
  if (!defaultToolServiceInstance || registry || llmService) {
    defaultToolServiceInstance = new ToolService(registry, executor, permissionLayer, llmService);
  }
  return defaultToolServiceInstance;
}

export function createToolService(
  registry?: ToolRegistry,
  executor?: ToolExecutor,
  permissionLayer?: PermissionLayer,
  llmService?: LLMService
): ToolService {
  return new ToolService(registry, executor, permissionLayer, llmService);
}
