/**
 * MOTION-BOT — Centralized Visual Design Tokens
 * 
 * Phase 2.1: Visual Design System
 * 
 * These tokens define the visual design language for MOTION-BOT.
 * All future UI components must consume these tokens (either via Tailwind utility
 * classes mapped to these values or directly via TypeScript imports).
 */

export const colors = {
  // Studio canvas & viewport backgrounds (dark, low eye-strain, cinematic)
  background: {
    DEFAULT: "hsl(224, 25%, 6%)",       // #0B0C10 - Primary app & stage background
    subtle: "hsl(224, 22%, 8%)",        // #0F1117 - Subtle contrast background
  },

  // Surface layers
  surface: {
    DEFAULT: "hsl(224, 20%, 9%)",       // #11131B - Sidebars, inspector panels, timeline base
    elevated: "hsl(224, 18%, 13%)",     // #1A1D27 - Floating panels, dropdowns, dialogs, popovers
    overlay: "rgba(6, 8, 12, 0.80)",     // Modal and backdrop scrims
  },

  // Borders & Dividers (subtle, technical hairline aesthetics)
  border: {
    DEFAULT: "hsl(224, 15%, 16%)",      // #212531 - Standard panel borders
    subtle: "hsl(224, 15%, 12%)",       // #171A23 - Internal hairline dividers
    active: "hsl(224, 18%, 26%)",       // #373C4E - Hovered / active borders
    focus: "hsl(217, 91%, 60%)",        // #3B82F6 - Focused element outline
  },

  // Text & Typography hierarchy
  text: {
    primary: "hsl(220, 40%, 98%)",      // #F8FAFC - High contrast, primary labels & values
    secondary: "hsl(218, 15%, 65%)",    // #94A0B8 - Secondary descriptions, metadata
    muted: "hsl(220, 12%, 46%)",        // #646E82 - Disabled text, hints, shortcuts
    inverse: "hsl(224, 25%, 6%)",       // #0B0C10 - Text on light accent badges
  },

  // Creative & Studio Accent (vibrant, focused, technical indigo-blue)
  accent: {
    DEFAULT: "hsl(239, 84%, 67%)",      // #6366F1 - Primary action, active track/keyframe highlight
    hover: "hsl(239, 84%, 72%)",        // #7E81F4 - Hover state
    active: "hsl(239, 84%, 60%)",       // #4F46E5 - Pressed state
    subtle: "hsla(239, 84%, 67%, 0.15)",// Semi-transparent highlight tint
    foreground: "hsl(0, 0%, 100%)",     // White text on accent
  },

  // Interactive states
  interactive: {
    selection: "hsla(217, 91%, 60%, 0.25)", // Canvas bounding box / selection marquee
    selectionBorder: "hsl(217, 91%, 60%)",  // Bounding box border
    hoverOverlay: "rgba(255, 255, 255, 0.04)", // Hover tint over surfaces
    activeOverlay: "rgba(255, 255, 255, 0.08)",// Active/pressed tint over surfaces
    focusRing: "hsl(217, 91%, 60%)",        // 2px keyboard focus ring
  },

  // Semantic feedback
  feedback: {
    success: {
      DEFAULT: "hsl(158, 64%, 52%)",    // #10B981 - Render success, saved status
      subtle: "hsla(158, 64%, 52%, 0.15)",
      foreground: "hsl(0, 0%, 100%)",
    },
    warning: {
      DEFAULT: "hsl(38, 92%, 50%)",     // #F59E0B - Resource warning, performance alert
      subtle: "hsla(38, 92%, 50%, 0.15)",
      foreground: "hsl(0, 0%, 0%)",
    },
    error: {
      DEFAULT: "hsl(0, 84%, 60%)",      // #EF4444 - Render failed, invalid input
      subtle: "hsla(0, 84%, 60%, 0.15)",
      foreground: "hsl(0, 0%, 100%)",
    },
  },
} as const;

