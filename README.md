# DeckWeave

Local-first PPTX/HTML slide conversion toolkit for AI-editable decks.

DeckWeave is an experimental open-source engine for turning existing PowerPoint
files into editable HTML slides, letting AI or humans edit that HTML, and
exporting it back to editable `.pptx`.

## Why

AI-generated slides often fail because they jump straight to visuals. DeckWeave
keeps three layers separate:

- `CREATIVE_BRIEF.md`: purpose, audience, message, and constraints
- `DESIGN.md`: visual language and brand rules
- `Slide IR`: structured slide elements that can render to HTML or PPTX

## MVP Scope

Current implementation:

- `.pptx` import
- text boxes
- images
- simple shapes (incl. dashed outlines)
- fixed-size HTML slides
- DeckWeave HTML export back to `.pptx`
- DeckIR JSON build (`build`) and PPTX → PNG render (`render`)
- image/PDF → editable `.pptx` via vision-driven reconstruction (the importer is the calling AI; see `docs/spec-2026-06-06-import-image.md`)

Not yet implemented:

- charts
- SmartArt
- animations
- full theme inheritance
- visual editor

## Usage

```bash
npm install
npm run build
npm run sample
npm run dev -- import examples/out/sample.pptx --out examples/out/sample.html
npm run dev -- export examples/out/sample.html --out examples/out/roundtrip.pptx
npm run dev -- critique examples/out/sample.html --brief templates/CREATIVE_BRIEF.md --design templates/DESIGN.md
```

## MCP

DeckWeave also ships a local stdio MCP server:

```bash
npm run build
node dist/src/mcp-server.js
```

Tools:

- `deckweave_import_pptx`
- `deckweave_export_pptx`
- `deckweave_critique`
- `deckweave_inspect`

See [Agent Usage](docs/AGENT_USAGE.md).

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

## OSS Notes

DeckWeave is intended to be published freely on GitHub under the MIT license.
Do not commit private decks, customer materials, fonts, or extracted media
unless you have explicit rights to publish them.

## Public Roadmap

1. Improve PPTX theme inheritance: slide layouts, masters, `txStyles`, and color maps.
2. ~~Add image/PDF import~~ — done via vision-driven reconstruction (`build` + `render` + self-check loop). Next: rounded rects, multi-page PDF batching, dual east-Asian/latin fonts.
3. Add layer decomposition: promote simple cards, tables, and lines into native PPTX objects.
4. Add visual regression checks for HTML/PPTX roundtrips.
5. Add a local browser editor for fixed-size DeckWeave HTML.
