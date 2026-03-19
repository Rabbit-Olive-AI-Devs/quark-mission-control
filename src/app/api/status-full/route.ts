import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

import { parsePipelineData } from "@/lib/parsers/pipeline";
import { parseCronList } from "@/lib/parsers/cron";
import { parseMetrics } from "@/lib/parsers/metrics";
import { parseHeartbeat } from "@/lib/parsers/heartbeat";
import { getSystemInfo, getOAuthStatus } from "@/lib/parsers/system";
import { parseEngagement } from "@/lib/parsers/engagement";
import { parseCognitive } from "@/lib/parsers/cognitive";
import { parseIntel } from "@/lib/parsers/intel";
import { parseDigest } from "@/lib/parsers/digest";
import {
  derivePipelineStatus,
  deriveCronStatus,
  deriveQuotaStatus,
  deriveQuarkStatus,
  deriveSystemStatus,
  computeHealthScore,
} from "@/lib/status-logic";
import { WORKSPACE_PATH } from "@/lib/config";
import type { ActivityEntry, ContentTodayData, StatusFullResponse } from "@/lib/parsers/types";

const PUBLISH_AUDIT_PATH = path.join(WORKSPACE_PATH, "content-engine/state/publish-audit.jsonl");
const PUBLISH_MODE_PATH = path.join(WORKSPACE_PATH, "content-engine/state/publish-mode.json");

