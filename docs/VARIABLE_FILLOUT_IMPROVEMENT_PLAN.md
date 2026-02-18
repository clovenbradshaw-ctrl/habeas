# Document Fillout from Variable Template Interface: Improvement Plan

## Core Product Problem to Solve
Today, users only see variables that already have values for the client/case. The interface needs to instead be document-driven:
1. Show **all variables required by the selected document template**.
2. Prefill each variable with any **existing client/case value**.
3. Clearly show which required variables are still missing.
4. Save newly entered values back to the **shared client/case variable store** so other documents can reuse them automatically.

This is the primary pain point and the first-priority redesign target.

## Goal
Make document completion predictable and fast by turning the editor into a “requirements + known values + missing fields” workflow.

## Success Metrics
- Reduce median time from opening a document to “all required variables complete” by 40%.
- Reduce required-variable misses at export/review by 70%.
- Increase cross-document variable reuse rate (same value reused without re-entry) by 50%.
- Reduce manual duplicate entry of the same variable across docs by 60%.

## Target UX Model (Must-Have)
For the selected document, render a variable panel with three explicit buckets:
- **Required by this document (missing)**
- **Required by this document (already filled from client/case)**
- **Optional / available shared variables**

Each variable row should show:
- Variable name and friendly label.
- Whether it is required for this document.
- Source of current value: `Auto-filled from intake`, `Saved on client`, `Doc override`, or `Empty`.
- Last-updated indicator.

## Data Model Contract
Introduce a merge model for the editor:
- `documentRequiredVariables`: extracted from template placeholders for the active document.
- `sharedClientVariables`: canonical values saved on the client/case and shared across documents.
- `documentOverrides`: doc-specific values (only when intentionally overridden).

Resolution order for display/render:
1. `documentOverrides[var]` (if present)
2. `sharedClientVariables[var]`
3. empty

Write behavior when user edits a field (default):
- Save to `sharedClientVariables[var]` so future documents auto-populate.
- Optional toggle: “Apply to this document only” writes to `documentOverrides[var]`.

## Phased Plan

### Phase 1 — Fix Visibility and Completion Logic (Highest Priority)
**Objective:** Always show what the selected document needs, whether filled or not.

- Parse active template and compute complete required-variable list.
- Show missing required variables even when no prior value exists.
- Add completion header: `X / Y required complete for this document`.
- Add one-click action: `Jump to next missing required`.
- Add clear empty-state copy per field: `No saved client value yet`.

**Deliverables:**
- Document-variable requirements panel (missing + filled required sections).
- Requirement-aware completion counter.
- Next-missing navigation behavior.

### Phase 2 — Save-and-Reuse Behavior Across Documents
**Objective:** Ensure values entered once are reusable everywhere.

- Default save path for edits is shared client/case variable store.
- Immediately reflect saved value in all open documents that reference same variable.
- Show impact hint: `Used in 4 documents` before save.
- Add explicit “doc-only override” control and label overridden rows.

**Deliverables:**
- Shared variable persistence flow.
- Cross-document propagation/update behavior.
- Override UX + safeguards.

### Phase 3 — Data Entry Quality and Speed
**Objective:** Reduce errors while filling required fields quickly.

- Type-aware controls (date, country, number, long text, email/phone).
- Inline validation and formatting hints.
- Keyboard flow: Enter save + next missing; Shift+Enter save/stay; Esc cancel.
- Autosave states (`Saving`, `Saved`, `Needs attention`).

**Deliverables:**
- Typed input component set.
- Validation/normalization layer.
- Keyboard-first completion flow.

### Phase 4 — Guidance, Review, and Confidence
**Objective:** Make “what to do next” and review readiness obvious.

- Checklist driven by actual state:
  1. Template added
  2. Required variables complete
  3. Comments resolved
  4. Ready to export
- Keep variable panel visible in review mode (no hard context switch).
- Explain hidden conditional sections with `Why hidden?` callouts.

**Deliverables:**
- State-driven checklist.
- Unified review + variable workspace.
- Conditional-visibility explanation chips.

## Implementation Sequence
1. Implement requirement extraction + merge contract (`required vars + shared values + overrides`).
2. Ship Phase 1 UI: show all required vars for selected document (including missing).
3. Implement shared-save default and cross-doc propagation (Phase 2).
4. Add typed inputs + validation + keyboard flow (Phase 3).
5. Add checklist/review integration and conditional explainers (Phase 4).

## Acceptance Criteria (MVP)
- Opening any document shows all variables required by that document, even if currently empty.
- Required variables are clearly split into missing vs already-filled.
- Editing a required variable saves it to shared client/case variables by default.
- After saving, opening another document that uses the same variable shows the saved value prefilled.
- Users can complete required fields using “next missing” without hunting through unrelated variables.

## Risks and Mitigations
- **Risk:** Legacy templates with inconsistent variable naming.
  - **Mitigation:** Add alias mapping layer and report unknown variables in admin diagnostics.
- **Risk:** Users accidentally overwrite shared values when they wanted doc-only changes.
  - **Mitigation:** Default shared-save with undo + prominent “doc-only override” toggle.
- **Risk:** Real-time propagation could feel surprising.
  - **Mitigation:** Show non-blocking toast: `Updated in 3 documents` with view links.

## Rollout Plan
- Dogfood with real drafting workflows and measure required-field completion time.
- Release Phase 1+2 behind a feature flag to 25% of users.
- Compare against baseline: missing-required count, duplicate-entry rate, and completion time.
- Expand to 100% after two weeks without regressions.
