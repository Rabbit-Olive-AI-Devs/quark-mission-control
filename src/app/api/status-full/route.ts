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
import { parsePostPerformance } from "@/lib/parsers/post-performance";
import {
  derivePipelineStatus,
  deriveCronStatus,
  deriveQuotaStatus,
  deriveQuarkStatus,
  deriveSystemStatus,
  computeHealthScore,
} from "@/lib/status-logic";
import { WORKSPACE_PATH } from "@/lib/config";
import type { ActivityEntry, ContentTodayData, StatusFullResponse, PostPerformanceSummary } from "@/lib/parsers/types";

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

function derivePostPerformanceSummary(): PostPerformanceSummary {
  const data = parsePostPerformance();

  if (!data || data.posts.length === 0) {
    return {
      totalImpressions: 0,
      avgER: 0,
      followerDelta: 0,
      diagnosticSummary: "no data",
      totalFollowers: 0,
      totalWatchTimeMinutes: 0,
    };
  }

  const posts = data.posts;

  // Total impressions: X uses impressions, other platforms use views
  const totalImpressions = posts.reduce((sum, p) => {
    const m = p.metrics as { impressions?: number; views?: number };
    const imp = m.impressions ?? 0;
    const views = m.views ?? 0;
    return sum + (imp > 0 ? imp : views);
  }, 0);

  // Average engagement rate across posts that have it
  const erPosts = posts.filter((p) => {
    const m = p.metrics as { engagement_rate?: number };
    return typeof m.engagement_rate === "number" && m.engagement_rate > 0;
  });
  const avgER =
    erPosts.length > 0
      ? erPosts.reduce((sum, p) => {
          const m = p.metrics as { engagement_rate?: number };
          return sum + (m.engagement_rate ?? 0);
        }, 0) / erPosts.length
      : 0;

  // Helper to sum all platform followers from a snapshot
  const sumAllFollowers = (s: { x_followers?: number; tiktok_followers?: number; instagram_followers?: number; youtube_followers?: number; substack_subscribers?: number }) =>
    (s.x_followers ?? 0) +
    (s.tiktok_followers ?? 0) +
    (s.instagram_followers ?? 0) +
    (s.youtube_followers ?? 0) +
    (s.substack_subscribers ?? 0);

  // Follower delta: diff between latest and oldest snapshot (all platforms)
  let followerDelta = 0;
  let totalFollowers = 0;
  if (data.followerHistory.length >= 1) {
    const sorted = [...data.followerHistory].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const newest = sorted[sorted.length - 1];
    totalFollowers = sumAllFollowers(newest);
    if (sorted.length >= 2) {
      const oldest = sorted[0];
      followerDelta = totalFollowers - sumAllFollowers(oldest);
    }
  }

  // Total watch time minutes (YouTube)
  const totalWatchTimeMinutes = posts.reduce((sum, p) => {
    const m = p.metrics as { watch_time_minutes?: number };
    return sum + (m.watch_time_minutes ?? 0);
  }, 0);

  // Diagnostic summary: count by label
  const counts: Record<string, number> = {};
  for (const p of posts) {
    const label = p.diagnostic ?? "unclassified";
    counts[label] = (counts[label] ?? 0) + 1;
  }

  // Order: scale, fix_hooks, fix_distribution, rethink, unclassified
  const LABEL_DISPLAY: Record<string, string> = {
    scale: "SCALE",
    fix_hooks: "FIX HOOKS",
    fix_distribution: "FIX DIST",
    rethink: "RETHINK",
    unclassified: "UNCLASSIFIED",
  };
  const parts: string[] = [];
  for (const [key, display] of Object.entries(LABEL_DISPLAY)) {
    if (counts[key]) {
      parts.push(`${counts[key]} ${display}`);
    }
  }
  const diagnosticSummary = parts.length > 0 ? parts.join(", ") : "no data";

  return { totalImpressions, avgER, followerDelta, diagnosticSummary, totalFollowers, totalWatchTimeMinutes };
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

    const postPerformanceSummary = derivePostPerformanceSummary();
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
      postPerformance: postPerformanceSummary,
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
