"use client";

import { useEffect } from "react";
import { Brain } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { GlassCard } from "@/components/ui/glass-card";
import { useApi } from "@/hooks/use-api";
import { useDashboardStore } from "@/stores/dashboard";
import { DegradationAlert } from "@/components/cognitive/degradation-alert";
import { CognitiveScorecards } from "@/components/cognitive/cognitive-scorecards";
import { TrendCharts } from "@/components/cognitive/trend-charts";
import { HistoryTable } from "@/components/cognitive/history-table";
import type { CognitiveData } from "@/lib/parsers/types";

export default function CognitivePage() {
  const { data, loading } = useApi<CognitiveData>("/api/cognitive", {
    snapshotKey: "cognitive",
    refreshOn: ["metrics"],
  });

  // Sync degradation flags to store (sidebar dot works even without visiting dashboard home)
  const setCognitiveDegradation = useDashboardStore((s) => s.setCognitiveDegradation);
  useEffect(() => {
    if (data?.activeDegradation) setCognitiveDegradation(data.activeDegradation);
  }, [data?.activeDegradation, setCognitiveDegradation]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <Brain size={24} className="text-[#00D4AA]" />
            Cognitive Health
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            {data?.current
              ? `Last collected: ${(() => {
                  // Strip UTC offset — Chandler writes local Chicago time with wrong offset during DST
                  const raw = data.current.collectedAt.replace(/[+-]\d{2}:\d{2}$/, "");
                  return new Date(raw).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
                })()}`
              : "Loading..."}
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <GlassCard key={i}>
                <div className="animate-pulse h-24 bg-white/5 rounded" />
              </GlassCard>
            ))}
          </div>
        ) : !data?.current ? (
          <GlassCard>
            <div className="text-center py-12">
              <Brain size={40} className="text-[#94A3B8]/30 mx-auto mb-4" />
              <p className="text-sm text-[#94A3B8]">No cognitive data yet.</p>
              <p className="text-xs text-[#94A3B8]/60 mt-1">
                Chandler will start writing metrics/cognitive/ JSON files during daily runs.
              </p>
            </div>
          </GlassCard>
        ) : (
          <>
            {/* Zone 1: Degradation Alert */}
            <ErrorBoundary>
              <DegradationAlert current={data.current} history={data.history} />
            </ErrorBoundary>

            {/* Zone 2: Today's Snapshot */}
            <ErrorBoundary>
              <CognitiveScorecards current={data.current} />
            </ErrorBoundary>

            {/* Zone 3: 7-Day Trends */}
            {data.history.length >= 2 && (
              <ErrorBoundary>
                <TrendCharts history={data.history} />
              </ErrorBoundary>
            )}

            {/* Zone 4: 30-Day History */}
            {data.weeklyRollups.length > 0 && (
              <ErrorBoundary>
                <HistoryTable weeklyRollups={data.weeklyRollups} history={data.history} />
              </ErrorBoundary>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
