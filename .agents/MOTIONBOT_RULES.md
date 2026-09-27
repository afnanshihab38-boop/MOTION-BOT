# MOTION-BOT — Development Rules & Governance

This document establishes the permanent development rules and engineering principles for the MOTION-BOT repository. Every agent and developer working on this project must strictly comply with these rules.

---

## 1. Phase Isolation

* **Strict Single Phase**: Only the currently active phase may be implemented.
* **No Premature Implementation**: Never implement future-phase functionality early.
* **Protected Locked Phases**: Never modify completed or locked phases unless explicitly authorized.
* **No Rewrite for Taste**: Never rewrite working code from a previous phase simply because you prefer an alternative style or implementation.
* **No Unrelated Refactoring**: Do not refactor unrelated parts of the codebase during feature work.
* **File Stability**: Never rename, move, or reorganize existing files unnecessarily.
* **Architectural Continuity**: Never replace or discard the project's architecture without explicit approval.

---

## 2. Preservation Rule

After a development phase is completed and verified, its implementation becomes **LOCKED**.

A locked phase must remain functionally, structurally, and visually unchanged unless a subsequent phase has a genuine, indispensable technical dependency on it.

If a locked phase must be modified to satisfy an unavoidable technical dependency:

1. **STOP** before making any modifications.
2. **Explain** precisely why the change is strictly necessary.
3. **Identify** all files, components, and interfaces that require modification.
4. **Detail** all potential side effects, regressions, or breaking changes.
5. **Wait** for explicit user approval before touching any locked file.

**Under no circumstances should any locked phase be modified silently.**

---

## 3. Minimal-Change Principle

For every current and future phase:

> **Change only what is strictly necessary to implement the current phase.**

* Do not "clean up" or reformat untouched files.
* Do not upgrade or downgrade package dependencies without a validated, unavoidable technical reason.
* Do not swap out working third-party libraries simply because a newer or different library is available.

---

## 4. No Fake Functionality

* **Zero Mock Deception**: Do not create fake AI responses, simulated backend logic, mock databases, or placeholder behavior that could later be mistaken for real implementation.
* **Transparent Placeholders**: Any intentional placeholder required for compilation or typing must be clearly commented and demarcated as such.

---

## 5. Architecture Preservation

* Future development phases must build directly upon the existing foundational architecture rather than reinventing or replacing it.
* Adhere to the directory structure and boundaries outlined in `docs/ARCHITECTURE.md`.

---

## 6. Testing Rule

* Every phase must undergo thorough verification before being submitted or marked as complete.
* Verification includes:
  - TypeScript strict compilation with zero type errors.
  - ESLint verification with zero blocking errors.
  - Production build verification (`npm run build`).
  - Development server startup verification.
* Any regression in locked phases constitutes an immediate blocker.

---

## 7. Phase Completion Rule

* At the conclusion of each phase, provide a structured completion report following the standard project template.
* **STOP** immediately after completing the phase report.
* **Never automatically begin the next phase.** Wait for explicit user instruction to proceed.
