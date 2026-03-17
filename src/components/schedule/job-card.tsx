"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { StatusDot } from "@/components/ui/status-dot";
import type { CronJob } from "@/lib/parsers/types";

const TZ = "America/Chicago";

function statusOf(job: CronJob): "ok" | "warning" | "error" | "idle" {
  if (job.status === "ok") return "ok";
  if (job.status === "error") return "error";
  if (job.status === "disabled") return "idle";
  return "idle";
}

function formatRelative(ms: number | null): string {
  if (!ms) return "\u2014";
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  if (diff > 0) {
    if (h > 24) return `in ${Math.floor(h / 24)}d`;
    if (h > 0) return `in ${h}h ${m}m`;
    return `in ${m}m`;
  }
  if (h > 24) return `${Math.floor(h / 24)}d ago`;
  if (h > 0) return `${h}h ${m}m ago`;
  return `${m}m ago`;
}

function formatTimestamp(ms: number | null): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface JobCardProps {
  job: CronJob;
  compact?: boolean;
  delay?: number;
}

export function JobCard({ job, compact = false, delay = 0 }: JobCardProps) {
  const st = statusOf(job);

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
        <StatusDot status={st} size="sm" pulse={st === "ok"} />
        <span className="text-xs text-[#F1F5F9] font-medium truncate flex-1">{job.name}</span>
        {job.agentId && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#7C3AED]/20 text-[#7C3AED] font-mono shrink-0">
            {job.agentId}
          </span>
        )}
        <span className="text-[10px] text-[#94A3B8] font-mono shrink-0">{formatRelative(job.lastRunMs)}</span>
      </div>
    );
  }

  return (
    <GlassCard delay={delay} className="p-4">
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <StatusDot status={st} size="md" pulse={st === "ok"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-[#F1F5F9] truncate">{job.name}</span>
            {job.agentId && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#7C3AED]/20 text-[#7C3AED] font-mono shrink-0">
                {job.agentId}
              </span>
            )}
          </div>
          <div className="text-xs text-[#94A3B8] mb-2">{job.scheduleHuman}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
            <div>
              <span className="text-[#64748B]">Last run</span>
              <div className="text-[#F1F5F9] font-mono">{formatRelative(job.lastRunMs)}</div>
              {job.lastRunMs && (
                <div className="text-[#64748B] font-mono">{formatTimestamp(job.lastRunMs)}</div>
              )}
            </div>
            <div>
              <span className="text-[#64748B]">Next run</span>
              <div className="text-[#F1F5F9] font-mono">{formatRelative(job.nextRunMs)}</div>
              {job.nextRunMs && (
                <div className="text-[#64748B] font-mono">{formatTimestamp(job.nextRunMs)}</div>
              )}
            </div>
          </div>
          <div className="mt-2 text-[10px] text-[#64748B] font-mono truncate">
            {job.model.split("/").pop()}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
