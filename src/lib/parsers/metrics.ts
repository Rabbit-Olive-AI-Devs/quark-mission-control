import fs from "fs";
import path from "path";
import os from "os";
import { WORKSPACE_PATH } from "../config";
import type { MetricsData, MetricRow, CodexQuota } from "./types";

const CODEXBAR_SNAPSHOT_PATH = path.join(
  os.homedir(),
  "Library/Group Containers/group.com.steipete.codexbar/widget-snapshot.json"
);

function parseTable(text: string, headers: string[]): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    if (!line.trim().startsWith("|") || line.includes("---")) continue;
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length < headers.length) continue;
    if (cells[0] === headers[0]) continue; // header row

    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ""; });
    rows.push(row);
  }

  return rows;
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

function parseCodexQuotaFromCodexBar(): CodexQuota | null {
  try {
    const raw = fs.readFileSync(CODEXBAR_SNAPSHOT_PATH, "utf-8");
    const snapshot = JSON.parse(raw);
    const codex = snapshot.entries?.find((e: { provider: string }) => e.provider === "codex");
    if (!codex) return null;

    const daily = codex.primary;
    const weekly = codex.secondary;

    return {
      dailyRemaining: daily ? 100 - daily.usedPercent : 0,
      dailyLabel: daily?.resetsAt ? formatResetTime(daily.resetsAt) : "Unavailable",
      weeklyRemaining: weekly ? 100 - weekly.usedPercent : 0,
      weeklyLabel: weekly?.resetsAt ? formatResetTime(weekly.resetsAt) : "Unavailable",
    };
  } catch {
    return null;
  }
}

export function parseMetrics(): MetricsData {
  const filePath = path.join(WORKSPACE_PATH, "metrics/dashboard.md");
  const result: MetricsData = {
    lastUpdated: "",
    cronReliability: "",
    codexUsage: "",
    codexQuota: { dailyRemaining: 0, dailyLabel: "Unavailable", weeklyRemaining: 0, weeklyLabel: "Unavailable" },
    degradationStatus: "NORMAL",
    opsHealth: [],
    contentPerf: [],
  };

  try {
    const liveQuota = parseCodexQuotaFromCodexBar();
    if (liveQuota) result.codexQuota = liveQuota;

    const content = fs.readFileSync(filePath, "utf-8");

    const updatedMatch = content.match(/Last updated:\s*(.+)/);
    if (updatedMatch) result.lastUpdated = updatedMatch[1];

    // Ops Health table
    const opsSection = content.split("## Ops Health")[1]?.split("##")[0] || "";
    const opsRows = parseTable(opsSection, ["Metric", "Value", "Target", "Status"]);
    result.opsHealth = opsRows.map((r) => ({
      metric: r.Metric || "",
      value: r.Value || "",
      target: r.Target || "",
      status: r.Status || "",
    }));

    // Content Performance
    const contentSection = content.split("## Content Performance")[1]?.split("##")[0] || "";
    const contentRows = parseTable(contentSection, ["Metric", "Today", "7-Day Total", "7-Day Avg"]);
    result.contentPerf = contentRows.map((r) => ({
      metric: r.Metric || "",
      today: r.Today || "",
      sevenDayTotal: r["7-Day Total"] || "",
      sevenDayAvg: r["7-Day Avg"] || "",
    }));

    // Degradation
    const degradeMatch = content.match(/## Degradation Status[\s\S]*?(?:Status|Mode):\s*\*?\*?(\w+)/i);
    if (degradeMatch) result.degradationStatus = degradeMatch[1];

    // Extract specific values
    const cronMatch = opsRows.find((r) => r.Metric?.includes("Cron"));
    if (cronMatch) result.cronReliability = cronMatch.Value || "";

    const codexMatch = opsRows.find((r) => r.Metric?.includes("Codex"));
    if (codexMatch && !result.codexUsage) result.codexUsage = codexMatch.Value || "";

    // Parse Codex daily and weekly quotas from bullet points
    const dailyMatch = content.match(/Codex usage window:\s*\*\*(\d+)%\s*remaining\*\*/);
    const weeklyMatch = content.match(/Codex weekly quota:\s*\*\*(\d+)%\s*remaining\*\*/);
    const dailyWindowMatch = content.match(/Codex usage window:\s*\*\*[^*]+\*\*\s*\(([^)]+)\)/);

    if (!liveQuota) {
      if (dailyMatch) {
        result.codexQuota.dailyRemaining = parseInt(dailyMatch[1]);
        result.codexQuota.dailyLabel = dailyWindowMatch ? dailyWindowMatch[1] : `${dailyMatch[1]}% remaining`;
      }
      if (weeklyMatch) {
        result.codexQuota.weeklyRemaining = parseInt(weeklyMatch[1]);
        const weeklyDetailMatch = content.match(/Codex weekly quota:\s*\*\*[^*]+\*\*\s*\(([^)]+)\)/);
        if (weeklyDetailMatch) {
          result.codexQuota.weeklyLabel = weeklyDetailMatch[1];
        } else {
          const now = new Date();
          const day = now.getDay();
          const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
          result.codexQuota.weeklyLabel = `Resets in ${daysUntilMonday}d (Monday)`;
        }
      }

      if (!dailyMatch && !weeklyMatch) {
        result.codexQuota.dailyLabel = "No live quota data in metrics source";
        result.codexQuota.weeklyLabel = "No live quota data in metrics source";
      }
    }
  } catch {
    // Return defaults
  }

  return result;
}
