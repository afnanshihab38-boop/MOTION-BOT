"use client";

/**
 * MOTION-BOT — Visual Editor Canvas Container
 * Viewport stage with pan/zoom navigation, stage boundary, title-safe guides,
 * and integrated SceneRenderer & SelectionOverlay with full interactive manipulation.
 * Supports element selection, deselection, move, resize (8 handles), and rotation.
 * Strictly respects locked elements and invisible elements.
 * Part of Phase 5.3: Basic Element Selection & Manipulation.
 */

import * as React from "react";
import { EditorState, ResizeHandleId, CanvasPoint } from "@/types/editor";
import { MotionElement } from "@/types/element";
import { Asset } from "@/types/asset";
import { SceneRenderer, resolveSceneBackground } from "./scene-renderer";
import { SelectionOverlay } from "./selection-overlay";
import { calculateAggregateBounds } from "@/services/editor/selection-system";
import { clampZoom, viewportToCanvas } from "@/services/editor/coordinate-system";
import {
  getActiveScene,
  selectElementInState,
  clearSelectionInState,
  setViewportZoom,
  fitCanvasToViewport,
  updateElementsInActiveScene,
} from "@/services/editor/editor-state";
import {
  moveElement,
  resizeElement,
  rotateElement,
  calculateRotationAngle,
} from "@/services/editor/element-manipulation";
import { cn } from "@/lib/utils";

export interface EditorCanvasProps {
  editorState: EditorState;
  onStateChange: (updater: (prev: EditorState) => EditorState) => void;
  assets?: Asset[];
  className?: string;
}

