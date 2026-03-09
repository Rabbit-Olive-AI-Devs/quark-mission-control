import fs from "fs";
import path from "path";
import { WORKSPACE_PATH } from "../config";

export type CommandCenterModelRow = {
  model: string;
  provider: string;
  runs: number;
  okRuns: number;
  errorRuns: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  avgDurationMs: number;
  lastSeen: string | null;
  sharePct: number;
};

export type CommandCenterAnomaly = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
};

export type CommandCenterData = {
  generatedAt: string;
  primaryModel: string;
  fallbackChain: string[];
  quota: {
    dailyRemaining: number;
    dailyLabel: string;
    weeklyRemaining: number;
    weeklyLabel: string;
  };
  windows: {
    last24h: {
      totalRuns: number;
      successRate: number;
      totalTokens: number;
      avgDurationMs: number;
      primarySharePct: number;
      fallbackSharePct: number;
    };
    last7d: {
      totalRuns: number;
      successRate: number;
      totalTokens: number;
      avgDurationMs: number;
      primarySharePct: number;
      fallbackSharePct: number;
    };
  };
  cost: {
    visibility: "estimated" | "unpriced";
    estimatedUsd7d: number;
    note: string;
  };
  topModels24h: CommandCenterModelRow[];
  topModels7d: CommandCenterModelRow[];
  anomalies: CommandCenterAnomaly[];
};

type RunEntry = {
  ts?: number;
  status?: string;
  summary?: string;
  error?: string;
  durationMs?: number;
  model?: string;
  provider?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
};

function safeReadJson(filePath: string): unknown | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function loadOpenClawConfig(): { primaryModel: string; fallbackChain: string[] } {
  const filePath = path.join(process.env.HOME || "/Users/quark", ".openclaw/openclaw.json");
  const config = safeReadJson(filePath) as Record<string, unknown> | null;
  const defaults = (((config?.agents as Record<string, unknown> | undefined)?.defaults as Record<string, unknown> | undefined)?.model as Record<string, unknown> | undefined) || {};

  const primaryModel = typeof defaults.primary === "string" ? defaults.primary : "openai-codex/gpt-5.4";
  const fallbackChain = Array.isArray(defaults.fallbacks)
    ? defaults.fallbacks.filter((v): v is string => typeof v === "string")
    : [];

  return { primaryModel, fallbackChain };
}

function loadQuota(): CommandCenterData["quota"] {
  const metricsPath = path.join(WORKSPACE_PATH, "metrics/dashboard.md");
  const fallback = {
    dailyRemaining: 100,
    dailyLabel: "Unknown",
    weeklyRemaining: 100,
    weeklyLabel: "Unknown",
  };

  try {
    const content = fs.readFileSync(metricsPath, "utf-8");
    const dailyMatch = content.match(/Codex usage window:\s*\*\*(\d+)%\s*remaining\*\*/);
    const weeklyMatch = content.match(/Codex weekly quota:\s*\*\*(\d+)%\s*remaining\*\*/);
    const dailyLabel = content.match(/Codex usage window:\s*\*\*[^*]+\*\*\s*\(([^)]+)\)/)?.[1] || fallback.dailyLabel;
    const weeklyLabel = content.match(/Codex weekly quota:\s*\*\*[^*]+\*\*\s*\(([^)]+)\)/)?.[1] || fallback.weeklyLabel;

    return {
      dailyRemaining: dailyMatch ? parseInt(dailyMatch[1], 10) : fallback.dailyRemaining,
      dailyLabel,
      weeklyRemaining: weeklyMatch ? parseInt(weeklyMatch[1], 10) : fallback.weeklyRemaining,
      weeklyLabel,
    };
  } catch {
    return fallback;
  }
}

function loadRuns(): RunEntry[] {
  const dir = path.join(process.env.HOME || "/Users/quark", ".openclaw/cron/runs");
  if (!fs.existsSync(dir)) return [];

  const runs: RunEntry[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".jsonl")) continue;
    const filePath = path.join(dir, file);
    try {
      const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
      for (const line of lines) {
        const parsed = JSON.parse(line) as RunEntry & { action?: string };
        if (parsed.action !== "finished") continue;
        runs.push(parsed);
      }
    } catch {
      // skip bad file
    }
  }

  return runs;
}

function summarizeModels(runs: RunEntry[]): CommandCenterModelRow[] {
  const map = new Map<string, CommandCenterModelRow>();
  const totalRuns = runs.length || 1;

  for (const run of runs) {
    const model = run.model || "unknown";
    const provider = run.provider || "unknown";
    const key = `${provider}::${model}`;
    const current = map.get(key) || {
      model,
      provider,
      runs: 0,
      okRuns: 0,
      errorRuns: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      avgDurationMs: 0,
      lastSeen: null,
      sharePct: 0,
    };

    current.runs += 1;
    if ((run.status || "").toLowerCase() === "ok") current.okRuns += 1;
    else current.errorRuns += 1;

    current.inputTokens += run.usage?.input_tokens || 0;
    current.outputTokens += run.usage?.output_tokens || 0;
    current.totalTokens += run.usage?.total_tokens || 0;
    current.avgDurationMs += run.durationMs || 0;

    if (typeof run.ts === "number") {
      const seen = new Date(run.ts).toISOString();
      if (!current.lastSeen || seen > current.lastSeen) current.lastSeen = seen;
    }

    map.set(key, current);
  }

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      avgDurationMs: row.runs ? Math.round(row.avgDurationMs / row.runs) : 0,
      sharePct: Math.round((row.runs / totalRuns) * 1000) / 10,
    }))
    .sort((a, b) => b.runs - a.runs || b.totalTokens - a.totalTokens);
}

