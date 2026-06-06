# Contributing to DeckWeave

Thanks for your interest in contributing.

## Setup

```bash
git clone https://github.com/tadashikudo-reraflow/deckweave.git
cd deckweave
npm install
npm run build
```

## Running tests

```bash
npm test
```

Tests use Node's built-in test runner via `tsx`. No extra dependencies needed.

## Running a sample

```bash
npm run sample          # creates examples/out/sample.pptx
npm run dev -- import examples/out/sample.pptx --out examples/out/sample.html
npm run dev -- export examples/out/sample.html --out examples/out/roundtrip.pptx
```

## Project structure

```
src/
  ir.ts           DeckIR type definitions
  build.ts        DeckIR JSON → PPTX
  pptx-export.ts  low-level pptxgenjs wrapper
  pptx-import.ts  PPTX → DeckIR
  html.ts         DeckIR → HTML
  html-import.ts  HTML → DeckIR
  render.ts       PPTX → PNG via LibreOffice
  critique.ts     slide critique against CREATIVE_BRIEF / DESIGN
  cli.ts          command-line interface
  mcp-server.ts   stdio MCP server
  units.ts        px ↔ inch / EMU helpers
tests/
  html.test.ts      HTML rendering unit tests
  build.test.ts     PPTX build tests
  roundtrip.test.ts build → import → render roundtrip
```

## What to contribute

Pull requests are welcome for:

- Bug fixes in PPTX import/export fidelity
- Additional chart types or shape support
- Better theme inheritance (slide masters, layouts, `txStyles`)
- Visual regression test fixtures
- SmartArt detection / passthrough
- Documentation improvements

If you are unsure, open an issue first.

## Guidelines

- Keep changes small and focused. One concern per PR.
- Add a test for any new behavior in `tests/`.
- Do not commit private decks, customer slides, fonts, or extracted media into this repository.
- Do not add external LLM API calls inside DeckWeave itself — the toolkit is intentionally LLM-free and deterministic. Vision/authoring stays outside (in the calling AI).

## License

MIT. By contributing you agree your changes will be released under the same license.
