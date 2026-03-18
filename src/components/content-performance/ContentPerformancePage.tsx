"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { ContentPerformanceEmpty } from "./ContentPerformanceEmpty";
import { ContentPerformanceError } from "./ContentPerformanceError";
import { ContentPerformanceSkeleton } from "./ContentPerformanceSkeleton";
import { AuditTrailTable } from "./AuditTrailTable";
import { WindowSelector } from "./WindowSelector";
import { LastRefreshBadge } from "./LastRefreshBadge";
import { StaleDataBanner } from "./StaleDataBanner";
import { EvolutionCharts, type EvolutionRow } from "./EvolutionCharts";
import { TopPostsTable } from "./TopPostsTable";
import { PlatformBreakdownTabs } from "./PlatformBreakdownTabs";
import { ContentTypeComparisonChart } from "./ContentTypeComparisonChart";
import type { ContentPerformanceAuditEvent } from "@/lib/content-performance/audit-log";

interface TopPostRow {
  id: string;
  platform: string;
  normalizedScore: number;
  rawMetrics: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number | null;
  };
}

interface ContentTypeRow {
  contentType: string;
  score: number;
}

interface ContentPerformancePageProps {
  dataset?: unknown[] | null;
  error?: string | null;
  loading?: boolean;
  lastRefresh?: string;
  auditEvents?: ContentPerformanceAuditEvent[];
  stale?: boolean;
  lastSuccessAt?: string | null;
  evolutionRows?: EvolutionRow[];
  topPosts?: TopPostRow[];
  contentTypeRows?: ContentTypeRow[];
}

const defaultEvolutionRows: EvolutionRow[] = [
  { dayKey: "2026-03-12", publishes: 2, totalEngagements: 40, engagementPerPost: 20, rolling7d: 18 },
  { dayKey: "2026-03-13", publishes: 3, totalEngagements: 55, engagementPerPost: 18.3, rolling7d: 20 },
  { dayKey: "2026-03-14", publishes: 2, totalEngagements: 52, engagementPerPost: 26, rolling7d: 21 },
];

const defaultTopPosts: TopPostRow[] = [
  {
    id: "x-1",
    platform: "x",
    normalizedScore: 1.22,
    rawMetrics: { likes: 44, comments: 7, shares: 5, views: 1200 },
  },
];

const defaultContentTypeRows: ContentTypeRow[] = [
  { contentType: "analysis", score: 0.84 },
  { contentType: "story", score: 0.71 },
  { contentType: "tutorial", score: 0.67 },
];

export function ContentPerformancePage({
  dataset = null,
  error = null,
  loading = false,
  lastRefresh,
  auditEvents = [],
  stale = false,
  lastSuccessAt,
  evolutionRows = defaultEvolutionRows,
  topPosts = defaultTopPosts,
  contentTypeRows = defaultContentTypeRows,
}: ContentPerformancePageProps) {
  const [windowDays, setWindowDays] = useState<7 | 14 | 30>(7);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold text-[#F1F5F9]">
            <Megaphone size={24} className="text-[#7C3AED]" />
            Content Performance
          </h1>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Cinematic Ops view for content delivery and engagement outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <WindowSelector value={windowDays} onChange={setWindowDays} />
          <LastRefreshBadge lastRefresh={lastRefresh} />
        </div>
      </div>

      <StaleDataBanner stale={stale} lastSuccessAt={lastSuccessAt} />

      {loading ? (
        <ContentPerformanceSkeleton />
      ) : error ? (
        <ContentPerformanceError message={error} />
      ) : !dataset || dataset.length === 0 ? (
        <ContentPerformanceEmpty />
      ) : null}

      <EvolutionCharts rows={evolutionRows.slice(-windowDays)} />
      <TopPostsTable rows={topPosts} />
      <PlatformBreakdownTabs
        data={{
          x: "X engagement breakdown",
          tiktok: "TikTok engagement breakdown",
          instagram: "Instagram engagement breakdown",
          youtube: "YouTube engagement breakdown",
          substack: "Substack engagement breakdown",
        }}
      />
      <ContentTypeComparisonChart rows={contentTypeRows} />

      <AuditTrailTable events={auditEvents} />
    </div>
  );
}
