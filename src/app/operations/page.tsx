"use client";

import { BarChart3 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { GlassCard } from "@/components/ui/glass-card";
import { useApi } from "@/hooks/use-api";
import { QuotaHero } from "@/components/operations/quota-hero";
import { FallbackChain } from "@/components/operations/fallback-chain";
import { UsageChart } from "@/components/operations/usage-chart";
import { ContentPerformance } from "@/components/operations/content-performance";
import { Reliability } from "@/components/operations/reliability";
import type { OperationsData } from "@/lib/parsers/types";

export default function OperationsPage() {
  const { data, loading } = useApi<OperationsData>("/api/operations", {
    snapshotKey: "operations",
    refreshOn: ["metrics"],
  });

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <BarChart3 size={24} className="text-[#00D4AA]" />
            Operations
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            {data
              ? `Model: ${data.activeModel} · ${data.cronReliability.totalJobs} cron jobs tracked`
              : "Loading..."}
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <GlassCard key={i}>
                <div className="animate-pulse h-24 bg-white/5 rounded" />
              </GlassCard>
            ))}
          </div>
        ) : !data ? (
          <GlassCard>
            <div className="text-center py-12">
              <BarChart3 size={40} className="text-[#94A3B8]/30 mx-auto mb-4" />
              <p className="text-sm text-[#94A3B8]">No operations data available.</p>
              <p className="text-xs text-[#94A3B8]/60 mt-1">
                Check that CodexBar and OpenClaw are configured.
              </p>
            </div>
          </GlassCard>
        ) : (
          <>
            {/* Zone 1: Quota Hero */}
            <ErrorBoundary>
              <QuotaHero quota={data.quota} activeModel={data.activeModel} />
            </ErrorBoundary>

            {/* Zone 2: Fallback Chain */}
            <ErrorBoundary>
              <FallbackChain chain={data.fallbackChain} />
            </ErrorBoundary>

            {/* Zone 3: Usage Chart */}
            <ErrorBoundary>
              <UsageChart dailyUsage={data.dailyUsage} tokenUsage={data.tokenUsage} />
            </ErrorBoundary>

            {/* Zone 4: Content Performance */}
            <ErrorBoundary>
              <ContentPerformance platforms={data.platforms} contentPerformance={data.contentPerformance} />
            </ErrorBoundary>

            {/* Zone 5: Reliability */}
            <ErrorBoundary>
              <Reliability reliability={data.cronReliability} />
            </ErrorBoundary>
          </>
        )}
      </div>
    </AppShell>
  );
}
