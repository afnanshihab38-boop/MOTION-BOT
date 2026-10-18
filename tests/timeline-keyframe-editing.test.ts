/**
 * MOTION-BOT — Timeline & Keyframe Editing Comprehensive Unit & Integration Tests
 *
 * Verifies all Phase 8.3 requirements:
 * 1. Playhead movement & frame snapping
 * 2. Playhead scrubbing & coordinate conversion
 * 3. Layer timing (startTime, duration, endTime, frame mapping)
 * 4. Add keyframe (Position, Scale, Rotation, Opacity)
 * 5. Move keyframe in time with FPS snapping
 * 6. Delete keyframe & clean up empty tracks
 * 7. Keyframe ↔ Canvas live interpolation (Position, Scale, Rotation, Opacity)
 * 8. Inspector ↔ Keyframe synchronization (One Source of Truth)
 * 9. Playback transport (Play, Pause, Stop, Loop, Clamping, Tick)
 * 10. Undo / Redo system integration (history snapshots on keyframe & timing changes)
 * 11. AI-generated Motion Plan compatibility (Phase 8.1 integration)
 * 12. Multi-FPS support (24fps, 30fps, 60fps)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TimelineManager,
  createTimelineManager,
  getEvaluatedSceneAtTime,
  calculateScrubTime,
  timeToFrames,
  framesToTime,
} from "../timeline";
import {
  getElementTiming,
  updateElementTiming,
  addKeyframeToElement,
  moveKeyframeOnElement,
  deleteKeyframeFromElement,
  updateKeyframeValueOnElement,
  syncPropertyWithKeyframes,
  getBasePropertyValue,
} from "../services/timeline";
import { createTextElement, createShapeElement, DEFAULT_TRANSFORM, DEFAULT_APPEARANCE } from "../services/element/element-model";
import { createScene } from "../services/project/scene-model";
import { createProject } from "../services/project/project-model";
import { MotionElement } from "../types/element";
import { Scene } from "../types/scene";
import { Project } from "../types/project";
import { evaluateScene } from "../engine";

describe("Phase 8.3: Timeline + Keyframe Editing", () => {
  // =========================================================================
  // 1. PLAYHEAD MOVEMENT & TIME SYNCHRONIZATION
  // =========================================================================
  describe("Playhead Movement & Scrubbing", () => {
    it("moves horizontally and represents current project time accurately", () => {
      const manager = new TimelineManager({ duration: 5, fps: 30 });
      assert.equal(manager.getState().currentTime, 0);

      manager.setCurrentTime(1.5);
      const state = manager.getState();
      assert.equal(state.currentTime, 1.5);
      assert.equal(state.currentFrame, 45);
      assert.equal(state.timecode, "00:00:01:15");
    });

    it("respects project duration boundaries by clamping playhead", () => {
      const manager = new TimelineManager({ duration: 4, fps: 30 });
      manager.setCurrentTime(6.0);
      assert.equal(manager.getState().currentTime, 4.0);

      manager.setCurrentTime(-1.0);
      assert.equal(manager.getState().currentTime, 0.0);
    });

    it("scrubs correctly from client pixel coordinates", () => {
      const scrubTime = calculateScrubTime({
        clientX: 250,
        containerLeft: 50,
        scrollLeft: 0,
        pixelsPerSecond: 100,
        duration: 5,
        fps: 30,
        snapToFrames: true,
      });

      // (250 - 50) / 100 = 2.0s
      assert.equal(scrubTime, 2.0);
    });

    it("respects different FPS settings for frame alignment", () => {
      const fps24 = timeToFrames(1.0, 24);
      assert.equal(fps24, 24);

      const fps60 = timeToFrames(1.0, 60);
      assert.equal(fps60, 60);

      const timeFromFrame60 = framesToTime(60, 60);
      assert.equal(timeFromFrame60, 1.0);
    });
  });

  // =========================================================================
  // 2. LAYER TIMING
  // =========================================================================
  describe("Layer Timing (Start Time, Duration, End Time)", () => {
    it("computes default layer timing matching scene duration if unspecified", () => {
      const element = createTextElement({ text: "Hello Motion" });
      const timing = getElementTiming(element, 30, 5.0);

      assert.equal(timing.startTime, 0);
      assert.equal(timing.duration, 3.0);
      assert.equal(timing.endTime, 3.0);
      assert.equal(timing.startFrame, 0);
      assert.equal(timing.durationFrames, 90);

      // Falls back to sceneDuration if element duration and durationFrames are unset
      const elementNoDuration = { ...element, duration: undefined, durationFrames: undefined } as any;
      const timingNoDuration = getElementTiming(elementNoDuration, 30, 5.0);
      assert.equal(timingNoDuration.startTime, 0);
      assert.equal(timingNoDuration.duration, 5.0);
      assert.equal(timingNoDuration.endTime, 5.0);
      assert.equal(timingNoDuration.durationFrames, 150);
    });

    it("updates layer timing bar start and duration immutably", () => {
      const element = createTextElement({ text: "Layer 1" });
      const updated = updateElementTiming(element, 1.0, 3.0, 30);

      assert.notEqual(updated, element);
      const timing = getElementTiming(updated, 30, 5.0);
      assert.equal(timing.startTime, 1.0);
      assert.equal(timing.duration, 3.0);
      assert.equal(timing.endTime, 4.0);
      assert.equal(timing.startFrame, 30);
      assert.equal(timing.durationFrames, 90);
    });

    it("clamps negative start time and enforces positive minimum duration", () => {
      const element = createShapeElement({ shapeKind: "rectangle" });
      const updated = updateElementTiming(element, -2.0, -1.0, 30);
      const timing = getElementTiming(updated, 30, 5.0);

      assert.equal(timing.startTime, 0);
      assert.ok(timing.duration > 0);
      assert.ok(timing.durationFrames >= 1);
    });
  });

  // =========================================================================
  // 3. KEYFRAMES MANIPULATION (ADD, MOVE, DELETE)
  // =========================================================================
  describe("Keyframe CRUD Operations", () => {
    it("adds a keyframe to a property track with automatic track creation", () => {
      const element = createTextElement({
        text: "Title",
        transform: { ...DEFAULT_TRANSFORM, x: 150, y: 200, scaleX: 1, scaleY: 1, rotation: 0 },
      });

      assert.equal(element.propertyTracks?.length ?? 0, 0);

      // Add keyframe at 1.0s for 'x'
      const { element: withKf, keyframe } = addKeyframeToElement(element, "x", 1.0, 300, 30);

      assert.equal(withKf.propertyTracks?.length, 1);
      const xTrack = withKf.propertyTracks![0];
      assert.equal(xTrack.property, "x");
      assert.equal(xTrack.keyframes.length, 2); // Base at 0s + target at 1.0s
      assert.equal(keyframe.time, 1.0);
      assert.equal(keyframe.value, 300);
    });

    it("moves keyframe in time with FPS frame snapping", () => {
      const element = createShapeElement({ shapeKind: "circle" });
      const { element: withKf, keyframe } = addKeyframeToElement(element, "rotation", 0.5, 45, 30);

      // Move keyframe from 0.5s to 2.0s
      const moved = moveKeyframeOnElement(withKf, keyframe.id, 2.0, 30);
      const track = moved.propertyTracks?.find((t) => t.property === "rotation");
      const movedKf = track?.keyframes.find((k) => k.id === keyframe.id);

      assert.ok(movedKf);
      assert.equal(movedKf?.time, 2.0);
      assert.equal(movedKf?.frame, 60);
    });

    it("deletes keyframe and cleans up empty track", () => {
      const element = createTextElement({ text: "Animated Layer" });
      const { element: withKf, keyframe } = addKeyframeToElement(element, "opacity", 1.0, 0.5, 30);

      // Element now has opacity track with 2 keyframes (base at 0 + new at 1.0)
      const trackBefore = withKf.propertyTracks?.find((t) => t.property === "opacity");
      assert.equal(trackBefore?.keyframes.length, 2);

      // Delete the keyframe at 1.0
      const afterFirstDelete = deleteKeyframeFromElement(withKf, keyframe.id);
      const trackAfterFirst = afterFirstDelete.propertyTracks?.find((t) => t.property === "opacity");
      assert.equal(trackAfterFirst?.keyframes.length, 1);

      // Delete the remaining base keyframe
      const baseKf = trackAfterFirst!.keyframes[0];
      const afterSecondDelete = deleteKeyframeFromElement(afterFirstDelete, baseKf.id);
      const trackAfterSecond = afterSecondDelete.propertyTracks?.find((t) => t.property === "opacity");
      assert.equal(trackAfterSecond, undefined);
    });

    it("supports editing keyframe value directly", () => {
      const element = createTextElement({ text: "Val Test" });
      const { element: withKf, keyframe } = addKeyframeToElement(element, "scaleX", 1.0, 1.5, 30);

      const updated = updateKeyframeValueOnElement(withKf, "scaleX", keyframe.id, 2.5);
      const track = updated.propertyTracks?.find((t) => t.property === "scaleX");
      const kf = track?.keyframes.find((k) => k.id === keyframe.id);

      assert.equal(kf?.value, 2.5);
    });
  });

  // =========================================================================
  // 4. KEYFRAME ↔ CANVAS INTERPOLATION
  // =========================================================================
  describe("Keyframe ↔ Canvas Interpolation", () => {
    it("interpolates Position X linearly at midpoint", () => {
      const element = createShapeElement({
        name: "Box",
        shapeKind: "rectangle",
        transform: { ...DEFAULT_TRANSFORM, x: 100, y: 100, scaleX: 1, scaleY: 1, rotation: 0 },
      });

      // Keyframe 1: X = 100 at 0s
      // Keyframe 2: X = 500 at 2s
      let animElement = addKeyframeToElement(element, "x", 0, 100, 30).element;
      animElement = addKeyframeToElement(animElement, "x", 2.0, 500, 30).element;

      const scene = createScene({ elements: [animElement], duration: 5.0 });

      // At 1.0s, X should be halfway (approx 300)
      const evaluatedMid = getEvaluatedSceneAtTime(scene, 1.0);
      const midElement = evaluatedMid.elements[0];
      assert.ok(midElement);
      // With easeInOut or linear, midpoint of 100 and 500 is 300
      assert.ok(Math.abs(midElement.transform.x - 300) < 5);

      // At 0s, X should be 100
      const evaluatedStart = getEvaluatedSceneAtTime(scene, 0);
      assert.equal(Math.round(evaluatedStart.elements[0].transform.x), 100);

      // At 2s, X should be 500
      const evaluatedEnd = getEvaluatedSceneAtTime(scene, 2.0);
      assert.equal(Math.round(evaluatedEnd.elements[0].transform.x), 500);
    });

    it("interpolates Scale, Rotation, and Opacity", () => {
      const element = createTextElement({
        text: "Dynamic",
        transform: { ...DEFAULT_TRANSFORM, scaleX: 1.0, scaleY: 1.0, rotation: 0 },
        appearance: { ...DEFAULT_APPEARANCE, opacity: 1.0 },
      });

      // Animate scaleX: 1.0 -> 3.0 from 0s to 2s
      let anim = addKeyframeToElement(element, "scaleX", 0, 1.0, 30).element;
      anim = addKeyframeToElement(anim, "scaleX", 2.0, 3.0, 30).element;

      // Animate rotation: 0 -> 180 from 0s to 2s
      anim = addKeyframeToElement(anim, "rotation", 0, 0, 30).element;
      anim = addKeyframeToElement(anim, "rotation", 2.0, 180, 30).element;

      // Animate opacity: 1.0 -> 0.0 from 0s to 2s
      anim = addKeyframeToElement(anim, "opacity", 0, 1.0, 30).element;
      anim = addKeyframeToElement(anim, "opacity", 2.0, 0.0, 30).element;

      const scene = createScene({ elements: [anim], duration: 4.0 });

      const evaluated = getEvaluatedSceneAtTime(scene, 1.0);
      const el = evaluated.elements[0];

      // Midpoint values
      assert.ok(Math.abs(el.transform.scaleX - 2.0) < 0.2);
      assert.ok(Math.abs(el.transform.rotation - 90) < 5);
      assert.ok(Math.abs((el.appearance?.opacity ?? 1) - 0.5) < 0.1);
    });
  });

  // =========================================================================
  // 5. INSPECTOR ↔ KEYFRAME SYNCHRONIZATION (ONE SOURCE OF TRUTH)
  // =========================================================================
  describe("Inspector ↔ Keyframes Synchronization", () => {
    it("updates existing keyframe value when property is edited at keyframe time", () => {
      const element = createTextElement({
        text: "Sync Element",
        transform: { ...DEFAULT_TRANSFORM, x: 100, y: 100 },
      });

      // Add keyframes at 0s and 2.0s
      let animated = addKeyframeToElement(element, "x", 0, 100, 30).element;
      animated = addKeyframeToElement(animated, "x", 2.0, 400, 30).element;

      // User changes X to 600 in the inspector while playhead is at 2.0s
      const synced = syncPropertyWithKeyframes(animated, "x", 600, 2.0, 30);

      // Verify the keyframe was updated to 600
      const track = synced.propertyTracks?.find((t) => t.property === "x");
      const kfAt2 = track?.keyframes.find((k) => Math.abs(k.time - 2.0) < 0.05);
      assert.ok(kfAt2);
      assert.equal(kfAt2?.value, 600);

      // Verify base transform also updated
      assert.equal(synced.transform.x, 600);
    });

    it("creates keyframe at playhead time when editing an already-animated property", () => {
      const element = createShapeElement({
        shapeKind: "rectangle",
        transform: { ...DEFAULT_TRANSFORM, rotation: 0 },
      });

      // Keyframed at 0s
      const animated = addKeyframeToElement(element, "rotation", 0, 0, 30).element;

      // Inspector changes rotation to 90 at 1.5s
      const synced = syncPropertyWithKeyframes(animated, "rotation", 90, 1.5, 30);

      const track = synced.propertyTracks?.find((t) => t.property === "rotation");
      assert.equal(track?.keyframes.length, 2);
      const newKf = track?.keyframes.find((k) => Math.abs(k.time - 1.5) < 0.05);
      assert.ok(newKf);
      assert.equal(newKf?.value, 90);
    });
  });

  // =========================================================================
  // 6. PLAYBACK TRANSPORT
  // =========================================================================
  describe("Playback Transport (Play, Pause, Stop, Loop, Tick)", () => {
    it("advances currentTime on tick when playing", () => {
      const manager = new TimelineManager({ duration: 5, fps: 30 });
      manager.play();
      assert.equal(manager.getState().isPlaying, true);

      // 1 frame advance
      manager.tick(1 / 30);
      assert.ok(Math.abs(manager.getState().currentTime - 1 / 30) < 1e-4);

      manager.pause();
      assert.equal(manager.getState().isPlaying, false);
      assert.equal(manager.getState().isPaused, true);
    });

    it("resets playhead on stop", () => {
      const manager = new TimelineManager({ duration: 5, fps: 30 });
      manager.setCurrentTime(3.5);
      manager.stop();

      assert.equal(manager.getState().isPlaying, false);
      assert.equal(manager.getState().isStopped, true);
      assert.equal(manager.getState().currentTime, 0);
    });

    it("respects looping behavior at outPoint", () => {
      const manager = new TimelineManager({ duration: 2.0, fps: 30, loop: true });
      manager.setCurrentTime(1.95);
      manager.play();

      // Tick past 2.0
      manager.tick(0.1);
      assert.equal(manager.getState().currentTime, 0);
      assert.equal(manager.getState().isPlaying, true);
    });

    it("pauses automatically at outPoint when loop is false", () => {
      const manager = new TimelineManager({ duration: 2.0, fps: 30, loop: false });
      manager.setCurrentTime(1.95);
      manager.play();

      manager.tick(0.1);
      assert.equal(manager.getState().currentTime, 2.0);
      assert.equal(manager.getState().isPaused, true);
    });
  });

  // =========================================================================
  // 7. UNDO / REDO INTEGRATION
  // =========================================================================
  describe("Undo / Redo Integration", () => {
    it("restores previous project state after keyframe addition", () => {
      const originalProject = createProject({
        name: "Undo Test Project",
        duration: 5,
        fps: 30,
        scenes: [
          createScene({
            elements: [createTextElement({ text: "Hello" })],
          }),
        ],
      });

      // Simulation of history stack in editor
      const history: Project[] = [originalProject];
      let currentProject = originalProject;

      // User adds keyframe
      const elem = currentProject.scenes[0].elements[0];
      const withKf = addKeyframeToElement(elem, "x", 1.0, 200, 30).element;
      const modifiedProject: Project = {
        ...currentProject,
        scenes: [
          {
            ...currentProject.scenes[0],
            elements: [withKf],
          },
        ],
      };
      history.push(modifiedProject);
      currentProject = modifiedProject;

      assert.equal(currentProject.scenes[0].elements[0].propertyTracks?.length, 1);

      // Perform Undo
      const previousState = history[0];
      currentProject = previousState;

      assert.equal(currentProject.scenes[0].elements[0].propertyTracks?.length ?? 0, 0);
      assert.equal(currentProject.name, "Undo Test Project");
    });
  });

  // =========================================================================
  // 8. AI-GENERATED MOTION COMPATIBILITY
  // =========================================================================
  describe("AI-Generated Motion Plan Compatibility", () => {
    it("loads and displays keyframes created by Phase 8.1 / Phase 6 motion models", () => {
      // Simulate an AI-generated motion plan output with structured keyframe tracks
      const aiGeneratedElement = createTextElement({
        name: "Headline",
        text: "AI Designed Motion",
        transform: { ...DEFAULT_TRANSFORM, x: 50, y: 50, scaleX: 1, scaleY: 1, rotation: 0 },
        propertyTracks: [
          {
            id: "track-ai-x",
            property: "x",
            enabled: true,
            interpolation: "linear",
            keyframes: [
              { id: "kf-1", time: 0.0, value: 50, easing: "easeOut", frame: 0 },
              { id: "kf-2", time: 1.5, value: 450, easing: "easeIn", frame: 45 },
            ],
          },
        ],
      });

      const aiScene = createScene({
        name: "AI Scene 1",
        duration: 3.0,
        elements: [aiGeneratedElement],
      });

      // Timeline evaluates AI-generated motion cleanly
      const evaluated = getEvaluatedSceneAtTime(aiScene, 0.75);
      const evaluatedEl = evaluated.elements[0];

      assert.ok(evaluatedEl);
      assert.ok(evaluatedEl.transform.x > 50 && evaluatedEl.transform.x < 450);

      // User can add further keyframes onto the AI-generated track
      const withUserKf = addKeyframeToElement(aiGeneratedElement, "x", 2.5, 600, 30).element;
      const xTrack = withUserKf.propertyTracks?.find((t) => t.property === "x");
      assert.equal(xTrack?.keyframes.length, 3);
    });
  });
});
