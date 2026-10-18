/**
 * MOTION-BOT — AI Contextual Editing Types
 * Phase 8.7: AI Contextual Editing
 *
 * Defines contracts, actions, and validation models for natural-language
 * editing commands executed against the active project state.
 */

import { Project } from "@/types/project";
import { Scene } from "@/types/scene";
import { MotionElement } from "@/types/element";

export type ContextualActionType =
  | "UPDATE_LAYER_TRANSFORM"
  | "UPDATE_TEXT_PROPERTY"
  | "UPDATE_SCENE_DURATION"
  | "UPDATE_SCENE_BACKGROUND"
  | "UPDATE_MOTION_PROPERTY"
  | "UPDATE_ASSET_PROPERTY"
  | "UPDATE_LAYER_APPEARANCE";

export interface ContextualEditAction {
  id: string;
  type: ContextualActionType;
  sceneId: string;
  elementId?: string;
  targetName: string;
  property: string;
  description: string;
  previousValue: unknown;
  proposedValue: unknown;
  payload: Record<string, unknown>;
}

export interface ContextualEditProposal {
  prompt: string;
  summary: string;
  actions: ContextualEditAction[];
  candidateProject: Project;
  isValid: boolean;
  validationErrors: string[];
  isAmbiguous?: boolean;
  ambiguityQuestion?: string;
}

export interface TimelineContextState {
  currentTime?: number;
  isPlaying?: boolean;
  duration?: number;
  fps?: number;
}

export interface ContextualEditRequest {
  prompt: string;
  project: Project;
  activeSceneId?: string;
  selectedElementId?: string;
  timelineState?: TimelineContextState;
  provider?: string;
}

export interface ContextualEditResult {
  success: boolean;
  proposal?: ContextualEditProposal;
  appliedProject?: Project;
  error?: {
    code: string;
    message: string;
  };
}
