import { execSync } from "child_process";
import os from "os";
import type { SystemInfo } from "./types";

export function getSystemInfo(): SystemInfo {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // CPU usage (average across cores)
  let cpuPercent = 0;
  try {
    const loadAvg = os.loadavg()[0]; // 1-minute average
    cpuPercent = Math.min(100, (loadAvg / cpus.length) * 100);
  } catch {
    cpuPercent = 0;
  }

  // Disk usage — try macOS format first, then Linux
  let diskUsedGb = 0;
  let diskTotalGb = 0;
  try {
    // macOS: df -g outputs in GB blocks
    const df = execSync("df -g / 2>/dev/null", { encoding: "utf-8" });
    const parts = df.split("\n")[1]?.split(/\s+/) || [];
    diskTotalGb = parseFloat(parts[1] || "0");
    diskUsedGb = parseFloat(parts[2] || "0");
  } catch {
    try {
      // Linux: df -BG outputs in GB blocks with "G" suffix
      const df = execSync("df -BG / 2>/dev/null", { encoding: "utf-8" });
      const parts = df.split("\n")[1]?.split(/\s+/) || [];
      diskTotalGb = parseFloat((parts[1] || "0").replace("G", ""));
      diskUsedGb = parseFloat((parts[2] || "0").replace("G", ""));
    } catch {
      // Defaults
    }
  }

  return {
    cpuPercent: Math.round(cpuPercent * 10) / 10,
    memoryUsedMb: Math.round(usedMem / 1048576),
    memoryTotalMb: Math.round(totalMem / 1048576),
    diskUsedGb,
    diskTotalGb,
    uptime: os.uptime(),
  };
}
