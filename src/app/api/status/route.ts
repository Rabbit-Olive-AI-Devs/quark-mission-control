import { NextResponse } from "next/server";
import { parsePipelineData } from "@/lib/parsers/pipeline";
import { parseCronList } from "@/lib/parsers/cron";
import { parseMetrics } from "@/lib/parsers/metrics";
import { parseHeartbeat } from "@/lib/parsers/heartbeat";
import { getSystemInfo } from "@/lib/parsers/system";
import { parseSessionLog } from "@/lib/parsers/session-log";
import {
  derivePipelineStatus,
  deriveCronStatus,
  deriveQuotaStatus,
  deriveQuarkStatus,
  deriveSystemStatus,
} from "@/lib/status-logic";

export async function GET() {
  try {
    const [pipeline, cronJobs, metrics, heartbeat, system, sessionLog] =
      await Promise.all([
        parsePipelineData(),
        parseCronList(),
        parseMetrics(),
        parseHeartbeat(),
        getSystemInfo(),
        parseSessionLog(),
      ]);

    // Map parser fields to status logic input shapes
    const pipelineStatus = derivePipelineStatus({
      jobs: (pipeline?.jobs ?? []).map((j) => ({
        status: String(j.status ?? ""),
        updated_at: String(j.createdAt ?? ""),
        stage: j.stages?.length
          ? String(j.stages[j.stages.length - 1].name)
          : "",
      })),
    });

    // parseCronList() returns CronJob[] directly (not an object with .jobs)
    const cronArray = Array.isArray(cronJobs) ? cronJobs : [];

    const cronStatus = deriveCronStatus({
      jobs: cronArray.map((j) => ({
        name: String(j.name ?? ""),
        status: String(j.status ?? ""),
        // CronJob type has no lastError field — omit it
      })),
    });

    const quotaStatus = deriveQuotaStatus({
      dailyPct: Number(metrics?.codexQuota?.dailyRemaining ?? 100),
      weeklyPct: Number(metrics?.codexQuota?.weeklyRemaining ?? 100),
    });

    const recentRuns = cronArray.length;
    const recentFailures = cronArray.filter((j) => j.status === "error").length;

    const quarkStatus = deriveQuarkStatus({
      lastHeartbeat: String(
        heartbeat?.lastHeartbeat ?? new Date().toISOString()
      ),
      recentRuns,
      recentFailures,
      windowHours: 6,
    });

    // SystemInfo: cpuPercent, memoryUsedMb, memoryTotalMb, diskUsedGb, diskTotalGb
    const systemStatus = deriveSystemStatus({
      cpu: Number(system?.cpuPercent ?? 0),
      memory: system
        ? Math.round((system.memoryUsedMb / system.memoryTotalMb) * 100)
        : 0,
      disk: system
        ? Math.round((system.diskUsedGb / system.diskTotalGb) * 100)
        : 0,
    });

    // sessionLog (SessionEntry[]) is available for downstream consumers
    void sessionLog;

    return NextResponse.json(
      {
        pipeline: pipelineStatus,
        cron: { ...cronStatus, jobs: cronArray },
        quota: { ...quotaStatus, raw: metrics?.codexQuota },
        quark: { ...quarkStatus, heartbeat },
        system: {
          ...systemStatus,
          uptime: system?.uptime,
          osVersion: system?.osVersion,
        },
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "CDN-Cache-Control":
            "s-maxage=15, stale-while-revalidate=45, stale-if-error=3600",
          "Cache-Control": "public, max-age=5",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to compute status", details: String(error) },
      { status: 500 }
    );
  }
}
