import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { buildDeck } from "../src/build.js";
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
          text: "Test Slide",
          fontSize: 40,
          fontFace: "Arial",
          color: "#000000",
          bold: true,
        },
        {
          id: "card",
          type: "shape",
          shape: "roundRect",
          radius: 8,
          x: 80,
          y: 200,
          w: 360,
          h: 300,
          fill: { type: "color", color: "#f2f7fc" },
        },
      ],
    },
  ],
};

const sampleIRWithChart: DeckIR = {
  size: { widthPx: 1280, heightPx: 720 },
  slides: [
    {
      id: "s1",
      size: { widthPx: 1280, heightPx: 720 },
      background: { type: "color", color: "#ffffff" },
      elements: [
        {
          id: "chart1",
          type: "chart",
          chartType: "bar",
          x: 60,
          y: 100,
          w: 580,
          h: 520,
          title: "売上",
          series: [
            { name: "2025", labels: ["Q1", "Q2", "Q3", "Q4"], values: [120, 145, 130, 160] },
          ],
          colors: ["#1565C0"],
          showLegend: true,
          showValues: false,
        },
      ],
    },
  ],
};

test("buildDeck: produces a non-empty pptx file", async () => {
  const tmp = path.join(os.tmpdir(), `dw-test-${Date.now()}.pptx`);
  await buildDeck(sampleIR, tmp);
  assert.ok(fs.existsSync(tmp), "output file created");
  const buf = fs.readFileSync(tmp);
  assert.ok(buf.length > 0, "file is non-empty");
  // PPTX = ZIP, magic bytes PK
  assert.equal(buf[0], 0x50, "first byte is P");
  assert.equal(buf[1], 0x4b, "second byte is K");
  fs.unlinkSync(tmp);
});

test("buildDeck: roundRect shape produces valid pptx", async () => {
  const tmp = path.join(os.tmpdir(), `dw-roundrect-${Date.now()}.pptx`);
  await buildDeck(sampleIR, tmp);
  const buf = fs.readFileSync(tmp);
  assert.equal(buf[0], 0x50, "valid zip signature");
  fs.unlinkSync(tmp);
});

test("buildDeck: chart element produces valid pptx", async () => {
  const tmp = path.join(os.tmpdir(), `dw-chart-${Date.now()}.pptx`);
  await buildDeck(sampleIRWithChart, tmp);
  const buf = fs.readFileSync(tmp);
  assert.equal(buf[0], 0x50, "valid zip signature");
  fs.unlinkSync(tmp);
});

test("buildDeck: multi-slide deck", async () => {
  const multiSlide: DeckIR = {
    size: { widthPx: 1280, heightPx: 720 },
    slides: [
      { ...sampleIR.slides[0], id: "s1" },
      { ...sampleIR.slides[0], id: "s2" },
      { ...sampleIR.slides[0], id: "s3" },
    ],
  };
  const tmp = path.join(os.tmpdir(), `dw-multi-${Date.now()}.pptx`);
  await buildDeck(multiSlide, tmp);
  assert.ok(fs.existsSync(tmp), "multi-slide pptx produced");
  fs.unlinkSync(tmp);
});
