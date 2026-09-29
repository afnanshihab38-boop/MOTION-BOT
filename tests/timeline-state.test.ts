/**
 * MOTION-BOT — Timeline Architecture & State Unit Tests
 * Test suite verifying timeline state initialization, playhead clamping, transport transitions,
 * selections, viewport navigation, SMPTE timecodes, observer subscriptions, and Project immutability.
 * Part of Phase 7.1: Timeline Architecture & State.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clampTime,
  clampZoom,
  createInitialTimelineState,
  createTimelineManager,
  defaultTimelineManager,
  formatTimecode,
  frameToTime,
  TimelineManager,
  timeToFrame,
} from "../timeline";
import { createScene } from "../services/project/scene-model";
import { createProject } from "../services/project/project-model";

describe("Timeline Architecture & State — Phase 7.1", () => {
  // ---------------------------------------------------------------------------
  // 1. STATE INITIALIZATION & DEFAULTS
  // ---------------------------------------------------------------------------
  describe("State Initialization & Defaults", () => {
    it("initializes with default values and stopped transport state", () => {
      const manager = new TimelineManager();
      const state = manager.getState();

      assert.equal(state.currentTime, 0);
      assert.equal(state.duration, 5.0);
      assert.equal(state.fps, 30);
      assert.equal(state.currentFrame, 0);
      assert.equal(state.totalFrames, 150);
      assert.equal(state.playbackState, "stopped");
      assert.equal(state.isPlaying, false);
      assert.equal(state.isPaused, false);
      assert.equal(state.isStopped, true);
      assert.equal(state.timecode, "00:00:00:00");
      assert.equal(state.inPoint, 0);
      assert.equal(state.outPoint, 5.0);
      assert.equal(state.loop, false);

      // Selection defaults
      assert.equal(state.selection.selectedTrackId, null);
      assert.equal(state.selection.selectedKeyframeId, null);
      assert.equal(state.selection.selectedKeyframeTrackId, null);
      assert.equal(state.selection.selectedClipId, null);

      // Viewport defaults
      assert.equal(state.viewport.zoom, 1.0);
      assert.equal(state.viewport.scrollLeft, 0);
      assert.equal(state.viewport.scrollTop, 0);
    });

    it("respects custom initial configuration options", () => {
      const manager = createTimelineManager({
        currentTime: 2.0,
        duration: 10.0,
        fps: 60,
        zoom: 2.0,
        scrollLeft: 120,
        loop: true,
      });

      const state = manager.getState();
      assert.equal(state.currentTime, 2.0);
      assert.equal(state.duration, 10.0);
      assert.equal(state.fps, 60);
      assert.equal(state.currentFrame, 120);
      assert.equal(state.totalFrames, 600);
      assert.equal(state.viewport.zoom, 2.0);
      assert.equal(state.viewport.scrollLeft, 120);
      assert.equal(state.loop, true);
      assert.equal(state.timecode, "00:00:02:00");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. PLAYHEAD TIME & BOUNDARY CLAMPING
  // ---------------------------------------------------------------------------
  describe("Playhead Time & Boundary Clamping", () => {
    it("updates currentTime and synchronizes currentFrame and timecode", () => {
      const manager = new TimelineManager();
      manager.setCurrentTime(1.5);

      const state = manager.getState();
      assert.equal(state.currentTime, 1.5);
      assert.equal(state.currentFrame, 45); // 1.5 * 30fps
      assert.equal(state.timecode, "00:00:01:15");
    });

    it("clamps currentTime to duration ceiling", () => {
      const manager = new TimelineManager({ duration: 4.0 });
      manager.setCurrentTime(8.5);

      const state = manager.getState();
      assert.equal(state.currentTime, 4.0);
      assert.equal(state.currentFrame, 120);
    });

    it("clamps negative time values to 0", () => {
      const manager = new TimelineManager();
      manager.setCurrentTime(-3.5);

      const state = manager.getState();
      assert.equal(state.currentTime, 0);
      assert.equal(state.currentFrame, 0);
      assert.equal(state.timecode, "00:00:00:00");
    });

    it("handles non-finite, NaN, and invalid numeric inputs gracefully", () => {
      const manager = new TimelineManager();
      manager.setCurrentTime(NaN);
      assert.equal(manager.getState().currentTime, 0);

      manager.setCurrentTime(Infinity);
      assert.equal(manager.getState().currentTime, 0);

      manager.setCurrentTime(-Infinity);
      assert.equal(manager.getState().currentTime, 0);

      manager.setCurrentTime("invalid" as unknown as number);
      assert.equal(manager.getState().currentTime, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. DURATION MANAGEMENT
  // ---------------------------------------------------------------------------
  describe("Duration Management", () => {
    it("updates duration and totalFrames accurately", () => {
      const manager = new TimelineManager({ duration: 5.0, fps: 30 });
      manager.setDuration(12.0);

      const state = manager.getState();
      assert.equal(state.duration, 12.0);
      assert.equal(state.totalFrames, 360);
      assert.equal(state.outPoint, 12.0);
    });

    it("re-clamps playhead time when duration shrinks below current time", () => {
      const manager = new TimelineManager({ duration: 10.0 });
      manager.setCurrentTime(8.0);
      assert.equal(manager.getState().currentTime, 8.0);

      // Shrink duration to 4.0
      manager.setDuration(4.0);
      const state = manager.getState();
      assert.equal(state.duration, 4.0);
      assert.equal(state.currentTime, 4.0);
      assert.equal(state.currentFrame, 120);
    });

    it("rejects non-positive duration values and preserves safe duration", () => {
      const manager = new TimelineManager({ duration: 6.0 });
      manager.setDuration(-2.0);
      assert.equal(manager.getState().duration, 5.0); // Defaults safely

      manager.setDuration(0);
      assert.equal(manager.getState().duration, 5.0);

      manager.setDuration(NaN);
      assert.equal(manager.getState().duration, 5.0);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. TRANSPORT & PLAYBACK STATE TRANSITIONS
  // ---------------------------------------------------------------------------
  describe("Playback Transport States", () => {
    it("transitions between stopped, playing, and paused states correctly", () => {
      const manager = new TimelineManager();

      // Start stopped
      assert.equal(manager.getState().playbackState, "stopped");
      assert.equal(manager.getState().isStopped, true);

      // Play
      manager.play();
      assert.equal(manager.getState().playbackState, "playing");
      assert.equal(manager.getState().isPlaying, true);
      assert.equal(manager.getState().isPaused, false);
      assert.equal(manager.getState().isStopped, false);

      // Pause
      manager.pause();
      assert.equal(manager.getState().playbackState, "paused");
      assert.equal(manager.getState().isPlaying, false);
      assert.equal(manager.getState().isPaused, true);
      assert.equal(manager.getState().isStopped, false);

      // Stop
      manager.stop();
      assert.equal(manager.getState().playbackState, "stopped");
      assert.equal(manager.getState().isPlaying, false);
      assert.equal(manager.getState().isPaused, false);
      assert.equal(manager.getState().isStopped, true);
    });

    it("resets playhead to inPoint on stop", () => {
      const manager = new TimelineManager({ inPoint: 1.0 });
      manager.setCurrentTime(3.5);
      manager.play();
      assert.equal(manager.getState().currentTime, 3.5);

      manager.stop();
      assert.equal(manager.getState().currentTime, 1.0);
      assert.equal(manager.getState().playbackState, "stopped");
    });

    it("automatically restarts from inPoint when playing at end of timeline", () => {
      const manager = new TimelineManager({ duration: 5.0, inPoint: 0 });
      manager.setCurrentTime(5.0);
      assert.equal(manager.getState().currentTime, 5.0);

      manager.play();
      assert.equal(manager.getState().playbackState, "playing");
      assert.equal(manager.getState().currentTime, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. SEEKING & STEPPING OPERATIONS
  // ---------------------------------------------------------------------------
  describe("Seeking & Stepping Operations", () => {
    it("seeks to discrete frames accurately via seekFrame", () => {
      const manager = new TimelineManager({ fps: 30 });
      manager.seekFrame(90);

      const state = manager.getState();
      assert.equal(state.currentFrame, 90);
      assert.equal(state.currentTime, 3.0);
    });

    it("steps forward and backward by frames", () => {
      const manager = new TimelineManager({ fps: 30 });
      manager.setCurrentTime(1.0); // frame 30

      manager.stepForward(5);
      assert.equal(manager.getState().currentFrame, 35);

      manager.stepBackward(10);
      assert.equal(manager.getState().currentFrame, 25);

      // Step backward beyond 0 clamps at 0
      manager.stepBackward(50);
      assert.equal(manager.getState().currentFrame, 0);
    });

    it("jumps to start and end accurately", () => {
      const manager = new TimelineManager({ duration: 6.0, inPoint: 0.5, outPoint: 5.5 });
      manager.jumpToStart();
      assert.equal(manager.getState().currentTime, 0.5);

      manager.jumpToEnd();
      assert.equal(manager.getState().currentTime, 5.5);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. SELECTION MANAGEMENT
  // ---------------------------------------------------------------------------
  describe("Selection Management", () => {
    it("selects tracks, keyframes, and clips independently", () => {
      const manager = new TimelineManager();

      manager.selectTrack("track-video-1");
      assert.equal(manager.getState().selection.selectedTrackId, "track-video-1");

      manager.selectKeyframe("kf-scale-1", "track-video-1");
      assert.equal(manager.getState().selection.selectedKeyframeId, "kf-scale-1");
      assert.equal(manager.getState().selection.selectedKeyframeTrackId, "track-video-1");

      manager.selectClip("clip-title-1");
      assert.equal(manager.getState().selection.selectedClipId, "clip-title-1");
    });

    it("clears selections via clearSelection", () => {
      const manager = new TimelineManager();
      manager.selectTrack("track-1");
      manager.selectKeyframe("kf-1", "track-1");
      manager.selectClip("clip-1");

      manager.clearSelection();
      const sel = manager.getState().selection;
      assert.equal(sel.selectedTrackId, null);
      assert.equal(sel.selectedKeyframeId, null);
      assert.equal(sel.selectedKeyframeTrackId, null);
      assert.equal(sel.selectedClipId, null);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. VIEWPORT ZOOM & SCROLL
  // ---------------------------------------------------------------------------
  describe("Viewport Zoom & Scroll", () => {
    it("sets zoom and enforces reasonable min/max zoom bounds", () => {
      const manager = new TimelineManager();

      manager.setZoom(2.5);
      assert.equal(manager.getState().viewport.zoom, 2.5);

      // Clamps extreme zoom in
      manager.setZoom(50.0);
      assert.equal(manager.getState().viewport.zoom, 10.0);

      // Clamps extreme zoom out
      manager.setZoom(0.001);
      assert.equal(manager.getState().viewport.zoom, 0.1);
    });

    it("sets scroll position with non-negative constraints", () => {
      const manager = new TimelineManager();
      manager.setScrollPosition(250, 40);

      assert.equal(manager.getState().viewport.scrollLeft, 250);
      assert.equal(manager.getState().viewport.scrollTop, 40);

      manager.setScrollPosition(-100, -50);
      assert.equal(manager.getState().viewport.scrollLeft, 0);
      assert.equal(manager.getState().viewport.scrollTop, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. TIMECODE & FRAME CONVERSION HELPERS
  // ---------------------------------------------------------------------------
  describe("Timecode & Frame Calculations", () => {
    it("formats SMPTE timecode (HH:MM:SS:FF) correctly", () => {
      assert.equal(formatTimecode(0, 30), "00:00:00:00");
      assert.equal(formatTimecode(1.0, 30), "00:00:01:00");
      assert.equal(formatTimecode(1.5, 30), "00:00:01:15");
      assert.equal(formatTimecode(65.0, 30), "00:01:05:00");
      assert.equal(formatTimecode(3661.0, 30), "01:01:01:00");
    });

    it("converts bidirectional time and frames with precision", () => {
      assert.equal(timeToFrame(2.5, 30), 75);
      assert.equal(frameToTime(75, 30), 2.5);
      assert.equal(timeToFrame(0.5, 60), 30);
      assert.equal(frameToTime(30, 60), 0.5);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. OBSERVER & SUBSCRIPTION MECHANISM
  // ---------------------------------------------------------------------------
  describe("Observer & Subscription Pattern", () => {
    it("notifies subscribers when timeline state updates", () => {
      const manager = new TimelineManager();
      const emittedStates: number[] = [];

      const unsubscribe = manager.subscribe((state) => {
        emittedStates.push(state.currentTime);
      });

      manager.setCurrentTime(1.0);
      manager.setCurrentTime(2.0);
      manager.setCurrentTime(3.0);

      assert.deepEqual(emittedStates, [1.0, 2.0, 3.0]);

      // Unsubscribe ceases notifications
      unsubscribe();
      manager.setCurrentTime(4.0);
      assert.deepEqual(emittedStates, [1.0, 2.0, 3.0]);
    });

    it("safely isolates subscriber exceptions without disrupting other listeners", () => {
      const manager = new TimelineManager();
      let listener2Called = false;

      manager.subscribe(() => {
        throw new Error("Faulty listener error");
      });

      manager.subscribe(() => {
        listener2Called = true;
      });

      manager.setCurrentTime(1.5);
      assert.equal(listener2Called, true);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. PROJECT & SCENE SYNCHRONIZATION WITHOUT MUTATION
  // ---------------------------------------------------------------------------
  describe("Project & Scene Synchronization (Immutability)", () => {
    it("syncWithScene synchronizes duration without mutating the scene object", () => {
      const manager = new TimelineManager();
      const scene = createScene({
        name: "Sync Scene",
        duration: 8.5,
      });

      const originalDuration = scene.duration;
      const originalName = scene.name;

      manager.syncWithScene(scene);

      assert.equal(manager.getState().duration, 8.5);
      assert.equal(scene.duration, originalDuration);
      assert.equal(scene.name, originalName);
    });

    it("syncWithProject synchronizes duration and FPS without mutating project", () => {
      const manager = new TimelineManager();
      const project = createProject({
        name: "Sync Project",
        duration: 15.0,
        fps: 60,
      });

      const originalDuration = project.duration;
      const originalFps = project.fps;

      manager.syncWithProject(project);

      assert.equal(manager.getState().duration, 15.0);
      assert.equal(manager.getState().fps, 60);
      assert.equal(project.duration, originalDuration);
      assert.equal(project.fps, originalFps);
    });

    it("moving playhead or mutating timeline state does NOT mutate project data", () => {
      const manager = new TimelineManager();
      const project = createProject({
        name: "Immutable Project",
        duration: 10.0,
      });

      manager.syncWithProject(project);

      // Scrub playhead extensively
      manager.setCurrentTime(2.5);
      manager.play();
      manager.seek(7.0);
      manager.setZoom(3.0);
      manager.selectTrack("track-x");

      // Verify project is 100% untouched
      assert.equal(project.duration, 10.0);
      assert.equal(project.name, "Immutable Project");
    });
  });

  // ---------------------------------------------------------------------------
  // 11. SINGLETON INSTANCE
  // ---------------------------------------------------------------------------
  describe("Singleton Instance", () => {
    it("provides defaultTimelineManager singleton", () => {
      assert.ok(defaultTimelineManager);
      assert.equal(typeof defaultTimelineManager.getState, "function");
      assert.equal(typeof defaultTimelineManager.play, "function");
    });
  });
});
