import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { buildDeck } from "../src/build.js";
import { importPptx } from "../src/pptx-import.js";
import { renderDeckToHtml } from "../src/html.js";
import type { DeckIR } from "../src/ir.js";

const sampleIR: DeckIR = {
  size: { widthPx: 1280, heightPx: 720 },
  slides: [
    {
      id: "s1",
      size: { widthPx: 1280, heightPx: 720 },
      background: { type: "color", color: "#ffffff" },
      elements: [
        {
          id: "title",
          type: "text",
          x: 80,
          y: 60,
          w: 1120,
          h: 90,
          text: "Roundtrip Test",
          fontSize: 36,
          fontFace: "Arial",
          color: "#1976D2",
          bold: true,
        },
        {
          id: "card",
          type: "shape",
          shape: "roundRect",
          radius: 8,
          x: 80,
          y: 200,
          w: 400,
          h: 250,
          fill: { type: "color", color: "#f0f4ff" },
        },
      ],
    },
  ],
};

test("roundtrip: build → import → slide count preserved", async () => {
  const tmp = path.join(os.tmpdir(), `dw-roundtrip-${Date.now()}.pptx`);
  await buildDeck(sampleIR, tmp);
  const deck = importPptx(tmp);
  assert.equal(deck.slides.length, 1, "one slide");
  fs.unlinkSync(tmp);
});

test("roundtrip: build → import → at least one element on slide", async () => {
  const tmp = path.join(os.tmpdir(), `dw-rt2-${Date.now()}.pptx`);
  await buildDeck(sampleIR, tmp);
  const deck = importPptx(tmp);
  assert.ok(deck.slides[0].elements.length >= 1, "elements present after import");
  fs.unlinkSync(tmp);
});

test("roundtrip: build → import → render HTML → slide section present", async () => {
  const tmp = path.join(os.tmpdir(), `dw-rt3-${Date.now()}.pptx`);
  await buildDeck(sampleIR, tmp);
  const deck = importPptx(tmp);
  const html = renderDeckToHtml(deck);
  assert.ok(html.includes("<section class=\"slide\""), "HTML has slide section");
  fs.unlinkSync(tmp);
});
