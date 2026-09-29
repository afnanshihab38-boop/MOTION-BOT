/**
 * MOTION-BOT — Master End-to-End AI Agent Coordinator
 * Phase 7.8: End-to-End AI Agent Integration
 *
 * Connects the complete MotionBot pipeline:
 * User Request
 *   ↓ Context Manager (7-layer prioritized context + secret sanitization)
 *   ↓ Project Memory
 *   ↓ Creative Brain (Creative Brief synthesis)
 *   ↓ Motion Plan Generator (Deterministic temporal plan)
 *   ↓ AI Output Validation & Reliability Layer (4-stage validation)
 *   ↓ Tool Registry & Permission Layer (Controlled application actions)
 *   ↓ Scene Engine & State Guardian (Atomic rollback & project update)
 *   ↓ Updated Project State & UI Ready
 */

import { Project } from "@/types/project";
import { SAMPLE_DEV_PROJECT } from "@/services/project/sample-project";
import { cloneProject } from "@/services/project/project-serializer";
import {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentProgressState,
  AgentProgressEvent,
  AGENT_PROGRESS_LABELS,
  AgentExecutedToolResult,
} from "./types";
import { applyMotionPlanToProject } from "./plan-applier";
import { ContextManager, getContextManager } from "../context/context-manager";
import { ProjectMemoryService, getProjectMemoryService } from "../memory/memory-service";
import { CreativeBrainService, getCreativeBrainService } from "../creative-brain/creative-brain-service";
import { MotionPlanService, getMotionPlanService } from "../motion-plan/motion-plan-service";
import { ToolService } from "../tools/tool-service";
import { AIReliabilityPipeline } from "../reliability/pipeline";
import { StateGuardian } from "../reliability/state-guardian";
import { LLMService, getLLMService } from "../llm-service";
import { LLMError } from "../llm-error";
import { LLMLogger } from "../logger";
import { scrubSecrets } from "../context/secret-scrubber";

export class MotionBotAgent {
  private readonly contextManager: ContextManager;
  private readonly memoryService: ProjectMemoryService;
  private readonly creativeBrain: CreativeBrainService;
  private readonly motionPlanService: MotionPlanService;
  private readonly toolService: ToolService;
  private readonly llmService: LLMService;

  constructor(options?: {
    contextManager?: ContextManager;
    memoryService?: ProjectMemoryService;
    creativeBrain?: CreativeBrainService;
    motionPlanService?: MotionPlanService;
    toolService?: ToolService;
    llmService?: LLMService;
  }) {
    this.contextManager = options?.contextManager || getContextManager();
    this.memoryService = options?.memoryService || getProjectMemoryService();
    this.creativeBrain = options?.creativeBrain || getCreativeBrainService(options?.llmService);
    this.motionPlanService =
      options?.motionPlanService || getMotionPlanService(options?.llmService);
    this.toolService = options?.toolService || new ToolService(undefined, undefined, undefined, options?.llmService);
    this.llmService = options?.llmService || getLLMService();
  }

  /**
   * Executes the complete end-to-end MotionBot AI pipeline.
   */
  public async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const progressSteps: AgentProgressEvent[] = [];
    const executedTools: AgentExecutedToolResult[] = [];

    // Helper to log and emit progress states
    const emitProgress = async (
      state: AgentProgressState,
      message: string,
      details?: Record<string, unknown>
    ) => {
      const event: AgentProgressEvent = {
        state,
        label: AGENT_PROGRESS_LABELS[state],
        message,
        timestamp: new Date().toISOString(),
        details,
      };
      progressSteps.push(event);
      if (request.onProgress) {
        try {
          await request.onProgress(event);
        } catch {
          // Progress listener errors should never crash the core pipeline
        }
      }
    };

    // Determine initial project and capture state snapshot
    const initialProject: Project = request.initialProject
      ? StateGuardian.snapshot(request.initialProject)
      : cloneProject(SAMPLE_DEV_PROJECT);

    const projectId = (request.projectId || initialProject.id || "proj_default").trim();
    let currentStage: AgentProgressState = "understanding_request";

