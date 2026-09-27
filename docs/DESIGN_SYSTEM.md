# MOTION-BOT — Visual Design System

## Current Phase: 2.1 — Visual Design System

---

## 1. Product Direction & Aesthetic Philosophy

MOTION-BOT is an AI-powered motion design studio. Its visual identity is intentionally modeled after **high-performance creative software** (such as After Effects, Figma, Linear, and Blender) rather than generic AI SaaS web dashboards.

### Aesthetic Attributes
* **Technical & Precise**: Exact geometry, hairline borders, compact data density, and clear visual alignment.
* **Cinematic Dark Palette**: Low eye-strain charcoal surfaces (`#0B0C10` to `#1A1D27`) that maximize focus on visual motion graphics.
* **Restrained & Purposeful**: Zero arbitrary decorative gradients, no childish or oversized cards, no excessive glassmorphism, and no gratuitous glowing neon effects.
* **High Information Density**: Structured for complex multi-panel layouts (canvas stage, timeline ruler, layer tracks, property inspectors) without visual clutter.

---

## 2. Core Design Principles

1. **Hierarchy Through Value, Not Size**: Use subtle lightness contrast and font weights to establish prominence rather than oversized type.
2. **Hairline Separation**: Separate panels and toolbars with precise 1px borders (`#212531`) rather than heavy drop shadows.
3. **Purposeful Accentuation**: The primary creative accent (`hsl(239, 84%, 67%)` / Indigo) is reserved strictly for focal interaction points: active tools, timeline playheads, selected keyframes, and primary actions.
4. **Predictable Spacing**: Every element aligns to a consistent 4px baseline grid.
5. **Universal Accessibility**: All text combinations meet or exceed WCAG AA contrast standards (minimum 4.5:1 for body, 7:1 for headers).

---

## 3. Semantic Color Tokens

All colors are defined as HSL CSS custom properties in `app/globals.css`, mapped to Tailwind CSS utilities in `tailwind.config.ts`, and exported as TypeScript constants in `lib/design-tokens.ts`.

### 3.1. Surface & Background Tokens

| Token | CSS Variable | Hex / Value | Role |
|---|---|---|---|
| `bg-background` | `--background` | `#0B0C10` (`224 25% 6%`) | App viewport and stage background |
| `bg-surface` | `--surface` | `#11131B` (`224 20% 9%`) | Toolbars, timeline base, sidebar docks |
| `bg-surface-elevated` | `--surface-elevated` | `#1A1D27` (`224 18% 13%`) | Dropdowns, popovers, modal dialogs, flyout menus |
| `bg-surface-overlay` | `--surface-overlay` | `rgba(6, 8, 12, 0.8)` | Modal scrim and backdrop blur |

### 3.2. Border & Divider Tokens

| Token | CSS Variable | Hex / Value | Role |
|---|---|---|---|
| `border-border` | `--border` | `#212531` (`224 15% 16%`) | Default container borders & panel splitters |
| `border-border-subtle` | `--border-subtle` | `#171A23` (`224 15% 12%`) | Hairline item dividers and grid lines |
| `border-border-active` | `--border-active` | `#373C4E` (`224 18% 26%`) | Hovered and active control borders |
| `border-selection-border` | `--selection` | `#3B82F6` (`217 91% 60%`) | Canvas bounding boxes and active selection |

### 3.3. Typography Color Tokens

| Token | CSS Variable | Hex / Value | Contrast Ratio | Role |
|---|---|---|---|---|
| `text-text-primary` | `--text-primary` | `#F8FAFC` (`220 40% 98%`) | 16.5:1 (AAA) | Headings, primary numeric values, active labels |
| `text-text-secondary` | `--text-secondary` | `#94A0B8` (`218 15% 65%`) | 7.8:1 (AAA) | Supporting text, inactive tabs, field labels |
| `text-text-muted` | `--text-muted` | `#646E82` (`220 12% 46%`) | 4.8:1 (AA) | Keyboard shortcuts, tooltips, disabled controls |
| `text-text-inverse` | `--text-inverse` | `#0B0C10` (`224 25% 6%`) | 16.5:1 (AAA) | High-contrast text on bright accent badges |

### 3.4. Creative Accent & State Tokens

| Token | CSS Variable | Hex / Value | Role |
|---|---|---|---|
| `bg-accent` | `--accent` / `--primary` | `#6366F1` (`239 84% 67%`) | Primary action, active tool, selected keyframe |
| `bg-selection` | `--selection` | `hsla(217 91% 60% / 0.25)` | Drag selection marquee, layer highlight |
| `text-success` | `--success` | `#10B981` (`158 64% 52%`) | Save confirmations, render complete |
| `text-warning` | `--warning` | `#F59E0B` (`38 92% 50%`) | FPS drop, memory warning, caution alerts |
| `text-error` | `--error` / `--destructive` | `#EF4444` (`0 84% 60%`) | Render errors, destructive actions |

---

## 4. Typography Scale

The font system uses modern system UI sans-serif for interface clarity and monospace for timecodes and coordinate values.

### 4.1. Roles & Dimensions

