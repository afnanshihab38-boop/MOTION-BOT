/**
 * MOTION-BOT — Timeline UI Component Types & Contracts
 * Definitions for timeline panel props, track grouping, and visual rendering options.
 * Part of Phase 7.2: Visual Timeline Interface.
 */

import { Scene } from "@/types/scene";
import { Project } from "@/types/project";
import { MotionElement } from "@/types/element";
import { AnimatableProperty, Keyframe } from "@/types/animation";
import { ITimelineStateManager, TimelineState } from "@/timeline";

/**
 * Grouped property track representation for hierarchical element timeline display.
 */
export interface GroupedPropertyTrack {
  id: string;
  name: string;
  category: "position" | "scale" | "rotation" | "opacity" | "dimensions" | "custom";
  properties: AnimatableProperty[];
  keyframes: Keyframe<number | string>[];
  hasKeyframes: boolean;
  enabled: boolean;
}

/**
 * Visual element track representation in the timeline.
 */
export interface ElementTimelineTrack {
  element: MotionElement;
  elementId: string;
  name: string;
  type: MotionElement["type"];
  color: string;
  startSec: number;
  durationSec: number;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  propertyGroups: GroupedPropertyTrack[];
  allKeyframeTimes: number[];
  isAnimated: boolean;
}

/**
 * Props for the main TimelinePanel component.
 */
export interface TimelinePanelProps {
  /** Active scene containing motion elements and keyframes */
  scene?: Scene;
  /** Active project metadata (duration, fps, etc.) */
  project?: Project;
  /** Custom or singleton timeline state manager */
  timelineManager?: ITimelineStateManager;
  /** ID of the element currently selected in the editor */
  selectedElementId?: string | null;
  /** Callback fired when an element track is clicked in the timeline */
  onSelectElement?: (elementId: string) => void;
  /** Callback fired when a keyframe is clicked */
  onSelectKeyframe?: (keyframeId: string, trackId?: string) => void;
  /** Optional container CSS class name */
  className?: string;
  /** Initial or fixed height for the timeline dock (default: h-56 / 224px) */
  height?: number | string;
  /** If true, expands all element property tracks by default */
  defaultExpandAll?: boolean;
  /** Callback fired when currentTime changes during scrubbing/seeking, passing updated time and evaluated scene */
  onTimeChange?: (time: number, evaluatedScene?: Scene) => void;
}

/**
 * Props for the TimelineHeader transport bar.
 */
export interface TimelineHeaderProps {
  timelineState: TimelineState;
  timelineManager: ITimelineStateManager;
  sceneName?: string;
  className?: string;
}

/**
 * Props for the TimeRuler component.
 */
export interface TimeRulerProps {
  duration: number;
  currentTime: number;
  pixelsPerSecond: number;
  fps: number;
  inPoint: number;
  outPoint: number;
  scrollLeft: number;
  timelineWidth: number;
  onSeek: (time: number) => void;
}

/**
 * Props for the KeyframeNode diamond component.
 */
export interface KeyframeNodeProps {
  keyframe: Keyframe<number | string>;
  pixelsPerSecond: number;
  isSelected?: boolean;
  propertyName?: string;
  onClick?: (e: React.MouseEvent) => void;
}
