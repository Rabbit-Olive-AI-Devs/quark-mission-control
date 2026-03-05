import fs from "fs";
import path from "path";
import { WORKSPACE_PATH } from "../config";

export interface MemoryFile {
  name: string;
  path: string;
  size: number;
  modified: string;
  type: "session" | "research" | "journal" | "digest" | "other";
}

function classifyFile(name: string): MemoryFile["type"] {
  if (name.match(/^\d{4}-\d{2}-\d{2}\.md$/)) return "session";
  if (name.startsWith("research-")) return "research";
  if (name.startsWith("digest-")) return "digest";
  return "other";
}

export interface MemoryFileWithContent extends MemoryFile {
  content: string;
}

export function listMemoryFilesWithContent(): MemoryFileWithContent[] {
  const files = listMemoryFiles();
  return files.map((f) => {
    const result = readMemoryFile(f.path);
    return { ...f, content: result?.content || "" };
  });
}

export function listMemoryFiles(): MemoryFile[] {
  const memDir = path.join(WORKSPACE_PATH, "memory");
  const files: MemoryFile[] = [];

  try {
    const entries = fs.readdirSync(memDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const fullPath = path.join(memDir, entry.name);
      const stats = fs.statSync(fullPath);
      files.push({
        name: entry.name,
        path: `memory/${entry.name}`,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        type: classifyFile(entry.name),
      });
    }

    // Also check journal directory
    const journalDir = path.join(memDir, "journal");
    if (fs.existsSync(journalDir)) {
      const jEntries = fs.readdirSync(journalDir, { withFileTypes: true });
      for (const entry of jEntries) {
        if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
        const fullPath = path.join(journalDir, entry.name);
        const stats = fs.statSync(fullPath);
        files.push({
          name: entry.name,
          path: `memory/journal/${entry.name}`,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          type: "journal",
        });
      }
    }
  } catch {
    // Return empty
  }

  return files.sort((a, b) => b.modified.localeCompare(a.modified));
}

export function readMemoryFile(slug: string): { content: string } | null {
  // Sanitize slug to prevent path traversal
  const safePath = slug.replace(/\.\./g, "").replace(/^\//, "");
  const filePath = path.join(WORKSPACE_PATH, safePath);

  if (!filePath.startsWith(WORKSPACE_PATH)) return null;

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return { content };
  } catch {
    return null;
  }
}
