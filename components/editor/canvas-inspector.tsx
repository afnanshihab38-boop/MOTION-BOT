"use client";

/**
 * MOTION-BOT — Context-Aware Visual Element Inspector
 * Live inspector panel binding active element properties (transform, appearance, typography,
 * shape geometry, image source) to modular input controls with real-time validation.
 * When no element is selected, displays project and active scene composition overview.
 * Modular architecture designed for future expansion (motion, effects, AI controls).
 * Part of Phase 5.5: Properties / Inspector Panel.
 */

import * as React from "react";
import {
  Sliders,
  Lock,
  Unlock,
  Film,
  Sparkles,
  Zap,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
} from "lucide-react";
import { Panel, PanelHeader, PanelContent } from "@/components/ui/panel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import {
  MotionElement,
  TextElement,
  ShapeElement,
  ImageElement,
  Transform2D,
} from "@/types/element";
import { Project } from "@/types/project";
import { Scene, SceneBackground } from "@/types/scene";
import { cn } from "@/lib/utils";
import {
  ProjectSceneSection,
  TransformSection,
  TextSection,
  ShapeSection,
  ImageSection,
} from "./inspector";

export interface CanvasInspectorProps {
  selectedElement: MotionElement | null;
  project?: Project;
  activeScene?: Scene;
  onUpdateElement?: (updates: Partial<MotionElement>) => void;
  onUpdateSceneBackground?: (bg: SceneBackground) => void;
  onLockToggle?: (elementId: string, locked: boolean) => void;
  onDuplicateElement?: (elementId: string) => void;
  onDeleteElement?: (elementId: string) => void;
  onReorderElement?: (
    elementId: string,
    action: "bringForward" | "sendBackward" | "bringToFront" | "sendToBack"
  ) => void;
  // Legacy / granular callbacks for backwards compatibility
  onTransformChange?: (updates: Partial<Transform2D>) => void;
  onOpacityChange?: (opacity: number) => void;
  onTextContentChange?: (text: string) => void;
  onFillChange?: (color: string) => void;
  className?: string;
}

