# Habeas: Complete User Flow & Visual Presentation Audit

> For UX designers without app access. Describes every screen, interaction, and visual
> treatment as implemented. Written February 2025.

---

## Table of Contents

1. [App-Level Chrome](#1-app-level-chrome)
2. [Login Screen](#2-login-screen)
3. [Cases Screen (Home)](#3-cases-screen-home)
4. [Case Creation Flow](#4-case-creation-flow)
5. [Workspace Screen (Document Editor)](#5-workspace-screen-document-editor)
6. [Pipeline Screen (Kanban)](#6-pipeline-screen-kanban)
7. [Templates Screen](#7-templates-screen)
8. [Template Editor Screen](#8-template-editor-screen)
9. [Stage System & Transitions](#9-stage-system--transitions)
10. [Key UX Problems](#10-key-ux-problems-observed-from-code)

---

## 1. App-Level Chrome

**Layout:** Full-height flexbox, two columns.

- **Sidebar** (left, 192px / `w-48`, dark gray `bg-gray-900`):
  - "Habeas" wordmark at top (Source Serif 4, serif, white, bold).
  - Subtitle: "Connected" or "Demo Mode" in gray-500.
  - Three nav items stacked vertically: **My Cases**, **Pipeline**, **Templates**.
    - Active state: `bg-white/10`, white text, semibold.
    - Inactive: gray-500, hover lightens.
    - No icons — text-only labels, `text-xs`.
  - Bottom: username (truncated), "Sign out" link.

- **Main content** (right, flex-1, `bg-gray-50`):
  - Max-width 1280px (`max-w-5xl`), centered, 20px padding.
  - **Breadcrumb** at top: `Habeas > [Screen Name]` — gray-400 text, gray-200 bottom border. Clicking "Habeas" always goes to Cases.
  - Below breadcrumb: current screen component renders.

- **Toast** (fixed, bottom center): Snackbar notification. Dark gray for success, red for error. `text-sm`, rounded-lg, shadow-lg. Auto-dismisses after 3 seconds.

- **Font**: DM Sans (sans-serif) for UI. Source Serif 4 (serif) for document content previews and the wordmark.

**Key observation:** The sidebar has no icons, no collapse behavior, and no visual hierarchy beyond active highlighting. All nav items are tiny (`text-xs`). There is no indication of which screen you're on besides the breadcrumb and the subtle sidebar highlight.

---

## 2. Login Screen

**Layout:** Centered card on gray-50 fullscreen backdrop.

**Visual hierarchy (top to bottom):**
1. "Habeas" — 3xl bold serif (Source Serif 4).
2. "Immigration detention case management" — sm gray-500 subtitle.
3. White card (`w-96`, rounded-xl, border, shadow-lg, p-8):
   - "Sign in" heading (base, bold).
   - "Connect to your Matrix homeserver" — xs gray-500.
   - **Username** field: label is xs uppercase semibold tracking-wide gray-500. Input: `bg-gray-50`, gray border, blue focus ring. Placeholder: `@user:server`.
   - **Password** field: identical styling.
   - Login error message (red-600, xs) appears inline above button.
   - **Sign In** button: full-width, blue-600, white text, sm semibold, rounded-lg.
   - Divider (`border-t border-gray-100`).
   - **Enter Demo Mode** button: full-width, outlined, gray-200 border, gray-600 text, xs.
4. Below card: "Server: app.aminoimmigration.com" in xs gray-400.

**Interaction:** No onboarding, no explanation of what the tool does beyond the subtitle. User must either have Matrix credentials or click Demo Mode. Clicking Demo loads seed data (pre-populated cases, templates, reference data) and logs in immediately.

---

## 3. Cases Screen (Home)

**Layout:** Single-column card list.

**Header row:**
- Left: "My Cases" (lg bold) + active case count (`X active cases`, sm gray-500).
- Right: **+ New Case** button (blue-600, white text, sm semibold).

**Empty state:** Centered gray-400 text: "No cases yet. Create one to get started." No illustration, no guidance.

**Case cards** (one per active case, stacked vertically):
- White card, gray-200 border, rounded-xl, p-4. Hover: shadow-md + blue-300 border. Entire card is clickable.
- **Top row:**
  - Left: Petitioner name (bold, gray-900) + circuit / facility / location (xs gray-500, separated by `·` and `—`).
  - Right: Two chips side-by-side:
    - Days-in-stage chip: green (0-5d), yellow (6-10d), red (11+d). Shows `{N}d`.
    - Stage chip: colored by stage (see Section 9). Shows stage name text.
- **Middle:** Document readiness bar (if docs exist):
  - Label row: "Documents" left, `{ready}/{total} ready` right, both xs.
  - Thin progress bar: gray-100 track, blue-500 fill. Height: 6px.
- **Bottom:** "Next step" callout:
  - Blue-50 background, blue-200 border, rounded-lg.
  - "NEXT STEP" label (xs bold blue-600 uppercase tracking-wide).
  - Action text (xs blue-800), e.g. "Fill remaining variables in petition (3 empty)".

**Interaction:** Click card → opens Workspace for that case. No multi-select, no sorting, no search/filter.

---

## 4. Case Creation Flow

Triggered by **+ New Case** button. A form card appears *inline* above the case list (not a modal, not a separate page).

**Form card:** White, blue-200 border, rounded-xl, p-4.

**"Create New Case" heading** (sm bold).

**Fields (2-column grid):**

| Field | Type | Details |
|-------|------|---------|
| Petitioner Name * | Text input | Placeholder "Last, First". Auto-focused. |
| Country of Origin | Dropdown | Pre-populated from reference data (16 countries in seed). Optional. |
| Detention Facility | Search input (full width, spans 2 cols) | Type-ahead: as you type, a dropdown of matching facilities appears (name + location + operator). Selecting a facility triggers the cascade. |
| Detention Statute | Dropdown | INA sections (e.g., "§ 1226(a) — General Detention"). Optional. |
| Lead Attorney | Dropdown | Attorney names with role. Optional. |

**Cascade preview** (appears when a facility is selected):
- Blue-50 background, blue-200 border, rounded-lg.
- "AUTO-POPULATED FROM FACILITY" label (xs bold blue-700 uppercase).
- 2-column grid showing auto-resolved values: Warden, Field Office, FOD, Court, AG, DHS Secretary, ICE Director.
- These values become case variables automatically.

**Buttons:** Cancel (outlined gray) | Create Case (blue-600), right-aligned.

**After creation:** Form closes, toast "Case created", auto-navigates to Workspace for the new case.

**Key observation:** The cascade is the most sophisticated piece of the creation flow, but it's visually compact and easy to miss. There's no visual indication that selecting a facility will auto-populate 7+ fields until it happens. The form has no stepper, progress indicator, or multi-step wizard UI — everything is on one inline panel.

---

## 5. Workspace Screen (Document Editor)

This is the core screen and the most complex. It has a **three-panel layout**.

### 5.1 Header Bar

Horizontal bar with wrapped flex items:
- **← Cases** back link (sm gray-500).
- **Petitioner name** (lg bold).
- **Stage chip** (colored, e.g., blue "Drafting").
- Circuit label (xs gray-400, e.g., "4th Cir.").
- Spacer.
- **Review Mode** toggle button: outlined, toggles between gray and purple-50/purple-300 active state. Text: "Review Mode" / "Exit Review".
- **Advance Stage →** button: outlined gray.
- **Export** button (blue-600 solid): opens dropdown flyout with:
  - "This document" section: Download as Word (.docx), Download as PDF.
  - "Full packet" section: Download all ready docs (.zip), Print packet.

### 5.2 Stage Suggestion Banner

Conditionally appears below the header when document statuses meet stage advancement criteria.
- Green-50 background, green-200 border, rounded-lg.
- Left: reason text (green-700 sm semibold), e.g., "All documents started — move to Drafting?"
- Right: green "Advance to {stage}" button + gray "Dismiss" link.
- **Note:** The Dismiss button has an empty click handler — it does nothing.

### 5.3 Three-Panel Layout

Minimum height: 520px. Horizontal flex with 12px gaps.

#### Left Panel: Document List (224px / `w-56`)

White card, gray-200 border, rounded-lg.

- **"CASE DOCUMENTS"** section header (xs bold gray-400 uppercase tracking-widest).
- Each document entry:
  - Clickable row. Selected: blue-50 bg + blue-200 border. Unselected: transparent, hover gray-50.
  - **Document name** (xs semibold gray-800).
  - **Status chip** (colored by status) + **status dropdown** (native `<select>`, transparent background, gray-400 text). Options: Not started / Draft / In Review / Ready / Filed.
  - **The chip and dropdown appear side-by-side**, which means the status is shown twice redundantly.

- **"+ Add document from template"** button: dashed blue-300 border, blue-600 text. Clicking reveals a dropdown list of all templates, each showing name + category + fork indicator.

**Status color mapping:**
| Status | Chip Color | Meaning |
|--------|-----------|---------|
| empty | Gray | Not started |
| draft | Yellow | Draft |
| review | Purple | In Review |
| ready | Green | Ready |
| filed | Blue | Filed |

#### Center Panel: Document Preview (flex-1, fills remaining width)

White card, gray-200 border, rounded-lg, full height.

- **Header:** Document name (xs bold gray-400 uppercase) + optional "Based on {parent}" lineage text + "Has overrides" orange chip.

**If no document selected or status is "empty":**
- Empty state: centered text "No template selected", subtitle "Choose a template to start this document", and a "Browse Templates" button.

**If document has content:**
- Faux court header:
  - "UNITED STATES DISTRICT COURT" (xs bold tracking-wide gray-700, centered).
  - "FOR THE {DISTRICT}" (xs gray-500, centered).
- Below, in serif font (Source Serif 4):
  - Each template section renders as a block:
    - **Section name** (xs bold gray-500 uppercase, centered).
    - **Content:** xs gray-600 text with merge fields rendered inline:
      - **Filled variable:** green-100 background, green-400 underline, px-1 rounded. Shows the actual value.
      - **Empty variable:** yellow-100 background, yellow-400 underline. Shows `{{VAR_NAME}}` placeholder text.
    - **Placeholder content** (if no template content): three horizontal gray skeleton bars of decreasing width.
  - Conditional sections are evaluated at render time (e.g., `DETENTION_DAYS > 180`). If the condition is false, the section is hidden entirely with no indication it exists.
  - In review mode: sections with open comments show a purple circle badge with count, absolutely positioned at the top-right of the section block.

**Key observation:** This is a read-only preview, not an editor. Users cannot click into the text to edit it. The only way to change content is to edit variable values in the right panel, or to edit the underlying template in the Template Editor (a completely separate screen). The "document editor" is really a "variable-fill form + live preview."

#### Right Panel: Variables OR Review (240px / `w-60`)

**Toggle between two modes** via the header bar's Review Mode button.

##### Variables Mode (default):

White card, gray-200 border, rounded-lg, scrollable (max-height 520px).

- **"SHARED VARIABLES"** header (xs bold gray-400 uppercase).
- **Fill counter:** `{filled}/{total} filled` (xs gray-500).
- Variables grouped by category:
  - **Petitioner** — name, country, entry date, residence years, apprehension details, criminal history, community ties.
  - **Detention** — facility name, location, days, warden info.
  - **Court** — district, division, case number, judge, filing date.
  - **Officials** — FOD, field office, ICE director, DHS secretary, AG.
  - **Attorneys** — lead attorney details.
  - **Opposing Counsel** — AUSA info.
  - **Other** — any variable not matching the above prefixes.
- Each group: category name (xs bold gray-400 uppercase).
- Each variable row: click to inline-edit.
  - Idle state: variable name + check mark (✓ green text if filled, ⚠ yellow if empty). If the doc has an override for this var: "(doc)" label in orange.
  - Edit state: inline text input with blue-300 border, auto-focused. Save on Enter/blur, cancel on Escape.
- Footer text: "Click any variable to edit. Values are shared across all documents in this case."

**Key observation:** There is no distinction between auto-populated variables (from the facility cascade) and manually-entered ones. There's no type-specific input — dates, names, paragraphs of text, and numbers all use the same plain text input. Country fields don't get a dropdown here despite having one in case creation.

##### Review Mode:

Purple-themed panel replacing the variables panel.

- **"REVIEW COMMENTS"** header.
- Each comment: purple-50 card with:
  - Section name (xs bold purple-700) + status chip (purple).
  - Comment text (xs gray-700).
  - Author name (xs gray-400).
  - "Resolve" link (green-600) for open comments.
- If no comments: "No comments on this document" centered text.
- **Add comment form:**
  - Section dropdown (populated from template section names + "General").
  - Textarea (3 rows, xs text).
  - "+ Add comment" button (purple outlined).
- **Action buttons** at bottom:
  - **Approve** (green-600 solid): marks doc as "ready" + resolves all open comments.
  - **Changes** (orange outlined): marks doc status as "review".

---

## 6. Pipeline Screen (Kanban)

**Layout:** Horizontal scrolling kanban board.

**Header:**
- "Pipeline" (lg bold).
- Attorney filter dropdown (xs, shows all unique case owners).
- Case count (xs gray-400).

**Progress strip** (below header, if cases exist):
- Thin horizontal bar (8px / `h-2`, rounded-full).
- Segmented by stage, proportional to case count. Each segment colored by stage color.
- Segments have `gap-px` (1px gap between them).

**Kanban columns:**
- Each visible stage is a 200px-wide fixed column (`flex-shrink-0`).
- **Column header:** colored bottom border (2px) matching stage color. Dot indicator (8px circle) + stage name (xs bold gray-600) + case count (xs bold gray-400).
- **Case cards** within each column:
  - White card, gray-200 border, rounded-lg, p-2.5. Left border: 3px, colored by stage.
  - Draggable (native HTML drag-and-drop).
  - Click opens case workspace.
  - **Content:**
    - Petitioner name (xs bold gray-800).
    - Mini doc progress bar (if docs exist): thin gray-100 track, blue-400 fill, `{ready}/{total}` count.
    - Chips/indicators row: days-in-stage chip (colored), open comment count (purple text), stale warning `!` (red, if >10 days), circuit label.
  - Hover: blue-300 border, subtle shadow.
- **Empty columns:** dashed gray-200 border, "Drop here" centered text. Only shown for the first 5 stages or stages with cases.

**Drag-and-drop:** Dragging a card to a different column changes the case's stage immediately. Toast notification confirms the move. No confirmation dialog.

**Key observation:** The pipeline gives a bird's-eye view but the cards are very small (200px wide) and dense. There's no detail panel — clicking a card navigates away to the workspace entirely. The progress strip is decorative since stages without cases don't show.

---

## 7. Templates Screen

**Layout:** Single-column card list with category filter tabs.

**Header:**
- "Template Library" (lg bold) + "Shared document templates for the team" (sm gray-500).
- **+ New Template** button (blue-600).

**Category filter:** Horizontal row of pill buttons (rounded-full):
- All, Petitions, Motions, Filing Docs, Briefs — each with count in parentheses.
- Active: blue-100 bg, blue-700 text. Inactive: gray-500, hover gray-100.

**Template cards** (single-column grid):
- White card, gray-200 border, rounded-xl, p-4. Hover: shadow-md + blue-300 border.
- **Left side:**
  - Template name (sm bold gray-900).
  - Description (xs gray-500).
  - Fork lineage (xs purple-500, if applicable): "Forked from: {parent name}".
  - Metadata row (xs gray-400): `{N} sections · {N} variables · Used in {N} docs · Last: {timeago}`.
- **Right side (button group):**
  - Edit (outlined gray) — opens Template Editor.
  - Fork (outlined gray) — creates copy, stays on list.
  - Delete (outlined gray) — browser `confirm()` dialog, then deletes.
  - **Use in case** (blue-600 solid) — opens case selector modal.

**Case selector modal** (for "Use in case"):
- Fixed overlay (`bg-black/40`), centered white card (w-96, rounded-xl, shadow-2xl).
- Heading: `Add "{template name}" to case`.
- Scrollable list of active cases, each a clickable row showing petitioner name + stage + circuit.
- Cancel button at bottom.
- Selecting a case adds the doc and navigates to that case's workspace.

**New template form** (inline, same pattern as case creation):
- Template Name (required), Category dropdown, Description text input.
- Creates template with one empty "Introduction" section and navigates to Template Editor.

---

## 8. Template Editor Screen

**Layout:** Three-panel horizontal layout (min-height 480px).

**Header:**
- "← Templates" back link.
- "Edit: {template name}" heading.
- Category dropdown (xs).
- **Save Template** button (blue-600).

**Template metadata row:** Two side-by-side inputs: Template Name + Description.

### Left Panel: Section List (208px / `w-52`)

White card, gray-200 border, rounded-lg.

- "SECTIONS" header (xs bold gray-400 uppercase).
- Each section: clickable row with:
  - Required indicator: ■ (filled square) if required, ☐ (empty square) if conditional.
  - Section name (truncated).
  - Paragraph count with ¶ symbol.
  - Selected: blue-50 bg, blue-200 border, bold blue-800 text.
- **"+ Add section"** button: dashed blue-300 border.

### Center Panel: Section Editor (flex-1)

White card with section editing controls:

- **Section header:** `SECTION: {name}` (xs bold gray-400 uppercase).
- **Controls row:**
  - Section Title text input.
  - Required toggle: custom toggle switch (8x16px pill). Blue-500 when on, gray-300 when off. Label: "Always included" or "Conditional".
  - Reorder buttons: ↑ ↓ (outlined gray, disabled at boundaries).
  - Delete button: × (outlined red).

- **Conditional section config** (only shown when Required is off):
  - Yellow-50 card with yellow-200 border.
  - "Include when:" label (xs bold yellow-700).
  - Condition expression input (e.g., `DETENTION_DAYS > 180`).
  - Help text: "Section appears only when condition is true."

- **Content editor:**
  - Label: `Content — use {{VARIABLE_NAME}} for merge fields`.
  - **Toolbar** (gray-50 bg, border-b): **B** (bold), **I** (italic), **¶ New para**, **{{ }} Insert variable** (blue-600 text).
  - **Textarea:** min-height 192px, Source Serif 4 font, sm text, gray-700. Placeholder: "Enter the legal prose for this section. Use {{VARIABLE_NAME}} for merge fields."
  - Bold/italic wrap selected text in `**` or `*` markers (markdown-style).
  - Insert variable prompts with browser `prompt()` dialog, appends `{{VAR_NAME}}` at the end of content.

### Right Panel: Variables Used (192px / `w-48`)

White card, gray-200 border, rounded-lg.

- "VARIABLES USED" header.
- Auto-extracted from all section content by regex (`{{[A-Z_]+}}`).
- Each variable: yellow-50 card, yellow-200 border, mono font, xs. Click inserts it at the end of current section content.
- If none: "No variables detected. Use {{VAR_NAME}} syntax in content."
- Footer: total count + "Click to insert at cursor" (though it actually appends at end, not at cursor).

---

## 9. Stage System & Transitions

### The 10 Stages

| # | Stage | Chip Color | Hex Color (Pipeline) | "Next Step" Text |
|---|-------|-----------|---------------------|-----------------|
| 1 | Intake | Blue | `#6366f1` (Indigo) | Complete client information and assign documents |
| 2 | Drafting | Blue | `#8b5cf6` (Violet) | Fill remaining variables in petition |
| 3 | Attorney Review | Purple | `#a855f7` (Purple) | Review proposed documents — reviewer comments pending |
| 4 | Ready to File | Green | *(from STAGE_COLORS)* | All documents ready — proceed to filing |
| 5 | Filed | Blue | *(from STAGE_COLORS)* | Awaiting court response — monitor ECF |
| 6 | Awaiting Response | — | *(from STAGE_COLORS)* | Government response pending |
| 7 | Reply Filed | — | *(from STAGE_COLORS)* | Awaiting court ruling |
| 8 | Order Received | — | *(from STAGE_COLORS)* | Review court order and determine next steps |
| 9 | Bond Hearing | — | *(from STAGE_COLORS)* | Prepare for bond hearing |
| 10 | Resolved | Gray | *(from STAGE_COLORS)* | Case resolved |

### Stage Advancement Rules

**Automatic suggestions** (green banner in Workspace):
- **Intake → Drafting:** All documents have status != 'empty' (all started).
- **Drafting → Attorney Review:** All documents are 'review' or better.
- **Attorney Review → Ready to File:** All documents are 'ready' or 'filed'.
- **Ready to File → Filed:** At least one document is 'filed'.

**Manual advancement:** "Advance Stage →" button moves to the next sequential stage regardless of document status. No confirmation dialog.

**Pipeline drag-and-drop:** Can move a case to *any* stage, forward or backward. No validation, no confirmation.

### What Changes Between Stages

**Nothing in the Workspace UI changes between stages.** The three-panel layout, available actions, document list, variable editor, and review panel are all identical regardless of whether the case is in "Intake" or "Bond Hearing." The only differences:

1. The stage chip label/color in the header.
2. The "Next step" text on the Cases screen.
3. The stage suggestion banner logic (only fires for stages 1-4).

There are no stage-specific:
- Checklists or task lists
- Required fields or validation
- Locked/unlocked sections
- Different available actions
- Contextual guidance or instructions
- Visual indicators of what the user should be doing

---

## 10. Key UX Problems Observed from Code

### 10.1 Stage System Is Purely Cosmetic

The 10 stages exist as labels but change nothing about the interface. Moving from "Intake" to "Drafting" to "Attorney Review" presents the exact same Workspace with the same capabilities. There's no guided workflow, no stage-specific tasks, and no validation that appropriate work has been completed before advancing. A user in "Intake" sees the same UI as one in "Bond Hearing."

### 10.2 "Dumped into the Editor" Problem

After case creation, the user lands in the Workspace with:
- An empty document list (no documents are auto-added).
- A variables panel (pre-populated from the cascade, but no guidance on what to do next).
- No onboarding, no checklist, no "here's what to do first" guidance.

The user must independently discover that they need to click "+ Add document from template", select templates, then fill variables. There's no staged reveal or wizard.

### 10.3 The Editor Isn't Really an Editor

The center panel is a read-only rendered preview. Users can't click text to edit it. The only way to change document content is:
- Edit variables one-at-a-time via the right panel (click variable name → inline text input → Enter to save).
- Edit the underlying template in a completely different screen (Template Editor), which affects all documents using that template.

There's no rich text editing, no direct text manipulation, no track-changes, no cursor placement.

### 10.4 Information Density vs. Discoverability

- Variable rows are tiny text lines with ✓/⚠ indicators. The entire variable editing UX is: click a tiny text row, type in a tiny inline input, press Enter.
- Document status is shown redundantly (chip + dropdown on the same row).
- The Review Mode toggle completely replaces the variables panel, so you can't see variables while reviewing.
- Export options include Word/PDF labels but actually export plain `.txt` files.

### 10.5 No Contextual Help or Orientation

- No tooltips anywhere.
- No empty-state illustrations.
- No onboarding flow.
- No "what should I do next" guidance beyond the "Next step" text on case cards (which is generic per-stage text, not computed from actual case state — except for a special case in Drafting that counts empty variables).
- Conditional sections silently disappear if their condition is false, with no indication they exist.

### 10.6 Navigation Awkwardness

- The sidebar is text-only with no icons, making it harder to scan.
- Workspace and Template Editor are not in the sidebar — they're reached by drilling into a case or template.
- The breadcrumb is one level deep (`Habeas > Case Workspace`) and doesn't show which case you're viewing.
- Going back from Workspace to Cases re-renders the full case list (no scroll position preservation).

### 10.7 Missing Features / Dead Ends

- The "Dismiss" button on stage suggestion banners has an empty click handler.
- Export "as Word" and "as PDF" both download a `.txt` file.
- The "full packet" export just shows a browser `alert()`.
- Variable insert says "Click to insert at cursor" but always appends at the end.
- Bold/italic toolbar buttons use markdown syntax (`**text**`) in a plain textarea — not rendered visually.
- No undo/redo in any editor.
- No search across cases or variables.
- No way to delete a case.
- No way to archive/restore a resolved case.

### 10.8 Scale Concerns

- Pipeline columns are 200px fixed-width regardless of screen size.
- The Workspace right panel is 240px, which is cramped for variable names like `PETITIONER_COUNTRY_FORMAL`.
- Case cards on the Cases screen have no max-width, stretching to 1280px on wide screens.
- No responsive/mobile considerations visible in the code.
