"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { PLATFORM_COLORS, TYPE_COLORS } from "@/lib/theme-constants";
import type { TrackedPost, PostMetrics, DiagnosticLabel } from "@/lib/parsers/types";

interface Props {
  posts: TrackedPost[];
}

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

function PlatformDot({ platform }: { platform: string }) {
  const color = PLATFORM_COLORS[platform] ?? "#94A3B8";
  return (
    <span
      className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
      style={{ backgroundColor: color }}
      title={platform}
    />
  );
}

function TypeBadge({ type }: { type: string }) {
  const color = TYPE_COLORS[type] ?? "#94A3B8";
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[9px] font-medium whitespace-nowrap"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {type.replace("_", " ")}
    </span>
  );
}

function DiagnosticBadge({ label }: { label: DiagnosticLabel }) {
  const color = DIAGNOSTIC_COLORS[label];
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {DIAGNOSTIC_LABELS[label]}
    </span>
  );
}

function FilterPill({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer"
      style={{
        backgroundColor: active
          ? color
            ? `${color}20`
            : "rgba(0,212,170,0.15)"
          : "rgba(255,255,255,0.05)",
        color: active ? (color ?? "#00D4AA") : "#94A3B8",
        borderWidth: 1,
        borderColor: active
          ? color
            ? `${color}40`
            : "rgba(0,212,170,0.3)"
          : "rgba(255,255,255,0.08)",
      }}
    >
      {label}
    </button>
  );
}

