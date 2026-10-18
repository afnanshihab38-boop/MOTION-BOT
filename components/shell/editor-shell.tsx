"use client";

/**
 * MOTION-BOT — Master Editor Shell
 * Integrates:
 * - Stage Canvas Viewport (EditorCanvas)
 * - Visual Timeline Dock (TimelinePanel)
 * - Context-Aware Inspector (CanvasInspector)
 * - MotionBot AI Workspace (MotionBotAIWorkspace)
 * - Project History (Undo / Redo)
 * Phase 8.1: AI Prompt -> Editor Integration
 */

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  MousePointer,
  Hand,
  Type,
  Square,
  Image as ImageIcon,
  Sparkles,
  RotateCcw,
  RotateCw,
  Download,
  Share2,
  Sliders,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Divider } from "@/components/ui/divider";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EditorCanvas } from "@/components/editor/editor-canvas";
import { CanvasInspector } from "@/components/editor/canvas-inspector";
import { MotionBotAIWorkspace } from "@/components/editor/ai-workspace";
import { SceneBar } from "@/components/editor/scene-bar";
import { AssetPanel } from "@/components/editor/asset-panel";
import { TimelinePanel } from "@/components/timeline/timeline-panel";
import { ExportDialog } from "@/components/editor/export-dialog";
import { createSampleProject } from "@/services/project/sample-project";
import {
  createInitialEditorState,
  getActiveScene,
  selectElementInState,
  setViewportZoom,
  fitCanvasToViewport,
  updateElementInActiveScene,
  toggleElementLockInActiveScene,
  toggleElementVisibilityInActiveScene,
  deleteElementInActiveScene,
  duplicateElementInActiveScene,
  reorderElementInActiveScene,
  addSceneToEditor,
  selectSceneInEditor,
  renameSceneInEditor,
  duplicateSceneInEditor,
  deleteSceneInEditor,
  reorderScenesInEditor,
  addAssetToEditor,
  removeAssetFromEditor,
  addAssetElementToActiveScene,
} from "@/services/editor/editor-state";
import { AutosaveManager } from "@/services/storage/autosave-manager";
import { syncPropertyWithKeyframes } from "@/services/timeline";
import { defaultTimelineManager } from "@/timeline";
import { AnimatableProperty } from "@/types/animation";
import { Project } from "@/types/project";
import { EditorState, EditorTool } from "@/types/editor";
import { MotionElement } from "@/types/element";
import { SceneBackground } from "@/types/scene";
import { Asset } from "@/types/asset";
import { cn } from "@/lib/utils";

export interface EditorShellProps {
  projectTitle?: string;
  initialProject?: Project;
}

