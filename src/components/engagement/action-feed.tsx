"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import type { EngagementAction } from "@/lib/parsers/types";
import {
  getPlatformColor,
  getActionColor,
  PLATFORM_LABELS,
  formatTimeAgo,
} from "@/lib/engagement-constants";

interface Props {
  actions: EngagementAction[];
}

const PAGE_SIZE = 50;
const ALL_PLATFORMS = ["x", "tiktok", "youtube", "instagram", "substack"];

export function ActionFeed({ actions }: Props) {
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = actions.filter((a) => {
    if (platformFilter && a.platform !== platformFilter) return false;
    if (actionFilter && a.action !== actionFilter) return false;
    return true;
  });

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const actionTypes = [...new Set(actions.map((a) => a.action))];

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <Activity size={16} className="text-[#00D4AA]" />
        <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider">
          Action Feed
        </h3>
        <span className="text-xs text-[#94A3B8] ml-auto">{filtered.length} actions</span>
      </div>

      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        <FilterPill label="All" active={platformFilter === null} onClick={() => setPlatformFilter(null)} />
        {ALL_PLATFORMS.map((p) => (
          <FilterPill
            key={p}
            label={PLATFORM_LABELS[p] ?? p}
            active={platformFilter === p}
            color={getPlatformColor(p)}
            onClick={() => setPlatformFilter(platformFilter === p ? null : p)}
          />
        ))}
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <FilterPill label="All Types" active={actionFilter === null} onClick={() => setActionFilter(null)} />
        {actionTypes.map((a) => (
          <FilterPill
            key={a}
            label={a}
            active={actionFilter === a}
            color={getActionColor(a)}
            onClick={() => setActionFilter(actionFilter === a ? null : a)}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-[#94A3B8] text-center py-6">No actions match filters</p>
      ) : (
        <div className="space-y-1.5">
          {visible.map((a, i) => (
            <ActionRow key={`${a.timestamp}-${i}`} action={a} />
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full mt-4 py-2 text-xs text-[#00D4AA] hover:bg-white/5 rounded-lg transition-colors"
        >
          Load more ({filtered.length - visibleCount} remaining)
        </button>
      )}
    </GlassCard>
  );
}

function FilterPill({ label, active, color, onClick }: { label: string; active: boolean; color?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors shrink-0"
      style={{
        backgroundColor: active ? (color ? `${color}20` : "rgba(0,212,170,0.15)") : "rgba(255,255,255,0.05)",
        color: active ? (color ?? "#00D4AA") : "#94A3B8",
        borderWidth: 1,
        borderColor: active ? (color ? `${color}40` : "rgba(0,212,170,0.3)") : "rgba(255,255,255,0.08)",
      }}
    >
      {label}
    </button>
  );
}

function getTargetUrl(platform: string, targetId: string): string | null {
  if (!targetId) return null;
  if (platform === "x") return `https://x.com/i/status/${targetId}`;
  if (platform === "youtube") return `https://youtube.com/watch?v=${targetId}`;
  return null;
}

function ActionRow({ action: a }: { action: EngagementAction }) {
  const [expanded, setExpanded] = useState(false);
  const targetUrl = getTargetUrl(a.platform, a.targetId);
  const targetLabel = a.targetAuthor
    ? `@${a.targetAuthor.replace(/^@/, "")}`
    : targetUrl
      ? "View post ↗"
      : a.targetId
        ? a.targetId.slice(0, 12) + "..."
        : "";

  return (
    <div
      className="flex items-center gap-3 text-xs p-2 rounded-lg bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.04] transition-colors md:flex-row flex-col md:text-left text-center"
      onClick={() => a.text && setExpanded(!expanded)}
    >
      <span className="text-[#94A3B8] w-14 shrink-0 text-right hidden md:block">{formatTimeAgo(a.timestamp)}</span>
      <span className="text-[#94A3B8] md:hidden">{formatTimeAgo(a.timestamp)}</span>
      <span className="w-2 h-2 rounded-full shrink-0 hidden md:block" style={{ backgroundColor: getPlatformColor(a.platform) }} />
      <span className="text-[#F1F5F9] w-16 shrink-0">{PLATFORM_LABELS[a.platform] ?? a.platform}</span>
      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0" style={{ backgroundColor: `${getActionColor(a.action)}15`, color: getActionColor(a.action) }}>
        {a.action}
      </span>
      {targetUrl ? (
        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00D4AA] hover:underline truncate flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          {targetLabel}
        </a>
      ) : (
        <span className="text-[#94A3B8] truncate flex-1">{targetLabel}</span>
      )}
      {a.text && !expanded && (
        <span className="text-[#94A3B8]/50 truncate max-w-[200px] hidden md:block">
          {a.text.length > 60 ? a.text.slice(0, 60) + "..." : a.text}
        </span>
      )}
      {a.guardrailResult !== "pass" && (
        <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#EF4444]/10 text-[#EF4444] shrink-0">blocked</span>
      )}
      {expanded && a.text && (
        <div className="w-full mt-2 p-2 rounded bg-white/[0.03] text-[#F1F5F9] text-xs">
          {a.text}
        </div>
      )}
    </div>
  );
}