function getTodayStr(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

function parseContentToday(): ContentTodayData {
  const todayStr = getTodayStr();
  let publishedCount = 0;
  const platformSet = new Set<string>();
  let publishMode: "LIVE" | "WARMUP" = "WARMUP";

  // Parse publish-audit.jsonl for today's publishes
  try {
    const content = fs.readFileSync(PUBLISH_AUDIT_PATH, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (
          entry.published_at?.startsWith(todayStr) &&
          entry.outcome === "published"
        ) {
          publishedCount++;
          if (entry.format) platformSet.add(entry.format);
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // File doesn't exist yet
  }

  // Read publish mode
  try {
    const raw = fs.readFileSync(PUBLISH_MODE_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (data.mode === "LIVE" || data.mode === "live") {
      publishMode = "LIVE";
    }
  } catch {
    // Default to WARMUP
  }

  return {
    publishedCount,
    platforms: [...platformSet],
    publishMode,
  };
}

const ERROR_KEYWORDS = ["fail", "error", "blind", "degraded", "crash", "broken"];
const WARNING_KEYWORDS = ["stuck", "warn", "stale", "timeout", "slow", "retry"];

function parseActivity(
  digestSections: Array<{ timeRange: string; items: string[] }>
): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  for (const section of digestSections) {
    for (const item of section.items) {
      const lower = item.toLowerCase();
      let level: ActivityEntry["level"] = "info";

      if (ERROR_KEYWORDS.some((kw) => lower.includes(kw))) {
        level = "error";
      } else if (WARNING_KEYWORDS.some((kw) => lower.includes(kw))) {
        level = "warning";
      }

      entries.push({
        timestamp: section.timeRange,
        text: item,
        level,
      });
    }
  }

  // Newest first, max 8 entries
  return entries.reverse().slice(0, 8);
}

export async function GET() {
  try {
    const [pipeline, cronJobs, metrics, heartbeat, system, engagement, cognitive, intel, digest, oauth] =
      await Promise.all([
        parsePipelineData(),
        parseCronList(),
        parseMetrics(),
        parseHeartbeat(),
        getSystemInfo(),
        parseEngagement(),
        parseCognitive(),
        parseIntel(),
        parseDigest(),
        Promise.resolve(getOAuthStatus()),
      ]);

    // --- Derive status cards (same logic as /api/status) ---

    const jobs = pipeline?.jobs ?? [];
    const pipelineStatus = derivePipelineStatus({
      jobs: jobs.map((j) => ({
        status: String(j.status ?? ""),
        updated_at: String(j.createdAt ?? ""),
        stage: j.stages?.length
          ? String(j.stages[j.stages.length - 1].name)
          : "",
      })),
    });

    // Compute stuckCount explicitly
    const TERMINAL = new Set(["published", "completed", "killed", "quarantined"]);
    const APPROVAL_WAIT = new Set(["preview_sent"]);
    const STUCK_THRESHOLD_MS = 3600_000;
    const activeJobs = jobs.filter((j) => !TERMINAL.has(j.status));
    const stuckCount = activeJobs.filter((j) => {
      if (APPROVAL_WAIT.has(j.status)) return false;
      const age = Date.now() - new Date(j.createdAt).getTime();
      return age > STUCK_THRESHOLD_MS;
    }).length;
    const quarantinedCount = jobs.filter((j) => j.status === "quarantined").length;

    const cronArray = Array.isArray(cronJobs) ? cronJobs : [];
    const cronStatus = deriveCronStatus({
      jobs: cronArray.map((j) => ({
        name: String(j.name ?? ""),
        status: String(j.status ?? ""),
      })),
    });

    const quotaStatus = deriveQuotaStatus({
      dailyPct: Number(metrics?.codexQuota?.dailyRemaining ?? 100),
      weeklyPct: Number(metrics?.codexQuota?.weeklyRemaining ?? 100),
    });

    const recentRuns = cronArray.length;
    const recentFailures = cronArray.filter((j) => j.status === "error").length;
    const quarkStatus = deriveQuarkStatus({
      lastHeartbeat: String(heartbeat?.lastHeartbeat ?? new Date().toISOString()),
      recentRuns,
      recentFailures,
      windowHours: 6,
    });

    const systemStatus = deriveSystemStatus({
      cpu: Number(system?.cpuPercent ?? 0),
      memory: system
        ? Math.round((system.memoryUsedMb / system.memoryTotalMb) * 100)
        : 0,
      disk: system
        ? Math.round((system.diskUsedGb / system.diskTotalGb) * 100)
        : 0,
    });

    // --- Health score ---

    const cronOk = cronArray.filter((j) => j.status !== "error").length;
    const healthScore = computeHealthScore({
      cronOk,
      cronTotal: cronArray.length,
      pipelineStuckCount: stuckCount,
      pipelineQuarantinedCount: quarantinedCount,
      quotaDailyPct: Number(metrics?.codexQuota?.dailyRemaining ?? 100),
      quotaWeeklyPct: Number(metrics?.codexQuota?.weeklyRemaining ?? 100),
      systemCpu: systemStatus.cpu,
      systemMemory: systemStatus.memory,
      systemDisk: systemStatus.disk,
      quarkLevel: quarkStatus.level,
    });

    // --- New sections ---

    const contentToday = parseContentToday();
    const activity = parseActivity(digest);

    const cognitiveData = cognitive?.current
      ? {
          memoryHealth: cognitive.current.memoryHealth,
          proactivity: cognitive.current.proactivity,
          engagement: cognitive.current.engagement,
          degradationFlags: cognitive.current.degradationFlags,
        }
      : null;

    const response: StatusFullResponse = {
      pipeline: {
        ...pipelineStatus,
        stuckCount,
        scorecard: pipeline?.scorecard ?? {
          published: 0,
          killed: 0,
          stale: 0,
          pending: 0,
          avgTimeToPublish: 0,
          contentTypeBreakdown: {},
        },
      },
      cron: { ...cronStatus, jobs: cronArray },
      quota: { ...quotaStatus, raw: metrics?.codexQuota ?? null },
      quark: { ...quarkStatus, heartbeat: heartbeat ?? null },
      system: {
        ...systemStatus,
        uptime: system?.uptime ?? 0,
        osVersion: system?.osVersion ?? "",
      },
      engagement: {
        today: engagement?.today ?? { total: 0, byPlatform: {}, byAction: {} },
        inboundGap: {
          replyRate: engagement?.inboundGap?.replyRate ?? 0,
          unansweredCount: engagement?.inboundGap?.unansweredCount ?? 0,
        },
        guardrailBlocks: engagement?.guardrailBlocks?.length ?? 0,
      },
      cognitive: cognitiveData,
      intel: {
        highSignal: intel?.highSignal ?? [],
        updatedAt: intel?.compiled ?? new Date().toISOString(),
      },
      contentToday,
      activity,
      oauth,
      healthScore,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "CDN-Cache-Control": "s-maxage=15, stale-while-revalidate=45, stale-if-error=3600",
        "Cache-Control": "public, max-age=5",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to compute status-full", details: String(error) },
      { status: 500 }
    );
  }
}
