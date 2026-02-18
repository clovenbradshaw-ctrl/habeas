# PDF Fidelity & Visual Customization Plan

## Goal
Make imported documents in the app look as close as possible to the original PDF (including fixed printable width, spacing, alignment, and typography), while adding safe controls for users to customize appearance without breaking print output.

## Success Criteria
- Imported document preview matches original PDF layout with high visual fidelity (target: >= 95% similarity by screenshot diff for first page).
- Preview uses a fixed page frame sized to real paper dimensions (Letter first, A4 optional).
- Print/export output matches on-screen preview (WYSIWYG).
- Users can customize typography/spacing/theme settings and save presets per template.
- Court caption and legal line-wrapping remain stable across variable substitution.

## Phase 1 — Baseline, Measurement, and Constraints
1. **Create fidelity benchmark set**
   - Collect 10 representative PDFs (single-column, two-column/caption-heavy, numbered paragraphs, long variables).
   - Store source snapshots and expected page dimensions.
2. **Add visual diff harness**
   - Render original PDF first page and app preview to image.
   - Compute pixel/SSIM diff and log score per template.
3. **Document normalization rules**
   - Define canonical page box, margins, default font stack, line-height policy, and tab-stop behavior.

## Phase 2 — Fixed Printable Page System (Highest Priority)
1. **Introduce page canvas component**
   - Add a `PageCanvas` wrapper with fixed logical size (e.g., 8.5in x 11in for Letter).
   - Center the page in the workspace with neutral background around it.
2. **Enforce fixed content width**
   - Move document body into a bounded content frame with explicit printable width and margins.
   - Prevent fluid-width expansion from viewport size.
3. **WYSIWYG print parity**
   - Ensure `@media print` uses the same dimensions/margins as the editor page canvas.
   - Remove responsive styles that alter line breaks in print mode.

## Phase 3 — Layout Fidelity Engine
1. **Block model upgrade**
   - Represent imported text with richer block metadata: paragraph indent, alignment, spacing before/after, tab stops, and run-level styles.
2. **Caption/court header templates**
   - Add dedicated layout primitives for legal caption structures (left party column, right case-number block, vertical bracket/parenthesis region).
3. **Whitespace preservation**
   - Support controlled preservation of spaces/tabs/line breaks where legal formatting depends on exact placement.
4. **Pagination awareness**
   - Add soft page-break calculations and optional explicit break markers for stable multi-page previews.

## Phase 4 — Typography and Styling Customization
1. **Template-level style profiles**
   - New style profile object: font family, font size scale, line height, paragraph spacing, margin set, and placeholder appearance.
2. **Advanced controls UI**
   - Add "Document Appearance" panel with live preview controls and reset-to-source.
3. **Variable token styling modes**
   - Toggle modes: "Source-like" (minimal highlight), "Editor" (current highlighted chips), and "Print-safe" (no highlight in output).
4. **Preset system**
   - Save/load named style presets per organization or template.

## Phase 5 — Import Accuracy Improvements
1. **PDF parser enhancement strategy**
   - Capture text runs with coordinates and font metrics.
   - Group runs into lines/paragraphs using geometric clustering tuned for legal docs.
2. **Reading-order fixes**
   - Improve ordering for multi-column/caption regions and avoid sentence scrambling.
3. **Fallback + repair tools**
   - Flag low-confidence imports and offer manual layout repair mode for problematic sections.

## Phase 6 — QA, Regression, and Rollout
1. **Automated regression suite**
   - Add screenshot tests for benchmark templates at fixed viewport + fixed zoom.
2. **Golden test cases for legal formatting**
   - Add tests for numbered paragraphs, hanging indents, caption block alignment, and long variable replacement.
3. **Progressive rollout**
   - Feature flag the new renderer, migrate templates in batches, and compare error/feedback metrics.

## Proposed Implementation Order (2-Week Sprint Sequence)
### Sprint 1
- Build `PageCanvas` fixed-width page shell.
- Align preview and print dimensions.
- Add first screenshot diff benchmark for 3 priority templates.

### Sprint 2
- Implement paragraph spacing/indent model.
- Ship caption layout primitive.
- Add "Source-like" placeholder styling toggle.

### Sprint 3
- Launch style profile + appearance controls.
- Add saved presets and per-template persistence.
- Expand regression set to all benchmark templates.

## Risks and Mitigations
- **Risk:** Browser font substitution changes wrapping.
  - **Mitigation:** Embed or standardize legal font set and lock fallback order.
- **Risk:** Variable values with unexpected length break alignment.
  - **Mitigation:** Add overflow policies (wrap/compress rules) and variable length warnings.
- **Risk:** Parsing quality varies across scanned/complex PDFs.
  - **Mitigation:** Confidence scoring + manual repair mode + fallback to image-backed preview.

## Immediate Next Steps
1. Implement fixed printable page width in the workspace preview first (highest impact).
2. Add side-by-side comparison mode: original PDF vs rendered preview.
3. Instrument fidelity score tracking so each import reports measurable accuracy.
