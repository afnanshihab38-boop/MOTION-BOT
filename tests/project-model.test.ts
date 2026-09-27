/**
 * MOTION-BOT — Project & Scene Model Test Suite
 * Validates concrete data structures, multi-scene explicit timing, arbitrary dimensions,
 * immutability guarantees, and validation logic.
 * Part of Phase 3.2: Project & Scene Model.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  createProject,
  validateProject,
  validateDimensions,
  addScene,
  removeScene,
  updateScene,
  reorderScenes,
  duplicateScene,
  addElementToProjectScene,
  updateProjectDimensions,
  updateProjectMetadata,
  DIMENSION_PRESETS,
} from "../services/project/project-model";

import {
  createScene,
  validateScene,
  alignScenesSequentially,
  setSceneTiming,
  findSceneAtTime,
} from "../services/project/scene-model";

import { TextElement } from "../types/element";
import { CURRENT_SCHEMA_VERSION } from "../types/project";

test("Project Model — Creation with default and custom values", () => {
  const project = createProject({
    name: "Summer Campaign 2026",
    width: 1920,
    height: 1080,
    fps: 60,
  });

  assert.equal(project.name, "Summer Campaign 2026");
  assert.equal(project.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(project.width, 1920);
  assert.equal(project.height, 1080);
  assert.equal(project.fps, 60);
  assert.equal(project.scenes.length, 1);
  assert.ok(project.id.startsWith("proj_"));
  assert.ok(project.createdAt);
  assert.ok(project.updatedAt);

  const validation = validateProject(project);
  assert.equal(validation.valid, true, `Validation failed: ${validation.errors.join(", ")}`);
});

test("Project Dimensions — Supports arbitrary dimensions without restriction", () => {
  // Test preset dimensions
  for (const preset of Object.values(DIMENSION_PRESETS)) {
    const proj = createProject({
      width: preset.width,
      height: preset.height,
    });
    assert.equal(proj.width, preset.width);
    assert.equal(proj.height, preset.height);
    assert.equal(validateProject(proj).valid, true);
  }

  // Test arbitrary custom dimensions (e.g. ultra-wide billboard, unusual banner, 4K)
  const arbitrarySizes = [
    { width: 800, height: 600 },
    { width: 3840, height: 2160 },
    { width: 1200, height: 628 },
    { width: 500, height: 500 },
    { width: 300, height: 250 },
    { width: 1920, height: 480 },
  ];

  for (const size of arbitrarySizes) {
    const proj = createProject({
      width: size.width,
      height: size.height,
    });
    assert.equal(proj.width, size.width);
    assert.equal(proj.height, size.height);
    assert.equal(validateProject(proj).valid, true);
  }

  // Dimension validation error cases
  assert.equal(validateDimensions(0, 1080).valid, false);
  assert.equal(validateDimensions(1920, -50).valid, false);
  assert.equal(validateDimensions(NaN, 1080).valid, false);
});

test("Scene Model — Creation, validation, and metadata", () => {
  const scene = createScene({
    name: "Intro Hook",
    order: 0,
    startTime: 0,
    duration: 3.5,
    background: { type: "solid", color: "#12141C" },
    metadata: {
      notes: "First 3 seconds hook to retain viewer attention",
      customFields: { hookType: "curiosity", targetRetention: 0.85 },
    },
  });

  assert.equal(scene.name, "Intro Hook");
  assert.equal(scene.startTime, 0);
  assert.equal(scene.duration, 3.5);
  assert.equal(scene.background.color, "#12141C");
  assert.equal(scene.metadata?.notes, "First 3 seconds hook to retain viewer attention");
  assert.equal(scene.metadata?.customFields?.hookType, "curiosity");

  const validation = validateScene(scene);
  assert.equal(validation.valid, true);
});

test("Scene Timing — Explicit timing for multiple consecutive scenes (0s -> 3s, 3s -> 6s, 6s -> 10s)", () => {
  const sceneA = createScene({ name: "Scene A", duration: 3.0 });
  const sceneB = createScene({ name: "Scene B", duration: 3.0 });
  const sceneC = createScene({ name: "Scene C", duration: 4.0 });

  // Align sequentially
  const aligned = alignScenesSequentially([sceneA, sceneB, sceneC]);

  // Scene A: 0s -> 3s
  assert.equal(aligned[0].startTime, 0);
  assert.equal(aligned[0].duration, 3.0);
  assert.equal(aligned[0].startTime + aligned[0].duration, 3.0);

  // Scene B: 3s -> 6s
  assert.equal(aligned[1].startTime, 3.0);
  assert.equal(aligned[1].duration, 3.0);
  assert.equal(aligned[1].startTime + aligned[1].duration, 6.0);

  // Scene C: 6s -> 10s
  assert.equal(aligned[2].startTime, 6.0);
  assert.equal(aligned[2].duration, 4.0);
  assert.equal(aligned[2].startTime + aligned[2].duration, 10.0);

  // Check scene queries at specific timecodes
  assert.equal(findSceneAtTime(aligned, 1.5)?.name, "Scene A");
  assert.equal(findSceneAtTime(aligned, 3.0)?.name, "Scene B");
  assert.equal(findSceneAtTime(aligned, 5.9)?.name, "Scene B");
  assert.equal(findSceneAtTime(aligned, 6.0)?.name, "Scene C");
  assert.equal(findSceneAtTime(aligned, 9.9)?.name, "Scene C");
  assert.equal(findSceneAtTime(aligned, 10.5), undefined);
});

test("Project Model — Multi-Scene Project integration and duration calculation", () => {
  const sceneA = createScene({ name: "Scene A", duration: 3.0 });
  const sceneB = createScene({ name: "Scene B", duration: 3.0 });
  const sceneC = createScene({ name: "Scene C", duration: 4.0 });

  const project = createProject({
    name: "Multi-Scene Commercial",
    scenes: [sceneA, sceneB, sceneC],
  });

  assert.equal(project.scenes.length, 3);
  assert.equal(project.duration, 10.0); // 3 + 3 + 4 = 10s total duration
  assert.equal(project.scenes[0].startTime, 0);
  assert.equal(project.scenes[1].startTime, 3.0);
  assert.equal(project.scenes[2].startTime, 6.0);

  const validation = validateProject(project);
  assert.equal(validation.valid, true);
});

test("State Safety & Immutability — Adding, updating, reordering, and element mutation", () => {
  const originalProject = createProject({
    name: "Original Project",
    scenes: [
      createScene({ name: "Scene 1", duration: 3.0 }),
      createScene({ name: "Scene 2", duration: 3.0 }),
    ],
  });

  // 1. Add Scene
  const newScene = createScene({ name: "Scene 3", duration: 4.0 });
  const projectWithAddedScene = addScene(originalProject, newScene);

  // Assert original project is untouched (immutable guarantee)
  assert.equal(originalProject.scenes.length, 2);
  assert.equal(projectWithAddedScene.scenes.length, 3);
  assert.equal(projectWithAddedScene.duration, 10.0);
  assert.notEqual(originalProject, projectWithAddedScene);

  // 2. Update Scene duration & realign
  const scene1Id = projectWithAddedScene.scenes[0].id;
  const projectWithUpdatedScene = updateScene(projectWithAddedScene, scene1Id, {
    duration: 5.0, // changed from 3s to 5s
  });

  // Scene 1: 0 -> 5s; Scene 2: 5 -> 8s; Scene 3: 8 -> 12s
  assert.equal(projectWithUpdatedScene.scenes[0].duration, 5.0);
  assert.equal(projectWithUpdatedScene.scenes[1].startTime, 5.0);
  assert.equal(projectWithUpdatedScene.scenes[2].startTime, 8.0);
  assert.equal(projectWithUpdatedScene.duration, 12.0);

  // 3. Reorder Scenes
  const reordered = reorderScenes(projectWithUpdatedScene, 0, 2);
  assert.equal(reordered.scenes[0].name, "Scene 2");
  assert.equal(reordered.scenes[1].name, "Scene 3");
  assert.equal(reordered.scenes[2].name, "Scene 1");
  assert.equal(reordered.scenes[0].startTime, 0);

  // 4. Duplicate Scene
  const duplicated = duplicateScene(projectWithAddedScene, scene1Id);
  assert.equal(duplicated.scenes.length, 4);
  assert.equal(duplicated.scenes[1].name, "Scene 1 (Copy)");

  // 5. Remove Scene
  const removed = removeScene(duplicated, scene1Id);
  assert.equal(removed.scenes.length, 3);

  // 6. Add Motion Element to Scene
  const sampleTextElement: TextElement = {
    id: "el_text_01",
    name: "Headline Text",
    type: "text",
    text: "Future of Motion Design",
    fontFamily: "Inter",
    fontSize: 72,
    fontWeight: 700,
    letterSpacing: -1,
    lineHeight: 1.1,
    textAlign: "center",
    verticalAlign: "middle",
    visible: true,
    locked: false,
    startFrame: 0,
    durationFrames: 90,
    zIndex: 1,
    transform: {
      x: 960,
      y: 540,
      width: 800,
      height: 120,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      anchorX: 0.5,
      anchorY: 0.5,
    },
    appearance: {
      opacity: 1,
      blendMode: "normal",
      fill: { type: "solid", color: "#FFFFFF" },
    },
    animations: [],
    propertyTracks: [],
  };

  const projectWithElement = addElementToProjectScene(
    projectWithAddedScene,
    projectWithAddedScene.scenes[0].id,
    sampleTextElement
  );

  assert.equal(projectWithAddedScene.scenes[0].elements.length, 0); // Original remains clean
  assert.equal(projectWithElement.scenes[0].elements.length, 1);
  assert.equal(projectWithElement.scenes[0].elements[0].name, "Headline Text");

  // 7. Update dimensions and metadata immutably
  const resized = updateProjectDimensions(projectWithElement, 1080, 1920);
  assert.equal(resized.width, 1080);
  assert.equal(resized.height, 1920);
  assert.equal(projectWithElement.width, 1920); // original unchanged

  const withMeta = updateProjectMetadata(resized, {
    client: "Acme Studios",
    category: "Brand Ad",
    customFields: { renderPriority: "high" },
  });
  assert.equal(withMeta.metadata.client, "Acme Studios");
  assert.equal(withMeta.metadata.customFields?.renderPriority, "high");
});
