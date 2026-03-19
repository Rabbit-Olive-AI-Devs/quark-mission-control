import { execSync } from "child_process";
import os from "os";
import { cachedSync } from "../async-cache";
import type { SystemInfo } from "./types";

function getMemoryUsedMb(): number {
  if (process.platform === "darwin") {
    try {
      const vmstat = execSync("vm_stat", { encoding: "utf-8" });
      let pageSize = 16384;
      try {
        pageSize = parseInt(execSync("sysctl -n hw.pagesize", { encoding: "utf-8" }).trim(), 10) || 16384;
      } catch { /* default 16384 */ }

      const extract = (label: string): number => {
        const match = vmstat.match(new RegExp(`${label}:\\s+(\\d+)`));
        return match ? parseInt(match[1], 10) : 0;
      };

      const active = extract("Pages active");
      const wired = extract("Pages wired down");
      const compressor = extract("Pages occupied by compressor");
      return Math.round((active + wired + compressor) * pageSize / (1024 * 1024));
    } catch {
      // Fall through to os.freemem() fallback
    }
  }
  return Math.round((os.totalmem() - os.freemem()) / (1024 * 1024));
}

export function getSystemInfo(): SystemInfo {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const usedMem = getMemoryUsedMb();

  // CPU usage (average across cores)
  let cpuPercent = 0;
  try {
    const loadAvg = os.loadavg()[0]; // 1-minute average
    cpuPercent = Math.min(100, (loadAvg / cpus.length) * 100);
  } catch {
    cpuPercent = 0;
  }

  // Disk usage — cached for 30s (spawns df)
  const { diskUsedGb, diskTotalGb } = cachedSync("disk-info", 30_000, () => {
    let used = 0;
    let total = 0;
    try {
      // macOS: df -g outputs in GB blocks
      const df = execSync("df -g / 2>/dev/null", { encoding: "utf-8" });
      const parts = df.split("\n")[1]?.split(/\s+/) || [];
      total = parseFloat(parts[1] || "0");
      used = parseFloat(parts[2] || "0");
    } catch {
      try {
        // Linux: df -BG outputs in GB blocks with "G" suffix
        const df = execSync("df -BG / 2>/dev/null", { encoding: "utf-8" });
        const parts = df.split("\n")[1]?.split(/\s+/) || [];
        total = parseFloat((parts[1] || "0").replace("G", ""));
        used = parseFloat((parts[2] || "0").replace("G", ""));
      } catch {
        // Defaults
      }
    }
    return { diskUsedGb: used, diskTotalGb: total };
  });

  return {
    cpuPercent: Math.round(cpuPercent * 10) / 10,
    memoryUsedMb: usedMem,
    memoryTotalMb: Math.round(totalMem / 1048576),
    diskUsedGb,
    diskTotalGb,
    uptime: os.uptime(),
    osVersion: `${os.type()} ${os.release()}`,
    nodeVersion: process.version,
  };
}
