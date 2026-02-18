# Template Schema & Import Reference

Complete reference for the habeas app data model, content format, storage, and import behavior. Written for anyone building importers that target this system.

---

## 1. Template Object

```js
{
  id: string,                      // "tpl_hc_general", "tpl_12345"
  name: string,                    // "HC Petition (General)"
  category: string,                // "petition" | "motion" | "filing" | "brief"
  desc: string,                    // Freeform description
  parentId: string | null,         // ID of template this was forked from (null if original)
  courtFormatRules: string | null, // Reference to a court ID for local formatting rules
  docs: number,                    // Usage count (how many documents created from this)
  lastUsed: number,                // Unix timestamp (milliseconds)
  archived: boolean | undefined,   // Soft-delete flag
  sections: Section[],             // Ordered array of sections
  variables: string[]              // Array of variable names used in this template
}
```

**Source:** `app/src/lib/seedData.js` — `SEED_TEMPLATES` array.

---

## 2. Section Object

```js
{
  id: string,                      // "s1", "s_1708300000000_3"
  name: string,                    // "Introduction", "Count I", "Prayer for Relief"
  required: boolean,               // Whether the section must appear in every generated doc
  paraCount: number,               // Number of paragraphs (informational, derived from content)
  content: string,                 // Plain text body with {{VARIABLE}} placeholders
  condition: string | undefined    // JS expression evaluated at render time (optional)
}
```

### Section fields explained

| Field | Purpose |
|-------|---------|
| `id` | Unique within the template. Seed data uses `s1`, `s2`, etc. Imports generate `s_<timestamp>_<idx>`. |
| `name` | Display label in the UI. Freeform — no fixed vocabulary. Seed templates use titles like "Introduction", "Custody", "Jurisdiction", "Count I — Violation of 8 U.S.C. § 1226(a)", "Prayer for Relief", "Verification", "Certificate of Service". |
| `required` | `true` = always included when generating a document. `false` = conditional or optional. |
| `paraCount` | Integer reflecting how many paragraphs the content contains. Used for display ("5¶"). Computed by counting double-newline-delimited blocks in `content`. |
| `content` | The actual text. Plain text, not HTML/Markdown/rich-text. Paragraphs separated by `\n\n`. Variables as `{{UPPERCASE_NAME}}`. |
| `condition` | Optional. A JavaScript expression string (e.g., `"DETENTION_DAYS > 180"`, `"HAS_DUE_PROCESS_CLAIM"`). When present, the section only renders if the expression evaluates to truthy given the case's variable values. Omit or leave `undefined` for unconditional sections. |

---

## 3. Variable System

### 3a. How variables are represented

Variables are **both stored on the template AND detected from content**.

- Each template has a top-level `variables: string[]` — a flat array of variable name strings (e.g., `["PETITIONER_NAME", "DISTRICT_FULL", ...]`).
- Variables also appear inline in section content as `{{VARIABLE_NAME}}` (double-brace, `UPPER_SNAKE_CASE`).
- On import, variables are **auto-detected** from `{{...}}` patterns in section content, then stored in the template's `variables` array.
- At render/export time, variables are substituted from the case's variable values or document-level overrides.

Detection regex used in the codebase:

```js
const matches = content.match(/\{\{([A-Z_]+)\}\}/g);
```

### 3b. Variable groups

Variables are organized into 6 logical groups (defined in `VARIABLE_GROUPS`):

| Group | Variables |
|-------|-----------|
| **Petitioner** | `PETITIONER_NAME`, `PETITIONER_COUNTRY`, `PETITIONER_COUNTRY_FORMAL`, `PETITIONER_DEMONYM`, `ENTRY_DATE`, `YEARS_RESIDENCE`, `APPREHENSION_LOCATION`, `APPREHENSION_DATE`, `CRIMINAL_HISTORY`, `COMMUNITY_TIES` |
| **Detention** | `DETENTION_FACILITY`, `FACILITY_LOCATION`, `FACILITY_OPERATOR`, `WARDEN_NAME`, `WARDEN_TITLE`, `DETENTION_DAYS`, `DETENTION_STATUTE` |
| **Court** | `DISTRICT_FULL`, `DIVISION`, `COURT_LOCATION`, `COURT_ADDRESS`, `CASE_NUMBER`, `JUDGE_NAME`, `JUDGE_TITLE`, `JUDGE_CODE`, `FILING_DATE` |
| **Officials** | `FOD_NAME`, `FIELD_OFFICE`, `FIELD_OFFICE_ADDRESS`, `ICE_DIRECTOR`, `ICE_DIRECTOR_ACTING`, `DHS_SECRETARY`, `AG_NAME` |
| **Attorneys** | `ATTORNEY_1_NAME`, `ATTORNEY_1_BAR`, `ATTORNEY_1_FIRM`, `ATTORNEY_1_ADDR`, `ATTORNEY_1_PHONE`, `ATTORNEY_1_EMAIL`, `ATTORNEY_2_NAME`, `ATTORNEY_2_BAR`, `ATTORNEY_2_FIRM`, `ATTORNEY_2_ADDR`, `ATTORNEY_2_PHONE`, `ATTORNEY_2_EMAIL` |
| **Opposing Counsel** | `AUSA_NAME`, `AUSA_OFFICE`, `AUSA_PHONE`, `AUSA_EMAIL` |

