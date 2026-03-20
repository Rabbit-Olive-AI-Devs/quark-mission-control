"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ContentHeroKpis } from "@/components/content/content-hero-kpis";
import { ContentRecommendations } from "@/components/content/content-recommendations";
import { PublishingCadenceChart } from "@/components/content/publishing-cadence-chart";
import { PipelineFunnel } from "@/components/content/pipeline-funnel";
import { ContentTopPosts } from "@/components/content/content-top-posts";
import { useApi } from "@/hooks/use-api";
import { Clapperboard } from "lucide-react";
import { formatTimeShort } from "@/lib/utils";
import type {
  PipelineData,
  ContentAuditData,
  StatusFullResponse,
  PostPerformanceData,
  ContentLifecycleData,
} from "@/lib/parsers/types";

export default function ContentPage() {
  const { data: pipeline } = useApi<PipelineData>("/api/pipeline", {
    refreshOn: ["pipeline"],
  });
  const { data: content, lastUpdated } = useApi<ContentAuditData>(
    "/api/content"
  );
  const { data: statusFull } = useApi<StatusFullResponse>("/api/status-full", {
    refreshOn: ["heartbeat"],
  });
  const { data: postPerformance } = useApi<PostPerformanceData>(
    "/api/post-performance",
    { refreshOn: ["pipeline"] }
  );
  const { data: lifecycle } = useApi<ContentLifecycleData>(
    "/api/content-lifecycle",
    { refreshOn: ["pipeline"] }
  );

  const publishMode = statusFull?.contentToday?.publishMode || null;

  // Derive cadence avg from lifecycle data
  const cadenceAvg7d = lifecycle?.cadence?.avgPerDay7d ?? 0;

  // Merge feedback: prefer lifecycle feedback, fall back to postPerformance feedback
  const feedback = lifecycle?.feedback ?? postPerformance?.feedback ?? null;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clapperboard size={22} className="text-[#00D4AA]" />
            <h1 className="text-xl font-semibold text-[#F1F5F9]">Content</h1>
            {publishMode && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  publishMode === "LIVE"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {publishMode}
              </span>
            )}
          </div>
          {lastUpdated && (
            <span className="text-[10px] text-[#64748B] font-mono">
              Updated {formatTimeShort(lastUpdated)}
            </span>
          )}
        </div>

        {/* Section 1: Hero KPIs */}
        <ContentHeroKpis
          todayCount={content?.todayCount ?? 0}
          weekCount={content?.weekCount ?? 0}
          platformCounts={content?.platformCounts ?? {}}
          cadenceAvg7d={cadenceAvg7d}
          postPerformance={postPerformance ?? null}
          scorecard={pipeline?.scorecard ?? null}
          feedback={feedback}
        />

        {/* Section 2: Recommendations */}
        <ContentRecommendations
          feedback={feedback}
          cadenceDaily={lifecycle?.cadence?.daily ?? []}
        />

        {/* Section 3: Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PublishingCadenceChart
            daily={lifecycle?.cadence?.daily ?? []}
            avgPerDay7d={cadenceAvg7d}
            trend={lifecycle?.cadence?.trend ?? "flat"}
          />
          <PipelineFunnel funnel={lifecycle?.funnel ?? null} />
        </div>

        {/* Section 4: Published Posts */}
        <div>
          <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
            Published Posts
          </h2>
          <ContentTopPosts
            records={content?.records ?? []}
            performancePosts={postPerformance?.posts ?? []}
          />
        </div>
      </div>
    </AppShell>
  );
}
