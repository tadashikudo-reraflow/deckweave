import { createRequire } from "node:module";
import type { DeckIR, SlideElement } from "./ir.js";
import { pxToIn, pxToPt } from "./units.js";

const require = createRequire(import.meta.url);
const PptxGenJS = require("pptxgenjs");

function addElement(slide: any, el: SlideElement): void {
  const x = pxToIn(el.x);
  const y = pxToIn(el.y);
  const w = pxToIn(el.w);
  const h = pxToIn(el.h);
  if (el.type === "image") {
    slide.addImage({ data: el.dataUri, x, y, w, h });
    return;
  }
  if (el.type === "shape") {
    const shapeOpts: Record<string, unknown> = {
      x, y, w, h,
      fill: el.fill?.type === "color" ? { color: el.fill.color.replace("#", "") } : { transparency: 100 },
      line: el.line?.color
        ? { color: el.line.color.replace("#", ""), width: el.line.width ?? 1, dashType: el.line.dash ?? "solid" }
        : { transparency: 100 }
    };
    if (el.shape === "roundRect" && el.radius != null) {
      shapeOpts.rectRadius = pxToIn(el.radius);
    }
    slide.addShape(el.shape === "line" ? "line" : el.shape, shapeOpts);
    return;
  }
  slide.addText(el.text, {
    x,
    y,
    w,
    h,
    fontFace: el.fontFace,
    fontSize: el.fontSize ? pxToPt(el.fontSize) : 18,
    color: el.color?.replace("#", "") ?? "111827",
    bold: el.bold,
    italic: el.italic,
    fit: "shrink",
    margin: 0
  });
}

export async function exportDeckToPptx(deck: DeckIR, outPath: string): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({
    name: "DECKWEAVE",
    width: pxToIn(deck.size.widthPx),
    height: pxToIn(deck.size.heightPx)
  });
  pptx.layout = "DECKWEAVE";
  pptx.author = "DeckWeave";
  pptx.subject = "DeckWeave generated presentation";
  pptx.title = "DeckWeave Export";
  pptx.company = "DeckWeave";
  for (const irSlide of deck.slides) {
    const slide = pptx.addSlide();
    if (irSlide.background?.type === "color") slide.background = { color: irSlide.background.color.replace("#", "") };
    if (irSlide.background?.type === "image") slide.addImage({ data: irSlide.background.dataUri, x: 0, y: 0, w: pxToIn(irSlide.size.widthPx), h: pxToIn(irSlide.size.heightPx) });
    for (const el of irSlide.elements) addElement(slide, el);
  }
  await pptx.writeFile({ fileName: outPath });
}
