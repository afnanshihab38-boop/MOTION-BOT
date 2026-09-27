/**
 * MOTION-BOT — Comprehensive Project Model Deep Validator
 * Zero-dependency deep validation ensuring structural, temporal, and referential integrity.
 * Part of Phase 3.5: Validation, Serialization & Architecture Lock.
 */

import { Project, CURRENT_SCHEMA_VERSION } from "@/types/project";
import { Scene } from "@/types/scene";
import { MotionElement } from "@/types/element";
import { Asset } from "@/types/asset";
import { Animation, AnimatableProperty } from "@/types/animation";

/**
 * Structured validation failure descriptor with precise JSON path.
 */
export interface ValidationError {
  path: string; // e.g. "scenes[0].elements[1].transform.width"
  message: string;
  code: string;
}

/**
 * Result of a validation check.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Helper to format validation errors into human-readable strings.
 */
export function formatValidationErrors(errors: ValidationError[]): string[] {
  return errors.map((err) => `[${err.path}] ${err.message} (${err.code})`);
}

/**
 * Supported animatable properties list for validation.
 */
const VALID_ANIMATABLE_PROPERTIES: Set<AnimatableProperty> = new Set([
  "x",
  "y",
  "width",
  "height",
  "rotation",
  "scaleX",
  "scaleY",
  "opacity",
  "fillColor",
  "strokeColor",
  "strokeWidth",
  "cornerRadius",
  "blurRadius",
  "fontSize",
  "letterSpacing",
  "lineHeight",
  "volume",
]);

/**
 * Validates an Asset entity.
 */
export function validateAssetDeep(
  asset: unknown,
  path = "asset"
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!asset || typeof asset !== "object") {
    errors.push({ path, message: "Asset must be a non-null object", code: "INVALID_OBJECT" });
    return errors;
  }

  const a = asset as Partial<Asset>;

  if (!a.id || typeof a.id !== "string" || a.id.trim() === "") {
    errors.push({ path: `${path}.id`, message: "Asset requires a valid non-empty string id", code: "REQUIRED_FIELD" });
  }

  if (!a.name || typeof a.name !== "string" || a.name.trim() === "") {
    errors.push({ path: `${path}.name`, message: "Asset requires a valid non-empty name", code: "REQUIRED_FIELD" });
  }

  const validTypes = ["image", "video", "audio", "font", "logo", "svg", "lottie"];
  if (!a.type || !validTypes.includes(a.type)) {
    errors.push({
      path: `${path}.type`,
      message: `Asset type must be one of: ${validTypes.join(", ")}, received: ${String(a.type)}`,
      code: "INVALID_ENUM",
    });
  }

  if (!a.url || typeof a.url !== "string" || a.url.trim() === "") {
    errors.push({ path: `${path}.url`, message: "Asset requires a valid string url", code: "REQUIRED_FIELD" });
  }

  if (a.width !== undefined && (typeof a.width !== "number" || isNaN(a.width) || a.width <= 0)) {
    errors.push({ path: `${path}.width`, message: "Asset width must be a positive number if provided", code: "INVALID_NUMBER" });
  }

  if (a.height !== undefined && (typeof a.height !== "number" || isNaN(a.height) || a.height <= 0)) {
    errors.push({ path: `${path}.height`, message: "Asset height must be a positive number if provided", code: "INVALID_NUMBER" });
  }

  if (a.duration !== undefined && (typeof a.duration !== "number" || isNaN(a.duration) || a.duration < 0)) {
    errors.push({ path: `${path}.duration`, message: "Asset duration must be non-negative if provided", code: "INVALID_NUMBER" });
  }

  return errors;
}

/**
 * Validates an individual keyframe sequence in an animation.
 */
