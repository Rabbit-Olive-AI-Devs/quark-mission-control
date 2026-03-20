"use client";

import { useEffect } from "react";
import { BarChart3 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { GlassCard } from "@/components/ui/glass-card";
import { CardFooter } from "@/components/ui/card-footer";
import { useApi } from "@/hooks/use-api";
import { useDashboardStore } from "@/stores/dashboard";
import { UnansweredAlert } from "@/components/engagement/unanswered-alert";
import { HeroKpis } from "@/components/engagement/hero-kpis";
import { DiagnosticQuadrant } from "@/components/engagement/diagnostic-quadrant";
import { ContentTypeChart } from "@/components/engagement/content-type-chart";
import { PostPerformanceTable } from "@/components/engagement/post-performance-table";
import { ActionFeed } from "@/components/engagement/action-feed";
import { PlatformHealthPanel } from "@/components/engagement/platform-health";
import { DetailTabs } from "@/components/engagement/detail-tabs";
import type { EngagementData, PostPerformanceData } from "@/lib/parsers/types";

export default function EngagementPage() {
  const {
    data: engData,
    loading: engLoading,
    error: engError,
    lastUpdated: engUpdated,
    refetch: engRefetch,
  } = useApi<EngagementData>("/api/engagement", {
    refreshOn: ["engagement"],
  });

  const {
    data: perfData,
    loading: perfLoading,
    error: perfError,
    lastUpdated: perfUpdated,
    refetch: perfRefetch,
  } = useApi<PostPerformanceData>("/api/post-performance", {
    refreshOn: ["engagement"],
  });

  const setEngagementUnanswered = useDashboardStore((s) => s.setEngagementUnanswered);
  useEffect(() => {
    if (engData?.inboundGap) setEngagementUnanswered(engData.inboundGap.unansweredCount);
  }, [engData?.inboundGap, setEngagementUnanswered]);

  const loading = engLoading || perfLoading;
  const lastUpdated = engUpdated && perfUpdated ? Math.max(engUpdated, perfUpdated) : engUpdated ?? perfUpdated;
  const error = engError || perfError;

  const handleRefresh = async () => {
    await Promise.all([engRefetch(), perfRefetch()]);
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 size={24} className="text-[#00D4AA]" />
            <h1 className="text-2xl font-semibold">Engagement</h1>
            {engData?.mode === "approval_required" && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
                Approval Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-sm text-[#94A3B8]">
              {perfData
                ? `${perfData.posts?.length ?? 0} posts tracked`
                : engData
                  ? `${engData.actions?.length ?? 0} actions tracked`
                  : "Loading..."}
              {engData ? ` · ${engData.mode} mode` : ""}
            </p>
            {engData && (
              <span className="text-xs text-[#94A3B8]/70">
                · Sources:{" "}
                {Object.entries(engData.sourceCoverage)
                  .filter(([, ok]) => ok)
                  .map(([name]) => name)
                  .join(", ") || "none"}
              </span>
            )}
            {lastUpdated && (
              <span className="text-xs text-[#94A3B8]/50">
                · Updated{" "}
                {new Date(lastUpdated).toLocaleTimeString("en-US", {
                  timeZone: "America/Chicago",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <GlassCard key={i}>
                <div className="animate-pulse h-24 bg-white/5 rounded" />
              </GlassCard>
            ))}
          </div>
        ) : !engData ? (
          <GlassCard>
            <div className="text-center py-12">
              <BarChart3 size={40} className="text-[#94A3B8]/30 mx-auto mb-4" />
              <p className="text-sm text-[#94A3B8]">No engagement data yet.</p>
              <p className="text-xs text-[#94A3B8]/60 mt-1">
                Data will appear here once posts are published and metrics are collected.
              </p>
            </div>
          </GlassCard>
        ) : (
          <>
            {/* Unanswered alert */}
            <ErrorBoundary>
              <UnansweredAlert inboundGap={engData.inboundGap} />
            </ErrorBoundary>

            {/* Layer 1: Hero KPIs */}
            <ErrorBoundary>
              <HeroKpis engagement={engData} postPerf={perfData} />
            </ErrorBoundary>

            {/* Layer 2: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <ErrorBoundary>
                <DiagnosticQuadrant
                  posts={perfData?.posts ?? []}
                  thresholds={perfData?.thresholds ?? {}}
                />
              </ErrorBoundary>
              <ErrorBoundary>
                <ContentTypeChart hooks={perfData?.hooks ?? { by_content_type: {}, rules: {} }} />
              </ErrorBoundary>
            </div>

            {/* Layer 3: Tabbed Detail */}
            <ErrorBoundary>
              <DetailTabs>
                {/* Tab 1: Post Performance Table */}
                <PostPerformanceTable posts={perfData?.posts ?? []} />

                {/* Tab 2: Outbound Activity */}
                <ActionFeed actions={engData?.actions ?? []} />

                {/* Tab 3: Platform Health */}
                {perfData ? (
                  <PlatformHealthPanel postPerf={perfData} />
                ) : (
                  <GlassCard>
                    <p className="text-sm text-[#94A3B8] text-center py-8">
                      No platform data available.
                    </p>
                  </GlassCard>
                )}
              </DetailTabs>
            </ErrorBoundary>

            <div className="mt-4">
              <CardFooter lastUpdated={lastUpdated} error={error} onRefresh={handleRefresh} />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
