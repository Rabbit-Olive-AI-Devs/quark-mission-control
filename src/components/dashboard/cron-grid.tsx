"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { StatusDot } from "@/components/ui/status-dot";
import { Clock } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { CronJob } from "@/lib/parsers/types";

export function CronGrid() {
  const { data, loading } = useApi<{ jobs: CronJob[]; summary: { total: number; ok: number; failed: number } }>(
    "/api/cron",
    ["heartbeat"]
  );

  if (loading) {
    return (
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-[#00D4AA]" />
          <h3 className="text-sm font-medium">Cron Jobs</h3>
        </div>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-white/5 rounded" />
          ))}
        </div>
      </GlassCard>
    );
  }

  const jobs = data?.jobs || [];
  const summary = data?.summary || { total: 0, ok: 0, failed: 0 };

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#00D4AA]" />
          <h3 className="text-sm font-medium">Cron Jobs</h3>
        </div>
        <span className="text-xs text-[#94A3B8]">
          {summary.ok}/{summary.total} OK
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
          >
            <StatusDot
              status={job.status === "ok" ? "ok" : (job.status === "unknown" || job.status === "idle" || job.status === "disabled") ? "idle" : "error"}
              size="sm"
            />
            <span className="text-xs text-[#F1F5F9] truncate">{job.name}</span>
          </div>
        ))}
      </div>

      {jobs.length === 0 && (
        <p className="text-xs text-[#94A3B8] text-center py-4">No cron jobs found</p>
      )}
    </GlassCard>
  );
}