export function validateAnimationDeep(
  animation: unknown,
  path = "animation"
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!animation || typeof animation !== "object") {
    errors.push({ path, message: "Animation must be a non-null object", code: "INVALID_OBJECT" });
    return errors;
  }

  const anim = animation as Partial<Animation>;

  if (!anim.id || typeof anim.id !== "string") {
    errors.push({ path: `${path}.id`, message: "Animation requires a valid string id", code: "REQUIRED_FIELD" });
  }

  if (!anim.property || !VALID_ANIMATABLE_PROPERTIES.has(anim.property as AnimatableProperty)) {
    errors.push({
      path: `${path}.property`,
      message: `Invalid animatable property: ${String(anim.property)}`,
      code: "INVALID_PROPERTY",
    });
  }

  if (!Array.isArray(anim.keyframes)) {
    errors.push({ path: `${path}.keyframes`, message: "Animation keyframes must be an array", code: "INVALID_TYPE" });
  } else {
    let lastTime = -Infinity;
    for (let k = 0; k < anim.keyframes.length; k++) {
      const kf = anim.keyframes[k];
      const kfPath = `${path}.keyframes[${k}]`;

      if (!kf || typeof kf !== "object") {
        errors.push({ path: kfPath, message: "Keyframe must be a non-null object", code: "INVALID_OBJECT" });
        continue;
      }

      if (!kf.id || typeof kf.id !== "string") {
        errors.push({ path: `${kfPath}.id`, message: "Keyframe requires a valid string id", code: "REQUIRED_FIELD" });
      }

      if (typeof kf.time !== "number" || isNaN(kf.time) || kf.time < 0) {
        errors.push({ path: `${kfPath}.time`, message: "Keyframe requires non-negative numeric time (in seconds)", code: "INVALID_NUMBER" });
      } else {
        if (kf.time < lastTime) {
          errors.push({
            path: `${kfPath}.time`,
            message: `Keyframe time ${kf.time} is out of chronological order (previous: ${lastTime})`,
            code: "OUT_OF_ORDER",
          });
        }
        lastTime = kf.time;
      }

      if (kf.value === undefined || kf.value === null) {
        errors.push({ path: `${kfPath}.value`, message: "Keyframe requires a defined value", code: "REQUIRED_FIELD" });
      }

      if (!kf.easing) {
        errors.push({ path: `${kfPath}.easing`, message: "Keyframe requires an easing specification", code: "REQUIRED_FIELD" });
      }
    }
  }

  return errors;
}

/**
 * Validates a Motion Element including geometry, styling, and asset references.
 */
