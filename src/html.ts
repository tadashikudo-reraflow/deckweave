import type { DeckIR, Fill, SlideElement } from "./ir.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fillCss(fill?: Fill): string {
  if (!fill) return "";
  if (fill.type === "color") return `background:${fill.color};`;
  return `background-image:url('${fill.dataUri}');background-size:cover;background-position:center;`;
}

function baseStyle(el: SlideElement): string {
  const rotate = el.rotation ? `transform:rotate(${el.rotation}deg);` : "";
  return [
    "position:absolute",
    `left:${el.x}px`,
    `top:${el.y}px`,
    `width:${el.w}px`,
    `height:${el.h}px`,
    "box-sizing:border-box",
    rotate
  ].join(";") + ";";
}

function elementHtml(el: SlideElement): string {
  const data = `data-deckweave-id="${escapeHtml(el.id)}" data-deckweave-type="${el.type}"`;
  if (el.type === "image") {
    return `<img class="dw-element dw-image" ${data} src="${el.dataUri}" style="${baseStyle(el)}object-fit:contain;" />`;
  }
  if (el.type === "shape") {
    const background = el.fill?.type === "color" ? `background:${el.fill.color};` : "";
    const border = el.line?.color ? `border:${el.line.width ?? 1}px solid ${el.line.color};` : "";
    return `<div class="dw-element dw-shape" ${data} data-deckweave-shape="${el.shape}" style="${baseStyle(el)}${background}${border}"></div>`;
  }
  if (el.type === "chart") {
    const label = `[Chart: ${el.chartType}${el.title ? " — " + el.title : ""}]`;
    return `<div class="dw-element dw-chart" ${data} style="${baseStyle(el)}background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:14px;color:#666;">${escapeHtml(label)}</div>`;
  }
  const fontSize = el.fontSize ? `font-size:${el.fontSize}px;` : "";
  const color = el.color ? `color:${el.color};` : "";
  const weight = el.bold ? "font-weight:700;" : "";
  const style = `${baseStyle(el)}${fillCss(el.fill)}${fontSize}${color}${weight}font-family:${el.fontFace ?? "Arial, sans-serif"};white-space:pre-wrap;overflow:hidden;`;
  return `<div class="dw-element dw-text" ${data} contenteditable="true" style="${style}">${escapeHtml(el.text)}</div>`;
}

export function renderDeckToHtml(deck: DeckIR): string {
  const slides = deck.slides
    .map((slide, index) => {
      const slideStyle = [
        "position:relative",
        `width:${slide.size.widthPx}px`,
        `height:${slide.size.heightPx}px`,
        "overflow:hidden",
        "margin:24px auto",
        "box-shadow:0 8px 32px rgba(0,0,0,.18)",
        "background:#fff",
        fillCss(slide.background)
      ].join(";") + ";";
      return `<section class="slide" data-slide-index="${index + 1}" data-slide-id="${escapeHtml(slide.id)}" style="${slideStyle}">
${slide.elements.map(elementHtml).join("\n")}
</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="deckweave" content="0.1.0" />
  <title>DeckWeave Import</title>
  <style>
    body { margin: 0; background: #f3f4f6; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .slide { transform-origin: top center; }
    .dw-text:focus { outline: 2px solid #2563eb; }
  </style>
</head>
<body>
${slides}
</body>
</html>
`;
}