function PostRow({ post }: { post: TrackedPost }) {
  const [expanded, setExpanded] = useState(false);
  const metrics = post.metrics as PostMetrics | Record<string, never>;
  const hasMetrics = "impressions" in metrics;
  const m = hasMetrics ? (metrics as PostMetrics) : null;

  const postUrl = post.post_id
    ? post.platform === "x"
      ? `https://x.com/i/status/${post.post_id}`
      : post.platform === "youtube"
        ? `https://youtube.com/watch?v=${post.post_id}`
        : null
    : null;

  return (
    <>
      <tr
        className="border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer text-xs"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-2.5 px-2">
          <div className="flex items-center gap-1.5">
            {expanded ? (
              <ChevronDown size={12} className="text-[#94A3B8]" />
            ) : (
              <ChevronRight size={12} className="text-[#94A3B8]" />
            )}
            <PlatformDot platform={post.platform} />
          </div>
        </td>
        <td className="py-2.5 px-2">
          <TypeBadge type={post.content_type} />
        </td>
        <td className="py-2.5 px-2 text-[#F1F5F9] max-w-[200px] truncate">
          {post.hook.length > 50 ? post.hook.slice(0, 50) + "..." : post.hook}
        </td>
        <td className="py-2.5 px-2 text-[#F1F5F9] font-mono text-right">
          {m ? formatNumber(m.impressions) : "--"}
        </td>
        <td className="py-2.5 px-2 text-[#F1F5F9] font-mono text-right">
          {m ? formatNumber(m.likes) : "--"}
        </td>
        <td className="py-2.5 px-2 text-[#F1F5F9] font-mono text-right">
          {m ? formatNumber(m.replies) : "--"}
        </td>
        <td className="py-2.5 px-2 font-mono text-right" style={{ color: m ? (m.engagement_rate >= 0.03 ? "#10B981" : m.engagement_rate >= 0.01 ? "#F59E0B" : "#EF4444") : "#94A3B8" }}>
          {m ? `${(m.engagement_rate * 100).toFixed(1)}%` : "--"}
        </td>
        <td className="py-2.5 px-2">
          <DiagnosticBadge label={post.diagnostic} />
        </td>
        <td className="py-2.5 px-2">
          {postUrl && (
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00D4AA] hover:text-[#00FFD0]"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={12} />
            </a>
          )}
        </td>
      </tr>
      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={9} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-3 bg-white/[0.02] border-b border-white/5 text-xs space-y-2">
                  <div>
                    <span className="text-[#94A3B8]">Hook: </span>
                    <span className="text-[#F1F5F9]">{post.hook}</span>
                  </div>
                  {post.cta && (
                    <div>
                      <span className="text-[#94A3B8]">CTA: </span>
                      <span className="text-[#F1F5F9]">{post.cta}</span>
                    </div>
                  )}
                  {m && (
                    <div className="flex gap-4 flex-wrap">
                      <span className="text-[#94A3B8]">
                        Impressions: <span className="text-[#F1F5F9] font-mono">{m.impressions.toLocaleString()}</span>
                      </span>
                      <span className="text-[#94A3B8]">
                        Likes: <span className="text-[#F1F5F9] font-mono">{m.likes.toLocaleString()}</span>
                      </span>
                      <span className="text-[#94A3B8]">
                        Replies: <span className="text-[#F1F5F9] font-mono">{m.replies.toLocaleString()}</span>
                      </span>
                      <span className="text-[#94A3B8]">
                        Retweets: <span className="text-[#F1F5F9] font-mono">{m.retweets.toLocaleString()}</span>
                      </span>
                      <span className="text-[#94A3B8]">
                        Bookmarks: <span className="text-[#F1F5F9] font-mono">{m.bookmarks.toLocaleString()}</span>
                      </span>
                      <span className="text-[#94A3B8]">
                        ER: <span className="text-[#F1F5F9] font-mono">{(m.engagement_rate * 100).toFixed(2)}%</span>
                      </span>
                    </div>
                  )}
                  {post.note && (
                    <div>
                      <span className="text-[#94A3B8]">Note: </span>
                      <span className="text-[#F1F5F9]">{post.note}</span>
                    </div>
                  )}
                  <div className="text-[#94A3B8]/60">
                    Job: {post.job_id}
                    {post.created_at && ` | Created: ${new Date(post.created_at).toLocaleDateString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

export function PostPerformanceTable({ posts }: Props) {
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [diagFilter, setDiagFilter] = useState<DiagnosticLabel | null>(null);

  const platforms = useMemo(() => [...new Set(posts.map((p) => p.platform))], [posts]);
  const types = useMemo(() => [...new Set(posts.map((p) => p.content_type))], [posts]);
  const diagnostics: DiagnosticLabel[] = useMemo(
    () => [...new Set(posts.map((p) => p.diagnostic))].filter((d) => d !== "unclassified") as DiagnosticLabel[],
    [posts]
  );

  const sorted = useMemo(() => {
    let filtered = [...posts];
    if (platformFilter) filtered = filtered.filter((p) => p.platform === platformFilter);
    if (typeFilter) filtered = filtered.filter((p) => p.content_type === typeFilter);
    if (diagFilter) filtered = filtered.filter((p) => p.diagnostic === diagFilter);

    filtered.sort((a, b) => {
      const aDate = a.created_at || a.last_updated || "";
      const bDate = b.created_at || b.last_updated || "";
      return bDate.localeCompare(aDate);
    });

    return filtered;
  }, [posts, platformFilter, typeFilter, diagFilter]);

  return (
    <GlassCard>
      {/* Filters */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        <FilterPill label="All" active={platformFilter === null} onClick={() => setPlatformFilter(null)} />
        {platforms.map((p) => (
          <FilterPill
            key={p}
            label={p.charAt(0).toUpperCase() + p.slice(1)}
            active={platformFilter === p}
            color={PLATFORM_COLORS[p]}
            onClick={() => setPlatformFilter(platformFilter === p ? null : p)}
          />
        ))}
      </div>
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        <FilterPill label="All Types" active={typeFilter === null} onClick={() => setTypeFilter(null)} />
        {types.map((t) => (
          <FilterPill
            key={t}
            label={t.replace("_", " ")}
            active={typeFilter === t}
            color={TYPE_COLORS[t]}
            onClick={() => setTypeFilter(typeFilter === t ? null : t)}
          />
        ))}
      </div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <FilterPill label="All Diag" active={diagFilter === null} onClick={() => setDiagFilter(null)} />
        {diagnostics.map((d) => (
          <FilterPill
            key={d}
            label={DIAGNOSTIC_LABELS[d]}
            active={diagFilter === d}
            color={DIAGNOSTIC_COLORS[d]}
            onClick={() => setDiagFilter(diagFilter === d ? null : d)}
          />
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] text-[#94A3B8] uppercase tracking-wider border-b border-white/10">
              <th className="py-2 px-2 text-left w-12"></th>
              <th className="py-2 px-2 text-left">Type</th>
              <th className="py-2 px-2 text-left">Hook</th>
              <th className="py-2 px-2 text-right">Imp</th>
              <th className="py-2 px-2 text-right">Likes</th>
              <th className="py-2 px-2 text-right">Replies</th>
              <th className="py-2 px-2 text-right">ER%</th>
              <th className="py-2 px-2 text-left">Diag</th>
              <th className="py-2 px-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-sm text-[#94A3B8]">
                  No posts match filters
                </td>
              </tr>
            ) : (
              sorted.map((post) => <PostRow key={post.job_id} post={post} />)
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-[#94A3B8]/50 mt-3">
        {sorted.length} of {posts.length} posts shown
      </p>
    </GlassCard>
  );
}
