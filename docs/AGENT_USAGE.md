# Agent Usage

DeckWeave is intended to be used by agents through three layers:

1. CLI for humans and scripts.
2. MCP tools for Codex/Claude/Hermes-compatible clients.
3. Skills that teach agents when and how to use the tool.

## MCP Tools

The stdio MCP server exposes:

- `deckweave_import_pptx`
- `deckweave_export_pptx`
- `deckweave_critique`
- `deckweave_inspect`

Run locally:

```bash
npm run build
node /path/to/deckweave/dist/src/mcp-server.js
```

Codex registration:

```bash
codex mcp add deckweave -- node /path/to/deckweave/dist/src/mcp-server.js
```

Claude registration should be done by the user in the Claude runtime, using the
same local stdio command. DeckWeave does not require OAuth, external API keys,
or uploads.

## Natural Language Triggers

Use DeckWeave when the user asks to:

- edit an existing PowerPoint deck with AI
- convert PPTX to HTML
- convert HTML slides back to PPTX
- inspect a PPTX as structured slide data
- critique a generated slide against a brief/design guide

Do not use DeckWeave for:

- private/customer decks that the user intends to publish as examples
- perfect PowerPoint compatibility claims
- charts, SmartArt, animations, or PDF/image OCR until those phases are
  implemented
