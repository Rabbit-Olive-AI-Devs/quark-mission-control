"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { SourceBadge } from "@/components/intel/source-badge";
import { Eye, Flame, Clock } from "lucide-react";
import type { IntelTrend } from "@/lib/parsers/types";

function viralityColor(v: number): string {
  if (v >= 8) return "#EF4444";
  if (v >= 6) return "#F59E0B";
  if (v >= 4) return "#10B981";
  return "#94A3B8";
}

function expiryOpacity(expiry: string): number {
  const match = expiry.match(/(\d+)/);
  if (!match) return 0.7;
  const hours = parseInt(match[1], 10);
  if (hours <= 6) return 1;
  if (hours <= 12) return 0.9;
  if (hours <= 24) return 0.8;
  if (hours <= 48) return 0.65;
  return 0.5;
}

function confidenceLabel(confidence: string): string {
  const c = confidence.toLowerCase();
  if (c === "high" || c === "confirmed") return "High";
  if (c === "medium" || c === "likely") return "Medium";
  return "Low";
}

function confidenceColor(confidence: string): string {
  const c = confidence.toLowerCase();
  if (c === "high" || c === "confirmed") return "#10B981";
  if (c === "medium" || c === "likely") return "#F59E0B";
  return "#94A3B8";
}

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  CONTENT: { bg: "#7C3AED20", text: "#A78BFA" },
  QUARK: { bg: "#00D4AA20", text: "#00D4AA" },
  BRIEF: { bg: "#F59E0B20", text: "#F59E0B" },
  MACRO: { bg: "#EF444420", text: "#EF4444" },
  COMMUNITY: { bg: "#3B82F620", text: "#60A5FA" },
  NICHE: { bg: "#10B98120", text: "#10B981" },
  BREAKING: { bg: "#EF444420", text: "#EF4444" },
  HOT: { bg: "#F97316", text: "#FB923C" },
};

const DEFAULT_TAG = { bg: "#94A3B820", text: "#94A3B8" };

const RELEVANCE_KEYWORDS = [
  "openclaw",
  "ai agent",
  "cli",
  "developer tool",
  "automation",
  "local llm",
  "mcp",
  "claude",
  "cursor",
  "codex",
];

/**
 * Parse "[TAG1+TAG2] Title text" into { tags: string[], cleanTitle: string }
 */
function parseTitleTags(title: string): { tags: string[]; cleanTitle: string } {
  const match = title.match(/^\[([^\]]+)\]\s*/);
  if (!match) return { tags: [], cleanTitle: title };

  const tagStr = match[1];
  const tags = tagStr
    .split("+")
    .map((t) => t.trim())
    .filter(Boolean);
  const cleanTitle = title.slice(match[0].length);
  return { tags, cleanTitle };
}

function TagPill({ tag }: { tag: string }) {
  const key = tag.toUpperCase();
  const colors = TAG_COLORS[key] ?? DEFAULT_TAG;

  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      {tag}
    </span>
  );
}

interface TrendCardProps {
  trend: IntelTrend;
  index: number;
}

export function TrendCard({ trend, index }: TrendCardProps) {
  const vColor = viralityColor(trend.virality);
  const opacity = expiryOpacity(trend.expiry);
  const confColor = confidenceColor(trend.confidence);
  const confText = confidenceLabel(trend.confidence);
  const { tags, cleanTitle } = parseTitleTags(trend.title);
  const isRelevant = RELEVANCE_KEYWORDS.some((kw) =>
    trend.title.toLowerCase().includes(kw)
  );

  return (
    <GlassCard delay={index * 0.04} hover>
      <div style={{ opacity }}>
        {/* Top row: source badge + tags + confidence + relevance */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <SourceBadge source={trend.source} />
            {tags.map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {isRelevant && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00D4AA]/15 text-[#00D4AA] font-medium">
                Relevant
              </span>
            )}
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
              style={{ backgroundColor: `${confColor}15`, color: confColor }}
            >
              <Eye size={10} />
              {confText}
            </div>
          </div>
        </div>

        {/* Title (cleaned of tag prefix) */}
        <h3 className="text-sm font-semibold text-[#F1F5F9] mb-1.5 leading-snug">
          {cleanTitle}
        </h3>

        {/* Angle / summary */}
        <p className="text-xs text-[#94A3B8] mb-3 line-clamp-3 leading-relaxed">
          {trend.angle}
        </p>

        {/* Virality bar */}
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Flame size={11} style={{ color: vColor }} />
              <span
                className="text-[10px] font-semibold"
                style={{ color: vColor }}
              >
                Virality {trend.virality}/10
              </span>
            </div>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${trend.virality * 10}%`,
                background: `linear-gradient(90deg, ${vColor}80, ${vColor})`,
              }}
            />
          </div>
        </div>

        {/* Footer: expiry */}
        <div className="flex items-center gap-1 text-[10px] text-[#64748B]">
          <Clock size={9} />
          <span>Expires {trend.expiry}</span>
        </div>
      </div>
    </GlassCard>
  );
}
