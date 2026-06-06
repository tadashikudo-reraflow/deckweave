import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { DeckIR } from "./ir.js";
import { renderDeckToHtml } from "./html.js";
import { exportDeckToPptx } from "./pptx-export.js";

// Zod mirror of the Slide IR (see ir.ts). Used to validate AI-authored DeckIR
// JSON before it reaches the deterministic exporter, so malformed vision output
// fails loudly instead of producing a broken deck.

const FillSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("color"), color: z.string() }),
  z.object({ type: z.literal("image"), dataUri: z.string() })
]);

const baseShape = {
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  rotation: z.number().optional()
};

const DashSchema = z.enum(["solid", "dash", "dashDot", "lgDash", "lgDashDot", "sysDash", "sysDot"]);

const TextSchema = z.object({
  ...baseShape,
  type: z.literal("text"),
  text: z.string(),
  fontSize: z.number().optional(),
  fontFace: z.string().optional(),
  color: z.string().optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  fill: FillSchema.optional()
});

const ImageSchema = z.object({
  ...baseShape,
  type: z.literal("image"),
  dataUri: z.string(),
  contentType: z.string()
});

const ShapeSchema = z.object({
  ...baseShape,
  type: z.literal("shape"),
  shape: z.enum(["rect", "roundRect", "line"]),
  radius: z.number().optional(),
  fill: FillSchema.optional(),
  line: z
    .object({ color: z.string().optional(), width: z.number().optional(), dash: DashSchema.optional() })
    .optional()
});

const ChartSeriesSchema = z.object({
  name: z.string(),
  labels: z.array(z.string()).optional(),
  values: z.array(z.number())
});

const ChartSchema = z.object({
  ...baseShape,
  type: z.literal("chart"),
  chartType: z.enum(["bar", "barH", "line", "pie", "doughnut", "area"]),
  title: z.string().optional(),
  series: z.array(ChartSeriesSchema).min(1),
  colors: z.array(z.string()).optional(),
  showLegend: z.boolean().optional(),
  showValues: z.boolean().optional()
});

const ElementSchema = z.discriminatedUnion("type", [TextSchema, ImageSchema, ShapeSchema, ChartSchema]);

const SizeSchema = z.object({ widthPx: z.number(), heightPx: z.number() });

const SlideSchema = z.object({
  id: z.string(),
  size: SizeSchema,
  background: FillSchema.optional(),
  elements: z.array(ElementSchema)
});

const DeckSchema = z.object({
  source: z.string().optional(),
  size: SizeSchema,
  slides: z.array(SlideSchema)
});

/** Read a DeckIR JSON file and validate it against the Slide IR schema. */
export function loadDeckIR(filePath: string): DeckIR {
  const resolved = path.resolve(filePath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(resolved, "utf8"));
  } catch (err) {
    throw new Error(`Invalid JSON in ${resolved}: ${(err as Error).message}`);
  }
  const result = DeckSchema.safeParse(parsed);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`DeckIR validation failed for ${resolved}:\n${details}`);
  }
  return result.data as DeckIR;
}

/** Build a validated DeckIR into a .pptx, and optionally a preview .html. */
export async function buildDeck(deck: DeckIR, pptxOut: string, htmlOut?: string): Promise<void> {
  const pptxPath = path.resolve(pptxOut);
  fs.mkdirSync(path.dirname(pptxPath), { recursive: true });
  await exportDeckToPptx(deck, pptxPath);
  if (htmlOut) {
    const htmlPath = path.resolve(htmlOut);
    fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
    fs.writeFileSync(htmlPath, renderDeckToHtml(deck), "utf8");
  }
}
