#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { buildDeck, loadDeckIR } from "./build.js";
import { critiqueHtml } from "./critique.js";
import { renderDeckToHtml } from "./html.js";
import { importHtml } from "./html-import.js";
import { exportDeckToPptx } from "./pptx-export.js";
import { importPptx } from "./pptx-import.js";
import { renderPptxToPngs } from "./render.js";

const program = new Command();

program
  .name("deckweave")
  .description("Local-first PPTX/HTML slide conversion toolkit.")
  .version("0.1.0");

program
  .command("import")
  .description("Import a .pptx deck into editable HTML.")
  .argument("<pptx>", "input .pptx file")
  .option("-o, --out <html>", "output HTML path")
  .action((pptx: string, options: { out?: string }) => {
    const deck = importPptx(pptx);
    const html = renderDeckToHtml(deck);
    const out = options.out ?? pptx.replace(/\.pptx$/i, ".html");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html, "utf8");
    console.log(`Imported ${deck.slides.length} slide(s) -> ${out}`);
  });

program
  .command("export")
  .description("Export DeckWeave HTML into editable PPTX.")
  .argument("<html>", "input DeckWeave HTML file")
  .option("-o, --out <pptx>", "output PPTX path")
  .action(async (html: string, options: { out?: string }) => {
    const deck = importHtml(html);
    const out = options.out ?? html.replace(/\.html?$/i, ".pptx");
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await exportDeckToPptx(deck, out);
    console.log(`Exported ${deck.slides.length} slide(s) -> ${out}`);
  });

program
  .command("build")
  .description("Build a DeckIR JSON file into editable PPTX (and optional preview HTML).")
  .argument("<ir>", "input DeckIR JSON file")
  .option("-o, --out <pptx>", "output PPTX path")
  .option("--html <html>", "also write a preview HTML to this path")
  .action(async (ir: string, options: { out?: string; html?: string }) => {
    const deck = loadDeckIR(ir);
    const out = options.out ?? ir.replace(/\.json$/i, ".pptx");
    await buildDeck(deck, out, options.html);
    const extra = options.html ? ` (+ ${options.html})` : "";
    console.log(`Built ${deck.slides.length} slide(s) -> ${out}${extra}`);
  });

program
  .command("render")
  .description("Render a .pptx to per-slide PNGs (requires LibreOffice). Used for visual self-check.")
  .argument("<pptx>", "input .pptx file")
  .option("--out-dir <dir>", "output directory for PNGs")
  .option("--dpi <n>", "render DPI", "150")
  .action((pptx: string, options: { outDir?: string; dpi: string }) => {
    const outDir = options.outDir ?? path.join(path.dirname(pptx), "render");
    const pngs = renderPptxToPngs(pptx, outDir, Number(options.dpi));
    console.log(`Rendered ${pngs.length} slide(s):\n${pngs.join("\n")}`);
  });

program
  .command("inspect")
  .description("Print the Slide IR JSON for a .pptx or DeckWeave HTML file.")
  .argument("<file>", "input .pptx or .html file")
  .action((file: string) => {
    const deck = /\.pptx$/i.test(file) ? importPptx(file) : importHtml(file);
    console.log(JSON.stringify(deck, null, 2));
  });

program
  .command("critique")
  .description("Run deterministic slide-quality checks against DeckWeave HTML.")
  .argument("<html>", "input DeckWeave HTML file")
  .option("--brief <path>", "CREATIVE_BRIEF.md path")
  .option("--design <path>", "DESIGN.md path")
  .option("-o, --out <path>", "write report to a Markdown file")
  .action((html: string, options: { brief?: string; design?: string; out?: string }) => {
    const report = critiqueHtml(html, options.brief, options.design);
    if (options.out) {
      fs.mkdirSync(path.dirname(options.out), { recursive: true });
      fs.writeFileSync(options.out, report, "utf8");
      console.log(`Wrote critique -> ${options.out}`);
    } else {
      console.log(report);
    }
  });

program.parseAsync();
