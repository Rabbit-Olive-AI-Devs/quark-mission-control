import { execSync } from "child_process";
import type { CronJob } from "./types";

interface CronJobJSON {
  id: string;
  name: string;
  enabled: boolean;
  schedule: { kind: string; expr: string; tz?: string };
  sessionTarget: string;
  payload?: { model?: string; timeoutSeconds?: number; agentId?: string };
  state?: { nextRunAtMs?: number; lastRunAtMs?: number; lastRunStatus?: string };
}

/** Convert cron expression to human-readable schedule in the job's timezone */
function cronToHuman(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return expr;

  const [minute, hour, , , dayOfWeek] = parts;

  // Format hours
  const formatHour = (h: number): string => {
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${minute.padStart(2, "0")} ${ampm}`;
  };

  const hours = hour.split(",").map(Number);
  const timeStr = hours.map(formatHour).join(", ");

  // Day of week
  const dayMap: Record<string, string> = { "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat" };
  if (dayOfWeek !== "*") {
    const days = dayOfWeek.split(",").map((d) => dayMap[d] || d).join(", ");
    return `${days} ${timeStr}`;
  }

  return timeStr;
}

function formatRelative(ms: number | undefined): string | null {
  if (!ms) return null;
  const diff = ms - Date.now();
  const absDiff = Math.abs(diff);
  const hours = Math.floor(absDiff / 3600000);
  const mins = Math.floor((absDiff % 3600000) / 60000);

  if (diff > 0) {
    if (hours > 24) return `in ${Math.floor(hours / 24)}d`;
    if (hours > 0) return `in ${hours}h ${mins}m`;
    return `in ${mins}m`;
  } else {
    if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
    if (hours > 0) return `${hours}h ${mins}m ago`;
    return `${mins}m ago`;
  }
}

function findOpenclawBin(): string {
  const envPath = process.env.OPENCLAW_BIN;
  if (envPath) return envPath;

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

  try {
    return execSync("which openclaw 2>/dev/null", { encoding: "utf-8", timeout: 3000 }).trim();
  } catch {
    return "openclaw";
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
      schedule: job.schedule.expr,
      scheduleHuman: cronToHuman(job.schedule.expr),
      timezone: job.schedule.tz || "UTC",
      model: job.payload?.model || "default",
      status: job.state?.lastRunStatus || (job.enabled ? "idle" : "disabled"),
      lastRun: formatRelative(job.state?.lastRunAtMs),
      nextRun: formatRelative(job.state?.nextRunAtMs),
      lastRunMs: job.state?.lastRunAtMs || null,
      nextRunMs: job.state?.nextRunAtMs || null,
      agentId: job.payload?.agentId || null,
      enabled: job.enabled,
    }));
  } catch {
    return [];
  }
}
