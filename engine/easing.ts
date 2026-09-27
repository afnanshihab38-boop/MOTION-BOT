/**
 * MOTION-BOT — Motion Engine Easing Functions & Registry
 * Pure mathematical curves, safe boundary enforcement, and extensible registry.
 * Part of Phase 6.2: Smooth Motion Mathematical Foundation.
 */

import {
  CubicBezierCurve,
  EasingDefinition,
  EasingType,
  SpringConfig,
  StepsConfig,
} from "@/types/animation";
import { clamp01 } from "./interpolation";
import { EasingFunction, IEasingRegistry } from "./types";

/**
 * Higher-order function that wraps any raw easing function with strict safety guarantees:
 * 1. Safely normalizes input t to [0, 1] using clamp01.
 * 2. Guaranteed boundary conditions: f(0) === 0 and f(1) === 1.
 * 3. Prevents invalid numerical results (NaN, +/- Infinity) with safe fallbacks.
 * 4. Deterministic pure evaluation.
 */
export function safeEasing(fn: EasingFunction): EasingFunction {
  return (t: number): number => {
    const u = clamp01(t);
    if (u === 0) return 0;
    if (u === 1) return 1;

    const result = fn(u);

    if (typeof result !== "number" || Number.isNaN(result) || !Number.isFinite(result)) {
      return u;
    }

    return result;
  };
}

// -----------------------------------------------------------------------------
// CORE PHASE 3 EASING FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Linear easing: constant velocity with no acceleration.
 * Identity mapping f(t) = t.
 */
export const linear: EasingFunction = safeEasing((t: number) => t);

/**
 * Ease In: accelerates from zero velocity.
 * Standard cubic ease-in f(t) = t^3.
 */
export const easeIn: EasingFunction = safeEasing((t: number) => t * t * t);

/**
 * Ease Out: decelerates to zero velocity.
 * Standard cubic ease-out f(t) = 1 - (1 - t)^3.
 */
export const easeOut: EasingFunction = safeEasing((t: number) => {
  const p = 1 - t;
  return 1 - p * p * p;
});

/**
 * Ease In-Out: accelerates until midpoint, then decelerates to zero velocity.
 * Symmetric cubic curve with exact midpoint f(0.5) === 0.5.
 */
export const easeInOut: EasingFunction = safeEasing((t: number) => {
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  const p = -2 * t + 2;
  return 1 - (p * p * p) / 2;
});

// -----------------------------------------------------------------------------
// ADDITIONAL CURVES FROM PHASE 3 MODEL
// -----------------------------------------------------------------------------

const c1 = 1.70158;
const c2 = c1 * 1.525;
const c3 = c1 + 1;
const c4 = (2 * Math.PI) / 3;
const c5 = (2 * Math.PI) / 4.5;

export const easeInQuad: EasingFunction = safeEasing((t: number) => t * t);
export const easeOutQuad: EasingFunction = safeEasing((t: number) => t * (2 - t));
export const easeInOutQuad: EasingFunction = safeEasing((t: number) =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
);

export const easeInCubic: EasingFunction = easeIn;
export const easeOutCubic: EasingFunction = easeOut;
export const easeInOutCubic: EasingFunction = easeInOut;

export const easeInQuart: EasingFunction = safeEasing((t: number) => t * t * t * t);
export const easeOutQuart: EasingFunction = safeEasing((t: number) => 1 - Math.pow(1 - t, 4));
export const easeInOutQuart: EasingFunction = safeEasing((t: number) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2
);

export const easeInExpo: EasingFunction = safeEasing((t: number) =>
  t === 0 ? 0 : Math.pow(2, 10 * t - 10)
);
export const easeOutExpo: EasingFunction = safeEasing((t: number) =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
);
export const easeInOutExpo: EasingFunction = safeEasing((t: number) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;
});

export const easeInBack: EasingFunction = safeEasing(
  (t: number) => c3 * t * t * t - c1 * t * t
);
export const easeOutBack: EasingFunction = safeEasing((t: number) => {
  const p = t - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
});
export const easeInOutBack: EasingFunction = safeEasing((t: number) =>
  t < 0.5
    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2
);

export const easeInElastic: EasingFunction = safeEasing((t: number) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
});
export const easeOutElastic: EasingFunction = safeEasing((t: number) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
});
export const easeInOutElastic: EasingFunction = safeEasing((t: number) => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5
    ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
    : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
});

