"use client";

import type { StatusFullResponse } from "@/lib/parsers/types";

interface IntelPanelProps {
  data: StatusFullResponse;
}

function getViralityColor(virality: number): string {
  if (virality >= 8) return "#00D4AA";
  if (virality >= 5) return "#F59E0B";
  return "#94A3B8";
}

function getViralityBg(virality: number): string {
  if (virality >= 8) return "rgba(0,212,170,0.08)";
  if (virality >= 5) return "rgba(245,158,11,0.06)";
  return "transparent";
}

/** Strip [CATEGORY] prefixes like [CONTENT], [BRIEF+CONTENT], [QUARK] from titles */
function cleanTitle(title: string): string {
  return title.replace(/^\[[\w+]+\]\s*/i, "").trim();
}

/** Map raw source paths/URLs to short human labels */
function sourceLabel(source: string): string {
  const s = source.toLowerCase();
  if (s.includes("twitter") || s.includes("x_trending") || s.includes("x_home") || s.includes("x_mentions")) return "X";
  if (s.includes("genviral")) return "Genviral";
  if (s.includes("reuters")) return "Reuters";
  if (s.includes("hn") || s.includes("hacker")) return "HN";
  if (s.includes("producthunt")) return "PH";
  if (s.includes("reddit")) return "Reddit";
  if (s.includes("tavily")) return "Web";
  if (s.includes("github")) return "GitHub";
  if (s.includes("verge")) return "Verge";
  if (s.includes("spacenews")) return "Space";
  return "Intel";
}

export function IntelPanel({ data }: IntelPanelProps) {
  const trends = data.intel.highSignal.slice(0, 3);

  if (trends.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-[#475569]">No active signals</p>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-xs text-[#334155]"
          >
            <span className="font-mono">{"\u2014"}</span>
            <span>Awaiting intel...</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {trends.map((trend, i) => (
        <div
          key={i}
          className="flex items-center gap-2 overflow-hidden rounded-md px-1.5 py-1.5 text-xs transition-colors duration-150"
          style={{ backgroundColor: getViralityBg(trend.virality) }}
        >
          {/* Virality score */}
          <span
            className="shrink-0 font-mono text-sm font-bold"
            style={{
              color: getViralityColor(trend.virality),
              textShadow: trend.virality >= 8
                ? `0 0 8px ${getViralityColor(trend.virality)}30`
                : "none",
            }}
          >
            {trend.virality.toFixed(1)}
          </span>

          {/* Title — cleaned, truncated */}
          <span className="min-w-0 flex-1 truncate text-[#F1F5F9]">
            {cleanTitle(trend.title)}
          </span>

          {/* Source — short label */}
          <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-[#64748B]">
            {sourceLabel(trend.source)}
          </span>
        </div>
      ))}

      {/* Signal count + update time */}
      <p className="pt-1 font-mono text-[10px] text-[#475569]">
        {data.intel.highSignal.length} signal{data.intel.highSignal.length !== 1 ? "s" : ""} · Updated 5:30 AM
      </p>
    </div>
  );
}
