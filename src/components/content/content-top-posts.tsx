"use client";

import { useState, useMemo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { PLATFORM_COLORS, TYPE_COLORS } from "@/lib/theme-constants";
import { formatDateTime } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import type {
  PublishRecord,
  TrackedPost,
  PostMetrics,
  DiagnosticLabel,
} from "@/lib/parsers/types";

interface ContentTopPostsProps {
  records: PublishRecord[];
  performancePosts?: TrackedPost[];
}

type TimeFilter = "7d" | "30d" | "all";
type PlatformFilter = "all" | string;
type SortKey = "date" | "top";

const PLATFORMS = ["x", "tiktok", "instagram", "youtube", "substack"];
const CONTENT_TYPES = [
  "proof",
  "news_relay",
  "viral_ride",
  "hot_take",
  "war_story",
  "reaction",
];
const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "all", label: "All" },
];

const OUTCOME_COLORS: Record<string, string> = {
  published: "#10B981",
  killed: "#EF4444",
  quarantined: "#F59E0B",
};

const DIAGNOSTIC_COLORS: Record<DiagnosticLabel, string> = {
  scale: "#10B981",
  fix_hooks: "#F59E0B",
  fix_distribution: "#F59E0B",
  rethink: "#EF4444",
  unclassified: "#94A3B8",
};

const DIAGNOSTIC_LABELS: Record<DiagnosticLabel, string> = {
  scale: "SCALE",
  fix_hooks: "FIX HOOKS",
  fix_distribution: "FIX DIST",
  rethink: "RETHINK",
  unclassified: "N/A",
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Extract tweet ID from an X URL like https://x.com/.../status/12345 */
function extractTweetId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/status\/(\d+)/);
  return m ? m[1] : null;
}

/** Build a lookup map: job_id -> TrackedPost and post_id -> TrackedPost */
function buildPerfMap(posts: TrackedPost[]): {
  byJobId: Map<string, TrackedPost>;
  byPostId: Map<string, TrackedPost>;
} {
  const byJobId = new Map<string, TrackedPost>();
  const byPostId = new Map<string, TrackedPost>();
  for (const p of posts) {
    byJobId.set(p.job_id, p);
    if (p.post_id) byPostId.set(p.post_id, p);
  }
  return { byJobId, byPostId };
}

function getMetrics(
  m: PostMetrics | Record<string, never>
): PostMetrics | null {
  return "impressions" in m ? (m as PostMetrics) : null;
}

/** Data is considered low-confidence if impressions <= 1 */
function isLowConfidence(m: PostMetrics | null): boolean {
  if (!m) return false;
  return m.impressions <= 1;
}

