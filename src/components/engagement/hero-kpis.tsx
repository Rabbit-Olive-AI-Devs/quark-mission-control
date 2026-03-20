"use client";

import { motion } from "framer-motion";
import { Eye, Activity, MessageCircle, Users, FileText, Stethoscope } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Sparkline } from "@/components/ui/sparkline";
import type {
  EngagementData,
  PostPerformanceData,
  TrackedPost,
  DiagnosticLabel,
} from "@/lib/parsers/types";

interface Props {
  engagement: EngagementData;
  postPerf: PostPerformanceData | null;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function getDelta(current: number, previous: number): { label: string; color: string } {
  const diff = current - previous;
  if (diff === 0) return { label: "0", color: "#94A3B8" };
  const sign = diff > 0 ? "+" : "";
  return {
    label: `${sign}${formatNumber(diff)}`,
    color: diff > 0 ? "#10B981" : "#EF4444",
  };
}

function Gauge({ value, max = 1, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(value / max, 1);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <svg width="68" height="68" viewBox="0 0 68 68" className="mx-auto">
      <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
      <circle
        cx="34"
        cy="34"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 34 34)"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x="34" y="38" textAnchor="middle" fill="#F1F5F9" fontSize="14" fontWeight="600">
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}

function getPostsWithMetrics(posts: TrackedPost[]): TrackedPost[] {
  return posts.filter(
    (p) => p.metrics && "impressions" in p.metrics && (p.metrics as { impressions: number }).impressions > 0
  );
}

function getDiagnosticSummary(posts: TrackedPost[]): { label: string; color: string } {
  const withMetrics = getPostsWithMetrics(posts);
  if (withMetrics.length === 0) return { label: "No data", color: "#94A3B8" };

  const counts: Record<string, number> = {};
  for (const p of withMetrics) {
    counts[p.diagnostic] = (counts[p.diagnostic] ?? 0) + 1;
  }

  const parts: string[] = [];
  const labelMap: Record<string, string> = {
    scale: "SCALE",
    fix_hooks: "FIX",
    fix_distribution: "DIST",
    rethink: "RETHINK",
  };

  for (const [key, display] of Object.entries(labelMap)) {
    if (counts[key]) parts.push(`${counts[key]} ${display}`);
  }

  return {
    label: parts.join(", ") || "No data",
    color: counts["scale"]
      ? "#10B981"
      : counts["fix_hooks"] || counts["rethink"]
        ? "#F59E0B"
        : "#94A3B8",
  };
}

function getDailyImpressions(posts: TrackedPost[]): number[] {
  const byDay = new Map<string, number>();
  for (const p of posts) {
    const dateStr = p.created_at?.slice(0, 10) || p.last_updated?.slice(0, 10);
    if (!dateStr || !p.metrics) continue;
    const m = p.metrics as { impressions?: number; views?: number };
    byDay.set(dateStr, (byDay.get(dateStr) ?? 0) + (m.impressions || m.views || 0));
  }
  const sorted = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([, v]) => v);
}

function getRecentPosts(posts: TrackedPost[], hours: number): TrackedPost[] {
  const cutoff = Date.now() - hours * 3600_000;
  return posts.filter((p) => {
    const ts = p.created_at || p.last_updated;
    if (!ts) return false;
    return new Date(ts).getTime() > cutoff;
  });
}

