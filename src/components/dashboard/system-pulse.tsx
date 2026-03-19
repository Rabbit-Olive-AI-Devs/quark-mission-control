"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { CardFooter } from "@/components/ui/card-footer";
import { Heart, Clock } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { formatTimeAgo, formatTimeShort } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/theme-constants";
import type { HeartbeatState, SystemInfo, CronJob } from "@/lib/parsers/types";
import { useState } from "react";

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[#94A3B8] w-10 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[10px] text-[#94A3B8] w-8 text-right font-mono">{Math.round(pct)}%</span>
    </div>
  );
}

function CronDot({ job }: { job: CronJob }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const statusColor =
    job.status === "ok" ? STATUS_COLORS.ok
    : job.status === "disabled" || job.status === "idle" ? STATUS_COLORS.idle
    : STATUS_COLORS.error;

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className="w-2.5 h-2.5 rounded-full cursor-default transition-transform hover:scale-125"
        style={{ background: statusColor }}
      />
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-[#1a1f2e] border border-white/10 shadow-lg whitespace-nowrap pointer-events-none">
          <div className="text-[10px] font-medium text-[#F1F5F9]">{job.name}</div>
          <div className="text-[9px] text-[#94A3B8]">
            {job.lastRun ? formatTimeShort(job.lastRun) : "Never run"}
          </div>
        </div>
      )}
    </div>
  );
}

export function SystemPulse() {
  const {
    data: heartbeat,
    error: hbErr,
    lastUpdated: hbUpdated,
    refetch: hbRefetch,
  } = useApi<HeartbeatState>("/api/heartbeat", { refreshOn: ["heartbeat"] });

  const { data: system } = useApi<SystemInfo>("/api/system", { refreshOn: ["heartbeat"] });

  const { data: cronData } = useApi<{ jobs: CronJob[]; summary: { total: number; ok: number; failed: number } }>(
    "/api/cron",
    { refreshOn: ["heartbeat"] }
  );

  const lastBeat = heartbeat?.lastHeartbeat ? new Date(heartbeat.lastHeartbeat) : null;
  const isRecent = Boolean(lastBeat);
  const jobs = cronData?.jobs || [];
  const summary = cronData?.summary;

  const cpuPct = system?.cpuPercent ?? 0;
  const memPct = system ? (system.memoryUsedMb / system.memoryTotalMb) * 100 : 0;
  const diskPct = system ? (system.diskUsedGb / system.diskTotalGb) * 100 : 0;

  const getCpuColor = () => cpuPct > 80 ? "#EF4444" : cpuPct > 50 ? "#F59E0B" : "#00D4AA";
  const getMemColor = () => memPct > 85 ? "#EF4444" : memPct > 65 ? "#F59E0B" : "#7C3AED";
  const getDiskColor = () => diskPct > 90 ? "#EF4444" : diskPct > 75 ? "#F59E0B" : "#00D4AA";

  return (
    <GlassCard delay={0.05}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart size={16} className={isRecent ? "text-[#EF4444]" : "text-[#94A3B8]"} />
          <h3 className="text-sm font-medium">System Pulse</h3>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
          isRecent ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#F59E0B]/10 text-[#F59E0B]"
        }`}>
          {isRecent ? "Healthy" : "Stale"}
        </span>
      </div>

      {/* Heartbeat hero */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-2xl font-bold text-[#F1F5F9]">
          {lastBeat ? formatTimeAgo(lastBeat) : "—"}
        </span>
        <span className="text-[10px] text-[#94A3B8]">since last heartbeat</span>
      </div>

      {/* System mini-bars */}
      <div className="space-y-1.5 mb-4">
        <MiniBar label="CPU" value={cpuPct} max={100} color={getCpuColor()} />
        <MiniBar label="Mem" value={memPct} max={100} color={getMemColor()} />
        <MiniBar label="Disk" value={diskPct} max={100} color={getDiskColor()} />
      </div>

      {/* Cron dots */}
      <div className="flex items-center gap-2 mb-1">
        <Clock size={12} className="text-[#94A3B8]" />
        <span className="text-[10px] text-[#94A3B8]">
          Cron {summary ? `${summary.ok}/${summary.total} OK` : ""}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {jobs.map((job) => (
          <CronDot key={job.id} job={job} />
        ))}
        {jobs.length === 0 && (
          <span className="text-[10px] text-[#4B5563]">No jobs</span>
        )}
      </div>

      <CardFooter lastUpdated={hbUpdated} error={hbErr} onRefresh={hbRefetch} />
    </GlassCard>
  );
}