Many of these auto-populate via "cascade" logic when a facility is selected (detention → field office → warden → court → officials).

### 3c. No separate variable objects

There is no `Variable` model with metadata stored per-template. The template just holds a `string[]` of names. Variable type metadata (text, number, date, select, etc.) is defined at the app level, not per-template.

---

## 4. Content Format

### Plain text only

Section content is stored as **plain text**. Not HTML, not Markdown, not any rich-text JSON format (no ProseMirror, TipTap, Slate, or Draft.js).

### Paragraphs

Multiple paragraphs within a section are separated by **double newlines** (`\n\n`).

Example content string:

```
1. Petitioner {{PETITIONER_NAME}} is a citizen of {{PETITIONER_COUNTRY}}.\n\n2. Petitioner is held at {{DETENTION_FACILITY}} in {{FACILITY_LOCATION}}.
```

### No inline formatting

The editor is a plain `<textarea>`. There is no bold, italic, underline, or other inline formatting in stored content. All formatting (font, margins, line spacing) is applied at export time by the export system, not stored in the content.

### Paragraph breaks

Within a section, `\n\n` creates a paragraph break. Single `\n` creates a line break within the same paragraph. The `paraCount` field equals the number of `\n\n`-delimited blocks.

---

## 5. Sections & Structure

### No fixed set of section types

Sections are **freeform**. There is no schema-level enum of section types. The `name` field is just a display string that the template author chooses. Common names in the seed data include:

- Introduction, Custody, Jurisdiction, Venue
- Parties, Legal Background and Argument, Statement of Facts
- Count I — Violation of 8 U.S.C. § 1226(a), Count II, Count III, Count IV
- Prayer for Relief, Verification, Certificate of Service
- Caption, Order, Signature Block
- Plaintiff Information, Defendant Information, Attorney Information

### What defines a section

A section is a **logical block chosen by the template author**. It typically maps to a major heading or logical unit of the legal document (not individual paragraphs). A single section can contain many paragraphs.

For seed templates, sections correspond to structural divisions of the legal filing — introduction, jurisdictional basis, party descriptions, legal counts, relief requested, etc.

### Section boundaries on import

The current import logic does **not** try to detect headings. It splits by double-newline paragraphs and groups them into chunks of ~2000 characters each:

```js
const paragraphs = text.split(/\n{2,}/).filter(p => p.trim());
// Group paragraphs until current chunk exceeds 2000 chars
```

Each chunk becomes a section named "Section 1", "Section 2", etc. The user can rename them after import.

---

## 6. Storage & State

### In-memory (React Context)

All state is held in a React `useReducer` store within `AppContext`. Templates live at `state.templates[]`.

### Demo mode

When not connected to a backend, the app populates from `SEED_*` exports in `seedData.js`. Data resets on page refresh (in-memory only).

### Backend (Matrix Protocol)

When connected to a Matrix homeserver:

- Templates are stored as **state events** in a shared data room (`#habeas-data:server`) with event type `com.habeas.template`.
- The template object is the event content — same shape as described above.
- Templates are loaded on login via `mx.loadTemplates()` and merged into state.

### No localStorage for templates

Templates are not persisted to `localStorage` or `IndexedDB`. Only the session token is stored in localStorage (`habeas_session` key).

### How a template loads

1. On login/demo-enter, all templates are loaded into `state.templates[]`
2. When a user opens a template, `state.activeTemplateId` is set
3. The `TemplateEditScreen` component reads the matching template from `state.templates`
4. Edits dispatch reducer actions that update the template in-place in the state array

---

## 7. Import Behavior

### Current import pipeline

There are **two import paths**:

#### Path A: Import file as a new template (TemplatesScreen)

`TemplatesScreen.jsx` → `handleImportFile`:

1. User clicks "Import from File" button
2. File is parsed via `parseImportedFile(file)` → returns `{ text, fileType }`
3. Text is split into paragraphs by `/\n{2,}/`
4. Paragraphs are grouped into sections of ~2000 chars each
5. `{{VARIABLE}}` patterns are auto-detected from content
6. A new template is created with:
   - `name`: filename without extension
   - `category`: hardcoded `"petition"`
   - `desc`: `"Imported from <filename>"`
   - `sections`: the grouped chunks
   - `variables`: detected `{{VAR}}` names
