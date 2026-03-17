"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { TimelineView } from "@/components/schedule/timeline-view";
import { JobCard } from "@/components/schedule/job-card";
import { useApi } from "@/hooks/use-api";
import { Calendar, RefreshCw } from "lucide-react";
import type { CronJob } from "@/lib/parsers/types";

type ViewMode = "daily" | "weekly";

export default function SchedulePage() {
  const [view, setView] = useState<ViewMode>("daily");
  const { data, loading, refetch } = useApi<{
    jobs: CronJob[];
    summary: { total: number; ok: number; failed: number };
  }>("/api/schedule", { snapshotKey: "cron", refreshOn: ["heartbeat"] });

  const jobs = data?.jobs || [];
  const summary = data?.summary || { total: 0, ok: 0, failed: 0 };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-3 text-[#F1F5F9]">
              <Calendar size={24} className="text-[#00D4AA]" />
              Schedule
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">
              {summary.ok}/{summary.total} jobs running normally
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button
                onClick={() => setView("daily")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "daily"
                    ? "bg-[#00D4AA]/20 text-[#00D4AA]"
                    : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5"
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setView("weekly")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "weekly"
                    ? "bg-[#00D4AA]/20 text-[#00D4AA]"
                    : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5"
                }`}
              >
                Weekly
              </button>
            </div>
            <button
              onClick={refetch}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <RefreshCw size={16} className="text-[#94A3B8]" />
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <GlassCard className="text-center">
            <div className="text-3xl font-bold text-[#00D4AA]">{summary.total}</div>
            <div className="text-xs text-[#94A3B8] mt-1">Total Jobs</div>
          </GlassCard>
          <GlassCard className="text-center" delay={0.05}>
            <div className="text-3xl font-bold text-[#10B981]">{summary.ok}</div>
            <div className="text-xs text-[#94A3B8] mt-1">Healthy</div>
          </GlassCard>
          <GlassCard className="text-center" delay={0.1}>
            <div className="text-3xl font-bold text-[#94A3B8]">
              {jobs.filter((j) => j.status === "idle" || j.status === "disabled").length}
            </div>
            <div className="text-xs text-[#94A3B8] mt-1">Idle</div>
          </GlassCard>
          <GlassCard className="text-center" delay={0.15}>
            <div className="text-3xl font-bold text-[#EF4444]">{summary.failed}</div>
            <div className="text-xs text-[#94A3B8] mt-1">Failed</div>
          </GlassCard>
        </div>

        {/* Timeline */}
        <ErrorBoundary>
          {loading ? (
            <GlassCard delay={0.2}>
              <div className="animate-pulse space-y-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="h-8 bg-white/5 rounded" />
                ))}
              </div>
            </GlassCard>
          ) : (
            <GlassCard delay={0.2} className="p-4">
              <TimelineView jobs={jobs} view={view} />
            </GlassCard>
          )}
        </ErrorBoundary>
      </div>
    </AppShell>
  );
}
