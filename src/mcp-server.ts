#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { buildDeck, loadDeckIR } from "./build.js";
import { critiqueHtml } from "./critique.js";
import { renderDeckToHtml } from "./html.js";
import { importHtml } from "./html-import.js";
import { exportDeckToPptx } from "./pptx-export.js";
import { importPptx } from "./pptx-import.js";
import { renderPptxToPngs } from "./render.js";

const server = new McpServer({
  name: "deckweave",
  version: "0.1.0"
});

function ensureParent(filePath: string): void {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
}

function textResponse(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

server.registerTool(
  "deckweave_import_pptx",
  {
    title: "Import PPTX to editable HTML",
    description: "Convert a local .pptx file into DeckWeave editable HTML. Runs locally and does not upload files.",
    inputSchema: {
      pptxPath: z.string().describe("Absolute or working-directory-relative path to the input .pptx file."),
      outPath: z.string().optional().describe("Output .html path. Defaults to input path with .html extension.")
    }
  },
  async ({ pptxPath, outPath }) => {
    const input = path.resolve(pptxPath);
    const output = path.resolve(outPath ?? input.replace(/\.pptx$/i, ".html"));
    const deck = importPptx(input);
    ensureParent(output);
    fs.writeFileSync(output, renderDeckToHtml(deck), "utf8");
    return textResponse(JSON.stringify({ ok: true, slides: deck.slides.length, htmlPath: output }, null, 2));
  }
);

server.registerTool(
  "deckweave_export_pptx",
  {
    title: "Export editable HTML to PPTX",
    description: "Convert DeckWeave HTML into an editable .pptx file. Runs locally and does not upload files.",
    inputSchema: {
      htmlPath: z.string().describe("Absolute or working-directory-relative path to DeckWeave HTML."),
      outPath: z.string().optional().describe("Output .pptx path. Defaults to input path with .pptx extension.")
    }
  },
  async ({ htmlPath, outPath }) => {
    const input = path.resolve(htmlPath);
    const output = path.resolve(outPath ?? input.replace(/\.html?$/i, ".pptx"));
    const deck = importHtml(input);
    ensureParent(output);
    await exportDeckToPptx(deck, output);
    return textResponse(JSON.stringify({ ok: true, slides: deck.slides.length, pptxPath: output }, null, 2));
  }
);

server.registerTool(
  "deckweave_critique",
  {
    title: "Critique DeckWeave HTML",
    description: "Run deterministic slide-quality checks against DeckWeave HTML and optional brief/design files.",
    inputSchema: {
      htmlPath: z.string().describe("Path to DeckWeave HTML."),
      briefPath: z.string().optional().describe("Optional CREATIVE_BRIEF.md path."),
      designPath: z.string().optional().describe("Optional DESIGN.md path."),
      outPath: z.string().optional().describe("Optional markdown report output path.")
    }
  },
  async ({ htmlPath, briefPath, designPath, outPath }) => {
    const report = critiqueHtml(path.resolve(htmlPath), briefPath ? path.resolve(briefPath) : undefined, designPath ? path.resolve(designPath) : undefined);
    if (outPath) {
      const output = path.resolve(outPath);
      ensureParent(output);
      fs.writeFileSync(output, report, "utf8");
      return textResponse(JSON.stringify({ ok: true, reportPath: output }, null, 2));
    }
    return textResponse(report);
  }
);

server.registerTool(
  "deckweave_build",
  {
    title: "Build DeckIR JSON to PPTX",
    description:
      "Validate a DeckIR JSON file (Slide IR) and build it into an editable .pptx, optionally with a preview .html. Use this to turn AI-authored slide IR (e.g. from an image/PDF) into an editable PowerPoint. Runs locally and does not upload files.",
    inputSchema: {
      irPath: z.string().describe("Path to a DeckIR JSON file."),
      outPath: z.string().optional().describe("Output .pptx path. Defaults to input path with .pptx extension."),
      htmlPath: z.string().optional().describe("Optional preview .html output path.")
    }
  },
  async ({ irPath, outPath, htmlPath }) => {
    const input = path.resolve(irPath);
    const output = path.resolve(outPath ?? input.replace(/\.json$/i, ".pptx"));
    const deck = loadDeckIR(input);
    await buildDeck(deck, output, htmlPath ? path.resolve(htmlPath) : undefined);
    return textResponse(
      JSON.stringify({ ok: true, slides: deck.slides.length, pptxPath: output, htmlPath: htmlPath ? path.resolve(htmlPath) : undefined }, null, 2)
    );
  }
);

server.registerTool(
  "deckweave_inspect",
  {
    title: "Inspect PPTX or HTML as Slide IR",
    description: "Return DeckWeave Slide IR JSON for a local .pptx or DeckWeave HTML file.",
    inputSchema: {
      filePath: z.string().describe("Path to a .pptx, .html, or .htm file.")
    }
  },
  async ({ filePath }) => {
    const input = path.resolve(filePath);
    const deck = /\.pptx$/i.test(input) ? importPptx(input) : importHtml(input);
    return textResponse(JSON.stringify(deck, null, 2));
  }
);

server.registerTool(
  "deckweave_render",
  {
    title: "Render PPTX to per-slide PNGs",
    description:
      "Rasterize a local .pptx into per-slide PNG images using LibreOffice (headless). Use this to visually self-check a built deck against the original image and find layout drift. Requires LibreOffice; returns an actionable error if it is missing.",
    inputSchema: {
      pptxPath: z.string().describe("Path to the input .pptx file."),
      outDir: z.string().optional().describe("Output directory for PNGs. Defaults to a 'render' folder beside the .pptx."),
      dpi: z.number().optional().describe("Render DPI (default 150).")
    }
  },
  async ({ pptxPath, outDir, dpi }) => {
    const input = path.resolve(pptxPath);
    const dir = path.resolve(outDir ?? path.join(path.dirname(input), "render"));
    const pngs = renderPptxToPngs(input, dir, dpi ?? 150);
    return textResponse(JSON.stringify({ ok: true, slides: pngs.length, pngs }, null, 2));
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
