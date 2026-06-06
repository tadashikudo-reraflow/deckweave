import fs from "node:fs";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { DeckIR, SlideElement, SlideIR } from "./ir.js";

function numberFromStyle(style: string, key: string): number {
  const match = new RegExp(`${key}\\s*:\\s*([-0-9.]+)px`).exec(style);
  return match ? Number(match[1]) : 0;
}

function colorFromStyle(style: string, key: string): string | undefined {
  const match = new RegExp(`${key}\\s*:\\s*([^;]+)`).exec(style);
  return match?.[1]?.trim();
}

function fontWeightFromStyle(style: string): boolean | undefined {
  const value = colorFromStyle(style, "font-weight");
  if (!value) return undefined;
  if (value === "bold") return true;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric >= 600 : undefined;
}

function borderFromStyle(style: string): { color?: string; width?: number } | undefined {
  const match = /border\s*:\s*([-0-9.]+)px\s+[^ ]+\s+([^;]+)/.exec(style);
  if (!match) return undefined;
  return { width: Number(match[1]), color: match[2]?.trim() };
}

function elementFrom($: cheerio.CheerioAPI, el: Element, index: number): SlideElement | undefined {
  const node = $(el);
  const type = node.attr("data-deckweave-type");
  const style = node.attr("style") ?? "";
  const base = {
    id: node.attr("data-deckweave-id") ?? `${type ?? "element"}-${index}`,
    x: numberFromStyle(style, "left"),
    y: numberFromStyle(style, "top"),
    w: numberFromStyle(style, "width"),
    h: numberFromStyle(style, "height")
  };
  if (type === "image") {
    const dataUri = node.attr("src");
    if (!dataUri) return undefined;
    return { ...base, type: "image", dataUri, contentType: dataUri.split(";")[0]?.replace("data:", "") ?? "image/png" };
  }
  if (type === "shape") {
    const background = colorFromStyle(style, "background");
    const shape = node.attr("data-deckweave-shape") === "line" ? "line" : "rect";
    return {
      ...base,
      type: "shape",
      shape,
      fill: background ? { type: "color", color: background } : undefined,
      line: borderFromStyle(style)
    };
  }
  if (type === "text") {
    const color = colorFromStyle(style, "color");
    const fontSize = numberFromStyle(style, "font-size");
    const fontFamily = colorFromStyle(style, "font-family");
    return {
      ...base,
      type: "text",
      text: node.text(),
      color,
      fontSize: fontSize || undefined,
      fontFace: fontFamily?.split(",")[0]?.replaceAll('"', ""),
      bold: fontWeightFromStyle(style)
    };
  }
  return undefined;
}

export function importHtml(htmlPath: string): DeckIR {
  const html = fs.readFileSync(htmlPath, "utf8");
  const $ = cheerio.load(html);
  const slides: SlideIR[] = [];
  $(".slide").each((slideIndex, slideEl) => {
    const slide = $(slideEl);
    const style = slide.attr("style") ?? "";
    const size = {
      widthPx: numberFromStyle(style, "width") || 1280,
      heightPx: numberFromStyle(style, "height") || 720
    };
    const elements: SlideElement[] = [];
    slide.find("[data-deckweave-type]").each((elementIndex, el) => {
      const parsed = elementFrom($, el, elementIndex + 1);
      if (parsed) elements.push(parsed);
    });
    slides.push({ id: slide.attr("data-slide-id") ?? `slide-${slideIndex + 1}`, size, elements });
  });
  return { source: htmlPath, size: slides[0]?.size ?? { widthPx: 1280, heightPx: 720 }, slides };
}
