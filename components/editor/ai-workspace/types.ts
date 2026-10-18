/**
 * MOTION-BOT — AI Workspace Types & Constants
 * Phase 8.1: AI Prompt -> Editor Integration
 */

import { Project } from "@/types/project";
import { CreativeBrief } from "@/ai/creative-brain/types";
import { MotionPlan } from "@/ai/motion-plan/types";

export type AIWorkspaceState =
  | "IDLE"
  | "UNDERSTANDING_REQUEST"
  | "PREPARING_CONTEXT"
  | "GENERATING_CREATIVE_DIRECTION"
  | "GENERATING_MOTION_PLAN"
  | "VALIDATING"
  | "READY_TO_APPLY"
  | "APPLYING_TO_PROJECT"
  | "COMPLETE"
  | "ERROR";

export const STAGE_DISPLAY_NAMES: Record<AIWorkspaceState, string> = {
  IDLE: "Ready",
  UNDERSTANDING_REQUEST: "Understanding Request",
  PREPARING_CONTEXT: "Preparing Project Context",
  GENERATING_CREATIVE_DIRECTION: "Generating Creative Direction",
  GENERATING_MOTION_PLAN: "Generating Motion Plan",
  VALIDATING: "Validating Motion Plan",
  READY_TO_APPLY: "Ready to Apply",
  APPLYING_TO_PROJECT: "Applying to Project",
  COMPLETE: "Complete",
  ERROR: "Generation Failed",
};

export const EXAMPLE_PROMPTS = [
  "Create a 10-second product advertisement.",
  "Create a cinematic logo reveal.",
  "Create a vertical Instagram product promo.",
  "Create a bold kinetic typography intro.",
] as const;

export const CONTEXTUAL_EXAMPLE_PROMPTS = [
  "Make the headline bigger.",
  "Move the logo to the center.",
  "Make the animation slower.",
  "Change the background to a darker tone.",
  "Make the second scene shorter.",
] as const;

export interface AIWorkspaceProps {
  /** The current active project in the editor */
  project: Project;
  /** Callback invoked when the user confirms and applies the validated AI project state */
  onApplyProject: (updatedProject: Project, brief?: CreativeBrief, plan?: MotionPlan) => void;
  /** Optional callback to close or collapse the AI panel */
  onClose?: () => void;
  /** Optional class name for styling override */
  className?: string;
  /** Optional initial prompt to populate */
  initialPrompt?: string;
  /** Optional force provider (e.g. 'mock' for testing or 'openrouter') */
  defaultProvider?: string;
  /** Current active scene in the editor */
  activeScene?: import("@/types/scene").Scene;
  /** Currently selected layer in the editor */
  selectedElement?: import("@/types/element").MotionElement | null;
  /** Current playhead time in seconds */
  currentTime?: number;
  /** Initial workspace mode ('edit' for Contextual Assistant, 'create' for New Motion Generator) */
  defaultMode?: "edit" | "create";
}

export interface StructuredPlanPreviewData {
  title: string;
  style: string;
  durationSec: number;
  fps: number;
  aspectRatio: string;
  scenesCount: number;
  scenes: Array<{
    id: string;
    order: number;
    name: string;
    duration: number;
    description?: string;
  }>;
  typography: string;
  motionStyle: string;
  colorPalette: string[];
  elementsCount: number;
}
