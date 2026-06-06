import path from "node:path";
import AdmZip from "adm-zip";
import type { DeckIR, Fill, ImageElement, ShapeElement, SlideElement, SlideIR, TextElement } from "./ir.js";
import { asArray, attr, first, parser } from "./xml.js";
import { emuToPx, pptFontSizeToPt, ptToPx } from "./units.js";

type ZipEntryMap = Map<string, Buffer>;

function normalizeTarget(baseDir: string, target: string): string {
  return path.posix.normalize(path.posix.join(baseDir, target));
}

function readXml(entries: ZipEntryMap, filePath: string): any {
  const buf = entries.get(filePath);
  if (!buf) throw new Error(`Missing PPTX part: ${filePath}`);
  return parser.parse(buf.toString("utf8"));
}

function relationships(entries: ZipEntryMap, relPath: string, baseDir: string): Map<string, string> {
  const buf = entries.get(relPath);
  const map = new Map<string, string>();
  if (!buf) return map;
  const xml = parser.parse(buf.toString("utf8"));
  for (const rel of asArray(xml.Relationships?.Relationship)) {
    const id = attr(rel, "Id");
    const target = attr(rel, "Target");
    const mode = attr(rel, "TargetMode");
    if (!id || !target || mode === "External") continue;
    map.set(id, normalizeTarget(baseDir, target));
  }
  return map;
}

function zipEntryMap(pptxPath: string): ZipEntryMap {
  const zip = new AdmZip(pptxPath);
  const entries = new Map<string, Buffer>();
  for (const entry of zip.getEntries()) {
    if (!entry.isDirectory) entries.set(entry.entryName, entry.getData());
  }
  return entries;
}

function contentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function dataUri(entries: ZipEntryMap, filePath: string): string | undefined {
  const buf = entries.get(filePath);
  if (!buf) return undefined;
  return `data:${contentType(filePath)};base64,${buf.toString("base64")}`;
}

function xfrm(node: any): { x: number; y: number; w: number; h: number; rotation?: number } {
  const tx = node?.["a:xfrm"] ?? node?.["p:xfrm"];
  const off = tx?.["a:off"];
  const ext = tx?.["a:ext"];
  const rotation = attr(tx, "rot");
  return {
    x: emuToPx(attr(off, "x")),
    y: emuToPx(attr(off, "y")),
    w: emuToPx(attr(ext, "cx")),
    h: emuToPx(attr(ext, "cy")),
    rotation: rotation ? Number(rotation) / 60000 : undefined
  };
}

function solidColor(node: any): string | undefined {
  const fill = node?.["a:solidFill"];
  const srgb = fill?.["a:srgbClr"];
  const val = attr(srgb, "val");
  if (val) return `#${val}`;
  const scheme = fill?.["a:schemeClr"];
  const schemeVal = attr(scheme, "val");
  if (!schemeVal) return undefined;
  const fallback: Record<string, string> = {
    tx1: "#000000",
    tx2: "#666666",
    bg1: "#ffffff",
    bg2: "#f3f4f6",
    accent1: "#2563eb",
    accent2: "#16a34a",
    accent3: "#dc2626",
    accent4: "#9333ea",
    accent5: "#ea580c",
    accent6: "#0891b2"
  };
  return fallback[schemeVal] ?? "#111827";
}

function fill(node: any): Fill | undefined {
  const color = solidColor(node);
  return color ? { type: "color", color } : undefined;
}

function textFromBody(txBody: any): string {
  const paragraphs = asArray(txBody?.["a:p"]);
  return paragraphs
    .map((p: any) => {
      const runs = asArray(p?.["a:r"]);
      const fields = asArray(p?.["a:fld"]);
      const texts = [...runs, ...fields]
        .map((r: any) => r?.["a:t"])
        .filter((t: unknown) => typeof t === "string");
      return texts.join("");
    })
    .join("\n")
    .trim();
}