export function EditorShell({
  projectTitle,
  initialProject,
}: EditorShellProps) {
  // 1. Single Canonical Editor & Project State (One Source of Truth)
  const [editorState, setEditorState] = React.useState<EditorState>(() => {
    const proj = initialProject || createSampleProject();
    return createInitialEditorState(proj);
  });
  const project = editorState.project;

  const [history, setHistory] = React.useState<Project[]>([]);
  const [future, setFuture] = React.useState<Project[]>([]);

  // Push history snapshot for discrete or committed changes
  const pushHistory = React.useCallback((prevProject: Project) => {
    setHistory((prev) => [...prev, prevProject]);
    setFuture([]);
  }, []);

  // Autosave Manager Integration (Debounced storage commits)
  const [saveStatus, setSaveStatus] = React.useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const autosaveManagerRef = React.useRef<AutosaveManager | null>(null);
  const lastProjectRef = React.useRef<Project>(initialProject || project);

  React.useEffect(() => {
    const manager = new AutosaveManager({
      debounceMs: 1000,
      onStatusChange: (status) => setSaveStatus(status.state),
    });
    manager.loadProject(editorState.project);
    autosaveManagerRef.current = manager;

    return () => {
      manager.dispose();
    };
    // Mount-only initialization for AutosaveManager baseline
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Continuous autosave change listener on editorState.project
  React.useEffect(() => {
    if (autosaveManagerRef.current && editorState.project !== lastProjectRef.current) {
      lastProjectRef.current = editorState.project;
      autosaveManagerRef.current.notifyChange(editorState.project);
    }
  }, [editorState.project]);

  // Keyboard shortcut: Ctrl+S / Cmd+S manual save
  React.useEffect(() => {
    const handleSaveShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void autosaveManagerRef.current?.saveNow();
      }
    };
    window.addEventListener("keydown", handleSaveShortcut);
    return () => window.removeEventListener("keydown", handleSaveShortcut);
  }, []);

  // Browser beforeunload protection if unsaved changes exist
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === "unsaved" || saveStatus === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveStatus]);

  // 2. Panel & Layout States
  const [isRightSidebarOpen, setIsRightSidebarOpen] = React.useState(true);
  const [activeRightTab, setActiveRightTab] = React.useState<"ai" | "properties" | "assets">("ai");
  const [zoomSelection, setZoomSelection] = React.useState<string>("fit");
  const [currentTime, setCurrentTime] = React.useState<number>(0);
  const [isExportDialogOpen, setIsExportDialogOpen] = React.useState(false);

  // Active scene and selected element derived from live editor state
  const activeScene = getActiveScene(editorState) || project.scenes[0];
  const selectedElementId = editorState.selectedElementIds[0] || null;
  const selectedElement =
    activeScene?.elements.find((el) => el.id === selectedElementId) || null;

  const displayTitle = projectTitle || project.name || "Untitled Motion Comp 01";

  // 3. Undo / Redo Handlers
  const handleUndo = React.useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [editorState.project, ...prev]);
    setEditorState((prev) => ({
      ...prev,
      project: previous,
    }));
    autosaveManagerRef.current?.notifyChange(previous);
  }, [history, editorState.project]);

  const handleRedo = React.useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, editorState.project]);
    setEditorState((prev) => ({
      ...prev,
      project: next,
    }));
    autosaveManagerRef.current?.notifyChange(next);
  }, [future, editorState.project]);

  // Canvas commit for single-step drag / resize / rotate undo history
  const handleCanvasCommit = React.useCallback((previousProject: Project) => {
    pushHistory(previousProject);
    autosaveManagerRef.current?.notifyChange(editorState.project);
  }, [pushHistory, editorState.project]);

  // 4. Layer Manipulation Actions
  const handleDeleteElement = React.useCallback((elementId?: string) => {
    const targetId = elementId || editorState.selectedElementIds[0];
    if (!targetId) return;
    pushHistory(editorState.project);
    setEditorState((prev) => deleteElementInActiveScene(prev, targetId));
    autosaveManagerRef.current?.notifyChange(editorState.project);
  }, [editorState.selectedElementIds, editorState.project, pushHistory]);

  const handleDuplicateElement = React.useCallback((elementId?: string) => {
    const targetId = elementId || editorState.selectedElementIds[0];
    if (!targetId) return;
    pushHistory(editorState.project);
    setEditorState((prev) => duplicateElementInActiveScene(prev, targetId));
    autosaveManagerRef.current?.notifyChange(editorState.project);
  }, [editorState.selectedElementIds, editorState.project, pushHistory]);

  const handleReorderElement = React.useCallback(
    (elementId: string, action: "bringForward" | "sendBackward" | "bringToFront" | "sendToBack") => {
      pushHistory(editorState.project);
      setEditorState((prev) => reorderElementInActiveScene(prev, elementId, action));
      autosaveManagerRef.current?.notifyChange(editorState.project);
    },
    [editorState.project, pushHistory]
  );

  const handleToggleVisibility = React.useCallback((elementId: string) => {
    pushHistory(editorState.project);
    setEditorState((prev) => toggleElementVisibilityInActiveScene(prev, elementId));
    autosaveManagerRef.current?.notifyChange(editorState.project);
  }, [editorState.project, pushHistory]);

  const handleLockToggle = React.useCallback((elementId: string, locked?: boolean) => {
    pushHistory(editorState.project);
    setEditorState((prev) => toggleElementLockInActiveScene(prev, elementId, locked));
    autosaveManagerRef.current?.notifyChange(editorState.project);
  }, [editorState.project, pushHistory]);

  // 4b. Scene Manipulation Handlers
  const handleSelectScene = React.useCallback(
    (sceneId: string) => {
      if (sceneId === editorState.activeSceneId) return;
      defaultTimelineManager.stop();
      setCurrentTime(0);
      setEditorState((prev) => selectSceneInEditor(prev, sceneId));
      autosaveManagerRef.current?.notifyChange(editorState.project);
    },
    [editorState.activeSceneId, editorState.project]
  );

  const handleCreateScene = React.useCallback(() => {
    pushHistory(editorState.project);
    defaultTimelineManager.stop();
    setCurrentTime(0);
    setEditorState((prev) => addSceneToEditor(prev));
    autosaveManagerRef.current?.notifyChange(editorState.project);
  }, [editorState.project, pushHistory]);

  const handleRenameScene = React.useCallback(
    (sceneId: string, newName: string) => {
      pushHistory(editorState.project);
      setEditorState((prev) => renameSceneInEditor(prev, sceneId, newName));
      autosaveManagerRef.current?.notifyChange(editorState.project);
    },
    [editorState.project, pushHistory]
  );

  const handleDuplicateScene = React.useCallback(
    (sceneId: string) => {
      pushHistory(editorState.project);
      defaultTimelineManager.stop();
      setCurrentTime(0);
      setEditorState((prev) => duplicateSceneInEditor(prev, sceneId));
      autosaveManagerRef.current?.notifyChange(editorState.project);
    },
    [editorState.project, pushHistory]
  );

  const handleDeleteScene = React.useCallback(
    (sceneId: string) => {
      if (editorState.project.scenes.length <= 1) return;
      pushHistory(editorState.project);
      defaultTimelineManager.stop();
      setCurrentTime(0);
      setEditorState((prev) => deleteSceneInEditor(prev, sceneId));
      autosaveManagerRef.current?.notifyChange(editorState.project);
    },
    [editorState.project, pushHistory]
  );

  const handleReorderScenes = React.useCallback(
    (fromIndex: number, toIndex: number) => {
      pushHistory(editorState.project);
      setEditorState((prev) => reorderScenesInEditor(prev, fromIndex, toIndex));
      autosaveManagerRef.current?.notifyChange(editorState.project);
    },
    [editorState.project, pushHistory]
  );

  // 4c. Asset Manipulation Handlers
  const handleAddAssetToProject = React.useCallback(
    (asset: Asset) => {
      pushHistory(editorState.project);
      setEditorState((prev) => addAssetToEditor(prev, asset));
      autosaveManagerRef.current?.notifyChange(editorState.project);
    },
    [editorState.project, pushHistory]
  );

  const handleRemoveAssetFromProject = React.useCallback(
    (assetId: string) => {
      pushHistory(editorState.project);
      setEditorState((prev) => removeAssetFromEditor(prev, assetId));
      autosaveManagerRef.current?.notifyChange(editorState.project);
    },
    [editorState.project, pushHistory]
  );

  const handleAddAssetToCanvas = React.useCallback(
    (assetId: string) => {
      pushHistory(editorState.project);
      setEditorState((prev) => addAssetElementToActiveScene(prev, assetId));
      setActiveRightTab("properties");
      if (!isRightSidebarOpen) {
        setIsRightSidebarOpen(true);
      }
      autosaveManagerRef.current?.notifyChange(editorState.project);
    },
    [editorState.project, isRightSidebarOpen, pushHistory]
  );

  // Global keyboard shortcuts for Undo / Redo / Delete / Duplicate
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d" && editorState.selectedElementIds.length > 0) {
        e.preventDefault();
        handleDuplicateElement();
      } else if ((e.code === "Delete" || e.code === "Backspace") && editorState.selectedElementIds.length > 0) {
        e.preventDefault();
        handleDeleteElement();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, handleDuplicateElement, handleDeleteElement, editorState.selectedElementIds]);

  // 5. Applying AI Generated Plan to Project
  const handleApplyAIProject = React.useCallback(
    async (newProject: Project) => {
      // Record undo snapshot
      pushHistory(editorState.project);

      setEditorState((prev) => {
        const nextState = createInitialEditorState(
          newProject,
          prev.viewport.containerWidth,
          prev.viewport.containerHeight
        );
        // Automatically select first element of the first scene if available
        const firstScene = newProject.scenes[0];
        const firstElem = firstScene?.elements[0];
        if (firstElem) {
          return selectElementInState(nextState, firstElem.id);
        }
        return nextState;
      });

      lastProjectRef.current = newProject;
      autosaveManagerRef.current?.loadProject(newProject);
      await autosaveManagerRef.current?.saveNow();

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("projectId", newProject.id);
        window.history.replaceState(null, "", url.toString());
      }
    },
    [editorState.project, pushHistory]
  );

  // 6. Tool Selection Handler
  const handleSelectTool = (tool: EditorTool) => {
    setEditorState((prev) => ({ ...prev, activeTool: tool }));
    if (tool === "image") {
      setIsRightSidebarOpen(true);
      setActiveRightTab("assets");
    }
  };

  // 7. Viewport Zoom Selector
  const handleZoomChange = (value: string) => {
    setZoomSelection(value);
    if (value === "fit") {
      setEditorState(fitCanvasToViewport);
    } else if (value === "50%") {
      setEditorState((prev) => setViewportZoom(prev, 0.5));
    } else if (value === "100%") {
      setEditorState((prev) => setViewportZoom(prev, 1.0));
    }
  };

  // 8. Element Selection Handlers
  const handleSelectElement = (elementId: string) => {
    setEditorState((prev) => selectElementInState(prev, elementId));
    // Switch to properties tab when user clicks an element
    setActiveRightTab("properties");
    if (!isRightSidebarOpen) {
      setIsRightSidebarOpen(true);
    }
  };

  // 9. Element Updates from Inspector
  const handleUpdateElement = (updates: Partial<MotionElement>) => {
    if (!selectedElement) return;
    pushHistory(editorState.project);

    let updatedElement: MotionElement = { ...selectedElement, ...updates } as unknown as MotionElement;

    // Synchronize animated properties with keyframes at current playhead time
    if (updates.transform) {
      for (const [key, val] of Object.entries(updates.transform)) {
        if (
          val !== undefined &&
          ["x", "y", "scaleX", "scaleY", "rotation", "width", "height"].includes(key)
        ) {
          updatedElement = syncPropertyWithKeyframes(
            updatedElement,
            key as AnimatableProperty,
            val as number,
            currentTime,
            project.fps
          );
        }
      }
    }

    if (updates.appearance?.opacity !== undefined) {
      updatedElement = syncPropertyWithKeyframes(
        updatedElement,
        "opacity",
        updates.appearance.opacity,
        currentTime,
        project.fps
      );
    }

    setEditorState((prev) =>
      updateElementInActiveScene(prev, selectedElement.id, updatedElement)
    );
    autosaveManagerRef.current?.notifyChange(editorState.project);
  };

  const handleUpdateSceneBackground = (bg: SceneBackground) => {
    if (!activeScene) return;
    pushHistory(editorState.project);
    setEditorState((prev) => {
      const updatedScenes = prev.project.scenes.map((s) =>
        s.id === activeScene.id ? { ...s, background: bg } : s
      );
      return {
        ...prev,
        project: {
          ...prev.project,
          scenes: updatedScenes,
        },
      };
    });
    autosaveManagerRef.current?.notifyChange(editorState.project);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background text-text-primary select-none font-sans">
      {/* 1. TOP TOOLBAR */}
      <header className="h-11 w-full border-b border-border bg-surface px-3 flex items-center justify-between shrink-0 z-30">
        {/* Left: Navigation, Title & Save Status */}
        <div className="flex items-center gap-3">
          <Link href="/projects">
            <Button variant="ghost" size="icon-sm" aria-label="Return to projects">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="flex items-center gap-2.5">
            <span className="text-small font-semibold text-text-primary tracking-tight truncate max-w-[240px]">
              {displayTitle}
            </span>
            <span className="rounded-xs bg-surface-elevated border border-border px-1.5 py-0.2 text-[10px] font-mono text-text-muted">
              {project.width} × {project.height} • {project.fps} FPS
            </span>
          </div>

          <Divider orientation="vertical" className="h-4 hidden sm:inline-block" />

          {/* Visual Save Status */}
          <div
            className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono cursor-pointer select-none"
            onClick={() => {
              if (saveStatus === "unsaved" || saveStatus === "error") {
                void autosaveManagerRef.current?.saveNow();
              }
            }}
            title={
              saveStatus === "error"
                ? "Save failed. Click to retry."
                : saveStatus === "unsaved"
                ? "Unsaved changes. Click to save now (⌘S)."
                : saveStatus === "saving"
                ? "Saving changes to storage..."
                : "All changes saved to storage."
            }
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                saveStatus === "saved" && "bg-emerald-500",
                saveStatus === "saving" && "bg-amber-500 animate-pulse",
                saveStatus === "unsaved" && "bg-amber-400",
                saveStatus === "error" && "bg-rose-500"
              )}
            />
            <span
              className={cn(
                "transition-colors",
                saveStatus === "error" && "text-rose-400 font-semibold",
                saveStatus === "unsaved" && "text-amber-300/90",
                saveStatus === "saving" && "text-amber-400",
                saveStatus === "saved" && "text-text-muted"
              )}
            >
              {saveStatus === "saving"
                ? "Saving..."
                : saveStatus === "unsaved"
                ? "Unsaved changes"
                : saveStatus === "error"
                ? "Save failed"
                : "Saved"}
            </span>
            {saveStatus === "error" && (
              <button
                type="button"
                onClick={() => void autosaveManagerRef.current?.saveNow()}
                className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-sans hover:bg-rose-500/30 transition-colors cursor-pointer"
                title="Click to retry saving project"
              >
                Retry Save
              </button>
            )}
          </div>
        </div>

        {/* Center: Stage Viewport & History Controls */}
        <div className="hidden md:flex items-center gap-2">
          <div className="flex items-center">
            <Tooltip content="Undo" shortcut="⌘Z">
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={history.length === 0}
                onClick={handleUndo}
                aria-label="Undo"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </Tooltip>
            <Tooltip content="Redo" shortcut="⇧⌘Z">
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={future.length === 0}
                onClick={handleRedo}
                aria-label="Redo"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </Button>
            </Tooltip>
          </div>

          <Divider orientation="vertical" className="h-4" />

          {/* Viewport Zoom Selector */}
          <SegmentedControl
            size="sm"
            value={zoomSelection}
            onValueChange={handleZoomChange}
            options={[
              { value: "50%", label: "50%" },
              { value: "fit", label: "Fit" },
              { value: "100%", label: "100%" },
            ]}
          />
        </div>

        {/* Right: AI Panel Toggle & Actions */}
        <div className="flex items-center gap-2">
          {/* Prominent MotionBot AI Toggle Button */}
          <Button
            variant={isRightSidebarOpen && activeRightTab === "ai" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "gap-1.5 text-xs font-semibold transition-all",
              isRightSidebarOpen && activeRightTab === "ai"
                ? "border-accent/40 bg-accent/15 text-accent shadow-xs"
                : "text-text-primary hover:text-accent"
            )}
            onClick={() => {
              if (isRightSidebarOpen && activeRightTab === "ai") {
                setIsRightSidebarOpen(false);
              } else {
                setIsRightSidebarOpen(true);
                setActiveRightTab("ai");
              }
            }}
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>MotionBot AI</span>
          </Button>

          <Divider orientation="vertical" className="h-4 hidden sm:inline-block" />

          <Button variant="ghost" size="sm" className="gap-1.5 text-text-secondary hidden sm:inline-flex">
            <Share2 className="h-3.5 w-3.5" />
            <span>Share</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            className="gap-1.5"
            onClick={() => setIsExportDialogOpen(true)}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </Button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE (Left Tool Panel + Center Canvas Area + Right Sidebar) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT TOOL PANEL */}
        <aside
          aria-label="Tool Panel"
          className="w-11 border-r border-border bg-surface flex flex-col items-center py-2.5 gap-1.5 shrink-0 z-20"
        >
          <Tooltip content="Select Tool" shortcut="V" side="right">
            <Button
              variant={editorState.activeTool === "select" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => handleSelectTool("select")}
              aria-label="Select Tool"
              className={cn(editorState.activeTool === "select" && "border-accent text-accent")}
            >
              <MousePointer className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip content="Text Tool" shortcut="T" side="right">
            <Button
              variant={editorState.activeTool === "text" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => handleSelectTool("text")}
              aria-label="Text Tool"
              className={cn(editorState.activeTool === "text" && "border-accent text-accent")}
            >
              <Type className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip content="Shape Tool" shortcut="R" side="right">
            <Button
              variant={editorState.activeTool === "shape" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => handleSelectTool("shape")}
              aria-label="Shape Tool"
              className={cn(editorState.activeTool === "shape" && "border-accent text-accent")}
            >
              <Square className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip content="Image / Asset Tool" shortcut="I" side="right">
            <Button
              variant={editorState.activeTool === "image" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => handleSelectTool("image")}
              aria-label="Image Tool"
              className={cn(editorState.activeTool === "image" && "border-accent text-accent")}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Divider className="w-6 my-1" />

          {/* Quick AI Trigger from Tool Panel */}
          <Tooltip content="MotionBot AI Workspace" shortcut="AI" side="right">
            <Button
              variant={isRightSidebarOpen && activeRightTab === "ai" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => {
                setIsRightSidebarOpen(true);
                setActiveRightTab("ai");
              }}
              aria-label="Open MotionBot AI"
              className={cn(
                isRightSidebarOpen && activeRightTab === "ai" && "border-accent text-accent bg-accent/15"
              )}
            >
              <Sparkles className="h-4 w-4 text-accent" />
            </Button>
          </Tooltip>

          <Divider className="w-6 my-1" />

          <Tooltip content="Hand / Canvas Pan" shortcut="H" side="right">
            <Button
              variant={editorState.activeTool === "hand" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => handleSelectTool("hand")}
              aria-label="Hand Tool"
              className={cn(editorState.activeTool === "hand" && "border-accent text-accent")}
            >
              <Hand className="h-4 w-4" />
            </Button>
          </Tooltip>
        </aside>

        {/* CENTER CANVAS WORKSPACE */}
        <main
          aria-label="Canvas Workspace"
          className="flex-1 bg-[#08090C] relative flex items-center justify-center overflow-hidden select-none"
        >
          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#171A23_1px,transparent_1px),linear-gradient(to_bottom,#171A23_1px,transparent_1px)] bg-[size:28px_28px] opacity-35 pointer-events-none" />

          {/* Real Interactive Stage Canvas */}
          <EditorCanvas
            editorState={editorState}
            onStateChange={setEditorState}
            onCommitChange={handleCanvasCommit}
            onDeleteSelected={handleDeleteElement}
            onDuplicateSelected={handleDuplicateElement}
            assets={project.assets}
            currentTime={currentTime}
            className="w-full h-full"
          />

          {/* Floating Expand Sidebar Button when Right Panel is Closed */}
          {!isRightSidebarOpen && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsRightSidebarOpen(true);
                  setActiveRightTab("ai");
                }}
                className="gap-1.5 shadow-floating border-accent/40 bg-surface/90 backdrop-blur-sm text-accent text-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>MotionBot AI</span>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setIsRightSidebarOpen(true);
                  setActiveRightTab("properties");
                }}
                aria-label="Open Inspector"
                className="shadow-subtle border border-border bg-surface/90 backdrop-blur-sm"
              >
                <Sliders className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR (Collapsible: MotionBot AI Workspace, Assets, or Properties Inspector) */}
        {isRightSidebarOpen && (
          <aside
            aria-label="Right Editor Workspace"
            className="w-80 md:w-96 border-l border-border bg-surface flex flex-col shrink-0 z-20 overflow-hidden"
          >
            {/* Top Switcher Tabs: [ MotionBot AI ] [ Assets ] [ Properties ] */}
            <div className="h-10 px-2 border-b border-border bg-surface-elevated/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveRightTab("ai")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-xs transition-colors flex items-center gap-1.5",
                    activeRightTab === "ai"
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  <span>AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRightTab("assets")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-xs transition-colors flex items-center gap-1.5",
                    activeRightTab === "assets"
                      ? "bg-surface-elevated text-text-primary border border-border"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <ImageIcon className="h-3 w-3" />
                  <span>Assets</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRightTab("properties")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-xs transition-colors flex items-center gap-1.5",
                    activeRightTab === "properties"
                      ? "bg-surface-elevated text-text-primary border border-border"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <Sliders className="h-3 w-3" />
                  <span>Properties</span>
                </button>
              </div>

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsRightSidebarOpen(false)}
                aria-label="Collapse Panel"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Panel Body: Active Content */}
            <div className="flex-1 overflow-hidden">
              {activeRightTab === "ai" ? (
                <MotionBotAIWorkspace
                  project={project}
                  activeScene={activeScene}
                  selectedElement={selectedElement}
                  currentTime={currentTime}
                  onApplyProject={handleApplyAIProject}
                  onClose={() => setIsRightSidebarOpen(false)}
                />
              ) : activeRightTab === "assets" ? (
                <AssetPanel
                  project={project}
                  onAddAssetToProject={handleAddAssetToProject}
                  onAddAssetToCanvas={handleAddAssetToCanvas}
                  onRemoveAssetFromProject={handleRemoveAssetFromProject}
                  onClose={() => setIsRightSidebarOpen(false)}
                />
              ) : (
                <CanvasInspector
                  selectedElement={selectedElement}
                  project={project}
                  activeScene={activeScene}
                  onUpdateElement={handleUpdateElement}
                  onUpdateSceneBackground={handleUpdateSceneBackground}
                  onLockToggle={handleLockToggle}
                  onDuplicateElement={handleDuplicateElement}
                  onDeleteElement={handleDeleteElement}
                  onReorderElement={handleReorderElement}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* 3. BOTTOM TIMELINE DOCK */}
      <footer
        aria-label="Timeline Dock"
        className="h-64 border-t border-border bg-surface flex flex-col shrink-0 z-30 select-none overflow-hidden"
      >
        {/* Scene Navigation & Management Bar */}
        <SceneBar
          project={project}
          activeSceneId={editorState.activeSceneId}
          onSelectScene={handleSelectScene}
          onCreateScene={handleCreateScene}
          onRenameScene={handleRenameScene}
          onDuplicateScene={handleDuplicateScene}
          onDeleteScene={handleDeleteScene}
          onReorderScenes={handleReorderScenes}
        />

        {/* Visual Timeline Panel */}
        <TimelinePanel
          scene={activeScene}
          project={project}
          selectedElementId={selectedElementId || undefined}
          onSelectElement={handleSelectElement}
          onTimeChange={setCurrentTime}
          onToggleVisibility={handleToggleVisibility}
          onToggleLock={handleLockToggle}
          onUpdateElement={(elementId, updates) => {
            pushHistory(editorState.project);
            setEditorState((prev) =>
              updateElementInActiveScene(prev, elementId, updates)
            );
            autosaveManagerRef.current?.notifyChange(editorState.project);
          }}
          height={224}
        />
      </footer>

      {/* Export & Render Foundation Dialog */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        project={project}
        activeSceneId={editorState.activeSceneId}
        currentTime={currentTime}
      />
    </div>
  );
}