export const typography = {
  fontFamily: {
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  },
  roles: {
    display: {
      fontSize: "2rem",          // 32px
      lineHeight: "2.25rem",     // 36px
      fontWeight: "700",
      letterSpacing: "-0.025em",
    },
    h1: {
      fontSize: "1.5rem",        // 24px
      lineHeight: "1.875rem",    // 30px
      fontWeight: "600",
      letterSpacing: "-0.02em",
    },
    h2: {
      fontSize: "1.25rem",       // 20px
      lineHeight: "1.625rem",    // 26px
      fontWeight: "600",
      letterSpacing: "-0.015em",
    },
    h3: {
      fontSize: "1.125rem",      // 18px
      lineHeight: "1.5rem",      // 24px
      fontWeight: "600",
      letterSpacing: "-0.01em",
    },
    body: {
      fontSize: "0.875rem",      // 14px
      lineHeight: "1.25rem",     // 20px
      fontWeight: "400",
      letterSpacing: "0em",
    },
    small: {
      fontSize: "0.8125rem",     // 13px
      lineHeight: "1.125rem",    // 18px
      fontWeight: "400",
      letterSpacing: "0em",
    },
    caption: {
      fontSize: "0.75rem",       // 12px
      lineHeight: "1rem",        // 16px
      fontWeight: "400",
      letterSpacing: "0.01em",
    },
    label: {
      fontSize: "0.6875rem",     // 11px
      lineHeight: "0.875rem",    // 14px
      fontWeight: "600",
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    },
    button: {
      fontSize: "0.8125rem",     // 13px
      lineHeight: "1.125rem",    // 18px
      fontWeight: "500",
      letterSpacing: "0.01em",
    },
    code: {
      fontSize: "0.75rem",       // 12px (Mono - timecodes, coordinates)
      lineHeight: "1rem",
      fontWeight: "500",
      letterSpacing: "0.02em",
    },
  },
} as const;

export const spacing = {
  0: "0px",
  0.5: "2px",      // Micro gaps, hairline offsets
  1: "4px",        // Base unit
  1.5: "6px",
  2: "8px",
  2.5: "10px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
} as const;

export const radius = {
  none: "0px",
  xs: "2px",       // Micro tags, timeline flags
  sm: "4px",       // Buttons, inputs, dropdown items (restrained, technical)
  md: "6px",       // Panels, inspector sections
  lg: "8px",       // Modals, floating sheets
  full: "9999px",  // Pills, scrub playheads
} as const;

export const shadows = {
  none: "none",
  subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.40)",
  elevated: "0 4px 12px 0 rgba(0, 0, 0, 0.45), 0 1px 2px 0 rgba(0, 0, 0, 0.35)",
  floating: "0 12px 32px 0 rgba(0, 0, 0, 0.65), 0 2px 6px 0 rgba(0, 0, 0, 0.40)",
  focusRing: "0 0 0 2px hsl(224, 25%, 6%), 0 0 0 4px hsl(217, 91%, 60%)",
} as const;

export const breakpoints = {
  sm: "640px",     // Small devices / narrow layout
  md: "768px",     // Tablet viewports
  lg: "1024px",    // Laptop workstations
  xl: "1280px",    // Standard desktop studio workspace
  "2xl": "1536px", // Ultrawide creative display
} as const;

export const motion = {
  duration: {
    instant: "75ms",    // Immediate feedback (active presses, toggle flips)
    fast: "150ms",      // Standard hover states, tooltip reveals
    normal: "200ms",    // Panel reveals, accordion toggles
    deliberate: "300ms",// Modal dialogs, drawer transitions
  },
  easing: {
    standard: "cubic-bezier(0.2, 0, 0, 1)", // Snappy deceleration
    enter: "cubic-bezier(0, 0, 0.2, 1)",    // Elements entering viewport
    exit: "cubic-bezier(0.4, 0, 1, 1)",     // Elements leaving viewport
    linear: "linear",                       // Continuous mechanical loops
  },
} as const;

export const accessibility = {
  focusRingOffset: "2px",
  focusRingWidth: "2px",
  minTouchTarget: "28px", // Compact desktop creative software standard (e.g. Figma / AE)
  minimumContrastRatio: 4.5, // WCAG AA requirement for body text
  enhancedContrastRatio: 7.0, // WCAG AAA requirement for display text
} as const;
