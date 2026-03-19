"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { HoverCard } from "@/components/ui/hover-card";
import { Sparkline } from "@/components/ui/sparkline";
import { PLATFORM_COLORS } from "@/lib/theme-constants";
import { Trophy, Hash, TrendingUp, Users } from "lucide-react";
import type {
  ContentPost,
  PipelineScorecard,
  EngagementUnifiedKpis,
  DailyAggregate,
} from "@/lib/parsers/types";

interface ContentHeroKpisProps {
  posts: ContentPost[];
  scorecard: PipelineScorecard | null;
  kpis: EngagementUnifiedKpis | null;
  trends: DailyAggregate[];
  publishMode: "LIVE" | "WARMUP" | null;
}

function totalEngagement(post: ContentPost): number {
  const m = post.metrics;
  return m.views + m.likes + m.comments + m.shares;
}

export function ContentHeroKpis({
  posts,
  scorecard,
  kpis,
  trends,
  publishMode,
}: ContentHeroKpisProps) {
  // Best performer
  const bestPost =
    posts.length > 0
      ? posts.reduce((best, p) =>
          totalEngagement(p) > totalEngagement(best) ? p : best
        )
      : null;
  const bestEngagement = bestPost ? totalEngagement(bestPost) : 0;
  const bestHook = bestPost
    ? bestPost.hook.length > 60
      ? bestPost.hook.slice(0, 60) + "..."
      : bestPost.hook
    : null;
  const bestPlatformColor = bestPost
    ? PLATFORM_COLORS[bestPost.platform] || "#94A3B8"
    : "#94A3B8";

  // Published this week
  const publishedCount = scorecard?.published ?? 0;
  const platformsUsed = Object.keys(scorecard?.contentTypeBreakdown ?? {});

  // Engagement rate
  const engagementRate = kpis?.engagement?.engagementRate ?? 0;
  const sparkData = trends.map((t) => t.total);

  // Follower delta
  const followerDelta = kpis?.growth?.followerDelta ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Best Performer */}
      <GlassCard delay={0}>
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={14} className="text-[#F59E0B]" />
          <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Best Performer
          </span>
        </div>
        {bestPost ? (
          <>
            <p className="text-xs text-[#F1F5F9] leading-relaxed mb-2 line-clamp-2">
              {bestHook}
            </p>
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                style={{
                  backgroundColor: `${bestPlatformColor}20`,
                  color: bestPlatformColor,
                }}
              >
                {bestPost.platform}
              </span>
              <span className="text-[10px] font-mono text-[#F59E0B]">
                {bestEngagement.toLocaleString()} eng
              </span>
            </div>
          </>
        ) : (
          <p className="text-xs text-[#64748B]">No posts this week</p>
        )}
      </GlassCard>

      {/* Published This Week */}
      <GlassCard delay={0.05}>
        <div className="flex items-center gap-2 mb-3">
          <Hash size={14} className="text-[#00D4AA]" />
          <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Published
          </span>
        </div>
        <div className="text-3xl font-bold text-[#F1F5F9] tabular-nums">
          {publishedCount}
        </div>
        <p className="text-[10px] text-[#64748B] mt-1">
          {platformsUsed.length > 0
            ? platformsUsed.join(", ")
            : "No platforms yet"}
        </p>
      </GlassCard>

      {/* Engagement Rate */}
      <GlassCard delay={0.1}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-[#7C3AED]" />
          <HoverCard
            content="Interactions / impressions. Above 3% is strong."
          >
            <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider cursor-help border-b border-dotted border-[#94A3B8]/30">
              Engagement Rate
            </span>
          </HoverCard>
        </div>
        <div className="text-3xl font-bold text-[#F1F5F9] tabular-nums">
          {engagementRate.toFixed(1)}%
        </div>
        <div className="mt-2">
          <Sparkline data={sparkData} color="#7C3AED" height={32} />
        </div>
      </GlassCard>

      {/* Followers */}
      <GlassCard delay={0.15}>
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-[#10B981]" />
          <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Followers
          </span>
        </div>
        <div
          className={`text-3xl font-bold tabular-nums ${
            followerDelta >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
          }`}
        >
          {followerDelta >= 0 ? "+" : ""}
          {followerDelta}
        </div>
        <p className="text-[10px] text-[#64748B] mt-1">net change this week</p>
      </GlassCard>
    </div>
  );
}
