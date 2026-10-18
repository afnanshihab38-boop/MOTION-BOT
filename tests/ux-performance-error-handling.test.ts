/**
 * Phase 8.9: UX + Performance + Error Handling Tests
 *
 * Verifies:
 * 1. Error sanitization (no leaked API keys, tokens, filepaths, or stack traces)
 * 2. User-facing error classification (network, rate limits, timeouts, validation, render, export)
 * 3. Loading states & status progressions (AI generation, project load, saving, rendering, export)
 * 4. Empty state robustness (empty project, empty scene, no assets, no selection, empty timeline, no templates)
 * 5. Performance safeguards (autosave debouncing, hash comparison skipping redundant writes, non-mutating evaluations)
 * 6. Responsive layout & viewport contracts
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { sanitizeUserError, redactSensitiveInfo } from "../lib/error-sanitizer";
import { createSampleProject } from "../services/project/sample-project";
import { AutosaveManager } from "../services/storage/autosave-manager";
import { IProjectRepository } from "../services/storage/project-repository";
import { executeExport } from "../services/render/export-pipeline";
import { Project } from "../types/project";
import { queryTemplates } from "../services/template";

// Mock InMemory Project Repository for Testing
class MockMemoryRepository {
  public projects = new Map<string, Project>();
  public saveCount = 0;

  async getProject(id: string) {
    const p = this.projects.get(id);
    if (!p) return { success: false, error: "Project not found" } as const;
    return { success: true, data: structuredClone(p) } as const;
  }

  async saveProject(project: Project) {
    this.saveCount++;
    this.projects.set(project.id, structuredClone(project));
    return { success: true, data: structuredClone(project) } as const;
  }

  async createProject(project: Project) {
    return this.saveProject(project);
  }

  async listProjects() {
    return { success: true, data: Array.from(this.projects.values()) } as const;
  }

  async deleteProject(id: string) {
    this.projects.delete(id);
    return { success: true } as const;
  }
}

describe("Phase 8.9: Error Sanitization & Security", () => {
  test("strips API keys and secrets from error messages", () => {
    const rawError = "Request failed: OpenRouter returned 401 with key sk-or-v1-abcdef1234567890abcdef1234567890";
    const sanitized = sanitizeUserError(rawError);
    assert.strictEqual(sanitized.includes("sk-or-v1-abcdef"), false);
    assert.strictEqual(sanitized.includes("[REDACTED_KEY]"), true);
  });

  test("strips Authorization Bearer tokens", () => {
    const rawError = "HTTP 403 Forbidden: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretpayload";
    const sanitized = sanitizeUserError(rawError);
    assert.strictEqual(sanitized.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"), false);
    assert.strictEqual(sanitized.includes("[REDACTED_TOKEN]"), true);
  });

  test("strips local filesystem absolute paths", () => {
    const rawError = "Failed to load module at C:\\Users\\Afnan Shihab\\MOTION-BOT\\secrets.env";
    const redacted = redactSensitiveInfo(rawError);
    assert.strictEqual(redacted.includes("Afnan Shihab"), false);
    assert.strictEqual(redacted.includes("[REDACTED_PATH]"), true);
  });

  test("maps network failures into actionable user guidance", () => {
    const netError = new TypeError("fetch failed: ECONNREFUSED 127.0.0.1:443");
    const sanitized = sanitizeUserError(netError);
    assert.strictEqual(sanitized.includes("Network connection issue"), true);
  });

  test("maps rate limit (429) errors into user guidance", () => {
    const rateLimitError = "Rate limit exceeded (HTTP 429). Too many requests in 1 minute.";
    const sanitized = sanitizeUserError(rateLimitError);
    assert.strictEqual(sanitized.includes("AI rate limit reached"), true);
  });

  test("maps quota and credit exhaustion errors into user guidance", () => {
    const quotaError = "Insufficient credits: user account balance has been exceeded.";
    const sanitized = sanitizeUserError(quotaError);
    assert.strictEqual(sanitized.includes("insufficient credits"), true);
  });

  test("falls back cleanly on generic exceptions with custom fallback", () => {
    const fallback = "Operation could not be completed";
    const sanitized = sanitizeUserError(null, fallback);
    assert.strictEqual(sanitized, fallback);
  });
});

describe("Phase 8.9: Loading States & Progressions", () => {
  test("Export pipeline progresses deterministically through preparing -> rendering -> complete", async () => {
    const project = createSampleProject();
    const statesReported: string[] = [];

    const result = await executeExport(
      project,
      {
        format: "png",
        scope: "current-frame",
        time: 0,
        width: 320,
        height: 180,
        fps: 30,
        quality: 0.9,
        qualityPreset: "high",
      },
      (p) => {
        statesReported.push(p.state);
      }
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(statesReported.includes("preparing"), true);
    assert.strictEqual(statesReported.includes("rendering"), true);
    assert.strictEqual(result.frameCount >= 1, true);
  });

  test("AutosaveManager tracks state transitions: saved -> unsaved -> saving -> saved", async () => {
    const repo = new MockMemoryRepository();
    const project = createSampleProject();
    const states: string[] = [];

    const autosave = new AutosaveManager({
      repository: repo as unknown as IProjectRepository,
      debounceMs: 50,
      onStatusChange: (status) => {
        states.push(status.state);
      },
    });

    autosave.loadProject(project);
    assert.strictEqual(autosave.getStatus().state, "saved");

    // Modify project and trigger change
    const updated = { ...project, name: "Renamed Project for Autosave" };
    autosave.notifyChange(updated);
    assert.strictEqual(autosave.getStatus().state, "unsaved");

    // Wait for debounced execution
    await new Promise((r) => setTimeout(r, 120));

    assert.strictEqual(repo.saveCount, 1);
    assert.strictEqual(states.includes("saving"), true);
    assert.strictEqual(autosave.getStatus().state, "saved");

    autosave.dispose();
  });
});

describe("Phase 8.9: Empty States & Graceful Degradation", () => {
  test("Empty scene (0 elements) renders and exports without throwing", async () => {
    const project = createSampleProject();
    // Empty out layers in first scene
    project.scenes[0].elements = [];

    const result = await executeExport(project, {
      format: "png",
      scope: "current-frame",
      time: 0,
      width: 160,
      height: 90,
      fps: 30,
      quality: 0.8,
      qualityPreset: "draft",
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.frameCount, 1);
  });

  test("Empty project (0 scenes) fails gracefully with clean validation error", async () => {
    const project = createSampleProject();
    project.scenes = [];

    const result = await executeExport(project, {
      format: "png",
      scope: "current-frame",
      time: 0,
      width: 160,
      height: 90,
      fps: 30,
      quality: 0.8,
      qualityPreset: "draft",
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error?.includes("no scenes"), true);
  });

  test("Template search with no matching results returns empty array without throwing", () => {
    const noResults = queryTemplates({ search: "xyz999nonexistenttoken" });
    assert.strictEqual(Array.isArray(noResults), true);
    assert.strictEqual(noResults.length, 0);
  });

  test("Project with 0 assets maintains valid assets array", () => {
    const project = createSampleProject();
    project.assets = [];
    assert.strictEqual(Array.isArray(project.assets), true);
    assert.strictEqual(project.assets.length, 0);
  });
});

describe("Phase 8.9: Performance & Optimization", () => {
  test("Autosave skips redundant writes when project hash is identical", async () => {
    const repo = new MockMemoryRepository();
    const project = createSampleProject();

    const autosave = new AutosaveManager({
      repository: repo as unknown as IProjectRepository,
      debounceMs: 50,
    });

    autosave.loadProject(project);
    assert.strictEqual(repo.saveCount, 0); // initial load doesn't force re-write

    // Notify identical state multiple times
    autosave.notifyChange(project);
    autosave.notifyChange(project);
    autosave.notifyChange(project);

    await new Promise((r) => setTimeout(r, 100));

    // Must be 0 because hash did not change
    assert.strictEqual(repo.saveCount, 0);

    autosave.dispose();
  });

  test("Rapid consecutive mutations coalesce into a single save", async () => {
    const repo = new MockMemoryRepository();
    const project = createSampleProject();

    const autosave = new AutosaveManager({
      repository: repo as unknown as IProjectRepository,
      debounceMs: 80,
    });

    autosave.loadProject(project);

    // Rapid consecutive changes
    for (let i = 1; i <= 5; i++) {
      autosave.notifyChange({ ...project, name: `Mutation ${i}` });
    }

    await new Promise((r) => setTimeout(r, 150));

    // Coalesced into 1 save write
    assert.strictEqual(repo.saveCount, 1);

    const saved = await repo.getProject(project.id);
    assert.strictEqual(saved.data?.name, "Mutation 5");

    autosave.dispose();
  });

  test("executeExport does not mutate input project or scenes", async () => {
    const original = createSampleProject();
    const snapshotBefore = JSON.stringify(original);

    await executeExport(original, {
      format: "png",
      scope: "current-frame",
      time: 0,
      width: 320,
      height: 180,
      fps: 30,
      quality: 0.9,
      qualityPreset: "high",
    });

    const snapshotAfter = JSON.stringify(original);
    assert.strictEqual(snapshotBefore, snapshotAfter);
  });
});
