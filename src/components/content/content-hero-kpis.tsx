"use client";

import { GlassCard } from "@/components/ui/glass-card";
import {
  Hash,
  Calendar,
  Users,
  TrendingUp,
  Activity,
  MessageSquare,
} from "lucide-react";
import type {
  PostPerformanceData,
  PipelineScorecard,
  ContentFeedback,
  TrackedPost,
  PostMetrics,
  FollowerSnapshot,
} from "@/lib/parsers/types";

interface ContentHeroKpisProps {
  todayCount: number;
  weekCount: number;
  platformCounts: Record<string, number>;
  cadenceAvg7d: number;
  postPerformance: PostPerformanceData | null;
  scorecard: PipelineScorecard | null;
  feedback: ContentFeedback | null;
}

function getLatestFollowers(history: FollowerSnapshot[]): FollowerSnapshot | null {
  if (history.length === 0) return null;
  return history[history.length - 1];
}

function computeAvgER(posts: TrackedPost[]): { er: number; count: number } {
  const withMetrics = posts.filter(
    (p) => "impressions" in p.metrics && (p.metrics as PostMetrics).impressions > 0
  );
  if (withMetrics.length === 0) return { er: 0, count: 0 };
  const total = withMetrics.reduce(
    (sum, p) => sum + ((p.metrics as PostMetrics).engagement_rate ?? 0),
    0
  );
  return { er: total / withMetrics.length, count: withMetrics.length };
}

function formatPlatformBreakdown(counts: Record<string, number>): string {
  const labels: Record<string, string> = {
    x: "X",
    tiktok: "TT",
    instagram: "IG",
    youtube: "YT",
    substack: "Sub",
  };
  const parts = Object.entries(counts)
    .filter(([k, v]) => v > 0 && k !== "unknown")
    .map(([k, v]) => `${v} ${labels[k] || k}`);
  return parts.length > 0 ? parts.join(", ") : "none yet";
}

function trendLabel(weekCount: number, cadenceAvg: number): string {
  if (cadenceAvg <= 0) return "no baseline yet";
  const weeklyAvg = cadenceAvg * 7;
  if (weekCount > weeklyAvg * 1.15) return "above avg";
  if (weekCount < weeklyAvg * 0.85) return "below avg";
  return "on pace";
}