    try {
      // =======================================================================
      // STAGE 1: UNDERSTANDING REQUEST
      // =======================================================================
      currentStage = "understanding_request";
      await emitProgress(currentStage, "Analyzing natural language request and parameters...");

      const prompt = (request.prompt || "").trim();
      if (!prompt) {
        throw new LLMError({
          code: "INVALID_CONFIG",
          message: "User request prompt cannot be empty.",
          provider: "motion-agent",
        });
      }

      LLMLogger.info("MotionBot Agent initiated request", {
        provider: request.providerId || this.llmService.getActiveProviderId(),
        model: "motion-agent",
      });

      // =======================================================================
      // STAGE 2: PREPARING CONTEXT
      // =======================================================================
      currentStage = "preparing_context";
      await emitProgress(currentStage, "Constructing isolated context and querying project memory...");

      const constructedContext = await this.contextManager.buildContext({
        projectId,
        userRequest: prompt,
        currentProject: initialProject,
        budget: { maxCharacters: 16000, maxMemories: 5 },
      });

      const memoriesSummary = constructedContext.memoriesUsed.map(
        (m) => `[${m.category.toUpperCase()}] ${m.content}`
      );

      // =======================================================================
      // STAGE 3: GENERATING CREATIVE BRIEF
      // =======================================================================
      currentStage = "generating_creative_brief";
      await emitProgress(currentStage, "Synthesizing structured creative intent and visual direction...");

      const briefResult = await this.creativeBrain.analyzeRequest(
        {
          prompt,
          projectId,
          relevantMemories: memoriesSummary,
        },
        request.providerId
      );

      const brief = briefResult.brief;
      await emitProgress(currentStage, `Creative Brief synthesized: "${brief.title}" (${brief.duration}s, ${brief.aspectRatio})`, {
        briefId: brief.id,
        duration: brief.duration,
        aspectRatio: brief.aspectRatio,
        style: brief.style,
      });

      // =======================================================================
      // STAGE 4: GENERATING MOTION PLAN
      // =======================================================================
      currentStage = "generating_motion_plan";
      await emitProgress(currentStage, "Generating structured timeline choreography, scene sequence, and kinetic animations...");

      const planResult = await this.motionPlanService.generateMotionPlan(
        { brief },
        { providerId: request.providerId }
      );

      const motionPlan = planResult.plan;
      await emitProgress(
        currentStage,
        `Motion Plan generated: ${motionPlan.scenes.length} scenes, canvas ${motionPlan.canvas.width}x${motionPlan.canvas.height}`,
        {
          planId: motionPlan.id,
          sceneCount: motionPlan.scenes.length,
          canvas: `${motionPlan.canvas.width}x${motionPlan.canvas.height}`,
        }
      );

      // =======================================================================
      // STAGE 5: VALIDATING (RELIABILITY LAYER)
      // =======================================================================
      currentStage = "validating";
      await emitProgress(currentStage, "Running multi-stage AI reliability validation on candidate motion plan...");

      if (!planResult.validation.valid && planResult.validation.errors.length > 0) {
        const firstErr = planResult.validation.errors[0]?.message || "Motion Plan validation failed";
        throw new LLMError({
          code: "PROVIDER_ERROR",
          message: `Motion Plan validation rejected: ${firstErr}`,
          provider: "motion-agent",
          cause: { errors: planResult.validation.errors, stage: "validating" },
        });
      }

      const validationResult = await AIReliabilityPipeline.validate(
        motionPlan,
        "motion_plan",
        {
          projectId,
          expectedDuration: brief.duration,
          currentProject: initialProject,
          sessionPermission: request.readOnly ? "read" : "write",
          allowDestructive: Boolean(request.userConfirmed),
        }
      );

      if (!validationResult.valid || !validationResult.executionAllowed) {
        const firstIssue = validationResult.issues[0]?.message || "Validation failed";
        throw new LLMError({
          code: "PROVIDER_ERROR",
          message: `Motion Plan validation rejected: ${firstIssue}`,
          provider: "motion-agent",
          cause: { issues: validationResult.issues, stage: validationResult.stageFailed },
        });
      }

      await emitProgress(currentStage, "Motion Plan validated successfully across schema, temporal logic, and safety boundaries.");

      // =======================================================================
      // STAGE 6: APPLYING CHANGES (ATOMIC STATE EXECUTION & TOOLS)
      // =======================================================================
      currentStage = "applying_changes";
      await emitProgress(currentStage, "Applying motion plan and executing approved tools within atomic state boundary...");

      // Execute within StateGuardian atomic boundary to guarantee rollback if any step fails
      const atomicResult = await StateGuardian.executeAtomic<Project>(
        initialProject,
        async (workingCopy) => {
          // 1. Execute any explicit requested tools first
          if (request.toolRequests && request.toolRequests.length > 0) {
            for (const toolReq of request.toolRequests) {
              const toolStart = Date.now();
              const toolResult = await this.toolService.executeTool(
                {
                  tool: toolReq.tool,
                  arguments: toolReq.arguments || {},
                },
                {
                  projectId,
                  userConfirmed: request.userConfirmed,
                  readOnly: request.readOnly,
                }
              );

              executedTools.push({
                tool: toolReq.tool,
                arguments: toolReq.arguments || {},
                success: toolResult.success,
                result: toolResult.data,
                error: toolResult.error,
                durationMs: Date.now() - toolStart,
              });

              if (!toolResult.success) {
                return {
                  result: workingCopy,
                  updatedProject: workingCopy,
                  issues: [
                    {
                      stage: "safety_permission",
                      code: toolResult.error?.code || "TOOL_EXECUTION_ERROR",
                      message: toolResult.error?.message || `Tool '${toolReq.tool}' execution failed`,
                      severity: "error",
                      fatal: true,
                    },
                  ],
                };
              }
            }
          }

          // 2. Immutably apply the validated motion plan into the working project copy
          const applierResult = applyMotionPlanToProject(workingCopy, motionPlan);
          if (applierResult.errors.length > 0) {
            return {
              result: workingCopy,
              updatedProject: workingCopy,
              issues: applierResult.errors.map((err) => ({
                stage: "semantic",
                code: "PROJECT_VALIDATION_ERROR",
                message: err,
                severity: "error",
                fatal: true,
              })),
            };
          }

          return {
            result: applierResult.project,
            updatedProject: applierResult.project,
            issues: [],
          };
        }
      );

      if (!atomicResult.success || !atomicResult.result) {
        throw new LLMError({
          code: "PROVIDER_ERROR",
          message: atomicResult.error || "Project update was aborted and rolled back safely.",
          provider: "motion-agent",
        });
      }

      const finalProject = atomicResult.result;

      // Update project memory with the new creation decision
      try {
        await this.memoryService.createMemory({
          projectId,
          category: "creative_decision",
          content: `Created motion ad: "${brief.title}" (${brief.duration}s, ${brief.aspectRatio}, ${brief.style} style) with ${motionPlan.scenes.length} scenes.`,
          source: "ai_approved",
          priority: "medium",
          tags: ["motion_plan", brief.style, brief.aspectRatio],
        });
      } catch {
        // Non-critical background memory persistence failure
      }

      // =======================================================================
      // STAGE 7: COMPLETED
      // =======================================================================
      currentStage = "completed";
      const totalDurationMs = Date.now() - startTime;
      await emitProgress(
        currentStage,
        `MotionBot AI successfully updated project '${finalProject.name}' in ${totalDurationMs}ms.`,
        { durationMs: totalDurationMs, sceneCount: finalProject.scenes.length }
      );

      return {
        success: true,
        projectId,
        prompt,
        brief,
        motionPlan,
        finalProject,
        executedTools,
        progressSteps,
        durationMs: totalDurationMs,
        preservedPreviousState: false,
      };
    } catch (err: unknown) {
      // =======================================================================
      // STAGE 8: FAILED (SAFE RECOVERY & PRESERVATION)
      // =======================================================================
      const totalDurationMs = Date.now() - startTime;
      const rawMessage = err instanceof Error ? err.message : String(err);
      const sanitizedMessage = LLMLogger.sanitize(scrubSecrets(rawMessage).result);
      const errorCode = err instanceof LLMError ? err.code : "PIPELINE_ERROR";

      LLMLogger.error("MotionBot Agent execution failed, state preserved", {
        provider: "motion-agent",
        model: "motion-agent",
        errorCode: String(errorCode),
      });

      await emitProgress("failed", `MotionBot Agent stopped at stage '${currentStage}': ${sanitizedMessage}`, {
        stage: currentStage,
        code: errorCode,
      });

      return {
        success: false,
        projectId,
        prompt: request.prompt || "",
        finalProject: initialProject, // Guaranteed uncorrupted initial snapshot
        executedTools,
        progressSteps,
        durationMs: totalDurationMs,
        preservedPreviousState: true,
        error: {
          code: errorCode,
          message: sanitizedMessage,
          stage: currentStage,
          details: err instanceof LLMError ? err.cause : undefined,
        },
      };
    }
  }
}

// Global default agent instance
let defaultMotionBotAgent: MotionBotAgent | null = null;

export function getMotionBotAgent(): MotionBotAgent {
  if (!defaultMotionBotAgent) {
    defaultMotionBotAgent = new MotionBotAgent();
  }
  return defaultMotionBotAgent;
}

export function resetMotionBotAgent(): void {
  defaultMotionBotAgent = null;
}
