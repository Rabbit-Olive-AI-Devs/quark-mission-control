import { createHash } from "crypto";
import { stat } from "fs/promises";
import path from "path";
import { WORKSPACE_PATH } from "./config";

const WATCHED_FILES = [
  "memory/heartbeat-state.md",
  "memory/today-digest.md",
  "memory/pending-actions.md",
  "intel/DAILY-INTEL.md",
  "metrics/dashboard.md",
];

const WATCHED_DIRS = [
  "comms",
  "content-engine/renders",
  "content-engine/state",
  "content-engine/intake/pending",
  "content-engine/intake/approved",
];

async function safeStat(filePath: string): Promise<number> {
  try {
    const s = await stat(filePath);
    return s.mtimeMs;
  } catch {
    return 0;
  }
}

export async function computeWorkspaceHash(): Promise<string> {
  // Stat all watched files and directories in parallel.
  // For directories, we only stat the directory itself — its mtime updates
  // when files are added, removed, or renamed inside it.
  const allPaths = [
    ...WATCHED_FILES.map((f) => path.join(WORKSPACE_PATH, f)),
    ...WATCHED_DIRS.map((d) => path.join(WORKSPACE_PATH, d)),
  ];

  const allMtimes = await Promise.all(allPaths.map(safeStat));

  const input = allMtimes.sort((a, b) => a - b).join(",");
  return createHash("md5").update(input).digest("hex").slice(0, 12);
}