export function validateElementDeep(
  element: unknown,
  path = "element",
  validAssetIds?: Set<string>
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!element || typeof element !== "object") {
    errors.push({ path, message: "Element must be a non-null object", code: "INVALID_OBJECT" });
    return errors;
  }

  const el = element as Partial<MotionElement>;

  if (!el.id || typeof el.id !== "string" || el.id.trim() === "") {
    errors.push({ path: `${path}.id`, message: "Element requires a valid non-empty string id", code: "REQUIRED_FIELD" });
  }

  const validTypes = ["text", "image", "shape", "logo", "video", "audio", "group"];
  if (!el.type || !validTypes.includes(el.type)) {
    errors.push({
      path: `${path}.type`,
      message: `Element type must be one of: ${validTypes.join(", ")}, received: ${String(el.type)}`,
      code: "INVALID_ENUM",
    });
  }

  if (typeof el.visible !== "boolean") {
    errors.push({ path: `${path}.visible`, message: "Element requires a boolean visible property", code: "INVALID_TYPE" });
  }

  if (typeof el.locked !== "boolean") {
    errors.push({ path: `${path}.locked`, message: "Element requires a boolean locked property", code: "INVALID_TYPE" });
  }

  if (typeof el.zIndex !== "number" || isNaN(el.zIndex)) {
    errors.push({ path: `${path}.zIndex`, message: "Element requires a numeric zIndex", code: "INVALID_NUMBER" });
  }

  // Transform validation
  if (!el.transform || typeof el.transform !== "object") {
    errors.push({ path: `${path}.transform`, message: "Element requires a transform object", code: "REQUIRED_FIELD" });
  } else {
    const t = el.transform;
    const tPath = `${path}.transform`;

    if (typeof t.x !== "number" || isNaN(t.x) || !Number.isFinite(t.x)) {
      errors.push({ path: `${tPath}.x`, message: "Transform x must be a finite number", code: "INVALID_NUMBER" });
    }
    if (typeof t.y !== "number" || isNaN(t.y) || !Number.isFinite(t.y)) {
      errors.push({ path: `${tPath}.y`, message: "Transform y must be a finite number", code: "INVALID_NUMBER" });
    }
    if (typeof t.width !== "number" || isNaN(t.width) || t.width < 0 || !Number.isFinite(t.width)) {
      errors.push({ path: `${tPath}.width`, message: "Transform width must be a non-negative finite number", code: "INVALID_NUMBER" });
    }
    if (typeof t.height !== "number" || isNaN(t.height) || t.height < 0 || !Number.isFinite(t.height)) {
      errors.push({ path: `${tPath}.height`, message: "Transform height must be a non-negative finite number", code: "INVALID_NUMBER" });
    }
    if (typeof t.rotation !== "number" || isNaN(t.rotation) || !Number.isFinite(t.rotation)) {
      errors.push({ path: `${tPath}.rotation`, message: "Transform rotation must be a finite number", code: "INVALID_NUMBER" });
    }
    if (typeof t.scaleX !== "number" || isNaN(t.scaleX) || !Number.isFinite(t.scaleX)) {
      errors.push({ path: `${tPath}.scaleX`, message: "Transform scaleX must be a finite number", code: "INVALID_NUMBER" });
    }
    if (typeof t.scaleY !== "number" || isNaN(t.scaleY) || !Number.isFinite(t.scaleY)) {
      errors.push({ path: `${tPath}.scaleY`, message: "Transform scaleY must be a finite number", code: "INVALID_NUMBER" });
    }
  }

  // Appearance validation
  if (!el.appearance || typeof el.appearance !== "object") {
    errors.push({ path: `${path}.appearance`, message: "Element requires an appearance object", code: "REQUIRED_FIELD" });
  } else {
    const a = el.appearance;
    const aPath = `${path}.appearance`;

    if (typeof a.opacity !== "number" || isNaN(a.opacity) || a.opacity < 0 || a.opacity > 1) {
      errors.push({ path: `${aPath}.opacity`, message: "Appearance opacity must be a number between 0 and 1", code: "OUT_OF_RANGE" });
    }
    if (!a.blendMode || typeof a.blendMode !== "string") {
      errors.push({ path: `${aPath}.blendMode`, message: "Appearance requires a valid blendMode string", code: "REQUIRED_FIELD" });
    }
    if (!a.fill || typeof a.fill !== "object") {
      errors.push({ path: `${aPath}.fill`, message: "Appearance requires a fill object", code: "REQUIRED_FIELD" });
    }
  }

  // Type-specific validation
  if (el.type === "text") {
    const textEl = el as { text?: unknown; content?: unknown; fontSize?: unknown };
    const hasText = (typeof textEl.text === "string" && textEl.text.length > 0) ||
                    (typeof textEl.content === "string" && textEl.content.length > 0);
    if (!hasText) {
      errors.push({ path: `${path}.text`, message: "TextElement requires non-empty text or content", code: "REQUIRED_FIELD" });
    }
    if (textEl.fontSize !== undefined && (typeof textEl.fontSize !== "number" || (textEl.fontSize as number) <= 0)) {
      errors.push({ path: `${path}.fontSize`, message: "TextElement fontSize must be a positive number", code: "INVALID_NUMBER" });
    }
  }

  // Media element asset reference check
  if (el.type === "image" || el.type === "logo" || el.type === "video" || el.type === "audio") {
    const mediaEl = el as { assetId?: unknown };
    if (!mediaEl.assetId || typeof mediaEl.assetId !== "string" || mediaEl.assetId.trim() === "") {
      errors.push({
        path: `${path}.assetId`,
        message: `${el.type} element requires a valid assetId reference`,
        code: "REQUIRED_FIELD",
      });
    } else if (validAssetIds && !validAssetIds.has(mediaEl.assetId)) {
      errors.push({
        path: `${path}.assetId`,
        message: `${el.type} element references nonexistent assetId: "${mediaEl.assetId}"`,
        code: "BROKEN_ASSET_REFERENCE",
      });
    }
  }

  if (el.type === "group") {
    const groupEl = el as { childrenIds?: unknown };
    if (!Array.isArray(groupEl.childrenIds)) {
      errors.push({ path: `${path}.childrenIds`, message: "GroupElement requires an array of childrenIds", code: "INVALID_TYPE" });
    }
  }

  // Property animation tracks validation
  if (Array.isArray(el.propertyTracks)) {
    for (let t = 0; t < el.propertyTracks.length; t++) {
      const trackErrors = validateAnimationDeep(el.propertyTracks[t], `${path}.propertyTracks[${t}]`);
      errors.push(...trackErrors);
    }
  }

  return errors;
}

