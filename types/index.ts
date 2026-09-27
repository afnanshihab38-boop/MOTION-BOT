/**
 * MOTION-BOT — Type System & Data Architecture Registry
 * Central barrel export for all project, scene, element, asset,
 * animation, timeline, template, and brand kit data contracts.
 * Part of Phase 3.1: Data Architecture & Type System.
 */

// Foundation & Environment (Preserved from Phase 1)
export type AppEnvironment = "development" | "production" | "test";

// Project Data Architecture
export * from "./project";

// Scene & Composition Architecture
export * from "./scene";

// Element & Layer Architecture
export * from "./element";

// Asset & Media Architecture
export * from "./asset";

// Animation & Keyframe Architecture
export * from "./animation";

// Timeline & Track Architecture
export * from "./timeline";

// Template Architecture
export * from "./template";

// Brand Kit Architecture
export * from "./brand";
