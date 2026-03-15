"use client";

import { useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { GlassCard } from "@/components/ui/glass-card";
import { useApi } from "@/hooks/use-api";
import { useDashboardStore } from "@/stores/dashboard";
import { UnansweredAlert } from "@/components/engagement/unanswered-alert";
import { EngagementScorecards } from "@/components/engagement/engagement-scorecards";
import { TrendCharts } from "@/components/engagement/trend-charts";
import { GuardrailBlocks } from "@/components/engagement/guardrail-blocks";
import { ActionFeed } from "@/components/engagement/action-feed";
import type { EngagementData } from "@/lib/parsers/types";

export default function EngagementPage() {
  const { data, loading } = useApi<EngagementData>("/api/engagement", {
    snapshotKey: "engagement",
    refreshOn: ["engagement"],
  });

  const setEngagementUnanswered = useDashboardStore((s) => s.setEngagementUnanswered);
  useEffect(() => {
    if (data?.inboundGap) setEngagementUnanswered(data.inboundGap.unansweredCount);
  }, [data?.inboundGap, setEngagementUnanswered]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <MessageCircle size={24} className="text-[#00D4AA]" />
            <h1 className="text-2xl font-semibold">Social Engagement</h1>
            {data?.mode === "approval_required" && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
                Approval Mode
              </span>
            )}
          </div>
          <p className="text-sm text-[#94A3B8] mt-1">
            {data ? `${data.actions.length} actions tracked · ${data.mode} mode` : "Loading..."}
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
        ) : !data || data.actions.length === 0 ? (
          <GlassCard>
            <div className="text-center py-12">
              <MessageCircle size={40} className="text-[#94A3B8]/30 mx-auto mb-4" />
              <p className="text-sm text-[#94A3B8]">No engagement data yet.</p>
              <p className="text-xs text-[#94A3B8]/60 mt-1">
                Actions will appear here as Quark engages on social platforms.
              </p>
            </div>
          </GlassCard>
        ) : (
          <>
            <ErrorBoundary>
              <UnansweredAlert inboundGap={data.inboundGap} />
            </ErrorBoundary>

            <ErrorBoundary>
              <EngagementScorecards data={data} />
            </ErrorBoundary>

            <ErrorBoundary>
              <TrendCharts trends={data.trends} />
            </ErrorBoundary>

            <ErrorBoundary>
              <GuardrailBlocks blocks={data.guardrailBlocks} trends={data.trends} />
            </ErrorBoundary>

            <ErrorBoundary>
              <ActionFeed actions={data.actions} />
            </ErrorBoundary>
          </>
        )}
      </div>
    </AppShell>
  );
}