function summarizeWindow(runs: RunEntry[], primaryModel: string) {
  const totalRuns = runs.length;
  const okRuns = runs.filter((r) => (r.status || "").toLowerCase() === "ok").length;
  const totalTokens = runs.reduce((sum, r) => sum + (r.usage?.total_tokens || 0), 0);
  const avgDurationMs = totalRuns
    ? Math.round(runs.reduce((sum, r) => sum + (r.durationMs || 0), 0) / totalRuns)
    : 0;
  const primaryShort = primaryModel.split("/").pop() || primaryModel;
  const primaryRuns = runs.filter((r) => (r.model || "") === primaryShort || `${r.provider || ""}/${r.model || ""}` === primaryModel).length;
  const primarySharePct = totalRuns ? Math.round((primaryRuns / totalRuns) * 1000) / 10 : 0;

  return {
    totalRuns,
    successRate: totalRuns ? Math.round((okRuns / totalRuns) * 1000) / 10 : 100,
    totalTokens,
    avgDurationMs,
    primarySharePct,
    fallbackSharePct: totalRuns ? Math.round(((totalRuns - primaryRuns) / totalRuns) * 1000) / 10 : 0,
  };
}

function detectAnomalies(runs24h: RunEntry[], runs7d: RunEntry[], primaryModel: string): CommandCenterAnomaly[] {
  const anomalies: CommandCenterAnomaly[] = [];
  const shortPrimary = primaryModel.split("/").pop() || primaryModel;

  const errors24h = runs24h.filter((r) => (r.status || "").toLowerCase() !== "ok");
  if (errors24h.length >= 3) {
    anomalies.push({
      id: "cron-errors-24h",
      severity: errors24h.length >= 6 ? "critical" : "warning",
      title: "Cron errors detected",
      detail: `${errors24h.length} failed cron runs in the last 24h.`,
    });
  }

  const authRelated = runs7d.filter((r) => /401|auth|oauth|refresh_token|token refresh/i.test(`${r.error || ""} ${r.summary || ""}`));
  if (authRelated.length > 0) {
    anomalies.push({
      id: "auth-signals",
      severity: "warning",
      title: "Auth or token instability seen",
      detail: `${authRelated.length} run(s) in the last 7d mention auth, OAuth, or token refresh issues.`,
    });
  }

  const primary24h = runs24h.filter((r) => (r.model || "") === shortPrimary || `${r.provider || ""}/${r.model || ""}` === primaryModel).length;
  if (runs24h.length >= 5 && primary24h / runs24h.length < 0.6) {
    anomalies.push({
      id: "fallback-spike-24h",
      severity: "critical",
      title: "Fallback spike",
      detail: `Primary model handled only ${Math.round((primary24h / runs24h.length) * 100)}% of runs in the last 24h.`,
    });
  }

  const longRuns = runs24h.filter((r) => (r.durationMs || 0) > 180000);
  if (longRuns.length >= 3) {
    anomalies.push({
      id: "slow-runs-24h",
      severity: "warning",
      title: "Slow run cluster",
      detail: `${longRuns.length} runs in the last 24h took longer than 3 minutes.`,
    });
  }

  if (anomalies.length === 0) {
    anomalies.push({
      id: "stable",
      severity: "info",
      title: "No major anomalies",
      detail: "No fallback spike, auth flare-up, or error cluster crossed the alert threshold.",
    });
  }

  return anomalies.slice(0, 4);
}

export function parseCommandCenter(): CommandCenterData {
  const { primaryModel, fallbackChain } = loadOpenClawConfig();
  const quota = loadQuota();
  const allRuns = loadRuns().sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const now = Date.now();
  const runs24h = allRuns.filter((r) => typeof r.ts === "number" && now - r.ts < 24 * 3600 * 1000);
  const runs7d = allRuns.filter((r) => typeof r.ts === "number" && now - r.ts < 7 * 24 * 3600 * 1000);
  const topModels24h = summarizeModels(runs24h).slice(0, 5);
  const topModels7d = summarizeModels(runs7d).slice(0, 8);
  const estimatedUsd7d = 0;

  return {
    generatedAt: new Date().toISOString(),
    primaryModel,
    fallbackChain,
    quota,
    windows: {
      last24h: summarizeWindow(runs24h, primaryModel),
      last7d: summarizeWindow(runs7d, primaryModel),
    },
    cost: {
      visibility: estimatedUsd7d > 0 ? "estimated" : "unpriced",
      estimatedUsd7d,
      note:
        estimatedUsd7d > 0
          ? "Estimated from known per-model pricing metadata."
          : "Current providers expose useful usage/token data, but reliable dollar pricing is not configured for this stack yet.",
    },
    topModels24h,
    topModels7d,
    anomalies: detectAnomalies(runs24h, runs7d, primaryModel),
  };
}
