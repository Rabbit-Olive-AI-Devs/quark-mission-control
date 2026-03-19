"use client";

import { useState, useMemo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { PLATFORM_COLORS } from "@/lib/theme-constants";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ContentPost } from "@/lib/parsers/types";

interface ContentTopPostsProps {
  posts: ContentPost[];
}

type TimeFilter = "7d" | "30d" | "all";
type PlatformFilter = "all" | string;

function totalEngagement(post: ContentPost): number {
  const m = post.metrics;
  return m.views + m.likes + m.comments + m.shares;
}

const PLATFORMS = ["x", "tiktok", "instagram", "youtube", "substack"];
const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "all", label: "All" },
];

export function ContentTopPosts({ posts }: ContentTopPostsProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("7d");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const now = Date.now();
    const msMap: Record<TimeFilter, number> = {
      "7d": 7 * 86400000,
      "30d": 30 * 86400000,
      all: Infinity,
    };
    const cutoff = msMap[timeFilter];

    return posts
      .filter((p) => {
        if (cutoff !== Infinity) {
          const age = now - new Date(p.date).getTime();
          if (age > cutoff) return false;
        }
        if (platformFilter !== "all" && p.platform !== platformFilter)
          return false;
        return true;
      })
      .sort((a, b) => totalEngagement(b) - totalEngagement(a));
  }, [posts, timeFilter, platformFilter]);

  return (
    <GlassCard delay={0.1}>
      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Time filters */}
        <div className="flex gap-1">
          {TIME_FILTERS.map((tf) => (
            <button
              key={tf.key}
              onClick={() => setTimeFilter(tf.key)}
              className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                timeFilter === tf.key
                  ? "bg-[#00D4AA]/20 text-[#00D4AA]"
                  : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Platform filters */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setPlatformFilter("all")}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
              platformFilter === "all"
                ? "bg-[#00D4AA]/20 text-[#00D4AA]"
                : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5"
            }`}
          >
            All
          </button>
          {PLATFORMS.map((pl) => {
            const color = PLATFORM_COLORS[pl] || "#94A3B8";
            return (
              <button
                key={pl}
                onClick={() => setPlatformFilter(pl)}
                className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors uppercase ${
                  platformFilter === pl
                    ? "text-white"
                    : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5"
                }`}
                style={
                  platformFilter === pl
                    ? { backgroundColor: `${color}30`, color }
                    : undefined
                }
              >
                {pl}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-xs text-[#94A3B8]">
            No published posts yet. Posts will appear here after publishing.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-2 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Post
                </th>
                <th className="text-center px-3 py-2 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Platform
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Views
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Likes
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Comments
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Shares
                </th>
                <th className="text-right px-5 py-2 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((post) => {
                const isExpanded = expandedId === post.id;
                const total = totalEngagement(post);
                const platColor =
                  PLATFORM_COLORS[post.platform] || "#94A3B8";

                return (
                  <tr key={post.id} className="group">
                    <td className="px-5 py-2.5">
                      <button
                        onClick={() =>
                          setExpandedId(isExpanded ? null : post.id)
                        }
                        className="flex items-center gap-1.5 text-left hover:text-[#00D4AA] transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp size={10} className="shrink-0 text-[#94A3B8]" />
                        ) : (
                          <ChevronDown size={10} className="shrink-0 text-[#94A3B8]" />
                        )}
                        <span className="text-[#F1F5F9] group-hover:text-[#00D4AA] transition-colors">
                          {isExpanded
                            ? post.hook
                            : post.hook.length > 60
                              ? post.hook.slice(0, 60) + "..."
                              : post.hook}
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                        style={{
                          backgroundColor: `${platColor}20`,
                          color: platColor,
                        }}
                      >
                        {post.platform}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#94A3B8] tabular-nums">
                      {post.metrics.views.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#94A3B8] tabular-nums">
                      {post.metrics.likes.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#94A3B8] tabular-nums">
                      {post.metrics.comments.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#94A3B8] tabular-nums">
                      {post.metrics.shares.toLocaleString()}
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono font-semibold text-[#F1F5F9] tabular-nums">
                      {total.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}