function textStyle(txBody: any): Pick<TextElement, "fontSize" | "fontFace" | "color" | "bold" | "italic"> {
  const p = first(asArray(txBody?.["a:p"]));
  const run = first(asArray(p?.["a:r"])) ?? first(asArray(p?.["a:fld"]));
  const rPr = run?.["a:rPr"] ?? p?.["a:pPr"]?.["a:defRPr"];
  const sizePt = pptFontSizeToPt(attr(rPr, "sz"));
  const latin = rPr?.["a:latin"];
  const fontFace = attr(latin, "typeface");
  return {
    fontSize: sizePt ? ptToPx(sizePt) : undefined,
    fontFace,
    color: solidColor(rPr),
    bold: attr(rPr, "b") === "1" || attr(rPr, "b") === "true",
    italic: attr(rPr, "i") === "1" || attr(rPr, "i") === "true"
  };
}

function parseShape(sp: any, index: number): TextElement | ShapeElement | undefined {
  const props = sp?.["p:spPr"];
  const box = xfrm(props);
  if (box.w <= 0 || box.h <= 0) return undefined;
  const text = textFromBody(sp?.["p:txBody"]);
  if (text) {
    return {
      id: `shape-${index}`,
      type: "text",
      ...box,
      text,
      fill: fill(props),
      ...textStyle(sp?.["p:txBody"])
    };
  }
  const geom = attr(props?.["a:prstGeom"], "prst");
  const lineColor = solidColor(props?.["a:ln"]);
  return {
    id: `shape-${index}`,
    type: "shape",
    shape: geom === "line" ? "line" : "rect",
    ...box,
    fill: fill(props),
    line: lineColor ? { color: lineColor } : undefined
  };
}

function parsePicture(entries: ZipEntryMap, rels: Map<string, string>, pic: any, index: number): ImageElement | undefined {
  const props = pic?.["p:spPr"];
  const box = xfrm(props);
  const embed = attr(pic?.["p:blipFill"]?.["a:blip"], "r:embed");
  const target = embed ? rels.get(embed) : undefined;
  if (!target) return undefined;
  const uri = dataUri(entries, target);
  if (!uri) return undefined;
  return {
    id: `image-${index}`,
    type: "image",
    ...box,
    dataUri: uri,
    contentType: contentType(target)
  };
}

function parseSlide(entries: ZipEntryMap, slidePath: string, slideIndex: number, size: DeckIR["size"]): SlideIR {
  const xml = readXml(entries, slidePath);
  const relPath = `${path.posix.dirname(slidePath)}/_rels/${path.posix.basename(slidePath)}.rels`;
  const rels = relationships(entries, relPath, path.posix.dirname(slidePath));
  const tree = xml?.["p:sld"]?.["p:cSld"]?.["p:spTree"];
  const elements: SlideElement[] = [];
  let i = 0;
  for (const sp of asArray(tree?.["p:sp"])) {
    const parsed = parseShape(sp, ++i);
    if (parsed) elements.push(parsed);
  }
  for (const pic of asArray(tree?.["p:pic"])) {
    const parsed = parsePicture(entries, rels, pic, ++i);
    if (parsed) elements.push(parsed);
  }
  return { id: `slide-${slideIndex}`, size, elements };
}

export function importPptx(pptxPath: string): DeckIR {
  const entries = zipEntryMap(pptxPath);
  const pres = readXml(entries, "ppt/presentation.xml");
  const rels = relationships(entries, "ppt/_rels/presentation.xml.rels", "ppt");
  const sldSz = pres?.["p:presentation"]?.["p:sldSz"];
  const size = {
    widthPx: emuToPx(attr(sldSz, "cx") ?? "12192000"),
    heightPx: emuToPx(attr(sldSz, "cy") ?? "6858000")
  };
  const slideRefs = asArray(pres?.["p:presentation"]?.["p:sldIdLst"]?.["p:sldId"]);
  const slides = slideRefs
    .map((sld: any, index: number) => {
      const rid = attr(sld, "r:id");
      const slidePath = rid ? rels.get(rid) : undefined;
      return slidePath ? parseSlide(entries, slidePath, index + 1, size) : undefined;
    })
    .filter((slide: SlideIR | undefined): slide is SlideIR => Boolean(slide));
  return { source: pptxPath, size, slides };
}