export function HeroKpis({ engagement, postPerf }: Props) {
  const posts = postPerf?.posts ?? [];
  const withMetrics = getPostsWithMetrics(posts);

  // Total impressions — sum impressions (X) + views (TikTok/IG/YouTube/Substack) across all posts
  const totalImpressions = posts.reduce((sum, p) => {
    if (!p.metrics) return sum;
    const m = p.metrics as { impressions?: number; views?: number };
    return sum + (m.impressions || m.views || 0);
  }, 0);
  const dailyImpressions = getDailyImpressions(posts);

  // Weighted avg ER
  const totalER = withMetrics.reduce(
    (sum, p) => sum + ((p.metrics as { engagement_rate: number }).engagement_rate ?? 0),
    0
  );
  const avgER = withMetrics.length > 0 ? totalER / withMetrics.length : 0;
  const erColor = avgER >= 0.05 ? "#10B981" : avgER >= 0.02 ? "#F59E0B" : "#EF4444";

  // Reply rate from engagement — cap at 1.0 (100%)
  const replyRate = Math.min(engagement.inboundGap.replyRate, 1.0);
  const replyColor = replyRate >= 0.5 ? "#10B981" : replyRate >= 0.3 ? "#F59E0B" : "#EF4444";

  // Follower count — all platforms
  const followerHistory = postPerf?.followerHistory ?? [];
  const latestSnap = followerHistory.length > 0
    ? followerHistory[followerHistory.length - 1]
    : null;
  const prevSnap = followerHistory.length > 1
    ? followerHistory[followerHistory.length - 2]
    : null;

  const sumFollowers = (s: typeof latestSnap) =>
    (s?.x_followers ?? 0) +
    (s?.tiktok_followers ?? 0) +
    (s?.instagram_followers ?? 0) +
    (s?.youtube_followers ?? 0) +
    (s?.substack_subscribers ?? 0);

  const totalFollowers = sumFollowers(latestSnap);
  const prevTotalFollowers = prevSnap ? sumFollowers(prevSnap) : totalFollowers;
  const followerDelta = getDelta(totalFollowers, prevTotalFollowers);

  const followerPlatforms = latestSnap
    ? [
        latestSnap.x_followers != null ? { label: "X", value: latestSnap.x_followers, color: "#1DA1F2" } : null,
        latestSnap.tiktok_followers != null ? { label: "TT", value: latestSnap.tiktok_followers, color: "#FE2C55" } : null,
        latestSnap.instagram_followers != null ? { label: "IG", value: latestSnap.instagram_followers, color: "#E1306C" } : null,
        latestSnap.youtube_followers != null ? { label: "YT", value: latestSnap.youtube_followers, color: "#FF0000" } : null,
        latestSnap.substack_subscribers != null ? { label: "SS", value: latestSnap.substack_subscribers, color: "#FF6719" } : null,
      ].filter(Boolean) as { label: string; value: number; color: string }[]
    : [];

  // Posts in last 24h
  const recentPosts = getRecentPosts(posts, 24);
  const platformBreakdown = new Map<string, number>();
  for (const p of recentPosts) {
    platformBreakdown.set(p.platform, (platformBreakdown.get(p.platform) ?? 0) + 1);
  }

  // Diagnostic summary
  const diagSummary = getDiagnosticSummary(withMetrics);

  const cards = [
    {
      icon: Eye,
      label: "Total Impressions",
      color: "#3B82F6",
      render: () => (
        <>
          <div className="text-2xl font-bold text-[#F1F5F9] font-mono">{formatNumber(totalImpressions)}</div>
          <div className="mt-2 h-[30px]">
            {dailyImpressions.length >= 2 && <Sparkline data={dailyImpressions} color="#3B82F6" height={30} />}
          </div>
        </>
      ),
    },
    {
      icon: Activity,
      label: "Engagement Rate",
      color: erColor,
      render: () => (
        <>
          <div className="text-2xl font-bold font-mono" style={{ color: erColor }}>
            {(avgER * 100).toFixed(1)}%
          </div>
          <p className="text-[10px] text-[#94A3B8] mt-1">{withMetrics.length} posts measured</p>
        </>
      ),
    },
    {
      icon: MessageCircle,
      label: "Reply Rate",
      color: replyColor,
      render: () => (
        <>
          <Gauge value={replyRate} color={replyColor} />
          <p className="text-[10px] text-[#94A3B8] text-center mt-1">
            {engagement.inboundGap.totalReplied}/{engagement.inboundGap.totalReceived} replied
          </p>
        </>
      ),
    },
    {
      icon: Users,
      label: "Followers",
      color: "#7C3AED",
      render: () => (
        <>
          <div className="text-2xl font-bold text-[#F1F5F9] font-mono">{formatNumber(totalFollowers)}</div>
          {followerPlatforms.length > 0 && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2 text-left">
              {followerPlatforms.map((p) => (
                <div key={p.label} className="flex items-center justify-between text-[10px] font-mono">
                  <span style={{ color: p.color }}>{p.label}</span>
                  <span className="text-[#F1F5F9]">{p.value}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ),
    },
    {
      icon: FileText,
      label: "Posts (24h)",
      color: "#00D4AA",
      render: () => (
        <>
          <div className="text-2xl font-bold text-[#F1F5F9] font-mono">{recentPosts.length}</div>
          <div className="flex gap-1.5 mt-1 flex-wrap justify-center">
            {[...platformBreakdown.entries()].map(([plat, count]) => (
              <span key={plat} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-[#94A3B8]">
                {plat}: {count}
              </span>
            ))}
          </div>
        </>
      ),
    },
    {
      icon: Stethoscope,
      label: "Diagnostic",
      color: diagSummary.color,
      render: () => (
        <>
          <div
            className="text-sm font-bold font-mono text-center px-2"
            style={{ color: diagSummary.color }}
          >
            {diagSummary.label}
          </div>
          <p className="text-[10px] text-[#94A3B8] mt-1">
            {postPerf?.feedback?.summary
              ? postPerf.feedback.summary.length > 60
                ? postPerf.feedback.summary.slice(0, 60) + "..."
                : postPerf.feedback.summary
              : "Waiting for feedback"}
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <card.icon size={14} style={{ color: card.color }} />
              <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider">{card.label}</span>
            </div>
            <div className="text-center">{card.render()}</div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}
