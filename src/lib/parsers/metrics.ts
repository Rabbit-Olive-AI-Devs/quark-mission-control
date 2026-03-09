import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { WORKSPACE_PATH } from "../config";
import type { MetricsData, MetricRow, CodexQuota } from "./types";

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

function readOpenClawModelsOutput(): string {
  try {
    return execSync("openclaw models", {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 15000,
    });
  } catch {
    return "";
  }
}

function parseCodexQuotaFromModels(output: string): CodexQuota | null {
  const line = output.split("\n").find((l) => l.includes("openai-codex usage:"));
  if (!line) return null;

  const dailyMatch = line.match(/usage:\s*5h\s*(\d+)%\s*left\s*⏱([^·\n]+)/i);
  const weeklyMatch = line.match(/Week\s*(\d+)%\s*left\s*⏱([^\n]+)/i);

  if (!dailyMatch && !weeklyMatch) return null;

  return {
    dailyRemaining: dailyMatch ? parseInt(dailyMatch[1], 10) : 0,
    dailyLabel: dailyMatch ? `Resets in ${dailyMatch[2].trim()}` : "Unavailable",
    weeklyRemaining: weeklyMatch ? parseInt(weeklyMatch[1], 10) : 0,
    weeklyLabel: weeklyMatch ? `Resets in ${weeklyMatch[2].trim()}` : "Unavailable",
  };
}

function parseCodexUsageFromModels(output: string): string | null {
  const line = output.split("\n").find((l) => l.includes("openai-codex usage:"));
  if (!line) return null;
  const compact = line.replace(/^\s*-\s*openai-codex\s+usage:\s*/i, "").trim();
  return compact || null;
}

function parseCodexAuthStatusFromModels(output: string): string | null {
  const line = output
    .split("\n")
    .find((l) => l.includes("openai-codex:default") && /\b(ok|expired|invalid)\b/i.test(l));
  if (!line) return null;
  const match = line.match(/openai-codex:default\s+(ok|expired|invalid)[^\n]*/i);
  return match ? match[0].replace(/^openai-codex:default\s*/i, "") : line.trim();
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
    const modelsOutput = readOpenClawModelsOutput();
    const liveQuota = parseCodexQuotaFromModels(modelsOutput);
    const liveCodexUsage = parseCodexUsageFromModels(modelsOutput);
    const liveCodexAuthStatus = parseCodexAuthStatusFromModels(modelsOutput);

    if (liveQuota) result.codexQuota = liveQuota;
    if (liveCodexUsage) result.codexUsage = liveCodexUsage;

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
        // Check for parenthetical detail, otherwise compute days until weekly reset (Monday)
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

    if (liveCodexAuthStatus) {
      result.opsHealth = result.opsHealth.map((row) =>
        row.metric.toLowerCase().includes("codex")
          ? {
              ...row,
              value: liveCodexAuthStatus,
              status: /\bok\b/i.test(liveCodexAuthStatus) ? "✅" : "❌",
            }
          : row
      );
    }

    if (liveCodexUsage && /\bexpired\/invalid\b/i.test(result.codexUsage)) {
      result.degradationStatus = "ATTENTION";
    }
  } catch {
    // Return defaults
  }

  return result;
}
