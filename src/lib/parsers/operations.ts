import fs from "fs";
import path from "path";
import os from "os";
import { parseCronList } from "./cron";
import { WORKSPACE_PATH } from "@/lib/config";
import type {
  OperationsData,
  OperationsQuota,
  OperationsFallbackNode,
  OperationsDailyUsage,
  OperationsCronReliability,
  ContentPerformanceData,
  ContentPerformanceXMetrics,
  ContentPerformancePipeline,
  ContentPerformanceEngagement,
} from "./types";

const CODEXBAR_SNAPSHOT_PATH = path.join(
  os.homedir(),
  "Library/Group Containers/group.com.steipete.codexbar/widget-snapshot.json"
);

function safeReadJson(filePath: string): unknown | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function formatResetTime(resetsAt: string): string {
  if (!resetsAt) return "";
  const reset = new Date(resetsAt);
  const now = new Date();
  const diffMs = reset.getTime() - now.getTime();
  if (diffMs <= 0) return "Resetting...";
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `Resets in ${days}d ${hours % 24}h`;
  }
  return hours > 0 ? `Resets in ${hours}h ${mins}m` : `Resets in ${mins}m`;
}

function loadOpenClawConfig(): { primaryModel: string; fallbackChain: string[] } {
  const filePath = path.join(process.env.HOME || "/Users/quark", ".openclaw/openclaw.json");
  const config = safeReadJson(filePath) as Record<string, unknown> | null;
  const defaults =
    (
      ((config?.agents as Record<string, unknown> | undefined)?.defaults as Record<string, unknown> | undefined)
        ?.model as Record<string, unknown> | undefined
    ) || {};

  const primaryModel = typeof defaults.primary === "string" ? defaults.primary : "openai-codex/gpt-5.3-codex";
  const fallbackChain = Array.isArray(defaults.fallbacks)
    ? defaults.fallbacks.filter((v): v is string => typeof v === "string")
    : [];

  return { primaryModel, fallbackChain };
}

interface CodexBarEntry {
  provider: string;
  primary?: { usedPercent: number; resetsAt: string; windowMinutes: number };
  secondary?: { usedPercent: number; resetsAt: string; windowMinutes: number };
  tokenUsage?: {
    sessionTokens: number;
    sessionCostUSD: number;
    last30DaysTokens: number;
    last30DaysCostUSD: number;
  };
  dailyUsage?: { dayKey: string; totalTokens: number; costUSD: number }[];
}

function loadCodexBarSnapshot(): {
  quota: OperationsQuota;
  dailyUsage: OperationsDailyUsage[];
  tokenUsage: OperationsData["tokenUsage"];
} {
  const defaults = {
    quota: {
      dailyRemaining: 0,
      dailyLabel: "Unavailable",
      weeklyRemaining: 0,
      weeklyLabel: "Unavailable",
    },
    dailyUsage: [] as OperationsDailyUsage[],
    tokenUsage: { sessionTokens: 0, sessionCostUSD: 0, last30DaysTokens: 0, last30DaysCostUSD: 0 },
  };

  try {
    const raw = fs.readFileSync(CODEXBAR_SNAPSHOT_PATH, "utf-8");
    const snapshot = JSON.parse(raw);
    const codex = (snapshot.entries as CodexBarEntry[])?.find((e) => e.provider === "codex");
    if (!codex) return defaults;

    const daily = codex.primary;
    const weekly = codex.secondary;

    return {
      quota: {
        dailyRemaining: daily ? 100 - daily.usedPercent : 0,
        dailyLabel: daily?.resetsAt ? formatResetTime(daily.resetsAt) : "Unavailable",
        weeklyRemaining: weekly ? 100 - weekly.usedPercent : 0,
        weeklyLabel: weekly?.resetsAt ? formatResetTime(weekly.resetsAt) : "Unavailable",
      },
      dailyUsage: (codex.dailyUsage || []).slice(-7),
      tokenUsage: codex.tokenUsage || defaults.tokenUsage,
    };
  } catch {
    return defaults;
  }
}

function buildFallbackChain(
  primaryModel: string,
  fallbackModels: string[]
): OperationsFallbackNode[] {
  const primaryShort = primaryModel.split("/").pop() || primaryModel;
  const nodes: OperationsFallbackNode[] = [
    { name: primaryShort, provider: primaryModel.split("/")[0] || "unknown", status: "active" },
  ];

  for (const fb of fallbackModels) {
    const fbShort = fb.split("/").pop() || fb;
    nodes.push({ name: fbShort, provider: fb.split("/")[0] || "unknown", status: "standby" });
  }

  // If no fallbacks configured, show default chain
  if (nodes.length === 1) {
    nodes.push({ name: "MiniMax M2.5", provider: "minimax", status: "standby" });
    nodes.push({ name: "Gemini 2.5 Flash", provider: "google", status: "standby" });
  }

  return nodes;
}

function buildCronReliability(): OperationsCronReliability {
  const jobs = parseCronList();
  const enabledJobs = jobs.filter((j) => j.enabled);
  const okJobs = enabledJobs.filter((j) => j.status === "ok");
  const failedJobs = enabledJobs.filter(
    (j) => j.status !== "ok" && j.status !== "idle" && j.status !== "disabled" && j.status !== "unknown"
  );
  const disabledJobs = jobs.filter((j) => !j.enabled);
  const totalEnabled = enabledJobs.length || 1;

  const recentFailures = failedJobs
    .sort((a, b) => (b.lastRunMs || 0) - (a.lastRunMs || 0))
    .slice(0, 5)
    .map((j) => ({ name: j.name, lastRun: j.lastRun, status: j.status }));

  return {
    totalJobs: jobs.length,
    okJobs: okJobs.length,
    failedJobs: failedJobs.length,
    disabledJobs: disabledJobs.length,
    successRate: Math.round((okJobs.length / totalEnabled) * 1000) / 10,
    recentFailures,
  };
}

