"use client";

/**
 * MOTION-BOT — Visual Timeline Panel
 * Professional motion-design timeline panel displaying tracks, property hierarchies,
 * keyframe diamonds, time ruler, and transport header, strictly integrated with Phase 6 Motion Engine.
 * Part of Phase 7.2: Visual Timeline Interface.
 */

import * as React from "react";
import { Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  defaultTimelineManager,
  TimelineState,
  getEvaluatedSceneAtTime,
} from "@/timeline";
import {
  getElementTiming,
  addKeyframeToElement,
  deleteKeyframeFromElement,
  moveKeyframeOnElement,
  updateElementTiming,
} from "@/services/timeline";
import { MotionElement } from "@/types/element";
import { AnimatableProperty, Keyframe, PropertyAnimationTrack } from "@/types/animation";
import { TimelineHeader } from "./timeline-header";
import { TimeRuler } from "./time-ruler";
import { TrackRow } from "./track-row";
import { Playhead } from "./playhead";
import {
  ElementTimelineTrack,
  GroupedPropertyTrack,
  TimelinePanelProps,
} from "./types";

const ELEMENT_TYPE_COLORS: Record<string, string> = {
  text: "#6366F1", // Indigo
  shape: "#10B981", // Emerald
  image: "#F59E0B", // Amber
  logo: "#EC4899", // Pink
  video: "#3B82F6", // Blue
  audio: "#8B5CF6", // Purple
  group: "#64748B", // Slate
};

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  scene,
  project,
  timelineManager = defaultTimelineManager,
  selectedElementId,
  onSelectElement,
  onSelectKeyframe,
  className,
  height,
  defaultExpandAll = false,
  onTimeChange,
  onToggleVisibility,
  onToggleLock,
  onUpdateElement,
  onAddKeyframe,
  onDeleteKeyframe,
  onMoveKeyframe,
  onUpdateLayerTiming,
}) => {
  // Local state reflecting observable TimelineState from TimelineManager
  const [timelineState, setTimelineState] = React.useState<TimelineState>(() =>
    timelineManager.getState()
  );

  // Expanded element track rows (tracking element IDs)
  const [expandedElementIds, setExpandedElementIds] = React.useState<Set<string>>(() => {
    if (defaultExpandAll && scene?.elements) {
      return new Set(scene.elements.map((e) => e.id));
    }
    return selectedElementId ? new Set([selectedElementId]) : new Set();
  });

  // Automatically expand selectedElementId when it changes
  React.useEffect(() => {
    if (selectedElementId) {
      setExpandedElementIds((prev) => new Set([...prev, selectedElementId]));
    }
  }, [selectedElementId]);

  // Subscribe to TimelineManager state updates
  React.useEffect(() => {
    const unsubscribe = timelineManager.subscribe((nextState) => {
      setTimelineState(nextState);
    });
    return unsubscribe;
  }, [timelineManager]);

  // Sync timeline duration and frame rate from active scene/project
  React.useEffect(() => {
    if (scene) {
      timelineManager.syncWithScene(scene);
    } else if (project) {
      timelineManager.syncWithProject(project);
    }
  }, [scene, project, timelineManager]);

  // Toggle expand/collapse of element property tracks
  const handleToggleExpand = React.useCallback((elementId: string) => {
    setExpandedElementIds((prev) => {
      const next = new Set(prev);
      if (next.has(elementId)) {
        next.delete(elementId);
      } else {
        next.add(elementId);
      }
      return next;
    });
  }, []);

  // Compute pixelsPerSecond and total track canvas width
  const pixelsPerSecond = React.useMemo(() => {
    return Math.max(10, 100 * timelineState.viewport.zoom);
  }, [timelineState.viewport.zoom]);

  const timelineWidth = React.useMemo(() => {
    return Math.max(600, Math.ceil(timelineState.duration * pixelsPerSecond));
  }, [timelineState.duration, pixelsPerSecond]);

  // Keyframe Selection
  const handleKeyframeSelection = React.useCallback(
    (keyframeId: string, trackId?: string) => {
      timelineManager.selectKeyframe(keyframeId, trackId);
      onSelectKeyframe?.(keyframeId, trackId);
    },
    [timelineManager, onSelectKeyframe]
  );

  // Add Keyframe Internal
  const handleAddKeyframeInternal = React.useCallback(
    (elementId: string, property: AnimatableProperty, time: number) => {
      if (onAddKeyframe) {
        onAddKeyframe(elementId, property, time);
        return;
      }
      if (!scene || !onUpdateElement) return;
      const target = scene.elements.find((el) => el.id === elementId);
      if (!target) return;
      const res = addKeyframeToElement(
        target,
        property,
        time,
        undefined,
        timelineState.fps
      );
      onUpdateElement(elementId, res.element);
    },
    [onAddKeyframe, scene, onUpdateElement, timelineState.fps]
  );

  // Delete Keyframe Internal
  const handleDeleteKeyframeInternal = React.useCallback(
    (elementId: string, keyframeId: string) => {
      if (onDeleteKeyframe) {
        onDeleteKeyframe(elementId, keyframeId);
        return;
      }
      if (!scene || !onUpdateElement) return;
      const target = scene.elements.find((el) => el.id === elementId);
      if (!target) return;
      const updated = deleteKeyframeFromElement(target, keyframeId);
      onUpdateElement(elementId, updated);
      if (timelineState.selection.selectedKeyframeId === keyframeId) {
        timelineManager.selectKeyframe(null);
      }
    },
    [
      onDeleteKeyframe,
      scene,
      onUpdateElement,
      timelineState.selection.selectedKeyframeId,
      timelineManager,
    ]
  );

  // Move Keyframe Internal
  const handleMoveKeyframeInternal = React.useCallback(
    (elementId: string, keyframeId: string, newTime: number) => {
      if (onMoveKeyframe) {
        onMoveKeyframe(elementId, keyframeId, newTime);
        return;
      }
      if (!scene || !onUpdateElement) return;
      const target = scene.elements.find((el) => el.id === elementId);
      if (!target) return;
      const updated = moveKeyframeOnElement(
        target,
        keyframeId,
        newTime,
        timelineState.fps
      );
      onUpdateElement(elementId, updated);
    },
    [onMoveKeyframe, scene, onUpdateElement, timelineState.fps]
  );

  // Update Layer Timing Internal
  const handleUpdateLayerTimingInternal = React.useCallback(
    (elementId: string, startTime: number, duration: number) => {
      if (onUpdateLayerTiming) {
        onUpdateLayerTiming(elementId, startTime, duration);
        return;
      }
      if (!scene || !onUpdateElement) return;
      const target = scene.elements.find((el) => el.id === elementId);
      if (!target) return;
      const updated = updateElementTiming(
        target,
        startTime,
        duration,
        timelineState.fps
      );
      onUpdateElement(elementId, updated);
    },
    [onUpdateLayerTiming, scene, onUpdateElement, timelineState.fps]
  );

  // Keyboard shortcut for deleting selected keyframe
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (
        (e.code === "Delete" || e.code === "Backspace") &&
        timelineState.selection.selectedKeyframeId &&
        scene
      ) {
        const kfId = timelineState.selection.selectedKeyframeId;
        for (const el of scene.elements) {
          const hasKf = el.propertyTracks?.some((t) =>
            t.keyframes?.some((k) => k.id === kfId)
          );
          if (hasKf) {
            e.preventDefault();
            handleDeleteKeyframeInternal(el.id, kfId);
            break;
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    timelineState.selection.selectedKeyframeId,
    scene,
    handleDeleteKeyframeInternal,
  ]);

  // Convert Scene elements to timeline tracks with grouped property hierarchy
  const tracks: ElementTimelineTrack[] = React.useMemo(() => {
    if (!scene || !Array.isArray(scene.elements)) return [];

    return scene.elements.map((el) => {
      const propertyGroups = buildPropertyGroups(el);
      const allKeyframeTimes: number[] = [];

      for (const group of propertyGroups) {
        for (const kf of group.keyframes) {
          if (!allKeyframeTimes.includes(kf.time)) {
            allKeyframeTimes.push(kf.time);
          }
        }
      }
      allKeyframeTimes.sort((a, b) => a - b);

      const isAnimated = propertyGroups.some((g) => g.hasKeyframes);
      const color = ELEMENT_TYPE_COLORS[el.type] || "#6366F1";
      const timing = getElementTiming(
        el,
        timelineState.fps,
        scene.duration || timelineState.duration
      );

      return {
        element: el,
        elementId: el.id,
        name: el.name || `${el.type} element`,
        type: el.type,
        color,
        startSec: timing.startTime,
        durationSec: timing.duration,
        visible: el.visible !== false,
        locked: el.locked === true,
        zIndex: el.zIndex ?? 0,
        propertyGroups,
        allKeyframeTimes,
        isAnimated,
      };
    });
  }, [scene, timelineState.duration, timelineState.fps]);

  // Notify canvas/parent when currentTime changes (Timeline -> currentTime -> Motion Engine -> evaluated scene -> Canvas)
  const prevTimeRef = React.useRef(timelineState.currentTime);
  React.useEffect(() => {
    if (prevTimeRef.current !== timelineState.currentTime) {
      prevTimeRef.current = timelineState.currentTime;
      if (onTimeChange && scene) {
        const evaluated = getEvaluatedSceneAtTime(scene, timelineState.currentTime);
        onTimeChange(timelineState.currentTime, evaluated);
      }
    }
  }, [timelineState.currentTime, onTimeChange, scene]);

  // Handle seeking from ruler or playhead dragging
  const handleSeek = React.useCallback(
    (time: number) => {
      timelineManager.seek(time);
      if (onTimeChange && scene) {
        const evaluated = getEvaluatedSceneAtTime(scene, time);
        onTimeChange(time, evaluated);
      }
    },
    [timelineManager, onTimeChange, scene]
  );

  // Sync scroll position with timeline state
  const handleScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollLeft, scrollTop } = e.currentTarget;
      timelineManager.setScrollPosition(scrollLeft, scrollTop);
    },
    [timelineManager]
  );

  return (
    <footer
      aria-label="Visual Timeline Panel"
      style={{ height: height || undefined }}
      className={cn(
        "h-56 border-t border-border bg-surface flex flex-col shrink-0 z-30 select-none",
        className
      )}
    >
      {/* 1. Timeline Header Bar */}
      <TimelineHeader
        timelineState={timelineState}
        timelineManager={timelineManager}
        sceneName={scene?.name}
      />

      {/* 2. Main Timeline Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Layers Column (w-64) */}
        <div className="w-64 border-r border-border bg-surface flex flex-col shrink-0 overflow-y-auto">
          {/* Header */}
          <div className="h-7 border-b border-border bg-surface-elevated/70 px-3 flex items-center justify-between text-[10px] font-mono text-text-muted uppercase">
            <span>Layers ({tracks.length})</span>
            <span>Controls</span>
          </div>

          {/* Empty State */}
          {tracks.length === 0 && (
            <div className="p-4 text-center text-text-muted text-[11px] font-mono">
              No elements in active scene
            </div>
          )}

          {/* Layer Headers */}
          <div className="flex-1 divide-y divide-border-subtle/50">
            {tracks.map((track) => (
              <div key={`header-${track.elementId}`}>
                {/* Element Header Row */}
                <div
                  onClick={() => onSelectElement?.(track.elementId)}
                  className={cn(
                    "h-8 px-2 flex items-center justify-between text-xs cursor-pointer transition-colors duration-fast",
                    track.elementId === selectedElementId
                      ? "bg-surface-elevated text-text-primary"
                      : "hover:bg-surface-elevated/40 text-text-secondary"
                  )}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: track.color }}
                    />
                    <span className="truncate text-[11px] font-medium">
                      {track.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility?.(track.elementId);
                      }}
                      className="p-0.5 text-text-muted hover:text-text-primary transition-colors"
                      aria-label={track.visible ? "Hide element" : "Show element"}
                    >
                      {track.visible ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-text-muted/40" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLock?.(track.elementId);
                      }}
                      className="p-0.5 text-text-muted hover:text-text-primary transition-colors"
                      aria-label={track.locked ? "Unlock element" : "Lock element"}
                    >
                      {track.locked ? (
                        <Lock className="h-3 w-3 text-warning" />
                      ) : (
                        <Unlock className="h-3 w-3 text-text-muted/40" />
                      )}
                    </button>
                    <span className="text-[9px] font-mono text-text-muted">
                      z:{track.zIndex}
                    </span>
                  </div>
                </div>

                {/* Indented Property Labels when expanded */}
                {expandedElementIds.has(track.elementId) &&
                  track.propertyGroups.map((group) => (
                    <div
                      key={`header-sub-${track.elementId}-${group.id}`}
                      className="h-6 px-3 pl-8 flex items-center text-[11px] font-mono text-text-muted bg-[#07080B] border-t border-border-subtle/30"
                    >
                      <span className="truncate">{group.name}</span>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right Track Area & Time Ruler (Horizontally Scrollable Container) */}
        <div
          onScroll={handleScroll}
          className="flex-1 flex flex-col overflow-x-auto overflow-y-auto relative bg-[#090A0F]"
        >
          {/* Synchronized Time Ruler */}
          <TimeRuler
            duration={timelineState.duration}
            currentTime={timelineState.currentTime}
            pixelsPerSecond={pixelsPerSecond}
            fps={timelineState.fps}
            inPoint={timelineState.inPoint}
            outPoint={timelineState.outPoint}
            scrollLeft={timelineState.viewport.scrollLeft}
            timelineWidth={timelineWidth}
            onSeek={handleSeek}
          />

          {/* Track Rows Container */}
          <div
            style={{ width: `${timelineWidth}px` }}
            className="flex-1 relative divide-y divide-border-subtle/30"
          >
            {/* Playhead Vertical Line */}
            <Playhead
              currentTime={timelineState.currentTime}
              pixelsPerSecond={pixelsPerSecond}
              duration={timelineState.duration}
              fps={timelineState.fps}
              timelineWidth={timelineWidth}
              onSeek={handleSeek}
            />

            {/* Elements & Sub-Property Tracks */}
            {tracks.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center p-6 text-center text-text-muted select-none">
                <p className="text-xs font-medium text-text-secondary">Timeline is ready</p>
                <p className="text-[11px] text-text-muted mt-1 max-w-xs">
                  Add layers to this scene to animate transform and visual properties with frame-accurate keyframes.
                </p>
              </div>
            ) : (
              tracks.map((track) => (
                <TrackRow
                  key={track.elementId}
                  track={track}
                  pixelsPerSecond={pixelsPerSecond}
                  timelineWidth={timelineWidth}
                  duration={timelineState.duration}
                  currentTime={timelineState.currentTime}
                  fps={timelineState.fps}
                  isSelected={track.elementId === selectedElementId}
                  isExpanded={expandedElementIds.has(track.elementId)}
                  onToggleExpand={() => handleToggleExpand(track.elementId)}
                  onSelectTrack={() => onSelectElement?.(track.elementId)}
                  selectedKeyframeId={timelineState.selection.selectedKeyframeId}
                  onSelectKeyframe={handleKeyframeSelection}
                  onToggleVisibility={onToggleVisibility}
                  onToggleLock={onToggleLock}
                  onUpdateLayerTiming={handleUpdateLayerTimingInternal}
                  onAddKeyframe={handleAddKeyframeInternal}
                  onDeleteKeyframe={handleDeleteKeyframeInternal}
                  onMoveKeyframe={handleMoveKeyframeInternal}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

/**
 * Builds hierarchical property groups (Position, Scale, Rotation, Opacity, Dimensions)
 * from an element's Phase 3 propertyTracks. Ensures standard transform groups are
 * always editable even before initial keyframes are created.
 */
function buildPropertyGroups(element: MotionElement): GroupedPropertyTrack[] {
  const tracks = element.propertyTracks || [];
  const trackMap = new Map<AnimatableProperty, PropertyAnimationTrack>();

  for (const track of tracks) {
    if (track && track.property) {
      trackMap.set(track.property, track);
    }
  }

  const groups: GroupedPropertyTrack[] = [];

  // 1. Position (x, y)
  const xTrack = trackMap.get("x");
  const yTrack = trackMap.get("y");
  const posKeyframes = aggregateKeyframes([xTrack, yTrack]);
  groups.push({
    id: "position",
    name: "Position (X, Y)",
    category: "position",
    properties: ["x", "y"],
    keyframes: posKeyframes,
    hasKeyframes: posKeyframes.length > 0,
    enabled: Boolean(xTrack?.enabled ?? yTrack?.enabled ?? true),
  });

  // 2. Scale (scaleX, scaleY)
  const sxTrack = trackMap.get("scaleX");
  const syTrack = trackMap.get("scaleY");
  const scaleKeyframes = aggregateKeyframes([sxTrack, syTrack]);
  groups.push({
    id: "scale",
    name: "Scale (X, Y)",
    category: "scale",
    properties: ["scaleX", "scaleY"],
    keyframes: scaleKeyframes,
    hasKeyframes: scaleKeyframes.length > 0,
    enabled: Boolean(sxTrack?.enabled ?? syTrack?.enabled ?? true),
  });

  // 3. Rotation
  const rotTrack = trackMap.get("rotation");
  const rotKeyframes = rotTrack?.keyframes || [];
  groups.push({
    id: "rotation",
    name: "Rotation",
    category: "rotation",
    properties: ["rotation"],
    keyframes: rotKeyframes,
    hasKeyframes: rotKeyframes.length > 0,
    enabled: rotTrack?.enabled ?? true,
  });

  // 4. Opacity
  const opTrack = trackMap.get("opacity");
  const opKeyframes = opTrack?.keyframes || [];
  groups.push({
    id: "opacity",
    name: "Opacity",
    category: "opacity",
    properties: ["opacity"],
    keyframes: opKeyframes,
    hasKeyframes: opKeyframes.length > 0,
    enabled: opTrack?.enabled ?? true,
  });

  // 5. Dimensions (width, height)
  const wTrack = trackMap.get("width");
  const hTrack = trackMap.get("height");
  if (wTrack || hTrack || element.transform.width !== undefined) {
    const dimKeyframes = aggregateKeyframes([wTrack, hTrack]);
    groups.push({
      id: "dimensions",
      name: "Dimensions (W, H)",
      category: "dimensions",
      properties: ["width", "height"],
      keyframes: dimKeyframes,
      hasKeyframes: dimKeyframes.length > 0,
      enabled: Boolean(wTrack?.enabled ?? hTrack?.enabled ?? true),
    });
  }

  return groups;
}

/**
 * Aggregates and sorts keyframes across multiple related tracks (e.g. x and y).
 */
function aggregateKeyframes(
  tracks: Array<PropertyAnimationTrack | undefined>
): Keyframe<number | string>[] {
  const keyframes: Keyframe<number | string>[] = [];
  const seenIds = new Set<string>();

  for (const track of tracks) {
    if (!track || !track.keyframes) continue;
    for (const kf of track.keyframes) {
      if (!seenIds.has(kf.id)) {
        seenIds.add(kf.id);
        keyframes.push(kf);
      }
    }
  }

  return keyframes.sort((a, b) => a.time - b.time);
}
