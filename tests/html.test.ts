import { test } from "node:test";
import assert from "node:assert/strict";
import { renderDeckToHtml } from "../src/html.js";
import type { DeckIR } from "../src/ir.js";

const minimalDeck: DeckIR = {
  size: { widthPx: 1280, heightPx: 720 },
  slides: [
    {
      id: "s1",
      size: { widthPx: 1280, heightPx: 720 },
      background: { type: "color", color: "#ffffff" },
      elements: [
        {
          id: "t1",
          type: "text",
          x: 80,
          y: 60,
          w: 600,
          h: 80,
          text: "Hello DeckWeave",
          fontSize: 36,
          fontFace: "Arial",
          color: "#000000",
          bold: false,
        },
        {
          id: "r1",
          type: "shape",
          shape: "roundRect",
          radius: 8,
          x: 80,
          y: 200,
          w: 300,
          h: 200,
          fill: { type: "color", color: "#f0f0f0" },
        },
      ],
    },
  ],
};

test("renderDeckToHtml: produces valid HTML document", () => {
  const html = renderDeckToHtml(minimalDeck);
  assert.ok(html.startsWith("<!doctype html>"), "starts with doctype");
  assert.ok(html.includes("<section class=\"slide\""), "contains slide section");
  assert.ok(html.includes("deckweave"), "contains deckweave meta");
});

test("renderDeckToHtml: text element rendered as contenteditable div", () => {
  const html = renderDeckToHtml(minimalDeck);
  assert.ok(html.includes("contenteditable=\"true\""), "text is editable");
  assert.ok(html.includes("Hello DeckWeave"), "text content present");
});

test("renderDeckToHtml: shape element rendered as div with data attribute", () => {
  const html = renderDeckToHtml(minimalDeck);
  assert.ok(html.includes("data-deckweave-type=\"shape\""), "shape type attribute");
  assert.ok(html.includes("dw-shape"), "shape class");
});

test("renderDeckToHtml: chart element renders placeholder", () => {
  const deckWithChart: DeckIR = {
    size: { widthPx: 1280, heightPx: 720 },
    slides: [
      {
        id: "s1",
        size: { widthPx: 1280, heightPx: 720 },
        background: { type: "color", color: "#ffffff" },
        elements: [
          {
            id: "c1",
            type: "chart",
            chartType: "bar",
            title: "売上",
            x: 60,
            y: 100,
            w: 500,
            h: 400,
            series: [{ name: "2025", labels: ["Q1", "Q2"], values: [100, 120] }],
          },
        ],
      },
    ],
  };
  const html = renderDeckToHtml(deckWithChart);
  assert.ok(html.includes("dw-chart"), "chart class present");
  assert.ok(html.includes("Chart: bar"), "chart type in placeholder");
  assert.ok(html.includes("売上"), "chart title in placeholder");
});

test("renderDeckToHtml: escapes HTML in text content", () => {
  const deckWithXss: DeckIR = {
    size: { widthPx: 1280, heightPx: 720 },
    slides: [
      {
        id: "s1",
        size: { widthPx: 1280, heightPx: 720 },
        background: { type: "color", color: "#ffffff" },
        elements: [
          {
            id: "t1",
            type: "text",
            x: 0,
            y: 0,
            w: 400,
            h: 80,
            text: '<script>alert("xss")</script>',
            fontSize: 16,
            fontFace: "Arial",
            color: "#000000",
            bold: false,
          },
        ],
      },
    ],
  };
  const html = renderDeckToHtml(deckWithXss);
  assert.ok(!html.includes("<script>"), "raw script tag not present");
  assert.ok(html.includes("&lt;script&gt;"), "script is escaped");
});
