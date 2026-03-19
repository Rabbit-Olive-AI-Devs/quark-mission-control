import { NextResponse } from "next/server";
import { parseCronList } from "@/lib/parsers/cron";

export const dynamic = "force-dynamic";

export interface CronRunEntry {
  timestamp: string;
  status: "ok" | "error";
  durationMs: number;
}

export interface ScheduleJob {
  id: string;
  name: string;
  schedule: string;
  scheduleHuman: string;
  timezone: string;
  model: string;
  status: string;
  lastRun: string | null;
  nextRun: string | null;
  lastRunMs: number | null;
  nextRunMs: number | null;
  agentId: string | null;
  enabled: boolean;
  recentRuns: CronRunEntry[];
}

export async function GET() {
  const jobs = parseCronList();

  // Build recentRuns from available state.
  // Currently we only have the latest run per job from openclaw cron list.
  // Generate a single-entry array from lastRunMs + status.
  // When cron-history API is implemented, replace this with real 7-day data.
  const enriched: ScheduleJob[] = jobs.map((job) => {
    const recentRuns: CronRunEntry[] = [];
    if (job.lastRunMs) {
      recentRuns.push({
        timestamp: new Date(job.lastRunMs).toISOString(),
        status: job.status === "error" ? "error" : "ok",
        durationMs: 0, // Duration not available from cron list
      });
    }
    return { ...job, recentRuns };
  });

  return NextResponse.json({
    jobs: enriched,
    summary: {
      total: jobs.length,
      ok: jobs.filter((j) => j.status === "ok").length,
      failed: jobs.filter(
        (j) => j.status !== "ok" && j.status !== "idle" && j.status !== "unknown" && j.status !== "disabled"
      ).length,
    },
  });
}
