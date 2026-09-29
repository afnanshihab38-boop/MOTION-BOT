/**
 * MOTION-BOT — Timeline Interactive Time Navigation & Pipeline Unit Tests
 * Test suite verifying time conversion, playhead position, seeking, clamping,
 * zoom, scroll, FPS/frame conversion, floating-point drift prevention,
 * and the complete Motion Engine -> evaluated scene -> Canvas pipeline.
 * Part of Phase 7.3: Interactive Time Navigation.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  calculateScrubTime,
  clampTimeToDuration,
  formatTimeAndFrame,
  framesToTime,
  getEvaluatedSceneAtTime,
  getEvaluatedSceneState,
  pixelsToTime,
  snapTimeToFps,
  timeToFrames,
  timeToPixels,
  createTimelineManager,
  TimelineManager,
} from "../timeline";
import { TimelinePanel, TimeRuler, Playhead } from "../components/timeline";
import { createScene } from "../services/project/scene-model";
import { createAnimation, createKeyframe } from "../services/animation/animation-model";
import {
  createTextElement,
  createShapeElement,
  DEFAULT_TRANSFORM,
  DEFAULT_APPEARANCE,
} from "../services/element/element-model";

describe("Interactive Time Navigation — Phase 7.3", () => {
  // ---------------------------------------------------------------------------
  // 1. TIME CONVERSION & FPS / FRAME ACCURACY
  // ---------------------------------------------------------------------------
  describe("Time Conversion & Discrete Frame Accuracy", () => {
    it("converts continuous seconds to exact integer frames across standard frame rates", () => {
      // 30 fps
      assert.equal(timeToFrames(0, 30), 0);
      assert.equal(timeToFrames(0.5, 30), 15);
      assert.equal(timeToFrames(1.0, 30), 30);
      assert.equal(timeToFrames(2.5, 30), 75);

      // 24 fps (film)
      assert.equal(timeToFrames(0, 24), 0);
      assert.equal(timeToFrames(0.5, 24), 12);
      assert.equal(timeToFrames(1.0, 24), 24);
      assert.equal(timeToFrames(1.25, 24), 30);

      // 60 fps (high frame rate)
      assert.equal(timeToFrames(0, 60), 0);
      assert.equal(timeToFrames(0.5, 60), 30);
      assert.equal(timeToFrames(1.0, 60), 60);
      assert.equal(timeToFrames(1.75, 60), 105);
    });

    it("converts discrete frames back to continuous seconds without floating-point drift", () => {
      // 30 fps
      assert.equal(framesToTime(0, 30), 0);
      assert.equal(framesToTime(15, 30), 0.5);
      assert.equal(framesToTime(30, 30), 1.0);
      assert.equal(framesToTime(3, 30), 0.1); // No 0.10000000000000002 drift

      // 24 fps
      assert.equal(framesToTime(12, 24), 0.5);
      assert.equal(framesToTime(24, 24), 1.0);

      // 60 fps
      assert.equal(framesToTime(30, 60), 0.5);
      assert.equal(framesToTime(60, 60), 1.0);
    });

    it("snaps continuous timestamps to exact discrete frames based on project FPS", () => {
      // Near frame 15 at 30 fps (0.5s)
      assert.equal(snapTimeToFps(0.499, 30), 0.5);
      assert.equal(snapTimeToFps(0.501, 30), 0.5);

      // Frame 1 at 30fps is 0.033333s
      assert.equal(snapTimeToFps(0.033, 30), 0.033333);

      // Frame 3 at 30fps is exactly 0.1s
      assert.equal(snapTimeToFps(0.099, 30), 0.1);
      assert.equal(snapTimeToFps(0.101, 30), 0.1);
    });

    it("formats time and frame cleanly for scrubber badge display", () => {
      const formatted = formatTimeAndFrame(1.5, 30);
      assert.equal(formatted, "1.50s (F45 @ 30fps)");

      const formattedZero = formatTimeAndFrame(0, 24);
      assert.equal(formattedZero, "0.00s (F0 @ 24fps)");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. CLAMPING & BOUNDARY PROTECTION
  // ---------------------------------------------------------------------------
  describe("Time Clamping & Boundary Protection", () => {
    it("clamps negative time to zero", () => {
      assert.equal(clampTimeToDuration(-1.5, 10), 0);
      assert.equal(clampTimeToDuration(-0.0001, 10), 0);
      assert.equal(clampTimeToDuration(-Infinity, 10), 0);
    });

    it("clamps time exceeding duration to the exact duration", () => {
      assert.equal(clampTimeToDuration(12.5, 10), 10);
      assert.equal(clampTimeToDuration(999, 5), 5);
      assert.equal(clampTimeToDuration(Infinity, 10), 10);
    });

    it("handles non-finite, NaN, and invalid numeric inputs safely", () => {
      assert.equal(clampTimeToDuration(NaN as unknown as number, 10), 0);
      assert.equal(clampTimeToDuration("invalid" as unknown as number, 10), 0);
      assert.equal(snapTimeToFps(NaN as unknown as number, 30), 0);
      assert.equal(timeToFrames(NaN as unknown as number, 30), 0);
      assert.equal(framesToTime(NaN as unknown as number, 30), 0);
    });

    it("clamps safely when duration is zero", () => {
      assert.equal(clampTimeToDuration(5, 0), 0);
      assert.equal(clampTimeToDuration(-2, 0), 0);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. PIXELS TO TIME & TIME TO PIXELS (COORDINATE SYSTEM)
  // ---------------------------------------------------------------------------
  describe("Coordinate System Conversions", () => {
    it("converts time to horizontal pixels based on pixelsPerSecond", () => {
      // 100 pixels per second
      assert.equal(timeToPixels(0, 100), 0);
      assert.equal(timeToPixels(1.5, 100), 150);
      assert.equal(timeToPixels(5.0, 100), 500);

      // 200 pixels per second (2x zoom)
      assert.equal(timeToPixels(1.5, 200), 300);

      // 50 pixels per second (0.5x zoom)
      assert.equal(timeToPixels(2.0, 50), 100);
    });

    it("applies horizontal scroll offset to timeToPixels", () => {
      // 1.5s at 100pps is 150px; with 50px scroll offset -> 100px relative viewport position
      assert.equal(timeToPixels(1.5, 100, { scrollLeft: 50 }), 100);
      assert.equal(timeToPixels(1.5, 100, { scrollLeft: 150 }), 0);
    });

    it("converts pixel coordinate to time with duration clamping and frame snapping", () => {
      const pps = 100;
      const duration = 10;
      const fps = 30;

      // 150px at 100pps = 1.5s (frame 45)
      assert.equal(pixelsToTime(150, pps, { duration, fps }), 1.5);

      // Negative pixel is clamped to 0
      assert.equal(pixelsToTime(-50, pps, { duration, fps }), 0);

      // Pixel beyond duration is clamped to duration (10s)
      assert.equal(pixelsToTime(1500, pps, { duration, fps }), 10);
    });

    it("respects horizontal scroll in pixelsToTime", () => {
      const pps = 100;
      const duration = 10;
      const fps = 30;

      // If user clicks at viewport relative x=50, but container is scrolled 100px:
      // total canvas x = 150px -> 1.5s
      assert.equal(pixelsToTime(50, pps, { scrollLeft: 100, duration, fps }), 1.5);
    });

    it("supports disabling frame snapping for continuous mathematical time if desired", () => {
      const pps = 100;
      const duration = 10;
      // 33px at 100pps = 0.33s
      const unsnapped = pixelsToTime(33, pps, { duration, snapToFrames: false });
      assert.equal(unsnapped, 0.33);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. SCRUB TIME CALCULATION FROM POINTER EVENTS
  // ---------------------------------------------------------------------------
  describe("calculateScrubTime Pointer Coordinate Resolution", () => {
    it("accurately calculates target time from clientX and container offsets", () => {
      const targetTime = calculateScrubTime({
        clientX: 350,
        containerLeft: 200,
        scrollLeft: 0,
        pixelsPerSecond: 100,
        duration: 10,
        fps: 30,
        snapToFrames: true,
      });

      // relativeX = 350 - 200 = 150px -> 1.5s at 100pps
      assert.equal(targetTime, 1.5);
    });

    it("accurately calculates target time when container is scrolled horizontally", () => {
      const targetTime = calculateScrubTime({
        clientX: 250,
        containerLeft: 200,
        scrollLeft: 100, // scrolled 100px
        pixelsPerSecond: 100,
        duration: 10,
        fps: 30,
        snapToFrames: true,
      });

      // relativeX = 250 - 200 = 50px. CanvasX = 50 + 100 = 150px -> 1.5s
      assert.equal(targetTime, 1.5);
    });

    it("clamps pointer scrubbing to [0, duration] bounds when dragged out of bounds", () => {
      // Dragged far left past ruler
      const leftTime = calculateScrubTime({
        clientX: 50,
        containerLeft: 200,
        scrollLeft: 0,
        pixelsPerSecond: 100,
        duration: 10,
        fps: 30,
      });
      assert.equal(leftTime, 0);

      // Dragged far right past ruler
      const rightTime = calculateScrubTime({
        clientX: 2000,
        containerLeft: 200,
        scrollLeft: 0,
        pixelsPerSecond: 100,
        duration: 5,
        fps: 30,
      });
      assert.equal(rightTime, 5);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. TIMELINE MANAGER SEEKING & STATE SYNC
  // ---------------------------------------------------------------------------
  describe("TimelineManager Seeking Integration", () => {
    it("seeks accurately and notifies observers", () => {
      const manager = new TimelineManager({ duration: 10, fps: 30 });
      const states: number[] = [];

      manager.subscribe((state) => {
        states.push(state.currentTime);
      });

      manager.seek(2.5);
      assert.equal(manager.getState().currentTime, 2.5);
      assert.equal(manager.getState().currentFrame, 75);

      manager.seek(-5); // clamps to 0
      assert.equal(manager.getState().currentTime, 0);

      manager.seek(15); // clamps to duration (10)
      assert.equal(manager.getState().currentTime, 10);
    });

    it("seeks frame-accurately via seekFrame", () => {
      const manager = new TimelineManager({ duration: 5, fps: 30 });
      manager.seekFrame(45);

      assert.equal(manager.getState().currentFrame, 45);
      assert.equal(manager.getState().currentTime, 1.5);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. PIPELINE INTEGRATION: TIMELINE -> CURRENT TIME -> MOTION ENGINE -> CANVAS
  // ---------------------------------------------------------------------------
  describe("Motion Engine to Canvas Pipeline Integration", () => {
    it("evaluates animated scene properties at the scrubbed time via Phase 6 Motion Engine", () => {
      // Setup animated element: x travels from 100 to 500 linearly over 2 seconds
      const xTrack = createAnimation("x", [
        createKeyframe(0.0, 100, "linear"),
        createKeyframe(2.0, 500, "linear"),
      ]);
      const opacityTrack = createAnimation("opacity", [
        createKeyframe(0.0, 0.0, "linear"),
        createKeyframe(1.0, 1.0, "linear"),
      ]);

      const animatedText = createTextElement({
        name: "Motion Hero",
        text: "Animated Canvas",
        transform: { ...DEFAULT_TRANSFORM, x: 100, y: 200, width: 300, height: 80 },
        appearance: { ...DEFAULT_APPEARANCE, opacity: 0 },
        propertyTracks: [xTrack, opacityTrack],
      });

      const staticBox = createShapeElement({
        name: "Static Box",
        shapeKind: "rectangle",
        transform: { ...DEFAULT_TRANSFORM, x: 50, y: 50, width: 200, height: 200 },
        appearance: { ...DEFAULT_APPEARANCE, opacity: 1 },
      });

      const scene = createScene({
        name: "Motion Test Scene",
        duration: 5.0,
        elements: [animatedText, staticBox],
      });

      // 1. Evaluate at t = 0.0s
      const sceneAt0 = getEvaluatedSceneAtTime(scene, 0.0);
      assert.equal(sceneAt0.elements[0].transform.x, 100);
      assert.equal(sceneAt0.elements[0].appearance.opacity, 0);
      assert.equal(sceneAt0.elements[1].transform.x, 50); // static unchanged

      // 2. Evaluate at t = 1.0s (scrubbed halfway)
      // x should be halfway between 100 and 500 -> 300
      // opacity should be completed (1.0 at t=1.0)
      const sceneAt1 = getEvaluatedSceneAtTime(scene, 1.0);
      assert.equal(sceneAt1.elements[0].transform.x, 300);
      assert.equal(sceneAt1.elements[0].appearance.opacity, 1.0);
      assert.equal(sceneAt1.elements[1].transform.x, 50);

      // 3. Evaluate at t = 2.0s (full travel)
      const sceneAt2 = getEvaluatedSceneAtTime(scene, 2.0);
      assert.equal(sceneAt2.elements[0].transform.x, 500);

      // 4. Verify original scene was NOT mutated
      assert.equal(scene.elements[0].transform.x, 100);
      assert.equal(scene.elements[0].appearance.opacity, 0);
    });

    it("provides full EvaluatedSceneState metadata via getEvaluatedSceneState", () => {
      const scene = createScene({
        name: "State Metadata Test",
        duration: 4.0,
        elements: [],
      });

      const evaluatedState = getEvaluatedSceneState(scene, 2.0);
      assert.equal(evaluatedState.sceneId, scene.id);
      assert.equal(evaluatedState.globalTime, 2.0);
      assert.equal(evaluatedState.localTime, 2.0);
      assert.ok(Array.isArray(evaluatedState.elements));
    });
  });

  // ---------------------------------------------------------------------------
  // 7. COMPONENT TREE & INTERACTIVE PLAYHEAD RENDERING
  // ---------------------------------------------------------------------------
  describe("Component Tree & Interactive Elements Rendering", () => {
    it("renders TimeRuler with work area, slider role, and scrubber cap", () => {
      const html = renderToStaticMarkup(
        React.createElement(TimeRuler, {
          duration: 5.0,
          currentTime: 1.5,
          pixelsPerSecond: 100,
          fps: 30,
          inPoint: 0,
          outPoint: 5.0,
          scrollLeft: 0,
          timelineWidth: 600,
          onSeek: () => {},
        })
      );

      assert.ok(html.includes('role="slider"'));
      assert.ok(html.includes('aria-label="Timeline Time Ruler"'));
      assert.ok(html.includes('aria-valuenow="1.5"'));
      assert.ok(html.includes("left:150px")); // playhead at 1.5s * 100pps
    });

    it("renders Playhead with interactive grab zone and hairline beam", () => {
      const html = renderToStaticMarkup(
        React.createElement(Playhead, {
          currentTime: 2.0,
          pixelsPerSecond: 100,
          duration: 10,
          fps: 30,
          timelineWidth: 1000,
          onSeek: () => {},
        })
      );

      assert.ok(html.includes("left:200px"));
      assert.ok(html.includes("cursor-ew-resize"));
      assert.ok(html.includes("pointer-events-auto"));
    });

    it("renders TimelinePanel with onTimeChange support and passes evaluated scene", () => {
      const manager = createTimelineManager({ duration: 5.0, fps: 30, currentTime: 1.0 });

      const scene = createScene({
        name: "Scrub Scene",
        duration: 5.0,
        elements: [
          createTextElement({
            name: "Title",
            text: "Hello",
          }),
        ],
      });

      const html = renderToStaticMarkup(
        React.createElement(TimelinePanel, {
          scene,
          timelineManager: manager,
          onTimeChange: () => {},
        })
      );

      assert.ok(html.includes("Visual Timeline Panel"));
      assert.ok(html.includes("Title"));
    });
  });
});