export function ContentTopPosts({
  records,
  performancePosts = [],
}: ContentTopPostsProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("7d");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());

  const toggleTypeFilter = (type: string) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const perfMap = useMemo(
    () => buildPerfMap(performancePosts),
    [performancePosts]
  );

  const filtered = useMemo(() => {
    const now = Date.now();
    const msMap: Record<TimeFilter, number> = {
      "7d": 7 * 86400000,
      "30d": 30 * 86400000,
      all: Infinity,
    };
    const cutoff = msMap[timeFilter];

    const base = records.filter((r) => {
      if (cutoff !== Infinity && r.timestamp) {
        const age = now - new Date(r.timestamp).getTime();
        if (age > cutoff) return false;
      }
      if (platformFilter !== "all" && r.platform !== platformFilter)
        return false;
      if (typeFilters.size > 0 && !typeFilters.has(r.contentType)) return false;
      return true;
    });

    if (sortKey === "top") {
      return [...base].sort((a, b) => {
        const tweetIdA = extractTweetId(a.url);
        const tweetIdB = extractTweetId(b.url);
        const perfA =
          perfMap.byJobId.get(a.jobId) ||
          (tweetIdA ? perfMap.byPostId.get(tweetIdA) : undefined);
        const perfB =
          perfMap.byJobId.get(b.jobId) ||
          (tweetIdB ? perfMap.byPostId.get(tweetIdB) : undefined);
        const erA = perfA
          ? getMetrics(perfA.metrics)?.engagement_rate ?? -1
          : -1;
        const erB = perfB
          ? getMetrics(perfB.metrics)?.engagement_rate ?? -1
          : -1;
        return erB - erA;
      });
    }

    return base;
  }, [records, timeFilter, platformFilter, sortKey, typeFilters, perfMap]);

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

        <div className="w-px h-4 bg-white/10" />

        {/* Content type filters */}
        <div className="flex gap-1 flex-wrap">
          {CONTENT_TYPES.map((ct) => {
            const color = TYPE_COLORS[ct] || "#94A3B8";
            const active = typeFilters.has(ct);
            return (
              <button
                key={ct}
                onClick={() => toggleTypeFilter(ct)}
                className={`px-2 py-1 rounded text-[9px] font-bold transition-colors uppercase ${
                  active
                    ? "text-white"
                    : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5"
                }`}
                style={
                  active
                    ? { backgroundColor: `${color}30`, color }
                    : undefined
                }
              >
                {ct.replace(/_/g, " ")}
              </button>
            );
          })}
        </div>

        <div className="w-px h-4 bg-white/10" />

        {/* Sort controls */}
        <div className="flex gap-1">
          <button
            onClick={() => setSortKey("date")}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
              sortKey === "date"
                ? "bg-[#00D4AA]/20 text-[#00D4AA]"
                : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5"
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setSortKey("top")}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
              sortKey === "top"
                ? "bg-[#00D4AA]/20 text-[#00D4AA]"
                : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5"
            }`}
          >
            Top Performing
          </button>
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
          <table className="w-full text-xs min-w-[800px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-2 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Date
                </th>
                <th className="text-center px-3 py-2 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Type
                </th>
                <th className="text-center px-3 py-2 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Platform
                </th>
                <th className="text-center px-3 py-2 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Outcome
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Imp
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Likes
                </th>
                <th className="text-right px-3 py-2 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                  ER%
                </th>
                <th className="text-center px-3 py-2 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Diag
                </th>
                <th className="text-right px-5 py-2 text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">
                  Link
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record, idx) => {
                const platColor =
                  PLATFORM_COLORS[record.platform] || "#94A3B8";
                const typeColor =
                  TYPE_COLORS[record.contentType] || "#94A3B8";
                const outcomeColor =
                  OUTCOME_COLORS[record.outcome] || "#94A3B8";

                const tweetId = extractTweetId(record.url);
                const perf =
                  perfMap.byJobId.get(record.jobId) ||
                  (tweetId ? perfMap.byPostId.get(tweetId) : undefined);
                const m = perf ? getMetrics(perf.metrics) : null;
                const diag = perf?.diagnostic ?? null;
                const diagColor = diag ? DIAGNOSTIC_COLORS[diag] : null;
                const diagLabel = diag ? DIAGNOSTIC_LABELS[diag] : null;
                const lowConf = isLowConfidence(m);

                // For low-confidence data, show diagnostic as "insufficient data"
                const displayDiagLabel =
                  lowConf && diag && diag !== "unclassified"
                    ? "LOW DATA"
                    : diagLabel;
                const displayDiagColor = lowConf ? "#64748B" : diagColor;

                const erColor = m
                  ? lowConf
                    ? "#64748B"
                    : m.engagement_rate >= 0.03
                    ? "#10B981"
                    : m.engagement_rate >= 0.01
                    ? "#F59E0B"
                    : "#EF4444"
                  : "#94A3B8";

                return (
                  <tr
                    key={`${record.jobId}-${record.format}-${idx}`}
                    className="group border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-5 py-2.5 font-mono text-[#94A3B8] tabular-nums whitespace-nowrap">
                      {record.timestamp
                        ? formatDateTime(record.timestamp)
                        : "--"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                        style={{
                          backgroundColor: `${typeColor}20`,
                          color: typeColor,
                        }}
                      >
                        {record.contentType.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                        style={{
                          backgroundColor: `${platColor}20`,
                          color: platColor,
                        }}
                      >
                        {record.platform}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: outcomeColor }}
                        />
                        <span
                          className="text-[10px] font-medium"
                          style={{ color: outcomeColor }}
                        >
                          {record.outcome}
                        </span>
                      </span>
                    </td>
                    {/* Engagement metrics — dimmed if low confidence */}
                    <td
                      className={`px-3 py-2.5 text-right font-mono tabular-nums ${
                        lowConf ? "opacity-40" : ""
                      } text-[#F1F5F9]`}
                    >
                      {m ? (
                        formatNumber(m.impressions)
                      ) : (
                        <span className="text-[#64748B]">&mdash;</span>
                      )}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono tabular-nums ${
                        lowConf ? "opacity-40" : ""
                      } text-[#F1F5F9]`}
                    >
                      {m ? (
                        formatNumber(m.likes)
                      ) : (
                        <span className="text-[#64748B]">&mdash;</span>
                      )}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-mono tabular-nums ${
                        lowConf ? "opacity-40" : ""
                      }`}
                      style={{ color: erColor }}
                    >
                      {m ? (
                        `${(m.engagement_rate * 100).toFixed(1)}%`
                      ) : (
                        <span className="text-[#64748B]">&mdash;</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {displayDiagLabel && displayDiagColor ? (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap"
                          style={{
                            backgroundColor: `${displayDiagColor}20`,
                            color: displayDiagColor,
                          }}
                        >
                          {displayDiagLabel}
                        </span>
                      ) : (
                        <span className="text-[#64748B]">&mdash;</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      {record.url ? (
                        <a
                          href={record.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#00D4AA] hover:text-[#00D4AA]/80 transition-colors"
                        >
                          <ExternalLink size={10} />
                          <span className="text-[10px] font-mono">view</span>
                        </a>
                      ) : (
                        <span className="text-[#64748B]">&mdash;</span>
                      )}
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
