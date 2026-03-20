"use client";

import { Globe, Activity, FileText, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { PLATFORM_COLORS, PLATFORM_LABELS } from "@/lib/theme-constants";
import type {
  PostPerformanceData,
  PlatformHealth,
  TrackedPost,
  FollowerSnapshot,
} from "@/lib/parsers/types";
import { formatTimeAgo } from "@/lib/utils";

interface Props {
  postPerf: PostPerformanceData;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function getFollowerCount(platform: string, history: FollowerSnapshot[]): number {
  if (!history || history.length === 0) return 0;
  const latest = history[history.length - 1];
  switch (platform) {
    case "x":
      return latest.x_followers ?? 0;
    case "tiktok":
      return latest.tiktok_followers ?? 0;
    case "instagram":
      return latest.instagram_followers ?? 0;
    default:
      return 0;
  }
}

function getPostsThisWeek(platform: string, posts: TrackedPost[]): number {
  const weekAgo = Date.now() - 7 * 86400_000;
  return posts.filter((p) => {
    if (p.platform !== platform) return false;
    const ts = p.created_at || p.last_updated;
    if (!ts) return false;
    return new Date(ts).getTime() > weekAgo;
  }).length;
}

function getAvgER(platform: string, posts: TrackedPost[]): number {
  const platPosts = posts.filter(
    (p) =>
      p.platform === platform &&
      p.metrics &&
      "engagement_rate" in p.metrics &&
      (p.metrics as { engagement_rate: number }).engagement_rate > 0
  );
  if (platPosts.length === 0) return 0;
  const total = platPosts.reduce(
    (sum, p) => sum + ((p.metrics as { engagement_rate: number }).engagement_rate ?? 0),
    0
  );
  return total / platPosts.length;
}

function StatusIndicator({ status }: { status: string }) {
  if (status === "healthy" || status === "active") {
    return <CheckCircle size={14} className="text-[#10B981]" />;
  }
  if (status === "degraded" || status === "warning") {
    return <AlertTriangle size={14} className="text-[#F59E0B]" />;
  }
  return <AlertTriangle size={14} className="text-[#EF4444]" />;
}

interface PlatformCardData {
  platform: string;
  label: string;
  color: string;
  followers: number;
  postsThisWeek: number;
  avgER: number;
  health: PlatformHealth | null;
  lastUpdated: string | null;
}

export function PlatformHealthPanel({ postPerf }: Props) {
  const platforms = ["x", "tiktok", "youtube", "instagram", "substack"];
  const platformHealth = postPerf.feedback?.platform_health ?? {};

  // Find the latest metrics_updated_at from posts per platform
  function getLatestUpdate(platform: string): string | null {
    const platPosts = (postPerf.posts ?? []).filter((p) => p.platform === platform);
    if (platPosts.length === 0) return null;
    const dates = platPosts
      .map((p) => p.last_updated)
      .filter((d): d is string => !!d)
      .sort()
      .reverse();
    return dates[0] ?? null;
  }

  const safePosts = postPerf.posts ?? [];
  const safeHistory = postPerf.followerHistory ?? [];

  const cards: PlatformCardData[] = platforms
    .map((p) => ({
      platform: p,
      label: PLATFORM_LABELS[p] ?? p,
      color: PLATFORM_COLORS[p] ?? "#94A3B8",
      followers: getFollowerCount(p, safeHistory),
      postsThisWeek: getPostsThisWeek(p, safePosts),
      avgER: getAvgER(p, safePosts),
      health: platformHealth[p] ?? null,
      lastUpdated: getLatestUpdate(p),
    }))
    .filter((c) => c.postsThisWeek > 0 || c.followers > 0 || c.health !== null);

  if (cards.length === 0) {
    return (
      <GlassCard>
        <div className="text-center py-8">
          <Globe size={32} className="text-[#94A3B8]/30 mx-auto mb-3" />
          <p className="text-sm text-[#94A3B8]">No platform data available yet.</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => (
        <GlassCard key={card.platform}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: card.color }}
              />
              <span className="text-sm font-semibold text-[#F1F5F9]">{card.label}</span>
            </div>
            {card.health && <StatusIndicator status={card.health.status} />}
          </div>

          <div className="space-y-3">
            {card.followers > 0 && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-[#94A3B8]">
                  <Activity size={12} />
                  Followers
                </div>
                <span className="text-[#F1F5F9] font-mono">{formatNumber(card.followers)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-[#94A3B8]">
                <FileText size={12} />
                Posts (7d)
              </div>
              <span className="text-[#F1F5F9] font-mono">{card.postsThisWeek}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-[#94A3B8]">
                <Activity size={12} />
                Avg ER
              </div>
              <span
                className="font-mono"
                style={{
                  color:
                    card.avgER >= 0.03
                      ? "#10B981"
                      : card.avgER >= 0.01
                        ? "#F59E0B"
                        : card.avgER > 0
                          ? "#EF4444"
                          : "#94A3B8",
                }}
              >
                {card.avgER > 0 ? `${(card.avgER * 100).toFixed(1)}%` : "--"}
              </span>
            </div>

            {card.health && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-[#94A3B8]">
                  <Activity size={12} />
                  Baseline ER
                </div>
                <span className="text-[#F1F5F9] font-mono">
                  {(card.health.baseline_er * 100).toFixed(1)}%
                </span>
              </div>
            )}

            {card.lastUpdated && (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-[#94A3B8]">
                  <Clock size={12} />
                  Data freshness
                </div>
                <span className="text-[#94A3B8]/70">{formatTimeAgo(card.lastUpdated)}</span>
              </div>
            )}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
