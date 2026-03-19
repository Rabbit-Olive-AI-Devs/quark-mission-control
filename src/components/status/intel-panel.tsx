"use client";

import type { StatusFullResponse } from "@/lib/parsers/types";
import { formatTimeAgo } from "@/lib/utils";

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
            <span className="font-mono">\u2014</span>
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
          className="flex items-start gap-2 rounded-md px-1.5 py-1 text-xs transition-colors duration-150"
          style={{ backgroundColor: getViralityBg(trend.virality) }}
        >
          {/* Virality score badge */}
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

          {/* Title */}
          <span
            className="flex-1 text-[#F1F5F9]"
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "50ch",
            }}
          >
            {trend.title}
          </span>

          {/* Source badge */}
          <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#94A3B8]">
            {trend.source}
          </span>
        </div>
      ))}

      {/* Updated timestamp */}
      <p className="pt-1 font-mono text-[10px] text-[#475569]">
        Updated {formatTimeAgo(data.intel.updatedAt)}
      </p>
    </div>
  );
}
