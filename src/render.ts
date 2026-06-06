import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Rasterize a .pptx to per-slide PNGs using a local LibreOffice (headless).
// Used by the self-check loop: render the built deck, compare each PNG against
// the original image, and patch the IR where they diverge. deckweave never
// calls an LLM itself — the visual comparison happens in the calling agent.

const SOFFICE_CANDIDATES = [
  "soffice",
  "/opt/homebrew/bin/soffice",
  "/usr/local/bin/soffice",
  "/Applications/LibreOffice.app/Contents/MacOS/soffice"
];

const INSTALL_HINT =
  "LibreOffice (soffice) was not found. Install it with:\n" +
  "  brew install --cask libreoffice\n" +
  "Without it, skip auto-render and verify manually: open the .pptx and press " +
  "Ctrl+A (Cmd+A) — every text and shape should get its own selection handle.";

function findSoffice(): string | null {
  for (const candidate of SOFFICE_CANDIDATES) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch {
      // try next candidate
    }
  }
  return null;
}

function hasPythonFitz(): boolean {
  try {
    execFileSync("python3", ["-c", "import fitz"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Render every slide of a .pptx to a PNG. Returns the written PNG paths in
 * slide order. Throws an actionable error if LibreOffice or the PDF rasterizer
 * is missing, so the caller can fall back to manual verification.
 */
export function renderPptxToPngs(pptxPath: string, outDir: string, dpi = 150): string[] {
  const soffice = findSoffice();
  if (!soffice) throw new Error(INSTALL_HINT);
  if (!hasPythonFitz()) {
    throw new Error(
      "python3 with PyMuPDF (fitz) is required to rasterize the rendered PDF.\n" +
        "  pip install pymupdf\n" +
        "Or skip auto-render and verify the .pptx manually with Ctrl+A."
    );
  }

  const inputPptx = path.resolve(pptxPath);
  if (!fs.existsSync(inputPptx)) throw new Error(`PPTX not found: ${inputPptx}`);
  const resolvedOutDir = path.resolve(outDir);
  fs.mkdirSync(resolvedOutDir, { recursive: true });

  // Use a throwaway user profile so headless conversion works even when a GUI
  // LibreOffice is already running (otherwise soffice exits with a lock error).
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "deckweave-loprofile-"));
  const pdfDir = fs.mkdtempSync(path.join(os.tmpdir(), "deckweave-render-"));
  try {
    execFileSync(
      soffice,
      [
        "--headless",
        `-env:UserInstallation=file://${profile}`,
        "--convert-to",
        "pdf",
        "--outdir",
        pdfDir,
        inputPptx
      ],
      { stdio: "ignore" }
    );
    const pdfPath = path.join(pdfDir, path.basename(inputPptx).replace(/\.pptx$/i, ".pdf"));
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`LibreOffice did not produce a PDF for ${inputPptx}.`);
    }

    const py = [
      "import fitz, sys, os",
      "doc = fitz.open(sys.argv[1])",
      "outdir, dpi = sys.argv[2], int(sys.argv[3])",
      "paths = []",
      "for i, page in enumerate(doc):",
      "    pix = page.get_pixmap(dpi=dpi)",
      "    p = os.path.join(outdir, f'slide{i+1}.png')",
      "    pix.save(p)",
      "    paths.append(p)",
      "print('\\n'.join(paths))"
    ].join("\n");
    const stdout = execFileSync("python3", ["-c", py, pdfPath, resolvedOutDir, String(dpi)], {
      encoding: "utf8"
    });
    return stdout.trim().split("\n").filter(Boolean);
  } finally {
    fs.rmSync(profile, { recursive: true, force: true });
    fs.rmSync(pdfDir, { recursive: true, force: true });
  }
}