export const easeOutBounce: EasingFunction = safeEasing((t: number) => {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    const p = t - 1.5 / d1;
    return n1 * p * p + 0.75;
  } else if (t < 2.5 / d1) {
    const p = t - 2.25 / d1;
    return n1 * p * p + 0.9375;
  } else {
    const p = t - 2.625 / d1;
    return n1 * p * p + 0.984375;
  }
});
export const easeInBounce: EasingFunction = safeEasing((t: number) => 1 - easeOutBounce(1 - t));
export const easeInOutBounce: EasingFunction = safeEasing((t: number) =>
  t < 0.5
    ? (1 - easeOutBounce(1 - 2 * t)) / 2
    : (1 + easeOutBounce(2 * t - 1)) / 2
);

// -----------------------------------------------------------------------------
// BEZIER, STEPS & SPRING SOLVERS
// -----------------------------------------------------------------------------

export const BEZIER_PRESETS: Record<string, CubicBezierCurve> = {
  ease: { p1x: 0.25, p1y: 0.1, p2x: 0.25, p2y: 1.0 },
  easeIn: { p1x: 0.42, p1y: 0.0, p2x: 1.0, p2y: 1.0 },
  easeOut: { p1x: 0.0, p1y: 0.0, p2x: 0.58, p2y: 1.0 },
  easeInOut: { p1x: 0.42, p1y: 0.0, p2x: 0.58, p2y: 1.0 },
};

function sampleBezier(p1: number, p2: number, t: number): number {
  return ((1 - 3 * p2 + 3 * p1) * t + (3 * p2 - 6 * p1)) * t * t + 3 * p1 * t;
}

function sampleBezierDerivative(p1: number, p2: number, t: number): number {
  return (3 * (1 - 3 * p2 + 3 * p1) * t + 2 * (3 * p2 - 6 * p1)) * t + 3 * p1;
}

export function createCubicBezierSolver(curve: CubicBezierCurve): EasingFunction {
  const { p1x, p1y, p2x, p2y } = curve;

  if (p1x === p1y && p2x === p2y) {
    return linear;
  }

  return safeEasing((x: number): number => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const currentX = sampleBezier(p1x, p2x, t) - x;
      if (Math.abs(currentX) < 1e-7) {
        return sampleBezier(p1y, p2y, t);
      }
      const currentSlope = sampleBezierDerivative(p1x, p2x, t);
      if (Math.abs(currentSlope) < 1e-7) {
        break;
      }
      t -= currentX / currentSlope;
    }

    let t0 = 0.0;
    let t1 = 1.0;
    t = x;

    while (t0 < t1) {
      const currentX = sampleBezier(p1x, p2x, t);
      if (Math.abs(currentX - x) < 1e-7) {
        return sampleBezier(p1y, p2y, t);
      }
      if (x > currentX) {
        t0 = t;
      } else {
        t1 = t;
      }
      t = (t1 + t0) / 2;
    }

    return sampleBezier(p1y, p2y, t);
  });
}

export function createStepsSolver(config: StepsConfig): EasingFunction {
  const count = Math.max(1, Math.floor(config.stepsCount));
  const position = config.stepPosition || "end";

  return safeEasing((t: number): number => {
    if (position === "start") {
      return Math.min(1, (Math.floor(t * count) + 1) / count);
    }
    if (position === "jump-none") {
      return count <= 1 ? 0 : Math.floor(t * (count - 1)) / (count - 1);
    }
    if (position === "jump-both") {
      return (Math.floor(t * count) + 1) / (count + 1);
    }
    return Math.floor(t * count) / count;
  });
}

export function createSpringSolver(config: SpringConfig): EasingFunction {
  const m = Math.max(0.001, config.mass);
  const k = Math.max(0.001, config.stiffness);
  const c = Math.max(0.001, config.damping);
  const v0 = config.initialVelocity || 0;

  const omega0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));

  return safeEasing((t: number): number => {
    const scaledTime = t * 6;

    if (zeta < 1) {
      const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
      const decay = Math.exp(-zeta * omega0 * scaledTime);
      const sinTerm = Math.sin(omegaD * scaledTime);
      const cosTerm = Math.cos(omegaD * scaledTime);
      const a = (v0 + zeta * omega0) / omegaD;
      return 1 - decay * (cosTerm + a * sinTerm);
    } else {
      const decay = Math.exp(-omega0 * scaledTime);
      return 1 - decay * (1 + (v0 + omega0) * scaledTime);
    }
  });
}