export function ContentHeroKpis({
  todayCount,
  weekCount,
  platformCounts,
  cadenceAvg7d,
  postPerformance,
  scorecard,
  feedback,
}: ContentHeroKpisProps) {
  const latestFollowers = postPerformance
    ? getLatestFollowers(postPerformance.followerHistory)
    : null;
  const { er: avgER, count: erPostCount } = postPerformance
    ? computeAvgER(postPerformance.posts)
    : { er: 0, count: 0 };

  const pendingCount = scorecard?.pending ?? 0;
  const staleCount = scorecard?.stale ?? 0;
  const hasStuck = staleCount > 0;

  const feedbackSummary = feedback?.summary ?? null;
  const truncatedFeedback = feedbackSummary
    ? feedbackSummary.length > 80
      ? feedbackSummary.slice(0, 77) + "..."
      : feedbackSummary
    : null;

  const dataConfidence =
    erPostCount >= 10
      ? "high"
      : erPostCount >= 5
      ? "moderate"
      : "insufficient";

  const confidenceColors: Record<string, string> = {
    high: "#10B981",
    moderate: "#F59E0B",
    insufficient: "#64748B",
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Published Today */}
      <GlassCard delay={0}>
        <div className="flex items-center gap-2 mb-3">
          <Hash size={14} className="text-[#00D4AA]" />
          <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Published Today
          </span>
        </div>
        <div className="text-3xl font-bold text-[#F1F5F9] tabular-nums">
          {todayCount}
        </div>
        <p className="text-[10px] text-[#64748B] mt-1">
          {formatPlatformBreakdown(platformCounts)}
        </p>
      </GlassCard>

      {/* This Week */}
      <GlassCard delay={0.04}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} className="text-[#7C3AED]" />
          <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
            This Week
          </span>
        </div>
        <div className="text-3xl font-bold text-[#F1F5F9] tabular-nums">
          {weekCount}
        </div>
        <p className="text-[10px] text-[#64748B] mt-1">
          {trendLabel(weekCount, cadenceAvg7d)}
        </p>
      </GlassCard>

      {/* Followers */}
      <GlassCard delay={0.08}>
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-[#3B82F6]" />
          <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Followers
          </span>
        </div>
        {(() => {
          const total = latestFollowers
            ? (latestFollowers.x_followers ?? 0) +
              (latestFollowers.tiktok_followers ?? 0) +
              (latestFollowers.instagram_followers ?? 0) +
              (latestFollowers.youtube_followers ?? 0) +
              (latestFollowers.substack_subscribers ?? 0)
            : 0;
          const breakdown = latestFollowers
            ? [
                latestFollowers.x_followers != null ? `X: ${latestFollowers.x_followers}` : null,
                latestFollowers.tiktok_followers != null ? `TT: ${latestFollowers.tiktok_followers}` : null,
                latestFollowers.instagram_followers != null ? `IG: ${latestFollowers.instagram_followers}` : null,
                latestFollowers.youtube_followers != null ? `YT: ${latestFollowers.youtube_followers}` : null,
                latestFollowers.substack_subscribers != null ? `SS: ${latestFollowers.substack_subscribers}` : null,
              ].filter(Boolean).join(" \u00B7 ")
            : "";
          return (
            <>
              <div className="text-3xl font-bold text-[#F1F5F9] tabular-nums font-mono">
                {total > 0 ? total : "--"}
              </div>
              {breakdown && (
                <p className="text-[9px] text-[#64748B] mt-1 font-mono">{breakdown}</p>
              )}
              <p className="text-[10px] text-[#64748B] mt-0.5">
                {latestFollowers ? `as of ${latestFollowers.date}` : "no follower data"}
              </p>
            </>
          );
        })()}
      </GlassCard>

      {/* Avg ER */}
      <GlassCard delay={0.12}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-[#10B981]" />
          <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Avg ER
          </span>
        </div>
        <div className="text-3xl font-bold text-[#F1F5F9] tabular-nums">
          {erPostCount > 0 ? `${(avgER * 100).toFixed(1)}%` : "--"}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] text-[#64748B]">
            across {erPostCount} post{erPostCount !== 1 ? "s" : ""}
          </span>
          <span
            className="text-[9px] px-1 py-0.5 rounded font-medium"
            style={{
              backgroundColor: `${confidenceColors[dataConfidence]}20`,
              color: confidenceColors[dataConfidence],
            }}
          >
            {dataConfidence === "insufficient"
              ? "insufficient data"
              : dataConfidence}
          </span>
        </div>
      </GlassCard>

      {/* Pipeline */}
      <GlassCard delay={0.16}>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-[#F59E0B]" />
          <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Pipeline
          </span>
        </div>
        <div
          className="text-3xl font-bold tabular-nums"
          style={{ color: hasStuck ? "#F59E0B" : "#F1F5F9" }}
        >
          {pendingCount}
        </div>
        <p className="text-[10px] mt-1">
          <span className="text-[#64748B]">
            {pendingCount} pending
          </span>
          {staleCount > 0 && (
            <span className="text-[#EF4444]"> · {staleCount} stuck</span>
          )}
        </p>
      </GlassCard>

      {/* Feedback */}
      <GlassCard delay={0.2}>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={14} className="text-[#EC4899]" />
          <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Feedback
          </span>
        </div>
        <div className="text-sm text-[#F1F5F9] leading-relaxed">
          {truncatedFeedback || (
            <span className="text-[#64748B]">No feedback yet</span>
          )}
        </div>
        {feedback && (
          <p className="text-[10px] text-[#64748B] mt-1">
            {feedback.posts_analyzed} post{feedback.posts_analyzed !== 1 ? "s" : ""} analyzed
          </p>
        )}
      </GlassCard>
    </div>
  );
}
