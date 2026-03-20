"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ContentHeroKpis } from "@/components/content/content-hero-kpis";
import { ContentTopPosts } from "@/components/content/content-top-posts";
import { ContentPlatformBreakdown } from "@/components/content/content-platform-breakdown";
import { ContentWhatsNext } from "@/components/content/content-whats-next";
import { useApi } from "@/hooks/use-api";
import { Clapperboard } from "lucide-react";
import { formatTimeShort } from "@/lib/utils";
import type {
  PipelineData,
  ContentAuditData,
  StatusFullResponse,
  PostPerformanceData,
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

  const publishMode = statusFull?.contentToday?.publishMode || null;
  const avgTimeMs = (pipeline?.scorecard?.avgTimeToPublish ?? 0) * 1000;

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

        {/* Hero KPIs */}
        <ContentHeroKpis
          todayCount={content?.todayCount ?? 0}
          weekCount={content?.weekCount ?? 0}
          platformCounts={content?.platformCounts ?? {}}
          avgTimeMs={avgTimeMs}
          publishMode={publishMode}
        />

        {/* Published Posts */}
        <div>
          <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
            Published Posts
          </h2>
          <ContentTopPosts
            records={content?.records ?? []}
            performancePosts={postPerformance?.posts ?? []}
          />
        </div>

        {/* Bottom split: Platform Breakdown + What's Next */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
              Platform Breakdown
            </h2>
            <ContentPlatformBreakdown
              platformCounts={content?.platformCounts ?? {}}
            />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
              What&apos;s Next
            </h2>
            <ContentWhatsNext jobs={pipeline?.jobs ?? []} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