// -----------------------------------------------------------------------------
// EASING REGISTRY ARCHITECTURE
// -----------------------------------------------------------------------------

/**
 * Extensible Easing Registry allowing dynamic addition of custom easing curves.
 */
export class EasingRegistry implements IEasingRegistry {
  private readonly curves = new Map<string, EasingFunction>();

  constructor() {
    this.registerDefaults();
  }

  /**
   * Registers a new easing function under a unique name.
   * Automatically wraps with safeEasing guarantees.
   */
  public register(name: string, fn: EasingFunction): void {
    this.curves.set(name, safeEasing(fn));
  }

  /**
   * Retrieves a registered easing function by name.
   */
  public get(name: string): EasingFunction | undefined {
    return this.curves.get(name);
  }

  /**
   * Checks if an easing name is registered.
   */
  public has(name: string): boolean {
    return this.curves.has(name);
  }

  /**
   * Returns a list of all registered easing curve names.
   */
  public list(): string[] {
    return Array.from(this.curves.keys());
  }

  /**
   * Resolves an EasingType, EasingDefinition, custom string, or undefined to a safe EasingFunction.
   */
  public resolve(
    easing: EasingType | EasingDefinition | string | undefined
  ): EasingFunction {
    if (!easing) {
      return linear;
    }

    if (typeof easing === "string") {
      return this.curves.get(easing) || linear;
    }

    if (typeof easing === "object") {
      if (easing.type === "cubicBezier" && easing.bezier) {
        return createCubicBezierSolver(easing.bezier);
      }
      if (easing.type === "spring" && easing.spring) {
        return createSpringSolver(easing.spring);
      }
      if (easing.type === "steps" && easing.steps) {
        return createStepsSolver(easing.steps);
      }
      return this.curves.get(easing.type) || linear;
    }

    return linear;
  }

  private registerDefaults(): void {
    // Core Phase 3 functions
    this.register("linear", linear);
    this.register("easeIn", easeIn);
    this.register("easeOut", easeOut);
    this.register("easeInOut", easeInOut);

    // Quad, Quart, Expo, Back, Elastic, Bounce
    this.register("easeInQuad", easeInQuad);
    this.register("easeOutQuad", easeOutQuad);
    this.register("easeInOutQuad", easeInOutQuad);
    this.register("easeInCubic", easeInCubic);
    this.register("easeOutCubic", easeOutCubic);
    this.register("easeInOutCubic", easeInOutCubic);
    this.register("easeInQuart", easeInQuart);
    this.register("easeOutQuart", easeOutQuart);
    this.register("easeInOutQuart", easeInOutQuart);
    this.register("easeInExpo", easeInExpo);
    this.register("easeOutExpo", easeOutExpo);
    this.register("easeInOutExpo", easeInOutExpo);
    this.register("easeInBack", easeInBack);
    this.register("easeOutBack", easeOutBack);
    this.register("easeInOutBack", easeInOutBack);
    this.register("easeInElastic", easeInElastic);
    this.register("easeOutElastic", easeOutElastic);
    this.register("easeInOutElastic", easeInOutElastic);
    this.register("easeInBounce", easeInBounce);
    this.register("easeOutBounce", easeOutBounce);
    this.register("easeInOutBounce", easeInOutBounce);
  }
}

/**
 * Global singleton default easing registry.
 */
export const defaultEasingRegistry = new EasingRegistry();

/**
 * Convenience static lookup map matching Phase 6.1 contract.
 */
export const EASING_REGISTRY: Record<string, EasingFunction> = new Proxy(
  {},
  {
    get: (_, prop: string) => defaultEasingRegistry.get(prop) || linear,
    has: (_, prop: string) => defaultEasingRegistry.has(prop),
  }
);

/**
 * Universal easing resolver using the default easing registry.
 */
export function resolveEasing(
  easing: EasingType | EasingDefinition | string | undefined
): EasingFunction {
  return defaultEasingRegistry.resolve(easing);
}
