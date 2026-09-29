/**
 * MOTION-BOT — Timeline UI Components Unit & Integration Tests
 * Verifies timeline panel rendering, hierarchical track generation (Position, Scale, Rotation, Opacity),
 * time ruler calculations, keyframe nodes, zoom scaling, and Motion Engine integration.
 * Part of Phase 7.2: Visual Timeline Interface.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  TimelinePanel,
  TimelineHeader,
  TimeRuler,
  KeyframeNode,
  PropertyTrackRow,
  TrackRow,
} from "../components/timeline";
import { createTimelineManager, TimelineManager } from "../timeline";
import { createScene } from "../services/project/scene-model";
import { createProject } from "../services/project/project-model";
import { createAnimation, createKeyframe } from "../services/animation/animation-model";
import {
  createTextElement,
  createShapeElement,
  createImageElement,
  DEFAULT_TRANSFORM,
  DEFAULT_APPEARANCE,
} from "../services/element/element-model";

describe("Visual Timeline Interface — Phase 7.2", () => {
  // ---------------------------------------------------------------------------
  // 1. FULL TIMELINE PANEL RENDERING (REACT-DOM/SERVER)
  // ---------------------------------------------------------------------------
  describe("TimelinePanel Component Tree Rendering", () => {
    it("renders the complete timeline panel structure to valid HTML", () => {
      const xTrack = createAnimation("x", [
        createKeyframe(0.0, 100, "linear"),
        createKeyframe(2.0, 500, "easeInOut"),
      ]);
      const opacityTrack = createAnimation("opacity", [
        createKeyframe(0.0, 0.0, "linear"),
        createKeyframe(1.0, 1.0, "easeOut"),
      ]);

      const animText = createTextElement({
        name: "Headline Banner",
        text: "Motion Studio",
        transform: { ...DEFAULT_TRANSFORM, x: 100, y: 200 },
        appearance: { ...DEFAULT_APPEARANCE, opacity: 0 },
        propertyTracks: [xTrack, opacityTrack],
        zIndex: 2,
      });

      const staticShape = createShapeElement({
        name: "Backdrop Box",
        shapeKind: "rectangle",
        transform: { ...DEFAULT_TRANSFORM, x: 0, y: 0, width: 800, height: 400 },
        zIndex: 1,
      });

      const scene = createScene({
        name: "Intro Scene",
        startTime: 0,
        duration: 4.0,
        elements: [animText, staticShape],
      });

      const manager = createTimelineManager({
        currentTime: 1.0,
        duration: 4.0,
        fps: 30,
      });

      const html = renderToStaticMarkup(
        React.createElement(TimelinePanel, {
          scene,
          timelineManager: manager,
          selectedElementId: animText.id,
        })
      );

      // Verify structural components are present
      assert.ok(html.includes("Visual Timeline Panel"), "Must contain Timeline Panel aria-label");
      assert.ok(html.includes("Headline Banner"), "Must contain animated element name");
      assert.ok(html.includes("Backdrop Box"), "Must contain static element name");
      assert.ok(html.includes("Layers (2)"), "Must display correct layer count");
      assert.ok(html.includes("00:00:01:00"), "Must display current timecode at 1s");
      assert.ok(html.includes("30 FPS"), "Must display frame rate badge");
      assert.ok(html.includes("Intro Scene"), "Must display active scene name");
      assert.ok(html.includes("Timeline Time Ruler"), "Must contain Time Ruler");
    });

    it("renders clean empty state when scene has zero elements", () => {
      const scene = createScene({
        name: "Blank Scene",
        duration: 5.0,
        elements: [],
      });

      const html = renderToStaticMarkup(
        React.createElement(TimelinePanel, {
          scene,
        })
      );

      assert.ok(html.includes("No elements in active scene"), "Must render empty message");
      assert.ok(html.includes("Layers (0)"), "Must indicate 0 layers");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. HIERARCHICAL PROPERTY TRACK GROUPING
  // ---------------------------------------------------------------------------
  describe("Hierarchical Property Track Grouping", () => {
    it("groups x and y tracks into Position property group", () => {
      const xTrack = createAnimation("x", [
        createKeyframe(0.0, 50, "linear"),
        createKeyframe(2.0, 250, "linear"),
      ]);
      const yTrack = createAnimation("y", [
        createKeyframe(0.5, 100, "linear"),
        createKeyframe(2.5, 300, "linear"),
      ]);

      const element = createShapeElement({
        name: "Moving Ball",
        propertyTracks: [xTrack, yTrack],
      });

      const scene = createScene({ elements: [element], duration: 3.0 });
      const manager = createTimelineManager({ duration: 3.0 });

      const html = renderToStaticMarkup(
        React.createElement(TimelinePanel, {
          scene,
          timelineManager: manager,
          defaultExpandAll: true,
        })
      );

      assert.ok(html.includes("Position (X, Y)"), "Must group x and y under Position");
      assert.ok(html.includes("Moving Ball"), "Must display element track");
    });

    it("groups scale, rotation, opacity, and dimensions tracks", () => {
      const scaleXTrack = createAnimation("scaleX", [createKeyframe(0.0, 1.0, "linear")]);
      const scaleYTrack = createAnimation("scaleY", [createKeyframe(0.0, 1.0, "linear")]);
      const rotTrack = createAnimation("rotation", [createKeyframe(0.0, 0, "linear")]);
      const opTrack = createAnimation("opacity", [createKeyframe(0.0, 1, "linear")]);
      const wTrack = createAnimation("width", [createKeyframe(0.0, 200, "linear")]);

      const element = createImageElement({
        name: "Hero Photo",
        assetId: "asset-1",
        propertyTracks: [scaleXTrack, scaleYTrack, rotTrack, opTrack, wTrack],
      });

      const scene = createScene({ elements: [element], duration: 5.0 });
      const manager = createTimelineManager();

      const html = renderToStaticMarkup(
        React.createElement(TimelinePanel, {
          scene,
          timelineManager: manager,
          defaultExpandAll: true,
        })
      );

      assert.ok(html.includes("Scale (X, Y)"), "Must group scale tracks");
      assert.ok(html.includes("Rotation"), "Must render Rotation track");
      assert.ok(html.includes("Opacity"), "Must render Opacity track");
      assert.ok(html.includes("Dimensions (W, H)"), "Must render Dimensions track");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. KEYFRAME NODE RENDERING & POSITIONING
  // ---------------------------------------------------------------------------
  describe("KeyframeNode Component", () => {
    it("renders keyframe diamond at accurate horizontal pixel offset", () => {
      const kf = createKeyframe(2.5, 300, "easeInOut");
      const pixelsPerSecond = 100;

      const html = renderToStaticMarkup(
        React.createElement(KeyframeNode, {
          keyframe: kf,
          pixelsPerSecond,
          propertyName: "Position X",
        })
      );

      // 2.5s * 100px/s = 250px
      assert.ok(html.includes("left:250px"), "Keyframe left must equal time * pixelsPerSecond");
      assert.ok(html.includes("rotate-45"), "Keyframe must be rendered as rotated diamond");
      assert.ok(html.includes("Val: 300"), "Tooltip must display keyframe value");
      assert.ok(html.includes("easeInOut"), "Tooltip must display easing curve");
    });

    it("applies highlight styling when keyframe is selected", () => {
      const kf = createKeyframe(1.0, 100, "linear");

      const htmlSelected = renderToStaticMarkup(
        React.createElement(KeyframeNode, {
          keyframe: kf,
          pixelsPerSecond: 100,
          isSelected: true,
        })
      );

      assert.ok(htmlSelected.includes("ring-2"), "Selected keyframe must have ring highlight");
    });
  });

  // ---------------------------------------------------------------------------
  // 4. TIME RULER & SCALING
  // ---------------------------------------------------------------------------
  describe("TimeRuler Component", () => {
    it("renders time markers matching composition duration", () => {
      const html = renderToStaticMarkup(
        React.createElement(TimeRuler, {
          duration: 5.0,
          currentTime: 2.0,
          pixelsPerSecond: 100,
          fps: 30,
          inPoint: 0,
          outPoint: 5.0,
          scrollLeft: 0,
          timelineWidth: 500,
          onSeek: () => {},
        })
      );

      assert.ok(html.includes("0s"), "Must display 0s marker");
      assert.ok(html.includes("1s"), "Must display 1s marker");
      assert.ok(html.includes("2s"), "Must display 2s marker");
      assert.ok(html.includes("3s"), "Must display 3s marker");
      assert.ok(html.includes("4s"), "Must display 4s marker");
      assert.ok(html.includes("5s"), "Must display 5s marker");
      assert.ok(html.includes("left:200px"), "Playhead cap must sit at currentTime * pixelsPerSecond");
    });

    it("scales timeline width for long compositions without clipping", () => {
      const htmlLong = renderToStaticMarkup(
        React.createElement(TimeRuler, {
          duration: 60.0, // 1 minute
          currentTime: 15.0,
          pixelsPerSecond: 50,
          fps: 30,
          inPoint: 0,
          outPoint: 60.0,
          scrollLeft: 0,
          timelineWidth: 3000,
          onSeek: () => {},
        })
      );

      assert.ok(htmlLong.includes("width:3000px"), "Ruler must support full extended width");
      assert.ok(htmlLong.includes("60s"), "Must display 60s boundary label");
    });
  });

  // ---------------------------------------------------------------------------
  // 5. TIMELINE HEADER TRANSPORT BAR
  // ---------------------------------------------------------------------------
  describe("TimelineHeader Component", () => {
    it("renders all transport control buttons and timecode readout", () => {
      const manager = createTimelineManager({
        currentTime: 2.5,
        duration: 5.0,
        fps: 30,
        loop: true,
      });

      const html = renderToStaticMarkup(
        React.createElement(TimelineHeader, {
          timelineState: manager.getState(),
          timelineManager: manager,
          sceneName: "Main Feature",
        })
      );

      assert.ok(html.includes("Jump to start"), "Must have jump to start");
      assert.ok(html.includes("Step backward"), "Must have step backward");
      assert.ok(html.includes("Play"), "Must have play button");
      assert.ok(html.includes("Stop"), "Must have stop button");
      assert.ok(html.includes("Step forward"), "Must have step forward");
      assert.ok(html.includes("Jump to end"), "Must have jump to end");
      assert.ok(html.includes("00:00:02:15"), "Must show current SMPTE timecode");
      assert.ok(html.includes("00:00:05:00"), "Must show total SMPTE timecode");
      assert.ok(html.includes("Toggle loop playback"), "Must have loop button");
      assert.ok(html.includes("Main Feature"), "Must display scene name");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. PHASE 6 MOTION ENGINE CONSUMPTION
  // ---------------------------------------------------------------------------
  describe("Motion Engine Value Consumption", () => {
    it("displays live evaluated property values from Motion Engine in PropertyTrackRow", () => {
      const xTrack = createAnimation("x", [
        createKeyframe(0.0, 0, "linear"),
        createKeyframe(2.0, 400, "linear"),
      ]);

      const element = createTextElement({
        name: "Motion Text",
        transform: { ...DEFAULT_TRANSFORM, x: 0 },
        propertyTracks: [xTrack],
      });

      const propertyGroup = {
        id: "position",
        name: "Position (X, Y)",
        category: "position" as const,
        properties: ["x" as const, "y" as const],
        keyframes: xTrack.keyframes,
        hasKeyframes: true,
        enabled: true,
      };

      // At t = 1.0s, x evaluates to 200 via Phase 6 Motion Engine
      const htmlMid = renderToStaticMarkup(
        React.createElement(PropertyTrackRow, {
          element,
          propertyGroup,
          pixelsPerSecond: 100,
          currentTime: 1.0,
          timelineWidth: 400,
        })
      );

      // Check evaluated display badge contains 200
      assert.ok(htmlMid.includes("200,"), "Must consume evaluated x position (200) from Motion Engine");
    });
  });
});
