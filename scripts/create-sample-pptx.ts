import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const PptxGenJS = require("pptxgenjs");

fs.mkdirSync("examples/out", { recursive: true });

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "DeckWeave";

const slide = pptx.addSlide();
slide.background = { color: "F8FAFC" };
slide.addShape("rect", {
  x: 0.6,
  y: 0.5,
  w: 12.1,
  h: 6.5,
  fill: { color: "FFFFFF" },
  line: { color: "CBD5E1", width: 1 }
});
slide.addText("DeckWeave MVP", {
  x: 1.0,
  y: 0.9,
  w: 8.5,
  h: 0.7,
  fontFace: "Aptos Display",
  fontSize: 34,
  bold: true,
  color: "0F172A"
});
slide.addText("PPTX -> HTML -> PPTX, local-first and AI-editable.", {
  x: 1.05,
  y: 1.75,
  w: 9.5,
  h: 0.5,
  fontFace: "Aptos",
  fontSize: 18,
  color: "475569"
});
slide.addShape("rect", {
  x: 1.05,
  y: 2.65,
  w: 3.2,
  h: 1.4,
  fill: { color: "DBEAFE" },
  line: { color: "60A5FA", width: 1 }
});
slide.addText("Editable text", {
  x: 1.3,
  y: 3.08,
  w: 2.7,
  h: 0.4,
  fontSize: 20,
  bold: true,
  color: "1D4ED8"
});
slide.addText("1. Import\n2. Edit HTML\n3. Export", {
  x: 5.0,
  y: 2.7,
  w: 3.2,
  h: 1.3,
  fontSize: 22,
  color: "111827",
  breakLine: false
});

await pptx.writeFile({ fileName: "examples/out/sample.pptx" });
console.log("examples/out/sample.pptx");
