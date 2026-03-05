import fs from "fs";
import path from "path";
import { WORKSPACE_PATH } from "../config";

export interface SearchResult {
  file: string;
  line: number;
  content: string;
  context: string;
}

export function searchMemoryFiles(query: string, maxResults = 50): SearchResult[] {
  if (!query || query.length < 2) return [];

  const results: SearchResult[] = [];
  const memDir = path.join(WORKSPACE_PATH, "memory");
  const lowerQuery = query.toLowerCase();

  function searchDir(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= maxResults) return;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          searchDir(fullPath);
        } else if (entry.name.endsWith(".md")) {
          try {
            const content = fs.readFileSync(fullPath, "utf-8");
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (results.length >= maxResults) return;
              if (lines[i].toLowerCase().includes(lowerQuery)) {
                const relativePath = fullPath.replace(WORKSPACE_PATH + "/", "");
                // Get surrounding context (1 line before and after)
                const start = Math.max(0, i - 1);
                const end = Math.min(lines.length - 1, i + 1);
                const context = lines.slice(start, end + 1).join("\n");

                results.push({
                  file: relativePath,
                  line: i + 1,
                  content: lines[i].trim(),
                  context,
                });
              }
            }
          } catch {
            // Skip unreadable files
          }
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  searchDir(memDir);
  return results;
}
