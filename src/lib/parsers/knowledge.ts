import fs from "fs";
import path from "path";
import { WORKSPACE_PATH } from "../config";

export interface KnowledgeFile {
  name: string;
  path: string;
  size: number;
  modified: string;
  category: string;
}

export function listKnowledgeFiles(): KnowledgeFile[] {
  const kbDir = path.join(WORKSPACE_PATH, "shared/knowledge-base");
  const files: KnowledgeFile[] = [];

  try {
    function walkDir(dir: string, category: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath, entry.name);
        } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md") {
          const stats = fs.statSync(fullPath);
          const relPath = path.relative(path.join(WORKSPACE_PATH, "shared"), fullPath);
          files.push({
            name: entry.name,
            path: relPath,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            category,
          });
        }
      }
    }

    walkDir(kbDir, "general");
  } catch {
    // Return empty
  }

  return files.sort((a, b) => b.modified.localeCompare(a.modified));
}

export function readKnowledgeFile(slug: string): { content: string } | null {
  const safePath = slug.replace(/\.\./g, "").replace(/^\//, "");
  const filePath = path.join(WORKSPACE_PATH, "shared", safePath);

  if (!filePath.startsWith(path.join(WORKSPACE_PATH, "shared"))) return null;

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return { content };
  } catch {
    return null;
  }
}

export interface KnowledgeFileWithContent extends KnowledgeFile {
  content: string;
}

export function listKnowledgeFilesWithContent(): KnowledgeFileWithContent[] {
  const files = listKnowledgeFiles();
  return files.map((f) => {
    const result = readKnowledgeFile(f.path);
    return { ...f, content: result?.content || "" };
  });
}
