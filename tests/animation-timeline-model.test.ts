/**
 * MOTION-BOT — Animation & Timeline Model Test Suite
 * Validates concrete animations, keyframes, easing curves, element animation binding,
 * timeline models, and hierarchical scene timelines.
 * Part of Phase 3.4: Animation & Timeline Data Model.
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  createAnimation,
  createKeyframe,
  validateAnimation,
  validateKeyframe,
  addKeyframe,
  removeKeyframe,
  updateKeyframe,
  getKeyframeAtTime,
  addAnimationToElement,
  removeAnimationFromElement,
  getElementAnimationForProperty,
  getAnimatedProperties,
} from "../services/animation/animation-model";

import {
  createTimeline,
  createTimelineTrack,
  createTimelineClip,
  createTimelineMarker,
  validateTimeline,
  setTimelineCurrentTime,
  setTimelineDuration,
  addTrackToTimeline,
  addClipToTrack,
  addAnimationToTimeline,
  attachTimelineToScene,
} from "../services/timeline/timeline-model";

import { createTextElement, createShapeElement } from "../services/element/element-model";
import { createScene } from "../services/project/scene-model";
import { createProject } from "../services/project/project-model";
import { AnimatableProperty, EasingType } from "../types/animation";

test("Keyframe Model — Creation, validation, and typed values", () => {
  // Numeric keyframe
  const kf1 = createKeyframe(0.0, 100, "linear", "Start Position");
  assert.equal(kf1.time, 0.0);
  assert.equal(kf1.value, 100);
  assert.equal(kf1.easing, "linear");
  assert.equal(kf1.label, "Start Position");
  assert.equal(validateKeyframe(kf1).valid, true);

  // Bezier easing keyframe
  const kf2 = createKeyframe(1.5, 500, {
    type: "cubicBezier",
    bezier: { p1x: 0.25, p1y: 0.1, p2x: 0.25, p2y: 1.0 },
  });
  assert.equal(kf2.time, 1.5);
  assert.equal(kf2.value, 500);
  assert.equal(typeof kf2.easing, "object");
  assert.equal(validateKeyframe(kf2).valid, true);

  // String / Color keyframe
  const kfColor = createKeyframe(0.5, "#FF0055", "easeIn");
  assert.equal(kfColor.value, "#FF0055");
  assert.equal(kfColor.easing, "easeIn");
  assert.equal(validateKeyframe(kfColor).valid, true);
});

test("Animation Model — Multiple supported animatable properties", () => {
  const supportedProperties: AnimatableProperty[] = [
    "x",
    "y",
    "scaleX",
    "scaleY",
    "rotation",
    "opacity",
    "width",
    "height",
    "fontSize",
    "cornerRadius",
  ];

  for (const prop of supportedProperties) {
    const kfStart = createKeyframe(0.0, 0, "linear");
    const kfEnd = createKeyframe(1.0, 100, "easeInOut");
    const anim = createAnimation(prop, [kfStart, kfEnd]);

    assert.equal(anim.property, prop);
    assert.equal(anim.keyframes.length, 2);
    assert.equal(anim.enabled, true);
    assert.equal(validateAnimation(anim).valid, true);
  }
});

test("Animation Model — Keyframe chronology and immutable operations", () => {
  // Create animation with keyframes passed out of order
  const kf3 = createKeyframe(2.0, 300, "easeOut");
  const kf1 = createKeyframe(0.0, 0, "linear");
  const kf2 = createKeyframe(1.0, 150, "easeInOut");

  const anim = createAnimation("x", [kf3, kf1, kf2]);

  // Keyframes must automatically be sorted chronologically
  assert.equal(anim.keyframes[0].time, 0.0);
  assert.equal(anim.keyframes[1].time, 1.0);
  assert.equal(anim.keyframes[2].time, 2.0);

  // Add a new keyframe immutably at 0.5s
  const kfMid = createKeyframe(0.5, 75, "easeIn");
  const animWithMid = addKeyframe(anim, kfMid);

  assert.equal(anim.keyframes.length, 3); // original untouched
  assert.equal(animWithMid.keyframes.length, 4);
  assert.equal(animWithMid.keyframes[1].time, 0.5);
  assert.equal(animWithMid.keyframes[1].value, 75);

  // Update keyframe at 1.0s
  const kf2Id = anim.keyframes[1].id;
  const updatedAnim = updateKeyframe(animWithMid, kf2Id, { value: 180 });
  assert.equal(getKeyframeAtTime(updatedAnim, 1.0)?.value, 180);

  // Remove keyframe at 2.0s
  const kf3Id = anim.keyframes[2].id;
  const removedAnim = removeKeyframe(updatedAnim, kf3Id);
  assert.equal(removedAnim.keyframes.length, 3);
  assert.equal(getKeyframeAtTime(removedAnim, 2.0), undefined);
});

test("Easing System — Standard and extensible curves", () => {
  const easings: EasingType[] = [
    "linear",
    "easeIn",
    "easeOut",
    "easeInOut",
    "easeInQuad",
    "easeOutElastic",
    "easeOutBounce",
    "spring",
  ];

  for (const easing of easings) {
    const kf = createKeyframe(0.5, 100, easing);
    assert.equal(kf.easing, easing);
  }
});

test("Element → Animation Relationship — Clean binding to elements", () => {
  const textEl = createTextElement({
    name: "Animated Title",
    text: "Future of Motion",
  });

  // Create an X position animation track
  const animX = createAnimation("x", [
    createKeyframe(0.0, -200, "easeOut"),
    createKeyframe(0.8, 960, "easeInOut"),
  ]);

  // Create an Opacity animation track
  const animOpacity = createAnimation("opacity", [
    createKeyframe(0.0, 0, "linear"),
    createKeyframe(0.5, 1, "easeIn"),
  ]);

  // Bind animations to element
  const animatedText = addAnimationToElement(
    addAnimationToElement(textEl, animX),
    animOpacity
  );

  assert.equal(textEl.propertyTracks.length, 0); // Original untouched
  assert.equal(animatedText.propertyTracks.length, 2);

  const animatedProps = getAnimatedProperties(animatedText);
  assert.ok(animatedProps.includes("x"));
  assert.ok(animatedProps.includes("opacity"));

  const retrievedAnimX = getElementAnimationForProperty(animatedText, "x");
  assert.ok(retrievedAnimX);
  assert.equal(retrievedAnimX?.elementId, animatedText.id);
  assert.equal(retrievedAnimX?.keyframes.length, 2);

  // Different elements have different animations
  const shapeEl = createShapeElement({ shapeKind: "rectangle" });
  const animScale = createAnimation("scaleX", [
    createKeyframe(0.0, 0, "easeIn"),
    createKeyframe(1.0, 1.2, "easeOut"),
  ]);
  const animatedShape = addAnimationToElement(shapeEl, animScale);

  assert.equal(getAnimatedProperties(animatedShape).length, 1);
  assert.equal(getAnimatedProperties(animatedShape)[0], "scaleX");
  assert.equal(getAnimatedProperties(animatedText).length, 2);

  // Remove animation
  const withoutOpacity = removeAnimationFromElement(animatedText, "opacity");
  assert.equal(withoutOpacity.propertyTracks.length, 1);
  assert.equal(withoutOpacity.propertyTracks[0].property, "x");
});

test("Timeline Model — Duration, currentTime, tracks, clips, and markers", () => {
  const timeline = createTimeline({
    duration: 10.0,
    currentTime: 2.5,
    fps: 30,
  });

  assert.equal(timeline.duration, 10.0);
  assert.equal(timeline.currentTime, 2.5);
  assert.equal(timeline.fps, 30);
  assert.equal(validateTimeline(timeline).valid, true);

  // Add tracks
  const videoTrack = createTimelineTrack({
    name: "Video Layer 1",
    type: "video",
    order: 0,
  });

  const textTrack = createTimelineTrack({
    name: "Title Track",
    type: "text",
    order: 1,
  });

  const withTracks = addTrackToTimeline(addTrackToTimeline(timeline, videoTrack), textTrack);
  assert.equal(withTracks.tracks.length, 2);

  // Add clip to track
  const titleClip = createTimelineClip({
    elementId: "el_text_01",
    trackId: textTrack.id,
    startFrame: 0,
    durationFrames: 90,
    label: "Main Title",
  });

  const withClips = addClipToTrack(withTracks, textTrack.id, titleClip);
  const targetTrack = withClips.tracks.find((t) => t.id === textTrack.id);
  assert.equal(targetTrack?.clips.length, 1);
  assert.equal(targetTrack?.clips[0].label, "Main Title");

  // Playhead position updates
  const seeked = setTimelineCurrentTime(withClips, 4.2);
  assert.equal(seeked.currentTime, 4.2);

  // Clamped at duration
  const overSeeked = setTimelineCurrentTime(withClips, 15.0);
  assert.equal(overSeeked.currentTime, 10.0);

  // Marker
  const marker = createTimelineMarker({
    frame: 90,
    label: "Beat Drop",
    color: "#00F0FF",
  });
  assert.equal(marker.label, "Beat Drop");
});

test("Scene Timeline — Hierarchical Architecture (Project -> Scene -> Element -> Animation + Scene -> Timeline)", () => {
  // 1. Create Element with Animation
  const textEl = createTextElement({ name: "Scene Title", text: "Welcome" });
  const anim = createAnimation("opacity", [
    createKeyframe(0.0, 0, "easeIn"),
    createKeyframe(1.0, 1, "easeOut"),
  ]);
  const animatedElement = addAnimationToElement(textEl, anim);

  // 2. Create Scene containing the Element
  const scene = createScene({
    name: "Intro Scene",
    duration: 5.0,
    elements: [animatedElement],
  });

  // 3. Create Scene Timeline and attach to Scene
  const sceneTimeline = createTimeline({
    duration: 5.0,
    currentTime: 0,
    fps: 60,
    tracks: [
      createTimelineTrack({
        name: "Text Track",
        type: "text",
        clips: [
          createTimelineClip({
            elementId: animatedElement.id,
            trackId: "track_text_1",
            startFrame: 0,
            durationFrames: 300,
          }),
        ],
      }),
    ],
    animations: [anim],
  });

  const sceneWithTimeline = attachTimelineToScene(scene, sceneTimeline);

  // 4. Create Project holding the Scene
  const project = createProject({
    name: "Full Commercial",
    scenes: [sceneWithTimeline],
  });

  // Assert hierarchical integrity
  assert.equal(project.scenes.length, 1);
  const rootScene = project.scenes[0];
  assert.equal(rootScene.name, "Intro Scene");
  assert.ok(rootScene.timeline);
  assert.equal(rootScene.timeline?.duration, 5.0);
  assert.equal(rootScene.elements.length, 1);

  const rootElement = rootScene.elements[0];
  assert.equal(rootElement.propertyTracks.length, 1);
  assert.equal(rootElement.propertyTracks[0].property, "opacity");
  assert.equal(rootElement.propertyTracks[0].keyframes.length, 2);
});
