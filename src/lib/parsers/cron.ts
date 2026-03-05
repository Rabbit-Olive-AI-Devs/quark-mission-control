import { execSync } from "child_process";
import type { CronJob } from "./types";

export function parseCronList(): CronJob[] {
  try {
    const output = execSync("/opt/homebrew/bin/openclaw cron list 2>/dev/null", {
      timeout: 10000,
      encoding: "utf-8",
    });

    const jobs: CronJob[] = [];
    const lines = output.split("\n").filter((l) => l.trim());

    // First line is the header — use it to find column positions
    const header = lines[0];
    if (!header) return [];

    // Find column start positions from header
    const cols = {
      id: header.indexOf("ID"),
      name: header.indexOf("Name"),
      schedule: header.indexOf("Schedule"),
      next: header.indexOf("Next"),
      last: header.indexOf("Last"),
      status: header.indexOf("Status"),
      target: header.indexOf("Target"),
      agentId: header.indexOf("Agent ID"),
      model: header.indexOf("Model"),
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const id = line.substring(cols.id, cols.name).trim();
      const name = line.substring(cols.name, cols.schedule).trim();
      const schedule = line.substring(cols.schedule, cols.next).trim();
      const next = line.substring(cols.next, cols.last).trim();
      const last = line.substring(cols.last, cols.status).trim();
      const status = line.substring(cols.status, cols.target).trim();
      const model = cols.model >= 0 ? line.substring(cols.model).trim() : "";

      if (!id || id.includes("─")) continue;

      jobs.push({
        id: id.length > 8 ? id.slice(0, 8) : id,
        name,
        schedule,
        model: model || "default",
        status: status.toLowerCase(),
        lastRun: last && last !== "-" ? last : null,
        nextRun: next && next !== "-" ? next : null,
        enabled: status.toLowerCase() !== "disabled",
      });
    }

    return jobs;
  } catch {
    return [];
  }
}
