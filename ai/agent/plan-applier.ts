/**
 * MOTION-BOT — Motion Plan Scene & Project Applier
 * Phase 7.8: End-to-End AI Agent Integration
 *
 * Immutably translates a validated structured Motion Plan into concrete
 * Scenes, Elements, Transitions, and Canvas configurations on the Project model.
 */

import { Project } from "@/types/project";
import { Scene, SceneBackground } from "@/types/scene";
import { MotionElement } from "@/types/element";
import { Asset } from "@/types/asset";
import { MotionPlan } from "../motion-plan/types";
import { createScene, alignScenesSequentially, calculateScenesDuration } from "@/services/project/scene-model";
import {
  createTextElement,
  createShapeElement,
  createImageElement,
  createLogoElement,
} from "@/services/element/element-model";
import { createAsset } from "@/services/asset/asset-model";
import { validateProjectDeep, formatValidationErrors } from "@/services/project/project-validator";

/**
 * Transforms a validated MotionPlan into concrete Project scenes and updates the project state.
 */
export function applyMotionPlanToProject(
  project: Project,
  plan: MotionPlan
): { project: Project; errors: string[] } {
  const width = plan.canvas.width || project.width;
  const height = plan.canvas.height || project.height;
  const fps = plan.canvas.fps || project.fps;

  // Ensure referenced assets exist in project catalog to satisfy referential integrity
  const assets: Asset[] = [...(project.assets || [])];
  const existingAssetIds = new Set(assets.map((a) => a.id));

  if (!existingAssetIds.has("asset_logo_primary")) {
    assets.push(
      createAsset({
        id: "asset_logo_primary",
        name: "MotionBot Brand Logo",
        type: "logo",
        url: "/assets/logo.svg",
        width: 512,
        height: 512,
      })
    );
    existingAssetIds.add("asset_logo_primary");
  }

  if (!existingAssetIds.has("asset_sneaker_cutout")) {
    assets.push(
      createAsset({
        id: "asset_sneaker_cutout",
        name: "Hero Showcase Cutout",
        type: "image",
        url: "/assets/products/sneaker-cutout.png",
        width: 1200,
        height: 800,
      })
    );
    existingAssetIds.add("asset_sneaker_cutout");
  }

  // Build scenes from motion plan specifications
  const generatedScenes: Scene[] = plan.scenes.map((scenePlan, index) => {
    const bg: SceneBackground = {
      type: scenePlan.background?.type === "gradient" ? "gradient" : "solid",
      color: scenePlan.background?.value || "#000000",
    };

    const elements: MotionElement[] = [];

    // Map text elements
    if (Array.isArray(scenePlan.text_elements)) {
      for (const textPlan of scenePlan.text_elements) {
        const xPos = (textPlan.position.x / 100) * width;
        const yPos = (textPlan.position.y / 100) * height;

        elements.push(
          createTextElement({
            id: textPlan.id,
            name: `${textPlan.role.toUpperCase()}: ${textPlan.text.slice(0, 20)}`,
            text: textPlan.text,
            fontSize:
              textPlan.style?.fontSize ||
              (textPlan.role === "headline" ? 56 : textPlan.role === "subheadline" ? 36 : 28),
            fontFamily: "Inter",
            fontWeight:
              textPlan.style?.fontWeight === "bold" || textPlan.style?.fontWeight === "black"
                ? 700
                : 400,
            alignment: textPlan.style?.align || "center",
            color: textPlan.style?.color || "#FFFFFF",
            transform: {
              x: xPos,
              y: yPos,
              width: Math.min(800, width * 0.8),
              height: 120,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              anchorX: 0.5,
              anchorY: 0.5,
            },
          })
        );
      }
    }

    // Map visual elements
    if (Array.isArray(scenePlan.visual_elements)) {
      for (const visualPlan of scenePlan.visual_elements) {
        const xPos = (visualPlan.position.x / 100) * width;
        const yPos = (visualPlan.position.y / 100) * height;
        const elemWidth = visualPlan.size?.width || 240;
        const elemHeight = visualPlan.size?.height || 240;

        if (visualPlan.type === "shape") {
          elements.push(
            createShapeElement({
              id: visualPlan.id,
              name: visualPlan.description || "Shape Element",
              shapeKind: "rectangle",
              transform: {
                x: xPos,
                y: yPos,
                width: elemWidth,
                height: elemHeight,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                anchorX: 0.5,
                anchorY: 0.5,
              },
              appearance: {
                opacity: 1,
                blendMode: "normal",
                fill: { type: "solid", color: "#3B82F6" },
              },
            })
          );
        } else if (visualPlan.type === "logo") {
          elements.push(
            createLogoElement({
              id: visualPlan.id,
              name: visualPlan.description || "Brand Logo",
              assetId: "asset_logo_primary",
              transform: {
                x: xPos,
                y: yPos,
                width: elemWidth,
                height: elemHeight,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                anchorX: 0.5,
                anchorY: 0.5,
              },
            })
          );
        } else {
          elements.push(
            createImageElement({
              id: visualPlan.id,
              name: visualPlan.description || "Visual Element",
              assetId: "asset_sneaker_cutout",
              transform: {
                x: xPos,
                y: yPos,
                width: elemWidth,
                height: elemHeight,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                anchorX: 0.5,
                anchorY: 0.5,
              },
            })
          );
        }
      }
    }

    return createScene({
      id: scenePlan.scene_id,
      name: `${scenePlan.purpose.toUpperCase()} (Scene ${index + 1})`,
      order: index,
      startTime: scenePlan.start_time,
      duration: scenePlan.duration,
      background: bg,
      elements,
      metadata: {
        description: `Narrative role: ${scenePlan.purpose}`,
        notes: `Entrance: ${scenePlan.entrance_animation?.type}, Camera: ${scenePlan.camera_motion?.type}`,
        customFields: {
          purpose: scenePlan.purpose,
          entranceAnimation: scenePlan.entrance_animation?.type,
          exitAnimation: scenePlan.exit_animation?.type,
          transition: scenePlan.transition?.type,
          cameraMotion: scenePlan.camera_motion?.type,
        },
      },
    });
  });

  const alignedScenes = alignScenesSequentially(generatedScenes);
  const totalDuration = Math.max(calculateScenesDuration(alignedScenes), plan.duration);

  const updatedProject: Project = {
    ...project,
    width,
    height,
    fps,
    duration: totalDuration,
    scenes: alignedScenes,
    assets,
    metadata: {
      ...project.metadata,
      title: plan.project.title || project.metadata.title,
      description: plan.project.description || project.metadata.description,
      customFields: {
        ...project.metadata.customFields,
        sourceBriefId: plan.project.sourceBriefId,
        aspectRatio: plan.canvas.aspect_ratio,
        motionPacing: plan.global_style?.motion_pacing,
        theme: plan.global_style?.theme,
      },
    },
    updatedAt: new Date().toISOString(),
  };

  const validation = validateProjectDeep(updatedProject);
  return {
    project: updatedProject,
    errors: validation.valid ? [] : formatValidationErrors(validation.errors),
  };
}
