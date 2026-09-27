# MOTION-BOT — System Architecture

This document describes the high-level system architecture and target subsystem designs for MOTION-BOT.

> **Status Notice**: Subsystems described in this document represent planned target architecture. As of Phase 1 (Foundation), only the architectural boundaries and base project structure are established. Subsystem implementations will be phased in accordance with `docs/DEVELOPMENT_PHASES.md`.

---

## 1. High-Level Architecture Overview

```
+---------------------------------------------------------------------------------+
|                                 MOTION-BOT Studio                               |
+---------------------------------------------------------------------------------+
|                                                                                 |
|   +-----------------------+   +-----------------------+   +-----------------+   |
|   |      Visual Editor    |   |     Timeline & Track  |   |   Inspector &   |   |
|   |      Canvas (Stage)   |   |        Controller     |   |   Properties    |   |
|   +-----------+-----------+   +-----------+-----------+   +--------+--------+   |
|               |                           |                        |            |
|               +--------------------+------+------------------------+            |
|                                    |                                            |
|                        +-----------v-----------+                                |
|                        |   Project State Model |                                |
|                        |   (Single Source)     |                                |
|                        +-----------+-----------+                                |
|                                    |                                            |
|        +---------------------------+---------------------------+                |
|        |                           |                           |                |
|   +----v---------------+  +--------v-----------+      +--------v-----------+    |
|   |    Motion Engine   |  | AI Creative Engine |      | Storage & Provider |    |
|   |  (Timeline/Render) |  |   (Gemini + LLM)   |      |  (Local / Cloud)   |    |
|   +--------------------+  +--------------------+      +--------------------+    |
|                                                                                 |
+---------------------------------------------------------------------------------+
```

---

## 2. Core Architectural Subsystems

### 2.1. Frontend Foundation
* **Framework**: Next.js (App Router)
* **View Layer**: React with TypeScript in strict mode
* **Design Objectives**:
  - High performance, responsive layout
  - Clean separation between presentation components and domain logic
  - Strict type safety across all state transitions and interfaces

### 2.2. UI & Design System
* **Styling**: Tailwind CSS
* **Components**: Accessible, reusable primitives following shadcn/ui patterns
* **Modularity**: Dedicated `components/ui/` for low-level primitives and `components/` for domain-specific visual layouts
* **Design Objectives**:
  - Theme consistency via CSS custom properties
  - Keyboard accessible and standards-compliant
  - No bespoke one-off CSS where utility classes or design tokens apply

### 2.3. Project System (Target Design)
* **Location**: `types/`, `services/project/`
* **Role**: Defines the schema and lifecycle of a motion design project.
* **Planned Capabilities**:
  - Schema for compositions, scenes, layers, tracks, keyframes, and assets.
  - Serialization and deserialization format for project files (`.motionbot` / JSON).
  - Versioned migration pathways for future schema evolution.
  - Deterministic state immutability for undo/redo stacks.

### 2.4. Visual Editor (Target Design)
* **Location**: `components/editor/`
* **Role**: Interactive canvas workspace where users manipulate visual elements.
* **Planned Capabilities**:
  - Stage rendering with zoom, pan, snapping, and coordinate transformation.
  - Selection, multi-selection, dragging, scaling, and rotation handles.
  - Alignment guides, safe zones, and aspect ratio viewports.

### 2.5. Motion Engine (Target Design)
* **Location**: `engine/`
* **Role**: Standalone, decoupled animation and timing engine.
* **Planned Capabilities**:
  - Pure calculation core independent of DOM rendering whenever possible.
  - Deterministic evaluation: `f(scene, time) -> frameState`.
  - Interpolation curves (linear, ease-in, ease-out, cubic-bezier, springs).
  - Keyframe evaluation, continuous property tracking, and nested timelines.
  - Support for both interactive 60fps canvas preview and headless frame extraction.

### 2.6. AI Creative System (Target Design)
* **Location**: `ai/`
* **Role**: Natural language to structured motion scene generation.
* **Planned Capabilities**:
  - Provider abstraction layer decoupling specific model vendors from internal logic.
  - Google Gemini API integration for multimodal script-to-scene planning.
  - Structured output schemas (JSON-based prompt-to-scene graphs).
  - Specialized agent roles: Creative Director, Scene Planner, Copywriter, and Motion Stylist.

### 2.7. Storage Abstraction (Target Design)
* **Location**: `services/storage/`
* **Role**: Unified persistence layer for project files and assets.
* **Planned Capabilities**:
  - Provider interface (`StorageService`) supporting:
    - Browser LocalStorage / IndexedDB for offline and client-side sessions.
    - Cloud object storage for saved user projects and asset uploads.
  - Content-addressable asset hashing and caching.

### 2.8. Rendering & Export System (Target Design)
* **Location**: `services/render/`
* **Role**: Frame synthesis and export pipeline.
* **Planned Capabilities**:
  - Client-side canvas recording / WebCodecs frame-by-frame export.
  - Future server-side rendering pipeline for high-fidelity MP4 / WebM / GIF generation.
  - Audio and caption synchronization.

---

## 3. Directory Layout and Responsibilities

| Directory | Purpose |
|---|---|
| `app/` | Next.js App Router pages, layouts, route handlers, and root styling |
| `components/` | Reusable React UI components (`components/ui/` for base primitives) |
| `lib/` | Shared utilities, formatting helpers, and common libraries |
| `types/` | Global TypeScript declarations, data schemas, and domain interfaces |
| `services/` | External service integrations, storage, rendering, and persistence abstractions |
| `engine/` | Decoupled motion and animation evaluation core |
| `ai/` | AI agent workflows, prompt schemas, and LLM provider interfaces |
| `templates/` | Built-in design templates, layout recipes, and preset motion behaviors |
| `public/` | Static web assets, icons, fonts, and metadata images |
| `docs/` | Architectural guides, phase specs, and developer documentation |
| `.agents/` | Phase lock tracking, development governance rules, and agent instructions |

---

## 4. Architectural Invariants

1. **Strict Decoupling**: The motion engine must not directly depend on UI components or network services.
2. **Schema-Driven State**: All project state must serialize to a clean, versioned JSON schema.
3. **Provider Agnostic AI**: The core motion editor must operate via well-defined domain events, allowing AI to act as an external generator that outputs valid project JSON.
4. **Phase Integrity**: Files belonging to future subsystems must not contain dummy code or premature partial implementations.
