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

  // Disk usage
  let diskUsedGb = 0;
  let diskTotalGb = 0;
  try {
    const df = execSync("df -g / 2>/dev/null", { encoding: "utf-8" });
    const parts = df.split("\n")[1]?.split(/\s+/) || [];
    diskTotalGb = parseFloat(parts[1] || "0");
    diskUsedGb = parseFloat(parts[2] || "0");
  } catch {
    // Defaults
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