export const CanvasInspector: React.FC<CanvasInspectorProps> = ({
  selectedElement,
  project,
  activeScene,
  onUpdateElement,
  onUpdateSceneBackground,
  onLockToggle,
  onDuplicateElement,
  onDeleteElement,
  onReorderElement,
  onTransformChange,
  onOpacityChange,
  onTextContentChange,
  onFillChange,
  className,
}) => {
  const [activeTab, setActiveTab] = React.useState("properties");

  // ==========================================================================
  // 1. NO ELEMENT SELECTED: Show Project & Scene Overview
  // ==========================================================================
  if (!selectedElement) {
    return (
      <aside
        aria-label="Properties Panel"
        className={cn(
          "w-76 border-l border-border bg-surface flex flex-col shrink-0 z-20 h-full select-none",
          className
        )}
      >
        <Panel bordered={false} className="h-full flex flex-col">
          <PanelHeader
            title="Composition"
            icon={<Film className="h-3.5 w-3.5 text-accent" />}
            actions={
              <span className="text-[10px] font-mono text-text-muted bg-surface-elevated/60 border border-border px-1.5 py-0.5 rounded-xs">
                {project?.fps ?? 30} FPS
              </span>
            }
          />
          <PanelContent className="p-0 overflow-y-auto flex-1 flex flex-col justify-between">
            <ProjectSceneSection
              project={project}
              activeScene={activeScene}
              onUpdateSceneBackground={onUpdateSceneBackground}
            />

            <div className="p-3 m-3 rounded-md border border-dashed border-border/80 bg-surface-elevated/30 text-[11px] text-text-muted flex items-start gap-2 select-none">
              <Sparkles className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
              <span>
                Select any layer on the canvas to inspect transform, typography, fill, and motion tracks.
              </span>
            </div>
          </PanelContent>
        </Panel>
      </aside>
    );
  }

  // ==========================================================================
  // 2. ELEMENT SELECTED: Show Element Properties & Transform
  // ==========================================================================
  const { transform, appearance, locked } = selectedElement;
  const isText = selectedElement.type === "text";
  const isShape = selectedElement.type === "shape";
  const isImage = selectedElement.type === "image";

  const textElem = isText ? (selectedElement as TextElement) : null;
  const shapeElem = isShape ? (selectedElement as ShapeElement) : null;
  const imageElem = isImage ? (selectedElement as ImageElement) : null;

  // Unified update handler
  const handleUpdate = (updates: Partial<MotionElement>) => {
    if (locked) return;
    onUpdateElement?.(updates);
  };

  const handleTransformChange = (updates: Partial<Transform2D>) => {
    if (locked) return;
    onTransformChange?.(updates);
    handleUpdate({
      transform: {
        ...transform,
        ...updates,
      },
    });
  };

  const handleOpacityChange = (opacity: number) => {
    if (locked) return;
    onOpacityChange?.(opacity);
    handleUpdate({
      appearance: {
        ...appearance,
        opacity,
      },
    });
  };

  return (
    <aside
      aria-label="Properties Panel"
      className={cn("w-76 border-l border-border bg-surface flex flex-col shrink-0 z-20 h-full select-none", className)}
    >
      <Panel bordered={false} className="h-full flex flex-col">
        {/* Panel Header */}
        <PanelHeader
          title="Properties"
          icon={<Sliders className="h-3.5 w-3.5 text-accent" />}
          actions={
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded-xs uppercase">
                {selectedElement.type}
              </span>
              <Tooltip content={locked ? "Unlock element" : "Lock element"}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-text-muted hover:text-text-primary"
                  onClick={() => onLockToggle?.(selectedElement.id, !locked)}
                  aria-label={locked ? "Unlock element" : "Lock element"}
                >
                  {locked ? (
                    <Lock className="h-3.5 w-3.5 text-warning" />
                  ) : (
                    <Unlock className="h-3.5 w-3.5" />
                  )}
                </Button>
              </Tooltip>
              <Tooltip content="Duplicate layer" shortcut="⌘D">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-text-muted hover:text-text-primary"
                  onClick={() => onDuplicateElement?.(selectedElement.id)}
                  aria-label="Duplicate layer"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>
              <Tooltip content="Delete layer" shortcut="Del">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-text-muted hover:text-danger"
                  onClick={() => onDeleteElement?.(selectedElement.id)}
                  aria-label="Delete layer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>
            </div>
          }
        />

        {/* Locked Status Banner */}
        {locked && (
          <div
            data-testid="locked-element-banner"
            className="mx-3 mt-2 p-2 rounded-xs bg-warning/10 border border-warning/30 flex items-center justify-between text-warning text-[11px]"
          >
            <div className="flex items-center gap-1.5">
              <Lock className="h-3 w-3 shrink-0" />
              <span>Element is locked</span>
            </div>
            <button
              type="button"
              onClick={() => onLockToggle?.(selectedElement.id, false)}
              className="text-[10px] font-medium underline hover:text-warning-hover cursor-pointer"
            >
              Unlock
            </button>
          </div>
        )}

        <PanelContent className="p-0 overflow-y-auto flex-1">
          {/* Layer Ordering Bar */}
          <div className="px-3 py-1.5 border-b border-border bg-surface-elevated/20 flex items-center justify-between text-xs text-text-muted">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Layer Order</span>
            <div className="flex items-center gap-0.5">
              <Tooltip content="Bring to Front">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-text-muted hover:text-text-primary"
                  onClick={() => onReorderElement?.(selectedElement.id, "bringToFront")}
                  aria-label="Bring to Front"
                >
                  <ArrowUpToLine className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>
              <Tooltip content="Bring Forward">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-text-muted hover:text-text-primary"
                  onClick={() => onReorderElement?.(selectedElement.id, "bringForward")}
                  aria-label="Bring Forward"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>
              <Tooltip content="Send Backward">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-text-muted hover:text-text-primary"
                  onClick={() => onReorderElement?.(selectedElement.id, "sendBackward")}
                  aria-label="Send Backward"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>
              <Tooltip content="Send to Back">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-text-muted hover:text-text-primary"
                  onClick={() => onReorderElement?.(selectedElement.id, "sendToBack")}
                  aria-label="Send to Back"
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                </Button>
              </Tooltip>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Modular Tab Bar with Extensible Future Slots */}
            <TabsList className="w-full px-2 border-b border-border bg-surface-elevated/20">
              <TabsTrigger value="properties" className="flex-1 text-[11px]">
                Properties
              </TabsTrigger>
              <TabsTrigger value="transform" className="flex-1 text-[11px]">
                Transform
              </TabsTrigger>
              {/* Modular Extension Slots */}
              <TabsTrigger
                value="motion"
                disabled
                className="text-[11px] opacity-40 cursor-not-allowed hidden sm:inline-flex"
                title="Motion & Keyframes"
              >
                <Zap className="h-3 w-3 mr-0.5 inline" />
                Motion
              </TabsTrigger>
              <TabsTrigger
                value="effects"
                disabled
                className="text-[11px] opacity-40 cursor-not-allowed hidden sm:inline-flex"
                title="Effects & Filters"
              >
                <Sparkles className="h-3 w-3 mr-0.5 inline" />
                FX
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Element-Specific Properties */}
            <TabsContent value="properties" className="p-3 m-0">
              {isText && textElem && (
                <TextSection
                  element={textElem}
                  appearance={appearance}
                  locked={locked}
                  onUpdate={(updates) => {
                    if (updates.text !== undefined) onTextContentChange?.(updates.text);
                    handleUpdate(updates as Partial<MotionElement>);
                  }}
                />
              )}

              {isShape && shapeElem && (
                <ShapeSection
                  element={shapeElem}
                  appearance={appearance}
                  locked={locked}
                  onUpdate={(updates) => {
                    const fill = updates.appearance?.fill;
                    if (fill && typeof fill === "object" && "color" in fill && fill.color) {
                      onFillChange?.(fill.color);
                    }
                    handleUpdate(updates as Partial<MotionElement>);
                  }}
                />
              )}

              {isImage && imageElem && (
                <ImageSection
                  element={imageElem}
                  locked={locked}
                  onUpdate={(updates) => handleUpdate(updates as Partial<MotionElement>)}
                />
              )}
            </TabsContent>

            {/* TAB 2: Transform & General Layer Opacity */}
            <TabsContent value="transform" className="p-3 m-0">
              <TransformSection
                transform={transform}
                appearance={appearance}
                locked={locked}
                onTransformChange={handleTransformChange}
                onOpacityChange={handleOpacityChange}
              />
            </TabsContent>
          </Tabs>
        </PanelContent>
      </Panel>
    </aside>
  );
};
