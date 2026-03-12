import { createHash } from "crypto";
import { stat, readdir } from "fs/promises";
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

async function dirMtimes(dirPath: string): Promise<number[]> {
  const mtimes: number[] = [];
  try {
    const dirStat = await stat(dirPath);
    mtimes.push(dirStat.mtimeMs);
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      const s = await stat(entryPath);
      mtimes.push(s.mtimeMs);
    }
  } catch {
    mtimes.push(0);
  }
  return mtimes;
}

export async function computeWorkspaceHash(): Promise<string> {
  const allMtimes: number[] = [];

  for (const file of WATCHED_FILES) {
    allMtimes.push(await safeStat(path.join(WORKSPACE_PATH, file)));
  }

  for (const dir of WATCHED_DIRS) {
    const mtimes = await dirMtimes(path.join(WORKSPACE_PATH, dir));
    allMtimes.push(...mtimes);
  }

  const input = allMtimes.sort((a, b) => a - b).join(",");
  return createHash("md5").update(input).digest("hex").slice(0, 12);
}
