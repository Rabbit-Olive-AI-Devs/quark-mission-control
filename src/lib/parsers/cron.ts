import { execSync } from "child_process";
import type { CronJob } from "./types";

interface CronJobJSON {
  id: string;
  name: string;
  enabled: boolean;
  schedule: { kind: string; expr: string; tz?: string };
  sessionTarget: string;
  payload?: { model?: string; timeoutSeconds?: number };
  state?: { nextRunAtMs?: number; lastRunAtMs?: number; lastRunStatus?: string };
}

function formatRelative(ms: number | undefined): string | null {
  if (!ms) return null;
  const diff = ms - Date.now();
  const absDiff = Math.abs(diff);
  const hours = Math.floor(absDiff / 3600000);
  const mins = Math.floor((absDiff % 3600000) / 60000);

  if (diff > 0) {
    if (hours > 24) return `in ${Math.floor(hours / 24)}d`;
    if (hours > 0) return `in ${hours}h`;
    return `in ${mins}m`;
  } else {
    if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${mins}m ago`;
  }
}

function findOpenclawBin(): string {
  const envPath = process.env.OPENCLAW_BIN;
  if (envPath) return envPath;

  // Try common locations
  const candidates = [
    "/opt/homebrew/bin/openclaw",
    "/usr/local/bin/openclaw",
    "/usr/bin/openclaw",
  ];
  for (const bin of candidates) {
    try {
      execSync(`test -x ${bin}`, { timeout: 2000 });
      return bin;
    } catch {
      // try next
    }
  }

  // Fallback: try PATH
  try {
    return execSync("which openclaw 2>/dev/null", { encoding: "utf-8", timeout: 3000 }).trim();
  } catch {
    return "openclaw"; // last resort, let it fail naturally
  }
}

export function parseCronList(): CronJob[] {
  try {
    const bin = findOpenclawBin();
    const output = execSync(`${bin} cron list --json 2>/dev/null`, {
      timeout: 10000,
      encoding: "utf-8",
    });

    const data = JSON.parse(output);
    const jobs: CronJobJSON[] = data.jobs || [];

    return jobs.map((job) => ({
      id: job.id.slice(0, 8),
      name: job.name,
      schedule: `cron ${job.schedule.expr}`,
      model: job.payload?.model || "default",
      status: job.state?.lastRunStatus || (job.enabled ? "idle" : "disabled"),
      lastRun: formatRelative(job.state?.lastRunAtMs),
      nextRun: formatRelative(job.state?.nextRunAtMs),
      enabled: job.enabled,
    }));
  } catch {
    return [];
  }
}
