# MOTION-BOT — Motion Engine

The standalone, framework-independent motion calculation engine for MOTION-BOT. It calculates deterministic visual states for elements and scenes from Phase 3 keyframe and animation tracks.

Part of **Phase 6: Motion Engine** (LOCKED).

## Architectural Isolation

The Motion Engine is strictly decoupled from:
- React components, hooks, and DOM
- Canvas rendering engines
- Timeline UI and scrubbing controls
- Playback loops and animation frame timers (`requestAnimationFrame`, `setInterval`)
- IndexedDB / Cloud storage persistence
- AI generation systems
- Export / video encoding pipelines

Conceptually:
```text
Project / Scene / Animation Data (Phase 3)
           ↓
     Motion Engine (Phase 6)
           ↓
Evaluated Element / Scene State
           ↓
Canvas / Timeline / Playback (Phase 5 / Phase 7)
```

## Module Structure

- **`types.ts`**: Core contracts, evaluation interfaces (`IMotionEngine`, `ISceneEvaluator`, `IPropertyAnimationEvaluator`, `IAnimationEvaluator`, `IKeyframeEvaluator`, `IEasingRegistry`), and evaluated state models (`EvaluatedSceneState`, `EvaluatedElementState`, `MotionEvaluationResult`).
- **`interpolation.ts`**: Linear interpolation (`lerp`, `lerpClamped`), normalization (`normalizeProgress`), progress clamping (`clamp01`), and generic interpolation utilities with safe handling of non-finite numbers.
- **`easing.ts`**: Mathematical easing curve implementations (`linear`, `easeIn`, `easeOut`, `easeInOut`, cubic bezier, spring fallback) with input normalization, boundary guarantees at $t=0$ and $t=1$, and extensible easing registry (`EasingRegistry`, `defaultEasingRegistry`).
- **`keyframe-evaluator.ts`**: Keyframe interval resolution, binary search localization, safe sorting, duplicate timestamp step-cut handling, and boundary clamping (`KeyframeEvaluator`, `defaultKeyframeEvaluator`).
- **`animation-evaluator.ts`**: Property animation track evaluator mapping time to evaluated property values (`AnimationEvaluator`, `defaultAnimationEvaluator`).
- **`property-evaluator.ts`**: Resolves the 8 core animatable properties (`x`, `y`, `width`, `height`, `rotation`, `scaleX`, `scaleY`, `opacity`) and immutably merges evaluated properties onto `MotionElement` instances (`PropertyAnimationEvaluator`, `applyEvaluationToElement`).
- **`scene-evaluator.ts`**: High-performance, pure scene-level motion evaluation resolving visual states for all elements in a scene at arbitrary timestamps, with support for scene start offsets, duration clamping, z-order preservation, and visibility filtering (`SceneEvaluator`, `defaultSceneEvaluator`, `evaluateScene`).
- **`motion-engine.ts`**: Central coordinator unifying element, property, and scene evaluation (`MotionEngine`, `createMotionEngine`, `defaultMotionEngine`).
- **`index.ts`**: Public barrel exports for the Motion Engine.
