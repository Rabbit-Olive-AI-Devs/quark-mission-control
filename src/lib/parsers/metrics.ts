import fs from "fs";
import path from "path";
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
    if (codexMatch) result.codexUsage = codexMatch.Value || "";

    // Parse Codex daily and weekly quotas from bullet points
    const dailyMatch = content.match(/Codex usage window:\s*\*\*(\d+)%\s*remaining\*\*/);
    const weeklyMatch = content.match(/Codex weekly quota:\s*\*\*(\d+)%\s*remaining\*\*/);
    const dailyWindowMatch = content.match(/Codex usage window:\s*\*\*[^*]+\*\*\s*\(([^)]+)\)/);

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
  } catch {
    // Return defaults
  }

  return result;
}