| Role | Utility Class | Size | Line Height | Weight | Tracking | Usage |
|---|---|---|---|---|---|---|
| **Display** | `.text-display` | `32px` (2.0rem) | `36px` | 700 | `-0.025em` | Splash titles, modal headers |
| **Heading 1** | `.text-h1` | `24px` (1.5rem) | `30px` | 600 | `-0.02em` | Main section titles, dialog titles |
| **Heading 2** | `.text-h2` | `20px` (1.25rem) | `26px` | 600 | `-0.015em` | Inspector group titles |
| **Heading 3** | `.text-h3` | `18px` (1.125rem) | `24px` | 600 | `-0.01em` | Panel titles, flyout titles |
| **Body** | `.text-body` | `14px` (0.875rem) | `20px` | 400 | `0` | Standard paragraphs, modal content |
| **Small** | `.text-small` | `13px` (0.8125rem) | `18px` | 400 | `0` | Field labels, property rows |
| **Caption** | `.text-caption` | `12px` (0.75rem) | `16px` | 400 | `+0.01em` | Metadata, timeline time markers |
| **Label** | `.text-label` | `11px` (0.6875rem) | `14px` | 600 | `+0.04em` | Section headers (UPPERCASE) |
| **Button** | `.text-btn` | `13px` (0.8125rem) | `18px` | 500 | `+0.01em` | Action buttons, toolbar buttons |
| **Code / Data** | `.text-code` | `12px` (0.75rem) | `16px` | 500 | `+0.02em` | Timecodes (`00:01:24:12`), coordinates (Mono) |

---

## 5. Spacing Scale

Based on a strict 4px grid system:

| Scale Key | Pixels | Rem Equivalent | Purpose |
|---|---|---|---|
| `0.5` | `2px` | `0.125rem` | Hairline offsets, micro indicators |
| `1` | `4px` | `0.25rem` | Base unit, tight icon gaps |
| `1.5` | `6px` | `0.375rem` | Compact button padding |
| `2` | `8px` | `0.5rem` | Standard padding inside inputs and list items |
| `3` | `12px` | `0.75rem` | Toolbar item padding |
| `4` | `16px` | `1.0rem` | Standard panel inner margin |
| `5` | `20px` | `1.25rem` | Section grouping gap |
| `6` | `24px` | `1.5rem` | Dialog padding |
| `8` | `32px` | `2.0rem` | Major panel divisions |
| `12` | `48px` | `3.0rem` | Top-level layout headers |

---

## 6. Radius Scale (Restrained)

Avoid large cards. Creative studio software requires crisp, restrained borders:

| Token | Class | Value | Usage |
|---|---|---|---|
| `none` | `rounded-none` | `0px` | Splitter bars, canvas edge, dock dividers |
| `xs` | `rounded-xs` | `2px` | Color swatch tags, status dots, keyframe diamonds |
| `sm` | `rounded-sm` | `4px` | Text inputs, dropdown items, toolbar buttons |
| `md` | `rounded-md` | `6px` | Floating property cards, popovers |
| `lg` | `rounded-lg` | `8px` | Modal dialogs, major overlay surfaces |
| `full` | `rounded-full` | `9999px` | Playhead scrubbers, avatar icons |

---

## 7. Shadows & Effects

Effects must be subtle and functional:

| Token | Class | Value | Usage |
|---|---|---|---|
| `subtle` | `shadow-subtle` | `0 1px 2px 0 rgba(0, 0, 0, 0.40)` | Toolbars, inputs, buttons |
| `elevated` | `shadow-elevated` | `0 4px 12px 0 rgba(0, 0, 0, 0.45), 0 1px 2px 0 rgba(0, 0, 0, 0.35)` | Dropdowns, menus, contextual flyouts |
| `floating` | `shadow-floating` | `0 12px 32px 0 rgba(0, 0, 0, 0.65), 0 2px 6px 0 rgba(0, 0, 0, 0.40)` | Modal dialogs, command palette |
| `focus-ring`| `shadow-focus-ring` | `0 0 0 2px #0B0C10, 0 0 0 4px #3B82F6` | High-contrast keyboard focus indicators |

---

## 8. Responsive Breakpoints

Designed for high-resolution desktop and laptop workstations with responsive degradation:

| Name | Breakpoint | Target Device | Layout Strategy |
|---|---|---|---|
| `sm` | `640px` | Mobile (landscape) | Single panel preview, collapsed dock |
| `md` | `768px` | Tablet | Stacked canvas and properties |
| `lg` | `1024px` | Laptop | 3-pane layout (Toolbox + Canvas + Inspector) |
| `xl` | `1280px` | Desktop Studio | Full studio (Stage, Timeline track, Inspector, Asset dock) |
| `2xl`| `1536px` | Ultrawide / 4K | Expanded stage with multi-layer keyframe graph |

---

## 9. UI Motion Guidelines (UI Transitions)

> *Note: These guidelines govern UI interface feedback, not the standalone motion engine to be built in Phase 6.*

### 9.1. Durations
* `instant` (`75ms`): Immediate tactile feedback (button presses, checkbox flips).
* `fast` (`150ms`): Hover state transitions, tooltips, active tab indicators.
* `normal` (`200ms`): Drawer toggles, accordion expansion, panel collapse.
* `deliberate` (`300ms`): Modal dialog entrance/exit, full overlay transitions.

### 9.2. Easing Curves
* `standard` (`cubic-bezier(0.2, 0, 0, 1)`): Quick acceleration with smooth deceleration (default UI curve).
* `enter` (`cubic-bezier(0, 0, 0.2, 1)`): Decelerating entrance for appearing elements.
* `exit` (`cubic-bezier(0.4, 0, 1, 1)`): Accelerating exit for dismissed elements.

---

## 10. Accessibility Standards

* **Visible Focus Rings**: All interactive controls must render a 2px high-contrast outline with 2px offset on `:focus-visible`.
* **Reduced Motion**: Automatically applied via CSS `@media (prefers-reduced-motion: reduce)` to disable non-essential UI transitions for sensitive users.
* **Readable Contrast**: All interactive text adheres to WCAG AA (>= 4.5:1) and display headers to WCAG AAA (>= 7:1).
* **Keyboard Navigability**: Interactive components must maintain clear tab-order and aria attributes.