/**
 * Validates a composition Scene including timing boundaries and contained elements.
 */
export function validateSceneDeep(
  scene: unknown,
  sceneIndex = 0,
  validAssetIds?: Set<string>
): ValidationError[] {
  const errors: ValidationError[] = [];
  const path = `scenes[${sceneIndex}]`;

  if (!scene || typeof scene !== "object") {
    errors.push({ path, message: "Scene must be a non-null object", code: "INVALID_OBJECT" });
    return errors;
  }

  const s = scene as Partial<Scene>;

  if (!s.id || typeof s.id !== "string" || s.id.trim() === "") {
    errors.push({ path: `${path}.id`, message: "Scene requires a valid non-empty string id", code: "REQUIRED_FIELD" });
  }

  if (!s.name || typeof s.name !== "string" || s.name.trim() === "") {
    errors.push({ path: `${path}.name`, message: "Scene requires a valid non-empty name", code: "REQUIRED_FIELD" });
  }

  if (typeof s.order !== "number" || isNaN(s.order) || s.order < 0) {
    errors.push({ path: `${path}.order`, message: "Scene order must be a non-negative integer", code: "INVALID_NUMBER" });
  }

  if (typeof s.startTime !== "number" || isNaN(s.startTime) || s.startTime < 0 || !Number.isFinite(s.startTime)) {
    errors.push({ path: `${path}.startTime`, message: "Scene startTime must be a non-negative finite number", code: "INVALID_NUMBER" });
  }

  if (typeof s.duration !== "number" || isNaN(s.duration) || s.duration <= 0 || !Number.isFinite(s.duration)) {
    errors.push({ path: `${path}.duration`, message: "Scene duration must be a positive finite number", code: "INVALID_NUMBER" });
  }

  if (!s.background || typeof s.background !== "object") {
    errors.push({ path: `${path}.background`, message: "Scene requires a valid background object", code: "REQUIRED_FIELD" });
  }

  if (!Array.isArray(s.elements)) {
    errors.push({ path: `${path}.elements`, message: "Scene elements must be an array", code: "INVALID_TYPE" });
  } else {
    for (let e = 0; e < s.elements.length; e++) {
      const elErrors = validateElementDeep(s.elements[e], `${path}.elements[${e}]`, validAssetIds);
      errors.push(...elErrors);
    }
  }

  return errors;
}

/**
 * Top-level deep validator for a Project and its complete object graph.
 */
