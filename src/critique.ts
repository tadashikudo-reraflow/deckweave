import fs from "node:fs";
import * as cheerio from "cheerio";

type CritiqueFinding = {
  severity: "high" | "medium" | "low";
  issue: string;
  fix: string;
};

function hasSection(markdown: string, name: string): boolean {
  return new RegExp(`^#{1,3}\\s+${name}\\s*$`, "im").test(markdown);
}

export function critiqueHtml(htmlPath: string, briefPath?: string, designPath?: string): string {
  const html = fs.readFileSync(htmlPath, "utf8");
  const $ = cheerio.load(html);
  const findings: CritiqueFinding[] = [];
  const slides = $(".slide");
  const textEls = $("[data-deckweave-type='text']");
  const imageEls = $("[data-deckweave-type='image']");
  const shapeEls = $("[data-deckweave-type='shape']");

  if (slides.length === 0) {
    findings.push({ severity: "high", issue: "No .slide sections found.", fix: "Render one fixed-size .slide section per slide." });
  }
  textEls.each((index, el) => {
    const text = $(el).text().trim();
    if (!text) findings.push({ severity: "medium", issue: `Text element ${index + 1} is empty.`, fix: "Remove empty text boxes or fill them with real content." });
    if (/lorem ipsum|placeholder|sample text/i.test(text)) {
      findings.push({ severity: "medium", issue: `Text element ${index + 1} still looks like placeholder copy.`, fix: "Replace placeholder copy with audience-specific message." });
    }
  });

  if (briefPath) {
    const brief = fs.readFileSync(briefPath, "utf8");
    for (const section of ["Purpose", "Audience", "Desired Action", "Core Message", "Avoid"]) {
      if (!hasSection(brief, section)) {
        findings.push({ severity: "medium", issue: `CREATIVE_BRIEF is missing ${section}.`, fix: `Add a clear ${section} section before generating final slides.` });
      }
    }
  } else {
    findings.push({ severity: "low", issue: "No CREATIVE_BRIEF provided.", fix: "Pass --brief templates/CREATIVE_BRIEF.md to critique purpose/audience fit." });
  }

  if (designPath) {
    const design = fs.readFileSync(designPath, "utf8");
    for (const section of ["Colors", "Typography", "Layout", "Do", "Don't"]) {
      if (!hasSection(design, section)) {
        findings.push({ severity: "low", issue: `DESIGN is missing ${section}.`, fix: `Add ${section} rules so AI edits keep visual consistency.` });
      }
    }
  } else {
    findings.push({ severity: "low", issue: "No DESIGN.md provided.", fix: "Pass --design templates/DESIGN.md to critique visual consistency." });
  }

  const summary = [
    "# DeckWeave Critique",
    "",
    `- Slides: ${slides.length}`,
    `- Text elements: ${textEls.length}`,
    `- Image elements: ${imageEls.length}`,
    `- Shape elements: ${shapeEls.length}`,
    "",
    "## Findings",
    ""
  ];

  if (findings.length === 0) {
    summary.push("No deterministic findings. Run a human/AI design review for semantic fit.");
  } else {
    for (const finding of findings) {
      summary.push(`- **${finding.severity.toUpperCase()}** ${finding.issue} Fix: ${finding.fix}`);
    }
  }

  summary.push(
    "",
    "## Human Review Prompts",
    "",
    "- Does the primary visual connect to the core message?",
    "- Is the slide solving the stated purpose, or only decorating the page?",
    "- Is the audience's real context reflected in the title and evidence?",
    "- Are explanation and expression balanced?",
    "- Can a PowerPoint user safely edit the high-value parts without breaking the layout?"
  );

  return summary.join("\n");
}
