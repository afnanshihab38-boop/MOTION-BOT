/**
 * MOTION-BOT — Central Tool Registry
 * Phase 7.5: Agent Tool / Action Layer
 *
 * Single source of truth for available motion design AI tools.
 * Exposes registration, inspection, and OpenRouter tool schema conversion.
 */

import {
  ToolDefinition,
  OpenRouterToolSpecification,
  OpenRouterFunctionDefinition,
} from "./types";
import { ALL_SAFE_MOTION_TOOLS } from "./implementations/motion-tools";

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  /**
   * Registers a safe tool into the central registry.
   */
  public register(tool: ToolDefinition): void {
    if (!tool || !tool.name) {
      throw new Error("Cannot register a tool without a valid name.");
    }
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name '${tool.name}' is already registered in ToolRegistry.`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Retrieves a tool definition by name.
   */
  public get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Checks if a tool is registered.
   */
  public has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Returns all registered tools.
   */
  public list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Returns all tool names.
   */
  public getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Formats tools into OpenRouter function calling specifications.
   */
  public getOpenRouterTools(): OpenRouterToolSpecification[] {
    return this.list().map((tool) => {
      const properties: Record<string, unknown> = {};

      for (const [key, prop] of Object.entries(tool.parameters.properties)) {
        properties[key] = {
          type: prop.type,
          description: prop.description,
          ...(prop.enum ? { enum: prop.enum } : {}),
          ...(prop.default !== undefined ? { default: prop.default } : {}),
        };
      }

      const fn: OpenRouterFunctionDefinition = {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties,
          required: tool.parameters.required || [],
        },
      };

      return {
        type: "function",
        function: fn,
      };
    });
  }

  /**
   * Clears all registered tools (used primarily for test isolation).
   */
  public clear(): void {
    this.tools.clear();
  }
}

// Global default registry instance
let defaultRegistryInstance: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!defaultRegistryInstance) {
    defaultRegistryInstance = new ToolRegistry();
    for (const tool of ALL_SAFE_MOTION_TOOLS) {
      defaultRegistryInstance.register(tool);
    }
  }
  return defaultRegistryInstance;
}

export function createToolRegistry(): ToolRegistry {
  return new ToolRegistry();
}