7. User is navigated to TemplateEditScreen for the new template

#### Path B: Import file as a case document (WorkspaceScreen)

`WorkspaceScreen.jsx` → `handleFileImport`:

1. User clicks "Upload document" in the Add Doc panel
2. File is parsed via `parseImportedFile(file)` → returns `{ text, fileType }`
3. A new document object is created:
   ```js
   {
     id: "doc_<timestamp>",
     templateId: null,      // not template-based
     name: "<filename>",
     status: "draft",
     variableOverrides: {},
     sections: [],          // empty — content is in importedContent
     imported: true,
     fileType: "pdf" | "docx" | "md" | "txt",
     importedContent: text   // raw extracted text blob
   }
   ```
4. The raw text is stored as-is in `importedContent` (not split into sections)

### File parsing (`fileImport.js`)

| Format | Parser | Behavior |
|--------|--------|----------|
| PDF | `pdfjs-dist` | Extracts text items from each page, joins with spaces within a page, double-newline between pages. **Formatting is lost.** |
| DOCX | `mammoth` (via `extractRawText`) | Extracts raw text only. **All formatting (bold, italic, headings) is discarded.** |
| MD | `FileReader.readAsText` | Read as plain text. Markdown syntax is preserved as literal characters. |
| TXT | `FileReader.readAsText` | Read as-is. |

### Variable detection on import

Variables are auto-detected from `{{UPPERCASE_NAME}}` patterns in the imported text. This happens in the template import path (Path A). The case document import path (Path B) stores raw text without variable extraction.

### Section boundary detection

The current importer does **not** attempt to detect section boundaries by headings. It uses a simple character-count chunking algorithm. An improved importer could detect section boundaries by recognizing patterns like:

- ALL-CAPS headings (e.g., `INTRODUCTION`, `CUSTODY`, `COUNT I`)
- Roman numeral or letter-prefixed sections
- Markdown headings (`## Section Title`)

---

## 8. Template Categories

The `category` field accepts these values:

| Value | Label | Description |
|-------|-------|-------------|
| `petition` | Petitions | Main habeas corpus filings |
| `motion` | Motions | TRO motions, motions to show cause, etc. |
| `filing` | Filings | Court administrative documents (cover sheets, declarations) |
| `brief` | Briefs | Reply briefs, response briefs |

The UI filters templates by these categories in the template library. There is no strict validation — the field is a freeform string, but only these four values are used.

### Beyond habeas petitions

The template system is generic. While the seed data is focused on habeas corpus (§ 2241 petitions, TRO motions, reply briefs), the architecture supports any document type. The `category` values could be extended for other immigration filing types.

---

## 9. Document Object (Case-Level)

Documents live inside a case and may be template-based or imported:

```js
{
  id: string,                        // "doc_1", "doc_1708300000000"
  templateId: string | null,         // Template ID if created from template, null if imported
  name: string,                      // Display name
  status: "draft" | "review" | "ready" | "filed" | "empty",
  variableOverrides: {},             // Document-specific variable values that override case-level
  sections: [],                      // Currently unused for imported docs
  imported: boolean | undefined,     // true if user-imported file
  fileType: string | undefined,      // "pdf", "docx", "txt", "md" (only for imported)
  importedContent: string | undefined // Raw text content (only for imported)
}
```

---

## 10. Minimal Valid Template (for importers)

The minimum fields needed to create a working template:

```js
{
  name: "My Template",
  category: "petition",         // or "motion", "filing", "brief"
  desc: "Description text",
  sections: [
    {
      id: "s_1",
      name: "Section 1",
      required: true,
      paraCount: 2,
      content: "First paragraph.\n\nSecond paragraph with {{PETITIONER_NAME}}."
    }
  ],
  variables: ["PETITIONER_NAME"]  // detected from content
}
```

The `createTemplate` function in AppContext will assign `id`, `parentId: null`, `docs: 0`, `lastUsed`, and `courtFormatRules: null` automatically.

---

## 11. Key File Locations

| What | Path |
|------|------|
| Seed data & template definitions | `app/src/lib/seedData.js` |
| File import parser | `app/src/lib/fileImport.js` |
| State management (reducer) | `app/src/context/AppContext.jsx` |
| Template library UI + import-to-template | `app/src/screens/TemplatesScreen.jsx` |
| Case workspace UI + import-to-case-doc | `app/src/screens/WorkspaceScreen.jsx` |
| Template editor | `app/src/screens/TemplateEditScreen.jsx` |
| Matrix backend integration | `app/src/lib/matrix.js` |
