import fs from "fs";
import path from "path";
import { WORKSPACE_PATH } from "../config";
import type { SessionEntry } from "./types";

export function parseSessionLog(date?: string): SessionEntry[] {
  const targetDate = date || new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  const filePath = path.join(WORKSPACE_PATH, `memory/${targetDate}.md`);
  const entries: SessionEntry[] = [];

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const sections = content.split(/^## /m).filter(Boolean);

    for (const section of sections) {
      const lines = section.split("\n");
      const timeRange = lines[0]?.trim() || "";
      if (!timeRange || timeRange.startsWith("#")) continue;

      const items: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("- ")) {
          items.push(line.slice(2));
        }
      }

      if (items.length > 0) {
        entries.push({ timeRange, items });
      }
    }
  } catch {
    // Return empty for missing date
  }

  return entries;
}