function parseContentPerformance(): ContentPerformanceData | null {
  const dailyDir = path.join(WORKSPACE_PATH, "metrics/daily");
  try {
    const files = fs.readdirSync(dailyDir).filter((f) => f.endsWith(".md")).sort();
    if (files.length === 0) return null;
    const latest = files[files.length - 1];
    const content = fs.readFileSync(path.join(dailyDir, latest), "utf-8");
    const reportDate = latest.replace(".md", "");

    // --- X metrics ---
    const x: ContentPerformanceXMetrics = {
      postsToday: 0,
      impressions: 0,
      likes: 0,
      replies: 0,
      retweets: 0,
      bookmarks: 0,
    };

    const xPostsMatch = content.match(/\*\*X posts today:\*\*\s*(\d+)/);
    if (xPostsMatch) x.postsToday = parseInt(xPostsMatch[1], 10);

    // Match both "RTs" and "retweets" variants
    const xEngMatch = content.match(
      /\*\*X engagement:\*\*\s*(\d+)\s*impressions?,\s*(\d+)\s*likes?,\s*(\d+)\s*replies?,\s*(\d+)\s*(?:RTs?|retweets?),\s*(\d+)\s*bookmarks?/
    );
    if (xEngMatch) {
      x.impressions = parseInt(xEngMatch[1], 10);
      x.likes = parseInt(xEngMatch[2], 10);
      x.replies = parseInt(xEngMatch[3], 10);
      x.retweets = parseInt(xEngMatch[4], 10);
      x.bookmarks = parseInt(xEngMatch[5], 10);
    }

    // --- TikTok ---
    let tiktokPostsToday = 0;
    const tiktokMatch = content.match(/\*\*TikTok posts today:\*\*\s*(\d+)/);
    if (tiktokMatch) tiktokPostsToday = parseInt(tiktokMatch[1], 10);

    // --- Pipeline throughput ---
    const pipeline: ContentPerformancePipeline = {
      published: 0,
      killed: 0,
      stale: 0,
      pendingPreview: 0,
      contentTypes: {},
    };

    const jobsMatch = content.match(
      /\*\*Jobs today:\*\*\s*(\d+)\s*published,\s*(\d+)\s*killed,\s*(\d+)\s*stale(?:,\s*(\d+)\s*pending(?:\s*preview)?)?/
    );
    if (jobsMatch) {
      pipeline.published = parseInt(jobsMatch[1], 10);
      pipeline.killed = parseInt(jobsMatch[2], 10);
      pipeline.stale = parseInt(jobsMatch[3], 10);
      pipeline.pendingPreview = jobsMatch[4] ? parseInt(jobsMatch[4], 10) : 0;
    }

    const typesMatch = content.match(/\*\*Content types:\*\*\s*(.+)/);
    if (typesMatch && typesMatch[1] !== "N/A") {
      const pairs = typesMatch[1].match(/(\w+)=(\d+)/g);
      if (pairs) {
        for (const pair of pairs) {
          const [key, val] = pair.split("=");
          pipeline.contentTypes[key] = parseInt(val, 10);
        }
      }
    }

    // --- Engagement metrics ---
    const engagement: ContentPerformanceEngagement = {
      actionsByPlatform: {},
      guardrailBlocks: 0,
      engagementMode: "unknown",
    };

    // Parse "- x: like=11, reply=2" style lines
    const engagementSection = content.match(
      /### Engagement Metrics\n([\s\S]*?)(?=\n###|\n---|\n$)/
    );
    if (engagementSection) {
      const sectionText = engagementSection[1];
      const platformLines = sectionText.matchAll(
        /^- (\w+):\s*(.+)$/gm
      );
      for (const match of platformLines) {
        const platform = match[1];
        // Skip lines that start with ** (those are label lines, not platform lines)
        if (platform.startsWith("**") || match[2].startsWith("**")) continue;
        const actions: Record<string, number> = {};
        const actionPairs = match[2].match(/(\w+)=(\d+)/g);
        if (actionPairs) {
          for (const pair of actionPairs) {
            const [key, val] = pair.split("=");
            actions[key] = parseInt(val, 10);
          }
          engagement.actionsByPlatform[platform] = actions;
        }
      }

      const blocksMatch = sectionText.match(/\*\*Guardrail blocks:\*\*\s*(\d+)/);
      if (blocksMatch) engagement.guardrailBlocks = parseInt(blocksMatch[1], 10);

      const modeMatch = sectionText.match(/\*\*Engagement mode:\*\*\s*(\w+)/);
      if (modeMatch) engagement.engagementMode = modeMatch[1];
    }

    return {
      reportDate,
      x,
      tiktokPostsToday,
      pipeline,
      engagement,
    };
  } catch {
    return null;
  }
}

export function parseOperations(): OperationsData {
  const { primaryModel, fallbackChain } = loadOpenClawConfig();
  const { quota, dailyUsage, tokenUsage } = loadCodexBarSnapshot();
  const cronReliability = buildCronReliability();
  const primaryShort = primaryModel.split("/").pop() || primaryModel;

  return {
    generatedAt: new Date().toISOString(),
    activeModel: primaryShort,
    quota,
    fallbackChain: buildFallbackChain(primaryModel, fallbackChain),
    dailyUsage,
    tokenUsage,
    cronReliability,
    platforms: ["x", "tiktok", "instagram", "youtube", "substack"],
    contentPerformance: parseContentPerformance(),
  };
}
