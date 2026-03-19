"use client";

import { useState, useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { TimelineView } from "@/components/schedule/timeline-view";
import { useApi } from "@/hooks/use-api";
import { Calendar, RefreshCw } from "lucide-react";
import type { CronJob } from "@/lib/parsers/types";

type ViewMode = "daily" | "weekly";

export default function SchedulePage() {
  const [view, setView] = useState<ViewMode>("daily");
  const [failedFirst, setFailedFirst] = useState(false);
  const { data, loading, refetch } = useApi<{
    jobs: Array<CronJob & { recentRuns: Array<{ status: "ok" | "error" }> }>;
    summary: { total: number; ok: number; failed: number };
  }>("/api/schedule", { refreshOn: ["heartbeat"] });

  const jobs = data?.jobs || [];
  const summary = data?.summary || { total: 0, ok: 0, failed: 0 };

  const recentRunsMap = useMemo(() => {
    const map: Record<string, Array<{ status: "ok" | "error" }>> = {};
    for (const job of jobs) {
      map[job.id] = job.recentRuns || [];
    }
    return map;
  }, [jobs]);

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
            {/* Failed first toggle */}
            <label className="flex items-center gap-2 text-xs text-[#94A3B8] cursor-pointer">
              <input
                type="checkbox"
                checked={failedFirst}
                onChange={(e) => setFailedFirst(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-[#EF4444] focus:ring-[#EF4444]/50"
              />
              Failed first
            </label>
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
          <GlassCard
            className={`text-center ${summary.failed > 0 ? "border-l-2 border-[#EF4444] shadow-[inset_4px_0_8px_-4px_rgba(239,68,68,0.3)]" : ""}`}
            delay={0.15}
          >
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
              <TimelineView
                jobs={jobs}
                view={view}
                failedFirst={failedFirst}
                recentRunsMap={recentRunsMap}
              />
            </GlassCard>
          )}
        </ErrorBoundary>
      </div>
    </AppShell>
  );
}
