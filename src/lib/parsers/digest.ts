import fs from "fs";
import path from "path";
import { WORKSPACE_PATH } from "../config";
import type { DigestEntry } from "./types";

export function parseDigest(): DigestEntry[] {
  const filePath = path.join(WORKSPACE_PATH, "memory/today-digest.md");
  const entries: DigestEntry[] = [];

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const sections = content.split(/^## /m).filter(Boolean);

    for (const section of sections) {
      const lines = section.split("\n");
      const timeRange = lines[0]?.trim() || "";
      if (!timeRange) continue;

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
    // Return empty
  }

  return entries;
}
