"use client";

/**
 * MOTION-BOT — Master AI Workspace Component
 * Phase 8.1: AI Prompt -> Editor Integration
 *
 * Dedicated in-editor workspace for transforming natural-language creative prompts
 * into validated, editable motion designs using the Phase 7 AI pipeline.
 */

import * as React from "react";
import {
  Sparkles,
  X,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Settings2,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AIWorkspaceProps,
  AIWorkspaceState,
  STAGE_DISPLAY_NAMES,
  EXAMPLE_PROMPTS,
  CONTEXTUAL_EXAMPLE_PROMPTS,
  StructuredPlanPreviewData,
} from "./types";
import { PlanPreview } from "./plan-preview";
import {
  requestAgentMotionDesign,
  requestContextualEdit,
  getAgentStatus,
  AgentStatusResponse,
} from "@/services/api/ai-client";
import { ContextualEditProposal } from "@/ai/contextual";
import { AgentExecutionResult } from "@/ai/agent/types";
import { sanitizeUserError } from "@/lib/error-sanitizer";
import { cn } from "@/lib/utils";

const MAX_PROMPT_CHARS = 1000;

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "None";
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

export const MotionBotAIWorkspace: React.FC<AIWorkspaceProps> = ({
  project,
  onApplyProject,
  onClose,
  className,
  initialPrompt = "",
  defaultProvider,
  activeScene,
  selectedElement,
  currentTime,
  defaultMode = "create",
}) => {
  const [workspaceMode, setWorkspaceMode] = React.useState<"edit" | "create">(defaultMode);
  const [prompt, setPrompt] = React.useState(initialPrompt);
  const [state, setState] = React.useState<AIWorkspaceState>("IDLE");
  const [activeStepText, setActiveStepText] = React.useState<string>("");
  const [executionResult, setExecutionResult] = React.useState<AgentExecutionResult | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string>("");
  const [agentStatus, setAgentStatus] = React.useState<AgentStatusResponse | null>(null);
  const [selectedProvider, setSelectedProvider] = React.useState<string>(defaultProvider || "openrouter");
  const [showSettings, setShowSettings] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Contextual Edit state
  const [contextualPrompt, setContextualPrompt] = React.useState<string>("");
  const [contextualLoading, setContextualLoading] = React.useState<boolean>(false);
  const [contextualProposal, setContextualProposal] = React.useState<ContextualEditProposal | null>(null);
  const [contextualError, setContextualError] = React.useState<string>("");
  const [appliedSuccessMessage, setAppliedSuccessMessage] = React.useState<string>("");
  const contextualTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Fetch initial agent status to display active model / mock status
  React.useEffect(() => {
    let isMounted = true;
    getAgentStatus().then((status) => {
      if (isMounted && status) {
        setAgentStatus(status);
        if (status.mockMode && !defaultProvider) {
          setSelectedProvider("mock");
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [defaultProvider]);

  // Handle prompt submission
  const handleGenerate = React.useCallback(async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setErrorMessage("Please enter a description for your motion design.");
      setState("ERROR");
      return;
    }

    setErrorMessage("");
    setState("UNDERSTANDING_REQUEST");
    setActiveStepText("Analyzing natural language request and creative constraints...");

    // Simulated progress transitions to reflect Phase 7 multi-stage pipeline
    const progressTimer1 = setTimeout(() => {
      setState("PREPARING_CONTEXT");
      setActiveStepText("Assembling project state, scene hierarchy, and memory context...");
    }, 400);

    const progressTimer2 = setTimeout(() => {
      setState("GENERATING_CREATIVE_DIRECTION");
      setActiveStepText("Creative Brain is synthesizing visual tone, typography, and color palette...");
    }, 900);

    const progressTimer3 = setTimeout(() => {
      setState("GENERATING_MOTION_PLAN");
      setActiveStepText("Motion Plan Generator is constructing frame-accurate keyframe tracks...");
    }, 1500);

    const progressTimer4 = setTimeout(() => {
      setState("VALIDATING");
      setActiveStepText("Running 4-stage reliability validation & safety boundary checks...");
    }, 2200);

    try {
      const response = await requestAgentMotionDesign({
        prompt: trimmed,
        projectId: project.id,
        initialProject: project,
        provider: selectedProvider,
      });

      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      clearTimeout(progressTimer3);
      clearTimeout(progressTimer4);

      if (response.success && response.result) {
        setExecutionResult(response.result);
        setState("READY_TO_APPLY");
      } else {
        setErrorMessage(
          sanitizeUserError(
            response.userFriendlyError,
            "MotionBot couldn't generate a valid motion plan. Your project hasn't been changed."
          )
        );
        setState("ERROR");
      }
    } catch (err: unknown) {
      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      clearTimeout(progressTimer3);
      clearTimeout(progressTimer4);
      setErrorMessage(
        sanitizeUserError(
          err,
          "MotionBot couldn't generate a valid motion plan. Your project hasn't been changed."
        )
      );
      setState("ERROR");
    }
  }, [prompt, project, selectedProvider]);

  // Keyboard shortcut: Cmd/Ctrl + Enter to trigger generate
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (prompt.trim() && state === "IDLE") {
        handleGenerate();
      }
    }
  };

  // Clicking an example populates prompt without auto-executing
  const handleSelectExample = (example: string) => {
    setPrompt(example);
    if (errorMessage) {
      setErrorMessage("");
      setState("IDLE");
    }
    textareaRef.current?.focus();
  };

  // Clear prompt
  const handleClearPrompt = () => {
    setPrompt("");
    setErrorMessage("");
    setState("IDLE");
    textareaRef.current?.focus();
  };

  // User clicks "Apply to Project" from plan preview
  const handleApplyToProject = React.useCallback(() => {
    if (!executionResult || !executionResult.finalProject) return;

    setState("APPLYING_TO_PROJECT");

    setTimeout(() => {
      onApplyProject(
        executionResult.finalProject,
        executionResult.brief,
        executionResult.motionPlan
      );
      setState("COMPLETE");
    }, 400);
  }, [executionResult, onApplyProject]);

  // User requests regeneration
  const handleRegenerate = () => {
    handleGenerate();
  };

  // User requests editing the prompt
  const handleEditPrompt = () => {
    setState("IDLE");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  // Contextual editing handlers
  const handleContextualSubmit = React.useCallback(
    async (overridePrompt?: string) => {
      const p = (overridePrompt || contextualPrompt).trim();
      if (!p) {
        setContextualError("Please enter an editing command.");
        return;
      }
      setContextualError("");
      setAppliedSuccessMessage("");
      setContextualLoading(true);

      try {
        const res = await requestContextualEdit({
          prompt: p,
          project,
          activeSceneId: activeScene?.id,
          selectedElementId: selectedElement?.id,
          timelineState: { currentTime },
          provider: selectedProvider,
        });

        if (res.success && res.proposal) {
          setContextualProposal(res.proposal);
        } else {
          setContextualError(
            sanitizeUserError(res.userFriendlyError, "Could not generate edit proposal.")
          );
        }
      } catch (err: unknown) {
        setContextualError(
          sanitizeUserError(err, "Failed to process contextual editing request.")
        );
      } finally {
        setContextualLoading(false);
      }
    },
    [contextualPrompt, project, activeScene, selectedElement, currentTime, selectedProvider]
  );

  const handleApplyContextual = React.useCallback(() => {
    if (!contextualProposal || !contextualProposal.candidateProject) return;
    onApplyProject(contextualProposal.candidateProject);
    setAppliedSuccessMessage("Changes applied! Press ⌘Z to undo.");
    setContextualProposal(null);
    setContextualPrompt("");
  }, [contextualProposal, onApplyProject]);

  const handleCancelContextual = React.useCallback(() => {
    setContextualProposal(null);
    setContextualError("");
  }, []);

  const handleRegenerateContextual = React.useCallback(() => {
    if (contextualProposal?.prompt) {
      handleContextualSubmit(contextualProposal.prompt);
    }
  }, [contextualProposal, handleContextualSubmit]);

  // Format preview data if result is available
  const planPreviewData: StructuredPlanPreviewData | null = React.useMemo(() => {
    if (!executionResult || !executionResult.brief) return null;
    const { brief, motionPlan, finalProject } = executionResult;

    const scenes =
      motionPlan?.scenes?.map((s, idx) => ({
        id: s.scene_id,
        order: idx,
        name: s.purpose ? `Scene ${idx + 1} — ${s.purpose}` : `Scene ${idx + 1}`,
        duration: s.duration,
        description: s.purpose,
      })) ||
      finalProject.scenes.map((s, idx) => ({
        id: s.id,
        order: s.order ?? idx,
        name: s.name,
        duration: s.duration,
      }));

    const elementsCount =
      motionPlan?.scenes?.reduce(
        (acc, s) => acc + (s.visual_elements?.length || 0) + (s.text_elements?.length || 0),
        0
      ) ||
      finalProject.scenes.reduce((acc, s) => acc + (s.elements?.length || 0), 0);

    const palette =
      brief.visualDirection?.palette ||
      motionPlan?.global_style?.palette ||
      ([
        brief.colorDirection?.background,
        brief.colorDirection?.primary,
        brief.colorDirection?.secondary,
        brief.colorDirection?.accent,
      ].filter(Boolean) as string[]) ||
      ["#08090C", "#FFFFFF", "#00F0FF"];

    const fps = motionPlan?.canvas?.fps || finalProject.fps || 30;

    const typography =
      brief.visualDirection?.typography ||
      motionPlan?.global_style?.typography ||
      "Inter / System Sans";

    const motionStyle = brief.animationDirection?.pacing
      ? `${brief.animationDirection.pacing} (${brief.animationDirection.transitionStyle || "spring transitions"})`
      : "Spring Dynamic Transitions";

    return {
      title: brief.title || "Generated Motion Design",
      style: brief.style || brief.visualDirection?.theme || "Modern Commercial",
      durationSec: brief.duration || motionPlan?.duration || finalProject.duration,
      fps,
      aspectRatio: brief.aspectRatio || motionPlan?.canvas?.aspect_ratio || `${finalProject.width}:${finalProject.height}`,
      scenesCount: scenes.length,
      scenes,
      typography,
      motionStyle,
      colorPalette: palette.length > 0 ? palette : ["#08090C", "#FFFFFF", "#00F0FF"],
      elementsCount,
    };
  }, [executionResult]);

  const isGenerating =
    state === "UNDERSTANDING_REQUEST" ||
    state === "PREPARING_CONTEXT" ||
    state === "GENERATING_CREATIVE_DIRECTION" ||
    state === "GENERATING_MOTION_PLAN" ||
    state === "VALIDATING";

  return (
    <div
      aria-label="MotionBot AI Workspace"
      className={cn(
        "flex flex-col h-full w-full bg-surface border-l border-border select-none overflow-hidden font-sans",
        className
      )}
    >
      {/* 1. WORKSPACE HEADER */}
      <div className="h-10 px-3 border-b border-border bg-surface-elevated/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-5 w-5 rounded-xs bg-accent/20 border border-accent/40 text-accent">
            <Sparkles className="h-3 w-3" />
          </div>
          <span className="text-small font-semibold text-text-primary tracking-tight">
            MOTIONBOT AI
          </span>
          <div className="flex items-center gap-1.5 ml-1 px-1.5 py-0.5 rounded-xs border border-border bg-surface text-[10px] font-mono text-text-muted">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                selectedProvider === "mock" ? "bg-amber-400" : "bg-emerald-400"
              )}
            />
            <span>
              {selectedProvider === "mock"
                ? "Mock Mode"
                : agentStatus?.activeModel
                ? "Nemotron 3 Ultra"
                : "Active"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowSettings(!showSettings)}
            aria-label="AI Settings"
            className={cn(showSettings && "text-accent bg-surface-elevated")}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>

          {onClose && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close AI Workspace"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Provider & Settings Drawer (collapsible) */}
      {showSettings && (
        <div className="p-3 border-b border-border bg-surface-elevated/30 text-xs space-y-2 shrink-0">
          <div className="flex items-center justify-between text-[11px] font-medium text-text-muted">
            <span>Execution Provider</span>
            <span className="font-mono text-[10px] text-text-secondary">
              {selectedProvider === "openrouter" ? "OpenRouter (Remote)" : "Mock (Offline)"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedProvider("openrouter")}
              className={cn(
                "px-2 py-1 rounded-xs border text-left transition-colors flex items-center justify-between text-[11px]",
                selectedProvider === "openrouter"
                  ? "border-accent bg-accent/10 text-accent font-semibold"
                  : "border-border bg-surface text-text-secondary hover:text-text-primary"
              )}
            >
              <span>NVIDIA Nemotron</span>
              {selectedProvider === "openrouter" && <CheckCircle2 className="h-3 w-3" />}
            </button>
            <button
              type="button"
              onClick={() => setSelectedProvider("mock")}
              className={cn(
                "px-2 py-1 rounded-xs border text-left transition-colors flex items-center justify-between text-[11px]",
                selectedProvider === "mock"
                  ? "border-accent bg-accent/10 text-accent font-semibold"
                  : "border-border bg-surface text-text-secondary hover:text-text-primary"
              )}
            >
              <span>Mock (Offline)</span>
              {selectedProvider === "mock" && <CheckCircle2 className="h-3 w-3" />}
            </button>
          </div>
          <div className="text-[10px] text-text-muted flex items-center gap-1 pt-1">
            <ShieldCheck className="h-3 w-3 text-emerald-400 shrink-0" />
            <span>API credentials stay strictly server-side. Zero browser key leakage.</span>
          </div>
        </div>
      )}

      {/* Mode Switcher */}
      <div className="flex border-b border-border bg-surface-elevated/20 text-xs shrink-0">
        <button
          type="button"
          onClick={() => {
            setWorkspaceMode("edit");
            setContextualError("");
            setAppliedSuccessMessage("");
          }}
          className={cn(
            "flex-1 py-2 px-3 text-center font-medium border-b-2 transition-all",
            workspaceMode === "edit"
              ? "border-accent text-accent bg-accent/5 font-semibold"
              : "border-transparent text-text-muted hover:text-text-primary"
          )}
        >
          Edit Assistant
        </button>
        <button
          type="button"
          onClick={() => {
            setWorkspaceMode("create");
            setErrorMessage("");
          }}
          className={cn(
            "flex-1 py-2 px-3 text-center font-medium border-b-2 transition-all",
            workspaceMode === "create"
              ? "border-accent text-accent bg-accent/5 font-semibold"
              : "border-transparent text-text-muted hover:text-text-primary"
          )}
        >
          New Motion
        </button>
      </div>

      {/* 2. BODY CONTENT */}
      <div className="flex-1 overflow-y-auto">
        {workspaceMode === "edit" ? (
          /* CONTEXTUAL EDIT ASSISTANT */
          <div className="p-3 space-y-3.5">
            {/* Target Context Info */}
            <div className="p-2.5 rounded-xs border border-border bg-surface-elevated/40 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-muted">Target Scene:</span>
                <span className="text-text-primary font-medium">{activeScene?.name || project.scenes[0]?.name || "Scene 1"}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-muted">Target Layer:</span>
                <span className={cn(selectedElement ? "text-accent font-medium" : "text-text-muted")}>
                  {selectedElement ? selectedElement.name : "None (Scene-level)"}
                </span>
              </div>
            </div>

            {/* Success Notification */}
            {appliedSuccessMessage && (
              <div className="p-2.5 rounded-xs border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{appliedSuccessMessage}</span>
              </div>
            )}

            {/* Proposal Card (Preview Before Apply) */}
            {contextualProposal ? (
              <div className="p-3 rounded-xs border border-accent/40 bg-accent/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Proposed Change</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">
                    {contextualProposal.actions.length} action(s)
                  </span>
                </div>

                <div className="text-xs text-text-primary leading-relaxed font-medium">
                  {contextualProposal.summary}
                </div>

                {/* Ambiguity Alert */}
                {contextualProposal.isAmbiguous && (
                  <div className="p-2.5 rounded-xs border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Clarification Needed</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-200/90">
                      {contextualProposal.ambiguityQuestion || "Please specify which element or property you would like to edit."}
                    </p>
                  </div>
                )}

                {/* Validation Errors */}
                {!contextualProposal.isValid && contextualProposal.validationErrors.length > 0 && (
                  <div className="p-2.5 rounded-xs border border-danger/40 bg-danger/10 text-danger text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Validation Issue</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {contextualProposal.validationErrors.join("; ")}
                    </p>
                  </div>
                )}

                {/* Action Diffs Preview */}
                {contextualProposal.isValid && contextualProposal.actions.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {contextualProposal.actions.map((act) => (
                      <div
                        key={act.id}
                        className="p-2 rounded-xs border border-border/80 bg-surface text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="text-text-primary font-semibold">{act.targetName}</span>
                          <span className="text-text-muted">{act.property}</span>
                        </div>
                        <div className="flex items-center gap-2 text-text-secondary">
                          <span className="line-through text-text-muted">{formatValue(act.previousValue)}</span>
                          <span className="text-accent">→</span>
                          <span className="font-semibold text-emerald-400">{formatValue(act.proposedValue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons: Apply, Cancel, Regenerate */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                  {contextualProposal.isValid && contextualProposal.actions.length > 0 && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 text-xs font-semibold h-8"
                      onClick={handleApplyContextual}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      <span>Apply</span>
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs px-3"
                    onClick={handleCancelContextual}
                  >
                    <span>Cancel</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs px-2.5 text-text-secondary hover:text-text-primary"
                    onClick={handleRegenerateContextual}
                    title="Regenerate this edit"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    <span>Regenerate</span>
                  </Button>
                </div>
              </div>
            ) : (
              /* Contextual Prompt Input */
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-[11px] font-medium text-text-primary">
                    Natural Language Editing
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Instruct MotionBot to adjust text sizes, center elements, modify timing, alter colors, or tune motion.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="relative rounded-xs border border-border focus-within:border-accent bg-surface-elevated/40 transition-colors">
                    <textarea
                      ref={contextualTextareaRef}
                      value={contextualPrompt}
                      onChange={(e) => {
                        setContextualPrompt(e.target.value);
                        if (contextualError) setContextualError("");
                      }}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          if (contextualPrompt.trim() && !contextualLoading) {
                            handleContextualSubmit();
                          }
                        }
                      }}
                      disabled={contextualLoading}
                      rows={3}
                      placeholder="e.g. 'Make the headline bigger', 'Move the logo to the center', 'Make the animation slower'..."
                      className="w-full bg-transparent p-2.5 text-xs text-text-primary placeholder:text-text-muted/60 resize-none focus:outline-none"
                    />
                    <div className="px-2.5 py-1 border-t border-border-subtle/50 flex items-center justify-between text-[10px] font-mono text-text-muted">
                      <span>{contextualPrompt.length} chars</span>
                      {contextualPrompt && !contextualLoading && (
                        <button
                          type="button"
                          onClick={() => setContextualPrompt("")}
                          className="hover:text-text-primary transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] text-text-muted/70 flex items-center justify-between px-0.5">
                    <span>Press ⌘+Enter to edit</span>
                    <span>Safe Preview Mode</span>
                  </div>
                </div>

                {/* Error Banner */}
                {contextualError && (
                  <div className="p-2.5 rounded-xs border border-danger/40 bg-danger/10 text-danger text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="leading-snug">{contextualError}</span>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full gap-2 text-xs font-semibold shadow-subtle h-8"
                  disabled={contextualLoading || !contextualPrompt.trim()}
                  onClick={() => handleContextualSubmit()}
                >
                  {contextualLoading ? (
                    <>
                      <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      <span>Synthesizing Edit...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Propose Changes</span>
                    </>
                  )}
                </Button>

                {/* Quick Prompts */}
                <div className="space-y-1.5 pt-2">
                  <div className="text-[10px] font-mono uppercase text-text-muted">
                    Quick Commands:
                  </div>
                  <div className="space-y-1">
                    {CONTEXTUAL_EXAMPLE_PROMPTS.map((ex, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={contextualLoading}
                        onClick={() => {
                          setContextualPrompt(ex);
                          handleContextualSubmit(ex);
                        }}
                        className="w-full text-left p-2 rounded-xs border border-border hover:border-accent/40 bg-surface-elevated/20 hover:bg-surface-elevated/60 text-[11px] text-text-secondary hover:text-text-primary transition-all flex items-center justify-between group disabled:opacity-50"
                      >
                        <span className="truncate">• {ex}</span>
                        <ChevronRight className="h-3 w-3 text-text-muted group-hover:text-accent transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* CREATE MODE (Existing Generator) */
          <div>
            {state === "READY_TO_APPLY" && planPreviewData ? (
              <PlanPreview
                data={planPreviewData}
                onApply={handleApplyToProject}
                onRegenerate={handleRegenerate}
                onEditPrompt={handleEditPrompt}
              />
            ) : state === "APPLYING_TO_PROJECT" ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                <div className="space-y-1">
                  <h3 className="text-small font-semibold text-text-primary">
                    Applying Plan to Project
                  </h3>
                  <p className="text-[11px] text-text-secondary">
                    Updating scenes, keyframe animation tracks, and visual elements...
                  </p>
                </div>
              </div>
            ) : state === "COMPLETE" ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-subtle">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-small font-semibold text-text-primary">
                    Applied to Project!
                  </h3>
                  <p className="text-[11px] text-text-secondary leading-relaxed max-w-xs">
                    Your motion design is now live in the canvas, layer list, and timeline. You can
                    edit any element or ask MotionBot for modifications.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 text-xs text-text-primary"
                  onClick={() => {
                    setState("IDLE");
                    setPrompt("");
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  <span>Create Another Design</span>
                </Button>
              </div>
            ) : (
              <div className="p-3 space-y-4">
                <div className="space-y-1">
                  <div className="text-[11px] font-medium text-text-primary">
                    Describe what you want to create...
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Enter an ad description, kinetic typography concept, or scene animation request.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="relative rounded-xs border border-border focus-within:border-accent bg-surface-elevated/40 transition-colors">
                    <textarea
                      ref={textareaRef}
                      value={prompt}
                      onChange={(e) => {
                        if (e.target.value.length <= MAX_PROMPT_CHARS) {
                          setPrompt(e.target.value);
                          if (errorMessage) {
                            setErrorMessage("");
                            setState("IDLE");
                          }
                        }
                      }}
                      onKeyDown={handleKeyDown}
                      disabled={isGenerating}
                      rows={4}
                      placeholder="e.g. Create a 10-second premium smartwatch advertisement with a dark background, bold kinetic typography, and smooth spring transitions."
                      className="w-full bg-transparent p-2.5 text-xs text-text-primary placeholder:text-text-muted/60 resize-none focus:outline-none"
                    />

                    <div className="px-2.5 py-1.5 border-t border-border-subtle/50 flex items-center justify-between text-[10px] font-mono text-text-muted">
                      <span>
                        {prompt.length} / {MAX_PROMPT_CHARS}
                      </span>
                      {prompt && !isGenerating && (
                        <button
                          type="button"
                          onClick={handleClearPrompt}
                          className="hover:text-text-primary transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-[10px] text-text-muted/70 flex items-center justify-between px-0.5">
                    <span>Press ⌘+Enter to generate</span>
                    <span>4-Stage Validation Active</span>
                  </div>
                </div>

                {state === "ERROR" && (
                  <div className="p-2.5 rounded-xs border border-danger/40 bg-danger/10 text-danger text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="leading-snug">
                        {errorMessage ||
                          "MotionBot couldn't generate a valid motion plan. Your project hasn't been changed."}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px] text-danger hover:bg-danger/20"
                        onClick={handleGenerate}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        <span>Try Again</span>
                      </Button>
                    </div>
                  </div>
                )}

                {isGenerating && (
                  <div className="p-3 rounded-xs border border-accent/30 bg-accent/5 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
                      <span className="text-[11px] font-semibold text-accent font-mono uppercase tracking-wider">
                        {STAGE_DISPLAY_NAMES[state]}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-secondary leading-relaxed">
                      {activeStepText}
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                      {[
                        "UNDERSTANDING_REQUEST",
                        "PREPARING_CONTEXT",
                        "GENERATING_CREATIVE_DIRECTION",
                        "GENERATING_MOTION_PLAN",
                        "VALIDATING",
                      ].map((step, idx) => {
                        const isPassed =
                          [
                            "UNDERSTANDING_REQUEST",
                            "PREPARING_CONTEXT",
                            "GENERATING_CREATIVE_DIRECTION",
                            "GENERATING_MOTION_PLAN",
                            "VALIDATING",
                          ].indexOf(state) >= idx;
                        return (
                          <div
                            key={step}
                            className={cn(
                              "h-1 flex-1 rounded-full transition-all duration-300",
                              isPassed ? "bg-accent" : "bg-border"
                            )}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full gap-2 text-xs font-semibold shadow-subtle"
                  disabled={isGenerating || !prompt.trim()}
                  onClick={handleGenerate}
                >
                  {isGenerating ? (
                    <>
                      <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      <span>Processing Request...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Generate Motion Design</span>
                    </>
                  )}
                </Button>

                <div className="space-y-2 pt-1">
                  <div className="text-[10px] font-mono uppercase text-text-muted">
                    Examples:
                  </div>
                  <div className="space-y-1.5">
                    {EXAMPLE_PROMPTS.map((example, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={isGenerating}
                        onClick={() => handleSelectExample(example)}
                        className="w-full text-left p-2 rounded-xs border border-border hover:border-accent/40 bg-surface-elevated/20 hover:bg-surface-elevated/60 text-[11px] text-text-secondary hover:text-text-primary transition-all flex items-center justify-between group disabled:opacity-50"
                      >
                        <span className="truncate">• {example}</span>
                        <ChevronRight className="h-3 w-3 text-text-muted group-hover:text-accent transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
