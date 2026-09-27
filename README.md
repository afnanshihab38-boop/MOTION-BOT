# MOTION-BOT

MOTION-BOT is an upcoming AI-powered motion design studio platform enabling users to generate, edit, and export motion graphics and video advertisements through natural language descriptions and visual editing tools.

---

## Current Development Phase

```text
CURRENT PHASE: PHASE 1 — FOUNDATION
STATUS: IN PROGRESS
```

Only Phase 1 (Technical Foundation) is currently active. Subsequent functional phases (Editor, Motion Engine, AI Creative System, Rendering) will be unlocked sequentially as specified in `docs/DEVELOPMENT_PHASES.md`.

---

## Technology Foundation

* **Framework**: [Next.js](https://nextjs.org/) (App Router)
* **View Library**: [React](https://react.dev/)
* **Type System**: [TypeScript](https://www.typescriptlang.org/) (strict mode)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/)
* **UI Primitives**: [shadcn/ui](https://ui.shadcn.com/) patterns
* **Code Quality**: ESLint + TypeScript strict checking

---

## Development Philosophy & Phase-Lock Rule

MOTION-BOT follows strict phase-based development governed by `.agents/MOTIONBOT_RULES.md`:

1. **Phase Isolation**: Only the currently active phase may be implemented.
2. **Phase Locking**: Completed phases are permanently locked against unauthorized modifications or unnecessary rewrites.
3. **Minimal-Change Principle**: Change only what is strictly required for the active phase.
4. **No Mock Deception**: No fake backend responses, mock AI completions, or deceptive placeholders.
5. **Architectural Preservation**: Every subsequent phase builds directly on the established architecture without rewriting prior foundations.

For status tracking of all phases, see `.agents/PHASE_LOCKS.md`.

---

## Local Development Instructions

### Prerequisites

* [Node.js](https://nodejs.org/) (v18.18.0 or higher; LTS v24+ recommended)
* `npm` (v10+ or equivalent package manager)

### Installation

```bash
npm install
```

### Development Server

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to view the application.

### Type Checking & Linting

```bash
npm run typecheck
npm run lint
```

### Production Build

```bash
npm run build
npm run start
```

---

## Documentation

* [System Architecture](docs/ARCHITECTURE.md)
* [Development Phases Roadmap](docs/DEVELOPMENT_PHASES.md)
* [Phase Rules & Guidelines](.agents/MOTIONBOT_RULES.md)
* [Phase Lock Tracking](.agents/PHASE_LOCKS.md)
