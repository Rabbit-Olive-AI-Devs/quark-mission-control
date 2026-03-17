"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { Megaphone, Eye, Heart, MessageCircle, Repeat2, Bookmark, Package, XCircle, Clock } from "lucide-react";
import { PLATFORM_COLORS, PLATFORM_LABELS, ACTION_COLORS, TYPE_COLORS } from "@/lib/theme-constants";
import type { ContentPerformanceData } from "@/lib/parsers/types";

interface ContentPerformanceProps {
  platforms: string[];
  contentPerformance: ContentPerformanceData | null;
}

function MetricPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ color }}>{icon}</span>
      <span className="text-[10px] text-[#94A3B8]">{label}</span>
      <span className="text-xs font-semibold text-[#F1F5F9]">{value.toLocaleString()}</span>
    </div>
  );
}

export function ContentPerformance({ platforms, contentPerformance }: ContentPerformanceProps) {
  const cp = contentPerformance;

  if (!cp) {
    return (
      <GlassCard className="mb-4" delay={0.15}>
        <div className="flex items-center gap-3 mb-4">
          <Megaphone size={18} className="text-[#7C3AED]" />
          <h2 className="text-sm font-semibold text-[#F1F5F9]">Content Performance</h2>
        </div>
        <p className="text-xs text-[#94A3B8] text-center py-4">
          No daily report yet — Chandler metrics will appear here after the first daily run.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="mb-4" delay={0.15}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Megaphone size={18} className="text-[#7C3AED]" />
          <h2 className="text-sm font-semibold text-[#F1F5F9]">Content Performance</h2>
        </div>
        <span className="text-[10px] text-[#94A3B8]/60">{cp.reportDate}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* X Metrics Card */}
        <div
          className="rounded-lg bg-white/5 border border-white/10 px-4 py-3"
          style={{ borderTopColor: PLATFORM_COLORS.x, borderTopWidth: 2 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#F1F5F9]">X</span>
            <span className="text-[10px] text-[#94A3B8]">{cp.x.postsToday} posts</span>
          </div>
          <div className="grid grid-cols-2 gap-y-1.5">
            <MetricPill icon={<Eye size={12} />} label="Impr" value={cp.x.impressions} color="#1DA1F2" />
            <MetricPill icon={<Heart size={12} />} label="Likes" value={cp.x.likes} color="#EF4444" />
            <MetricPill icon={<MessageCircle size={12} />} label="Replies" value={cp.x.replies} color="#7C3AED" />
            <MetricPill icon={<Repeat2 size={12} />} label="RTs" value={cp.x.retweets} color="#10B981" />
            <MetricPill icon={<Bookmark size={12} />} label="Saves" value={cp.x.bookmarks} color="#F59E0B" />
          </div>
        </div>

        {/* Pipeline Throughput Card */}
        <div
          className="rounded-lg bg-white/5 border border-white/10 px-4 py-3"
          style={{ borderTopColor: "#00D4AA", borderTopWidth: 2 }}
        >
          <div className="text-xs font-medium text-[#F1F5F9] mb-2">Pipeline Throughput</div>
          <div className="flex items-center gap-4 mb-2">
            <MetricPill icon={<Package size={12} />} label="Published" value={cp.pipeline.published} color="#10B981" />
            <MetricPill icon={<XCircle size={12} />} label="Killed" value={cp.pipeline.killed} color="#EF4444" />
            <MetricPill icon={<Clock size={12} />} label="Stale" value={cp.pipeline.stale} color="#F59E0B" />
          </div>
          {Object.keys(cp.pipeline.contentTypes).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {Object.entries(cp.pipeline.contentTypes).map(([type, count]) => (
                <span
                  key={type}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `${TYPE_COLORS[type] || "#94A3B8"}20`,
                    color: TYPE_COLORS[type] || "#94A3B8",
                  }}
                >
                  {type}={count}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Engagement Activity Card */}
        <div
          className="rounded-lg bg-white/5 border border-white/10 px-4 py-3"
          style={{ borderTopColor: "#7C3AED", borderTopWidth: 2 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#F1F5F9]">Engagement</span>
            {cp.engagement.engagementMode !== "unknown" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[#94A3B8]">
                {cp.engagement.engagementMode}
              </span>
            )}
          </div>
          {Object.keys(cp.engagement.actionsByPlatform).length > 0 ? (
            <div className="space-y-1.5">
              {Object.entries(cp.engagement.actionsByPlatform).map(([platform, actions]) => (
                <div key={platform} className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-medium w-8"
                    style={{ color: PLATFORM_COLORS[platform] || "#94A3B8" }}
                  >
                    {(PLATFORM_LABELS[platform] || platform).toUpperCase()}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(actions).map(([action, count]) => (
                      <span
                        key={action}
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${ACTION_COLORS[action] || "#94A3B8"}20`,
                          color: ACTION_COLORS[action] || "#94A3B8",
                        }}
                      >
                        {action}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-[#94A3B8]">No engagement data in report</p>
          )}
          {cp.engagement.guardrailBlocks > 0 && (
            <div className="mt-2 text-[10px] text-[#EF4444]">
              {cp.engagement.guardrailBlocks} guardrail block{cp.engagement.guardrailBlocks !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Platform activity row — remaining platforms */}
      {cp.tiktokPostsToday > 0 && (
        <div className="mt-3 flex gap-2">
          <span
            className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10"
            style={{ borderLeftColor: PLATFORM_COLORS.tiktok, borderLeftWidth: 2 }}
          >
            TikTok: {cp.tiktokPostsToday} post{cp.tiktokPostsToday !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </GlassCard>
  );
}
