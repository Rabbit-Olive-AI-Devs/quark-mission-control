import fs from "fs";
import path from "path";
import { WORKSPACE_PATH } from "../config";
import type { MetricsData, MetricRow } from "./types";

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
  } catch {
    // Return defaults
  }

  return result;
}
