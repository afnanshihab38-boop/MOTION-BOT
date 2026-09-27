/**
 * MOTION-BOT — Validation & Serialization Test Suite
 * Validates the complete lifecycle:
 *   Create Project -> Validate Project -> Serialize Project -> Deserialize Project -> Validate Again
 * Part of Phase 3.5: Validation, Serialization & Architecture Lock.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  validateProjectDeep,
  validateSceneDeep,
  validateElementDeep,
  validateAnimationDeep,
  validateAssetDeep,
  formatValidationErrors,
} from "../services/project/project-validator";

import {
  serializeProject,
  deserializeProject,
  cloneProject,
} from "../services/project/project-serializer";

import {
  createSampleProject,
  SAMPLE_DEV_PROJECT,
} from "../services/project/sample-project";

import { createProject } from "../services/project/project-model";
import { createScene } from "../services/project/scene-model";
import { createTextElement, createImageElement, createShapeElement } from "../services/element/element-model";
import { createImageAsset } from "../services/asset/asset-model";
import { createAnimation, createKeyframe } from "../services/animation/animation-model";
import { CURRENT_SCHEMA_VERSION, Project } from "../types/project";

test("Full Lifecycle — Create -> Validate -> Serialize -> Deserialize -> Validate Again", () => {
  // 1. Create Project
  const project = createSampleProject();

  // 2. Validate Project
  const val1 = validateProjectDeep(project);
  assert.equal(val1.valid, true, `Initial validation failed: ${formatValidationErrors(val1.errors).join(", ")}`);

  // 3. Serialize Project
  const jsonString = serializeProject(project, true);
  assert.equal(typeof jsonString, "string");
  assert.ok(jsonString.length > 0);

  // 4. Deserialize Project
  const result = deserializeProject(jsonString);
  assert.equal(result.success, true);
  if (!result.success) return;

  const deserializedProject = result.project;
  assert.equal(deserializedProject.id, project.id);
  assert.equal(deserializedProject.name, project.name);
  assert.equal(deserializedProject.width, 1920);
  assert.equal(deserializedProject.height, 1080);
  assert.equal(deserializedProject.scenes.length, project.scenes.length);
  assert.equal(deserializedProject.assets.length, project.assets.length);

  // 5. Validate Again
  const val2 = validateProjectDeep(deserializedProject);
  assert.equal(val2.valid, true, `Second validation failed: ${formatValidationErrors(val2.errors).join(", ")}`);
});

test("Serialization & Deep Cloning — Structural fidelity", () => {
  const sample = createSampleProject();
  const cloned = cloneProject(sample);

  assert.deepEqual(sample, cloned);
  assert.notEqual(sample, cloned); // Distinct memory reference
});

test("Deserialization — Rejection of invalid inputs and malformed JSON", () => {
  // Non-string input
  // @ts-expect-error Testing invalid runtime input
  assert.equal(deserializeProject(null).success, false);
  assert.equal(deserializeProject("").success, false);

  // Malformed JSON
  const syntaxErr = deserializeProject("{ name: 'bad json', ");
  assert.equal(syntaxErr.success, false);
  if (!syntaxErr.success) {
    assert.ok(syntaxErr.errors[0].includes("JSON syntax parse error"));
  }

  // Valid JSON but invalid project structure
  const invalidJson = JSON.stringify({ id: "", name: "" });
  const validationErr = deserializeProject(invalidJson);
  assert.equal(validationErr.success, false);
  if (!validationErr.success) {
    assert.ok(validationErr.errors.length > 0);
  }
});

test("Schema Version — Strict validation and backwards compatibility checks", () => {
  const project = createSampleProject();

  // Valid schema version
  assert.equal(project.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(validateProjectDeep(project).valid, true);

  // Missing schema version
  const badVersion = { ...project, schemaVersion: "" };
  const res1 = validateProjectDeep(badVersion);
  assert.equal(res1.valid, false);
  assert.ok(res1.errors.some((e) => e.path === "schemaVersion"));

  // Incompatible major schema version (e.g. 2.0.0 vs 1.0.0)
  const futureMajorVersion = { ...project, schemaVersion: "2.0.0" };
  const res2 = validateProjectDeep(futureMajorVersion);
  assert.equal(res2.valid, false);
  assert.ok(res2.errors.some((e) => e.code === "INCOMPATIBLE_SCHEMA_VERSION"));
});

test("Deep Validation — Catches broken asset references", () => {
  const asset = createImageAsset({
    id: "asset_valid_01",
    name: "photo.png",
    url: "https://example.com/photo.png",
  });

  const validImg = createImageElement({
    assetId: "asset_valid_01",
    name: "Valid Image",
  });

  const brokenImg = createImageElement({
    assetId: "asset_nonexistent_999",
    name: "Broken Image",
  });

  const scene = createScene({
    name: "Test Scene",
    elements: [validImg, brokenImg],
  });

  const project = createProject({
    scenes: [scene],
    assets: [asset], // Only asset_valid_01 exists in project
  });

  const validation = validateProjectDeep(project);
  assert.equal(validation.valid, false);
  const brokenAssetError = validation.errors.find((e) => e.code === "BROKEN_ASSET_REFERENCE");
  assert.ok(brokenAssetError);
  assert.ok(brokenAssetError?.message.includes("asset_nonexistent_999"));
});

test("Deep Validation — Catches chronological keyframe errors and negative times", () => {
  // Negative keyframe time
  const animNegative = {
    id: "anim_x",
    property: "x",
    interpolation: "linear",
    enabled: true,
    keyframes: [
      { id: "kf1", time: -1.0, value: 0, easing: "linear" },
    ],
  };
  const negErrors = validateAnimationDeep(animNegative);
  assert.ok(negErrors.some((e) => e.code === "INVALID_NUMBER"));

  // Out of order keyframe time
  const animOutOfOrder = {
    id: "anim_y",
    property: "y",
    interpolation: "bezier",
    enabled: true,
    keyframes: [
      { id: "kf1", time: 2.0, value: 100, easing: "linear" },
      { id: "kf2", time: 1.0, value: 50, easing: "linear" },
    ],
  };
  const orderErrors = validateAnimationDeep(animOutOfOrder);
  assert.ok(orderErrors.some((e) => e.code === "OUT_OF_ORDER"));
});

test("Sample Project Fixture — Satisfies complete deep validation", () => {
  const result = validateProjectDeep(SAMPLE_DEV_PROJECT);
  assert.equal(result.valid, true, `Sample project failed validation: ${formatValidationErrors(result.errors).join(", ")}`);
  assert.equal(SAMPLE_DEV_PROJECT.scenes.length, 1);
  assert.equal(SAMPLE_DEV_PROJECT.assets.length, 2);
  assert.equal(SAMPLE_DEV_PROJECT.scenes[0].elements.length, 4);
});
