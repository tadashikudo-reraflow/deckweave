# DeckWeave Implementation Plan

## Goal

Build a local-first, open-source slide conversion toolkit that can move decks
between PPTX, editable HTML, and eventually image/PDF inputs without depending
on external SaaS.

## Constraints

- Default to local execution.
- Keep the core free and GitHub-publishable.
- Do not include private sample decks, customer files, proprietary fonts, or
  extracted media in the repository.
- Prefer editable PowerPoint objects over pixel-perfect screenshots where the
  object has clear editing value.
- Rasterize only when fidelity matters more than editability.

## Architecture

```text
PPTX / HTML / PDF / Image
  -> Importer
  -> Slide IR
  -> HTML Renderer
  -> AI / human editing
  -> Design critique
  -> PPTX Exporter
```

## Phase 1: PPTX to HTML

Status: MVP implemented.

- Unzip `.pptx`.
- Resolve `ppt/presentation.xml` slide order and size.
- Parse slide relationships.
- Import text boxes, images, rectangles, and lines into Slide IR.
- Render each slide as fixed-size editable HTML.

Next improvements:

- Resolve slide layouts, masters, `txStyles`, theme fonts, and color maps.
- Add background fills and inherited placeholder styles.
- Add visual regression fixtures.

## Phase 2: HTML to PPTX

Status: MVP implemented.

- Parse DeckWeave HTML with structured DOM parsing.
- Convert editable text, images, and simple shapes back to PPTX.
- Preserve basic position, size, color, bold text, and line color.

Next improvements:

- Add tables.
- Add grouped elements.
- Improve text autosizing and paragraph runs.
- Preserve object IDs for richer roundtrip mapping.

## Phase 3: Design Quality Layer

Status: template and deterministic critique MVP implemented.

- `CREATIVE_BRIEF.md` captures purpose, audience, desired action, core message,
  appeal, context, and avoid rules.
- `DESIGN.md` captures colors, typography, layout, components, and visual rules.
- `deckweave critique` checks structural issues and emits human review prompts.

Next improvements:

- Add optional AI review hooks without making external API calls part of the
  default path.
- Add brand-specific `DESIGN.md` examples that are safe to publish.

## Phase 4: Image/PDF to PPTX

Status: MVP implemented (vision-driven reconstruction). See
`docs/spec-2026-06-06-import-image.md`.

Approach taken (reconstruction-first, not OCR-overlay):

- deckweave stays deterministic; the calling vision model is the importer.
- The model reads the image/PDF page and authors a DeckIR JSON (text as real text
  elements, dashed frames as `prstDash` outlines, complex graphics as image elements).
- `deckweave build` validates the IR (zod) and emits an editable `.pptx`.
- `deckweave render` rasterizes the `.pptx` to PNGs (LibreOffice headless) so the
  model can compare against the original and patch the IR — a 1–2 round self-check.

Rejected alternative: place the original page image as a background and overlay OCR
text. Higher pixel fidelity but leaves shapes/colors uneditable, so it loses the point.

Next improvements:

- Multi-page PDF batching (MVP does one slide/page at a time).
- Dual east-Asian/latin font specification per run.
- Promote detected tables and rules into native PPTX objects; keep complex graphics rasterized.

## Phase 5: Public GitHub Release

Status: repository created at https://github.com/tadashikudo-reraflow/deckweave (MIT).

Done:
- Repository created and initial commit pushed.
- Private decks and generated media excluded via `.gitignore`.
- `ir-sample.json` fixture (synthetic) committed as a working example.

Remaining before `v0.1.0` tag:
- Add tests for import/export/critique.
- Add fixture generation script that uses synthetic decks only.
- Add contribution guide (`CONTRIBUTING.md`).
- Add security and privacy notes to README.
