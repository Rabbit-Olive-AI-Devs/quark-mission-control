import type { StatusCard } from "./parsers/types";

interface PipelineInput {
  jobs: Array<{
    status: string;
    updated_at: string;
    stage?: string;
  }>;
}

const TERMINAL = new Set(["published", "completed", "killed", "quarantined"]);
const APPROVAL_WAIT = new Set(["preview_sent"]);
const STUCK_THRESHOLD_MS = 3600_000;

export function derivePipelineStatus(input: PipelineInput): StatusCard {
  const active = input.jobs.filter((j) => !TERMINAL.has(j.status));
  const stuck = active.filter((j) => {
    if (APPROVAL_WAIT.has(j.status)) return false;
    const age = Date.now() - new Date(j.updated_at).getTime();
    return age > STUCK_THRESHOLD_MS;
  });

  if (stuck.length > 0) {
    const worst = stuck[0];
    const hours = Math.round(
      (Date.now() - new Date(worst.updated_at).getTime()) / 3600_000
    );
    return {
      level: "warning",
      sentence: `${stuck.length} job${stuck.length > 1 ? "s" : ""} stuck${worst.stage ? ` at ${worst.stage}` : ""} (${hours}h)`,
      details: { stuck, active },
    };
  }

  if (active.length > 0) {
    return {
      level: "healthy",
      sentence: `${active.length} job${active.length > 1 ? "s" : ""} active, on track`,
      details: { active },
    };
  }

  return {
    level: "healthy",
    sentence: "No active jobs",
    details: { active: [] },
  };
}

interface CronInput {
  jobs: Array<{
    name: string;
    status: string;
    lastError?: string;
  }>;
}

export function deriveCronStatus(input: CronInput): StatusCard {
  const failed = input.jobs.filter((j) => j.status === "error");
  const total = input.jobs.length;

  if (failed.length === 0) {
    return {
      level: "healthy",
      sentence: `All ${total} jobs healthy`,
      details: { total, failed: [] },
    };
  }

  const names = failed.slice(0, 2).map((j) => j.name).join(", ");
  const extra = failed.length > 2 ? ` +${failed.length - 2} more` : "";

  return {
    level: "critical",
    sentence: `${failed.length}/${total} failed: ${names}${extra}`,
    details: { total, failed },
  };
}

interface QuotaInput {
  dailyPct: number;
  weeklyPct: number;
}

export function deriveQuotaStatus(input: QuotaInput): StatusCard {
  const pct = Math.min(input.dailyPct, input.weeklyPct);

  if (pct > 40) {
    return {
      level: "healthy",
      sentence: `${Math.round(pct)}% remaining, pace normal`,
      details: input as unknown as Record<string, unknown>,
    };
  }

  if (pct > 20) {
    return {
      level: "warning",
      sentence: `${Math.round(pct)}% remaining — watch usage`,
      details: input as unknown as Record<string, unknown>,
    };
  }

  const hoursLeft = Math.round((pct / (100 - pct)) * 18);
  return {
    level: "critical",
    sentence: `${Math.round(pct)}% remaining, exhausts in ~${hoursLeft}h`,
    details: { ...input, hoursLeft } as Record<string, unknown>,
  };
}

interface QuarkInput {
  lastHeartbeat: string;
  recentRuns: number;
  recentFailures: number;
  windowHours: number;
}

export function deriveQuarkStatus(input: QuarkInput): StatusCard {
  const silentMs = Date.now() - new Date(input.lastHeartbeat).getTime();
  const silentMin = Math.round(silentMs / 60_000);
  const okRuns = input.recentRuns - input.recentFailures;

  if (silentMin > 60) {
    return {
      level: "critical",
      sentence: `Silent ${silentMin}min, ${input.recentFailures} failures in last ${input.windowHours}h`,
      details: input as unknown as Record<string, unknown>,
    };
  }

  if (silentMin > 30 || input.recentFailures >= 3) {
    return {
      level: "warning",
      sentence: `Silent ${silentMin}min, ${okRuns}/${input.recentRuns} runs OK (${input.windowHours}h)`,
      details: input as unknown as Record<string, unknown>,
    };
  }

  return {
    level: "healthy",
    sentence: `Active, ${okRuns}/${input.recentRuns} runs OK (${input.windowHours}h)`,
    details: input as unknown as Record<string, unknown>,
  };
}

interface SystemInput {
  cpu: number;
  memory: number;
  disk: number;
}

export function deriveSystemStatus(
  input: SystemInput
): StatusCard & { cpu: number; memory: number; disk: number } {
  const max = Math.max(input.cpu, input.memory, input.disk);

  let level: "healthy" | "warning" | "critical" = "healthy";
  if (max > 95) level = "critical";
  else if (max > 80) level = "warning";

  return {
    level,
    sentence: `CPU ${input.cpu}% · Mem ${input.memory}% · Disk ${input.disk}%`,
    details: input as unknown as Record<string, unknown>,
    cpu: input.cpu,
    memory: input.memory,
    disk: input.disk,
  };
}
