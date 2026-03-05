import fs from "fs";
import path from "path";
import { WORKSPACE_PATH } from "../config";
import type { PendingActions } from "./types";

export function parsePending(): PendingActions {
  const filePath = path.join(WORKSPACE_PATH, "memory/pending-actions.md");
  const result: PendingActions = { dmDrafts: [], xDrafts: [], emailDrafts: [], notes: [] };

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    let currentSection = "";

    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("## DM Drafts")) currentSection = "dm";
      else if (trimmed.startsWith("## X Reply Drafts")) currentSection = "x";
      else if (trimmed.startsWith("## Email Drafts")) currentSection = "email";
      else if (trimmed.startsWith("## Notes")) currentSection = "notes";
      else if (trimmed.startsWith("- ") && trimmed !== "- None.") {
        const item = trimmed.slice(2);
        switch (currentSection) {
          case "dm": result.dmDrafts.push(item); break;
          case "x": result.xDrafts.push(item); break;
          case "email": result.emailDrafts.push(item); break;
          case "notes": result.notes.push(item); break;
        }
      }
    }
  } catch {
    // Return empty
  }

  return result;
}
