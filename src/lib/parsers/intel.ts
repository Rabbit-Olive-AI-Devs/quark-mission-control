import fs from "fs";
import path from "path";
import { WORKSPACE_PATH } from "../config";
import type { IntelReport, IntelTrend } from "./types";

function parseTrendBlock(block: string): IntelTrend {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  const title = (lines[0] || "").replace(/^\*\*/, "").replace(/\*\*$/, "").replace(/^- \*\*/, "");
  let source = "", virality = 0, confidence = "", expiry = "", angle = "";

  for (const line of lines) {
    const srcMatch = line.match(/Source[s]?:\s*(.+)/i);
    if (srcMatch) source = srcMatch[1];

    const virMatch = line.match(/Virality:\s*\*\*(\d+)\/10\*\*/i);
    if (virMatch) virality = parseInt(virMatch[1]);

    const confMatch = line.match(/Confidence:\s*\*\*(.+?)\*\*/i);
    if (confMatch) confidence = confMatch[1];

    const expMatch = line.match(/Expiry:\s*\*\*(.+?)\*\*/i);
    if (expMatch) expiry = expMatch[1];

    const angMatch = line.match(/Angle:\s*"(.+)"/i);
    if (angMatch) angle = angMatch[1];
  }

  return { title, source, virality, confidence, expiry, angle };
}

export function parseIntel(): IntelReport {
  const filePath = path.join(WORKSPACE_PATH, "intel/DAILY-INTEL.md");
  const result: IntelReport = {
    date: "", compiled: "", highSignal: [], rising: [], nicheSignals: [], suggestions: [],
  };

  try {
    const content = fs.readFileSync(filePath, "utf-8");

    // Date
    const dateMatch = content.match(/# Daily Intel — (\d{4}-\d{2}-\d{2})/);
    if (dateMatch) result.date = dateMatch[1];

    const compiledMatch = content.match(/## Compiled:\s*(.+)/);
    if (compiledMatch) result.compiled = compiledMatch[1];

    // Split by ### sections
    const sections = content.split(/^### /m);
    for (const section of sections) {
      const firstLine = section.split("\n")[0]?.trim() || "";

      if (firstLine.startsWith("High-Signal")) {
        const blocks = section.split(/^- \*\*/m).slice(1);
        result.highSignal = blocks.map((b) => parseTrendBlock("- **" + b));
      } else if (firstLine.startsWith("Rising")) {
        const blocks = section.split(/^- \*\*/m).slice(1);
        result.rising = blocks.map((b) => parseTrendBlock("- **" + b));
      } else if (firstLine.startsWith("Niche")) {
        const blocks = section.split(/^- \*\*/m).slice(1);
        result.nicheSignals = blocks.map((b) => parseTrendBlock("- **" + b));
      } else if (firstLine.startsWith("Suggested")) {
        const items = section.split("\n").filter((l) => l.trim().match(/^\d+\./));
        result.suggestions = items.map((l) => l.replace(/^\d+\.\s*/, "").trim());
      }
    }
  } catch {
    // Return empty
  }

  return result;
}