export function validateProjectDeep(project: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!project || typeof project !== "object") {
    return {
      valid: false,
      errors: [{ path: "project", message: "Project must be a non-null object", code: "INVALID_OBJECT" }],
    };
  }

  const p = project as Partial<Project>;

  // 1. Identity & Schema Version
  if (!p.id || typeof p.id !== "string" || p.id.trim() === "") {
    errors.push({ path: "id", message: "Project requires a valid non-empty string id", code: "REQUIRED_FIELD" });
  }

  if (!p.name || typeof p.name !== "string" || p.name.trim() === "") {
    errors.push({ path: "name", message: "Project requires a non-empty name", code: "REQUIRED_FIELD" });
  }

  if (!p.schemaVersion || typeof p.schemaVersion !== "string") {
    errors.push({ path: "schemaVersion", message: "Project requires a string schemaVersion", code: "REQUIRED_FIELD" });
  } else if (p.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    // Check compatibility
    const majorVersion = p.schemaVersion.split(".")[0];
    const currentMajor = CURRENT_SCHEMA_VERSION.split(".")[0];
    if (majorVersion !== currentMajor) {
      errors.push({
        path: "schemaVersion",
        message: `Incompatible schema version: ${p.schemaVersion} (expected major version ${currentMajor}.x.x)`,
        code: "INCOMPATIBLE_SCHEMA_VERSION",
      });
    }
  }

  // 2. Dimensions
  if (typeof p.width !== "number" || isNaN(p.width) || p.width <= 0 || !Number.isFinite(p.width)) {
    errors.push({ path: "width", message: "Project width must be a positive finite number", code: "INVALID_NUMBER" });
  }

  if (typeof p.height !== "number" || isNaN(p.height) || p.height <= 0 || !Number.isFinite(p.height)) {
    errors.push({ path: "height", message: "Project height must be a positive finite number", code: "INVALID_NUMBER" });
  }

  // 3. Playback Timing
  if (typeof p.fps !== "number" || isNaN(p.fps) || p.fps <= 0 || !Number.isFinite(p.fps)) {
    errors.push({ path: "fps", message: "Project fps must be a positive number", code: "INVALID_NUMBER" });
  }

  if (typeof p.duration !== "number" || isNaN(p.duration) || p.duration <= 0 || !Number.isFinite(p.duration)) {
    errors.push({ path: "duration", message: "Project duration must be a positive number in seconds", code: "INVALID_NUMBER" });
  }

  // 4. Timestamps
  if (!p.createdAt || typeof p.createdAt !== "string" || isNaN(Date.parse(p.createdAt))) {
    errors.push({ path: "createdAt", message: "Project requires a valid ISO 8601 createdAt timestamp", code: "INVALID_DATE" });
  }

  if (!p.updatedAt || typeof p.updatedAt !== "string" || isNaN(Date.parse(p.updatedAt))) {
    errors.push({ path: "updatedAt", message: "Project requires a valid ISO 8601 updatedAt timestamp", code: "INVALID_DATE" });
  }

  // 5. Metadata
  if (!p.metadata || typeof p.metadata !== "object") {
    errors.push({ path: "metadata", message: "Project requires a metadata object", code: "REQUIRED_FIELD" });
  }

  // 6. Assets Registry
  const validAssetIds = new Set<string>();
  if (!Array.isArray(p.assets)) {
    errors.push({ path: "assets", message: "Project assets must be an array", code: "INVALID_TYPE" });
  } else {
    for (let a = 0; a < p.assets.length; a++) {
      const assetErrors = validateAssetDeep(p.assets[a], `assets[${a}]`);
      errors.push(...assetErrors);
      if (p.assets[a]?.id) {
        validAssetIds.add(p.assets[a].id);
      }
    }
  }

  // 7. Scenes & Hierarchy
  if (!Array.isArray(p.scenes)) {
    errors.push({ path: "scenes", message: "Project scenes must be an array", code: "INVALID_TYPE" });
  } else if (p.scenes.length === 0) {
    errors.push({ path: "scenes", message: "Project must contain at least one scene", code: "EMPTY_ARRAY" });
  } else {
    for (let s = 0; s < p.scenes.length; s++) {
      const sceneErrors = validateSceneDeep(p.scenes[s], s, validAssetIds);
      errors.push(...sceneErrors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