interface InteractionState {
  mode: "panning" | "moving" | "resizing" | "rotating";
  startClientX: number;
  startClientY: number;
  startCanvasPoint: CanvasPoint;
  initialPanX?: number;
  initialPanY?: number;
  activeHandle?: ResizeHandleId;
  initialElements?: Map<string, MotionElement>;
  initialElement?: MotionElement;
  centerCanvasPoint?: CanvasPoint;
  initialRotation?: number;
  hasDragged: boolean;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  editorState,
  onStateChange,
  assets = [],
  className,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isSpacePressed, setIsSpacePressed] = React.useState(false);
  const [isPanningInternal, setIsPanningInternal] = React.useState(false);

  const interactionRef = React.useRef<InteractionState | null>(null);

  const activeScene = getActiveScene(editorState);
  const { zoom, panX, panY } = editorState.viewport;
  const { width: projectWidth, height: projectHeight } = editorState.project;

  // Track container size via ResizeObserver
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          onStateChange((prev) => ({
            ...prev,
            viewport: {
              ...prev.viewport,
              containerWidth: Math.round(width),
              containerHeight: Math.round(height),
            },
          }));
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [onStateChange]);

  // Handle Spacebar key state for pan mode toggling, Escape for deselect, and arrow keys for nudge
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === "Space" && !e.repeat) {
        setIsSpacePressed(true);
        return;
      }

      // Escape key deselects all elements
      if (e.code === "Escape") {
        onStateChange(clearSelectionInState);
        return;
      }

      // Nudge selected unlocked elements with arrow keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        if (editorState.selectedElementIds.length === 0) return;
        e.preventDefault();

        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.code === "ArrowLeft") dx = -step;
        if (e.code === "ArrowRight") dx = step;
        if (e.code === "ArrowUp") dy = -step;
        if (e.code === "ArrowDown") dy = step;

        if (!activeScene) return;

        const targetElements = activeScene.elements.filter(
          (el) =>
            editorState.selectedElementIds.includes(el.id) &&
            !el.locked &&
            el.visible
        );

        if (targetElements.length === 0) return;

        const updated = targetElements.map((el) => moveElement(el, dx, dy));
        onStateChange((prev) => updateElementsInActiveScene(prev, updated));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        setIsPanningInternal(false);
        if (interactionRef.current?.mode === "panning") {
          interactionRef.current = null;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activeScene, editorState.selectedElementIds, onStateChange]);

  // Mouse wheel: Ctrl/Meta for zoom, otherwise pan
  const handleWheel = React.useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zooming relative to cursor position
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseViewportX = e.clientX - rect.left;
        const mouseViewportY = e.clientY - rect.top;

        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        const newZoom = clampZoom(zoom * zoomFactor);

        // Adjust pan so the point under cursor stays at the same screen position
        const scaleChange = newZoom / zoom;
        const newPanX = mouseViewportX - (mouseViewportX - panX) * scaleChange;
        const newPanY = mouseViewportY - (mouseViewportY - panY) * scaleChange;

        onStateChange((prev) => ({
          ...prev,
          viewport: {
            ...prev.viewport,
            zoom: newZoom,
            panX: Math.round(newPanX),
            panY: Math.round(newPanY),
          },
        }));
      } else {
        // Panning via trackpad / wheel
        onStateChange((prev) => ({
          ...prev,
          viewport: {
            ...prev.viewport,
            panX: Math.round(prev.viewport.panX - e.deltaX),
            panY: Math.round(prev.viewport.panY - e.deltaY),
          },
        }));
      }
    },
    [zoom, panX, panY, onStateChange]
  );

  // Viewport/Canvas container mouse down (starts pan or deselects empty area)
  const handleContainerMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      const isMiddleClick = e.button === 1;
      const isHandActive = editorState.activeTool === "hand";

      if (isSpacePressed || isMiddleClick || isHandActive) {
        e.preventDefault();
        setIsPanningInternal(true);
        interactionRef.current = {
          mode: "panning",
          startClientX: e.clientX,
          startClientY: e.clientY,
          startCanvasPoint: { x: 0, y: 0 },
          initialPanX: panX,
          initialPanY: panY,
          hasDragged: false,
        };
      } else if (e.button === 0) {
        // Left click on empty space deselects elements
        onStateChange(clearSelectionInState);
      }
    },
    [isSpacePressed, editorState.activeTool, panX, panY, onStateChange]
  );

  // Element mouse down: selects element and initiates drag-move if unlocked
  const handleElementMouseDown = React.useCallback(
    (elementId: string, e: React.MouseEvent) => {
      // If panning, middle click, or hand tool active: pass through to pan
      if (isSpacePressed || e.button === 1 || editorState.activeTool === "hand") {
        return;
      }
      if (e.button !== 0) return; // Left click only

      e.stopPropagation();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || !activeScene) return;

      const startCanvasPoint = viewportToCanvas(
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        editorState.viewport
      );

      const isMultiSelect = e.shiftKey || e.metaKey || e.ctrlKey;
      const isAlreadySelected = editorState.selectedElementIds.includes(elementId);

      let nextSelectedIds = editorState.selectedElementIds;
      if (!isAlreadySelected) {
        nextSelectedIds = isMultiSelect
          ? [...editorState.selectedElementIds, elementId]
          : [elementId];

        onStateChange((prev) => ({
          ...prev,
          selectedElementIds: nextSelectedIds,
        }));
      }

      // Collect elements to move
      const targetElements = activeScene.elements.filter((el) =>
        nextSelectedIds.includes(el.id)
      );

      // If all target elements are locked or invisible, do not initiate move
      const movableElements = targetElements.filter((el) => !el.locked && el.visible);
      if (movableElements.length === 0) {
        return;
      }

      const initialMap = new Map<string, MotionElement>();
      for (const el of movableElements) {
        initialMap.set(el.id, { ...el, transform: { ...el.transform } });
      }

      interactionRef.current = {
        mode: "moving",
        startClientX: e.clientX,
        startClientY: e.clientY,
        startCanvasPoint,
        initialElements: initialMap,
        hasDragged: false,
      };
    },
    [
      isSpacePressed,
      editorState.activeTool,
      editorState.viewport,
      editorState.selectedElementIds,
      activeScene,
      onStateChange,
    ]
  );

  // Resize handle mouse down: initiates drag-resizing
  const handleResizeHandleMouseDown = React.useCallback(
    (handle: ResizeHandleId, e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || !activeScene) return;

      const primarySelectedId = editorState.selectedElementIds[0];
      const targetElement = activeScene.elements.find(
        (el) => el.id === primarySelectedId
      );
      if (!targetElement || targetElement.locked || !targetElement.visible) return;

      const startCanvasPoint = viewportToCanvas(
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        editorState.viewport
      );

      interactionRef.current = {
        mode: "resizing",
        activeHandle: handle,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startCanvasPoint,
        initialElement: {
          ...targetElement,
          transform: { ...targetElement.transform },
        },
        hasDragged: false,
      };
    },
    [activeScene, editorState.selectedElementIds, editorState.viewport]
  );

  // Rotation handle mouse down: initiates drag-rotation
  const handleRotateMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || !activeScene) return;

      const primarySelectedId = editorState.selectedElementIds[0];
      const targetElement = activeScene.elements.find(
        (el) => el.id === primarySelectedId
      );
      if (!targetElement || targetElement.locked || !targetElement.visible) return;

      const {
        x,
        y,
        width,
        height,
        rotation = 0,
        anchorX = 0,
        anchorY = 0,
      } = targetElement.transform;

      // Calculate element center in canvas coordinates
      const localDx = width * (0.5 - anchorX);
      const localDy = height * (0.5 - anchorY);
      const rad = (rotation * Math.PI) / 180;
      const centerX = x + Math.cos(rad) * localDx - Math.sin(rad) * localDy;
      const centerY = y + Math.sin(rad) * localDx + Math.cos(rad) * localDy;

      const startCanvasPoint = viewportToCanvas(
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        editorState.viewport
      );

      interactionRef.current = {
        mode: "rotating",
        startClientX: e.clientX,
        startClientY: e.clientY,
        startCanvasPoint,
        centerCanvasPoint: { x: centerX, y: centerY },
        initialElement: {
          ...targetElement,
          transform: { ...targetElement.transform },
        },
        initialRotation: rotation,
        hasDragged: false,
      };
    },
    [activeScene, editorState.selectedElementIds, editorState.viewport]
  );

  // Global window listeners for drag move and drag release
  React.useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      const interaction = interactionRef.current;
      if (!interaction) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const currentCanvasPoint = viewportToCanvas(
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        editorState.viewport
      );

      const deltaX = currentCanvasPoint.x - interaction.startCanvasPoint.x;
      const deltaY = currentCanvasPoint.y - interaction.startCanvasPoint.y;

      if (
        Math.hypot(
          e.clientX - interaction.startClientX,
          e.clientY - interaction.startClientY
        ) > 2
      ) {
        interaction.hasDragged = true;
      }

      if (interaction.mode === "panning") {
        const clientDeltaX = e.clientX - interaction.startClientX;
        const clientDeltaY = e.clientY - interaction.startClientY;
        const nextPanX = (interaction.initialPanX ?? 0) + clientDeltaX;
        const nextPanY = (interaction.initialPanY ?? 0) + clientDeltaY;
        onStateChange((prev) => ({
          ...prev,
          viewport: {
            ...prev.viewport,
            panX: Math.round(nextPanX),
            panY: Math.round(nextPanY),
          },
        }));
      } else if (interaction.mode === "moving" && interaction.initialElements) {
        const updatedElements: MotionElement[] = [];
        interaction.initialElements.forEach((initialEl) => {
          const moved = moveElement(initialEl, deltaX, deltaY, {
            snapToGrid: editorState.snapToGrid,
            gridSize: editorState.gridSize,
          });
          updatedElements.push(moved);
        });

        onStateChange((prev) => updateElementsInActiveScene(prev, updatedElements));
      } else if (
        interaction.mode === "resizing" &&
        interaction.initialElement &&
        interaction.activeHandle
      ) {
        const resized = resizeElement(
          interaction.initialElement,
          interaction.activeHandle,
          deltaX,
          deltaY,
          {
            snapToGrid: editorState.snapToGrid,
            gridSize: editorState.gridSize,
          }
        );
        onStateChange((prev) => updateElementsInActiveScene(prev, [resized]));
      } else if (
        interaction.mode === "rotating" &&
        interaction.initialElement &&
        interaction.centerCanvasPoint
      ) {
        const nextAngle = calculateRotationAngle(
          interaction.centerCanvasPoint,
          currentCanvasPoint,
          {
            snapToIncrements: e.shiftKey,
            incrementDegrees: 15,
          }
        );
        const rotated = rotateElement(interaction.initialElement, nextAngle);
        onStateChange((prev) => updateElementsInActiveScene(prev, [rotated]));
      }
    };

    const handleWindowMouseUp = () => {
      if (interactionRef.current) {
        setIsPanningInternal(false);
        interactionRef.current = null;
      }
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [
    editorState.viewport,
    editorState.snapToGrid,
    editorState.gridSize,
    onStateChange,
  ]);

  // Stage background click deselects elements if clicking empty canvas space
  const handleStageBackgroundClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !interactionRef.current?.hasDragged) {
        onStateChange(clearSelectionInState);
      }
    },
    [onStateChange]
  );

  // Element click handler from SceneRenderer
  const handleElementClick = React.useCallback(
    (elementId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const multiSelect = e.shiftKey || e.metaKey || e.ctrlKey;
      onStateChange((prev) => selectElementInState(prev, elementId, multiSelect));
    },
    [onStateChange]
  );

  // Calculate aggregate bounds of selected elements for SelectionOverlay
  const selectedElements = React.useMemo(() => {
    if (!activeScene) return [];
    return activeScene.elements.filter((el) =>
      editorState.selectedElementIds.includes(el.id)
    );
  }, [activeScene, editorState.selectedElementIds]);

  const selectionBounds = React.useMemo(() => {
    return calculateAggregateBounds(selectedElements);
  }, [selectedElements]);

  // Check if any selected element is locked
  const isSelectionLocked = React.useMemo(() => {
    return (
      selectedElements.length > 0 && selectedElements.some((el) => el.locked)
    );
  }, [selectedElements]);

  // Single-element anchor point for precise rotation origin alignment
  const primaryAnchor = React.useMemo(() => {
    if (selectedElements.length === 1) {
      return {
        anchorX: selectedElements[0].transform.anchorX ?? 0,
        anchorY: selectedElements[0].transform.anchorY ?? 0,
      };
    }
    return { anchorX: undefined, anchorY: undefined };
  }, [selectedElements]);

  // Cursor style determination
  const cursorStyle = React.useMemo(() => {
    if (isPanningInternal) return "grabbing";
    if (isSpacePressed || editorState.activeTool === "hand") return "grab";
    return "default";
  }, [isPanningInternal, isSpacePressed, editorState.activeTool]);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleContainerMouseDown}
      style={{ cursor: cursorStyle }}
      className={cn(
        "relative w-full h-full overflow-hidden select-none bg-neutral-950 font-sans",
        className
      )}
    >
      {/* Grid Pattern Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          backgroundPosition: `${panX}px ${panY}px`,
        }}
      />

      {/* Scene Metadata & Viewport Status HUD */}
      {activeScene && (
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-neutral-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-md border border-neutral-800 text-[11px] font-mono text-neutral-300 shadow-md pointer-events-none select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="font-semibold text-neutral-100">{activeScene.name}</span>
          <span className="text-neutral-500">•</span>
          <span>
            {activeScene.duration.toFixed(1)}s ({activeScene.durationFrames}f @{" "}
            {editorState.project.fps}fps)
          </span>
          <span className="text-neutral-500">•</span>
          <span>
            {projectWidth} × {projectHeight}
          </span>
        </div>
      )}

      {/* Transformed Stage Container */}
      <div
        style={{
          position: "absolute",
          left: `${panX}px`,
          top: `${panY}px`,
          width: `${projectWidth * zoom}px`,
          height: `${projectHeight * zoom}px`,
        }}
        onClick={handleStageBackgroundClick}
        className="transition-transform duration-75 ease-out shadow-2xl ring-1 ring-white/10"
      >
        {/* Canvas Stage Surface */}
        <div
          style={{
            width: `${projectWidth}px`,
            height: `${projectHeight}px`,
            transform: `scale(${zoom})`,
            transformOrigin: "0 0",
            ...resolveSceneBackground(activeScene?.background),
          }}
          className="relative overflow-hidden"
        >
          {/* Title Safe Margins (broadcast motion design guides) */}
          {editorState.showTitleSafe && (
            <div className="absolute inset-0 pointer-events-none z-10">
              {/* Action Safe (90%) */}
              <div className="absolute inset-[5%] border border-dashed border-cyan-500/20" />
              {/* Title Safe (80%) */}
              <div className="absolute inset-[10%] border border-dashed border-cyan-500/30" />
            </div>
          )}

          {/* Active Scene Elements */}
          {activeScene && (
            <SceneRenderer
              scene={activeScene}
              assets={assets}
              selectedElementIds={editorState.selectedElementIds}
              hoveredElementId={editorState.hoveredElementId}
              onElementClick={handleElementClick}
              onElementMouseDown={handleElementMouseDown}
              onElementMouseEnter={(id) =>
                onStateChange((prev) => ({ ...prev, hoveredElementId: id }))
              }
              onElementMouseLeave={() =>
                onStateChange((prev) => ({ ...prev, hoveredElementId: null }))
              }
            />
          )}

          {/* Selection Box & Transform Handles */}
          <SelectionOverlay
            bounds={selectionBounds}
            zoom={zoom}
            isLocked={isSelectionLocked}
            anchorX={primaryAnchor.anchorX}
            anchorY={primaryAnchor.anchorY}
            onHandleMouseDown={handleResizeHandleMouseDown}
            onRotateMouseDown={handleRotateMouseDown}
          />
        </div>
      </div>

      {/* Floating HUD: Viewport & Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-40 flex items-center gap-1 bg-neutral-900/90 backdrop-blur-md px-2 py-1.5 rounded-lg border border-neutral-800 shadow-xl text-neutral-300 text-xs">
        {/* Zoom Out Button */}
        <button
          type="button"
          onClick={() =>
            onStateChange((prev) =>
              setViewportZoom(prev, prev.viewport.zoom - 0.1)
            )
          }
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-800 active:bg-neutral-700 text-neutral-300 transition-colors"
          title="Zoom Out (Ctrl -)"
        >
          −
        </button>

        {/* Zoom Level Indicator */}
        <span className="w-12 text-center font-mono font-medium select-none text-neutral-200">
          {Math.round(zoom * 100)}%
        </span>

        {/* Zoom In Button */}
        <button
          type="button"
          onClick={() =>
            onStateChange((prev) =>
              setViewportZoom(prev, prev.viewport.zoom + 0.1)
            )
          }
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-800 active:bg-neutral-700 text-neutral-300 transition-colors"
          title="Zoom In (Ctrl +)"
        >
          +
        </button>

        <div className="w-[1px] h-4 bg-neutral-800 mx-1" />

        {/* Fit to Viewport Button */}
        <button
          type="button"
          onClick={() => onStateChange(fitCanvasToViewport)}
          className="px-2 h-7 flex items-center justify-center rounded hover:bg-neutral-800 active:bg-neutral-700 text-neutral-300 transition-colors font-medium"
          title="Fit Canvas to Viewport"
        >
          Fit
        </button>

        {/* Reset 100% Button */}
        <button
          type="button"
          onClick={() => onStateChange((prev) => setViewportZoom(prev, 1.0))}
          className="px-2 h-7 flex items-center justify-center rounded hover:bg-neutral-800 active:bg-neutral-700 text-neutral-300 transition-colors font-medium"
          title="Zoom to 100%"
        >
          100%
        </button>
      </div>
    </div>
  );
};
