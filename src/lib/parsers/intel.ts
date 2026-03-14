import fs from "fs";
import path from "path";
import { WORKSPACE_PATH } from "../config";
import type { IntelReport, IntelTrend } from "./types";

function extractTrendBlocks(section: string): string[] {
  const lines = section.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];

  const isStart = (line: string) => {
    const trimmed = line.trim();
    if (/^\d+\.\s+\*\*/.test(trimmed)) return true;
    if (!/^-\s+\*\*/.test(trimmed)) return false;
    // Guard against metadata bullets inside an existing trend block.
    return !/^-\s+\*\*(?:Virality|Source|Sources|Confidence|Expiry|Why it works|Platform recommendation|Urgency)\b/i.test(trimmed);
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      if (current.length > 0) current.push("");
      continue;
    }

    if (isStart(line)) {
      if (current.length > 0) blocks.push(current.join("\n"));
      current = [line.trim()];
    } else if (current.length > 0) {
      current.push(line.trim());
    }
  }

  if (current.length > 0) blocks.push(current.join("\n"));
  return blocks;
}

function parseTrendBlock(block: string): IntelTrend {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  const title = (lines[0] || "")
    .replace(/^\d+\.\s*/, "")
    .replace(/^-\s*/, "")
    .replace(/^\*\*/, "")
    .replace(/\*\*$/, "");

  let source = "", virality = 0, confidence = "", expiry = "", angle = "";

  for (const line of lines) {
    const srcMatch = line.match(/Source[s]?:\s*(.+)/i);
    if (srcMatch) source = srcMatch[1].replace(/^\*+|\*+$/g, "").trim();

    const virMatch = line.match(/Virality:[\s\S]*?(\d+(?:\.\d+)?)\s*\/\s*10\*\*/i) ||
      line.match(/Virality:[\s\S]*?(\d+(?:\.\d+)?)\s*\/\s*10/i);
    if (virMatch) virality = Math.round(parseFloat(virMatch[1]));

    const confMatch = line.match(/Confidence:\s*\*\*(.+?)\*\*/i) || line.match(/Confidence:\s*([^|]+)/i);
    if (confMatch) confidence = confMatch[1].trim();

    const expMatch = line.match(/Expiry:\s*\*\*(.+?)\*\*/i) || line.match(/Expiry:\s*([^|]+)/i);
    if (expMatch) expiry = expMatch[1].trim();

    const angMatch = line.match(/Angle:\s*"(.+)"/i);
    if (angMatch) angle = angMatch[1];
  }

  return { title, source, virality, confidence, expiry, angle };
}

export function parseIntel(date?: string): IntelReport {
  // If a date is provided, try to read an archive file first, then fall back to the main file
  let filePath = path.join(WORKSPACE_PATH, "intel/DAILY-INTEL.md");
  if (date) {
    const archivePath = path.join(WORKSPACE_PATH, `intel/archive/${date}.md`);
    if (fs.existsSync(archivePath)) {
      filePath = archivePath;
    }
    // Also try intel/{date}.md as another common pattern
    const altPath = path.join(WORKSPACE_PATH, `intel/${date}.md`);
    if (!fs.existsSync(filePath) && fs.existsSync(altPath)) {
      filePath = altPath;
    }
  }
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
        const blocks = extractTrendBlocks(section);
        result.highSignal = blocks.map((b) => parseTrendBlock(b));
      } else if (firstLine.startsWith("Rising")) {
        const blocks = extractTrendBlocks(section);
        result.rising = blocks.map((b) => parseTrendBlock(b));
      } else if (firstLine.startsWith("Niche")) {
        const blocks = extractTrendBlocks(section);
        result.nicheSignals = blocks.map((b) => parseTrendBlock(b));
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
