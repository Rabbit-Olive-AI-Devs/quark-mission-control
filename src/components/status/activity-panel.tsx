"use client";

import type { StatusFullResponse } from "@/lib/parsers/types";

interface ActivityPanelProps {
  data: StatusFullResponse;
}

const LEVEL_COLORS: Record<string, string> = {
  info: "#00D4AA",
  warning: "#F59E0B",
  error: "#EF4444",
};

const LEVEL_GLOW: Record<string, string> = {
  info: "rgba(0,212,170,0.15)",
  warning: "rgba(245,158,11,0.15)",
  error: "rgba(239,68,68,0.15)",
};

export function ActivityPanel({ data }: ActivityPanelProps) {
  const entries = data.activity;

  if (entries.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-[#475569]">No activity recorded today</p>
        <div className="flex items-start gap-3 text-xs">
          <span className="shrink-0 font-mono text-[#334155]">
            {"\u2014\u2014"}
          </span>
          <div className="border-l-2 border-[#334155] pl-3">
            <span className="text-[#475569]">Waiting for events...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {entries.map((entry, i) => (
        <div key={i} className="flex items-start gap-3 text-xs">
          {/* Timestamp */}
          <span
            className="shrink-0 font-mono text-[#64748B]"
            style={{ minWidth: "6ch" }}
          >
            {entry.timestamp.length > 10
              ? entry.timestamp.slice(0, 10)
              : entry.timestamp}
          </span>

          {/* Timeline bar + text */}
          <div
            className="flex-1 border-l-2 pl-3"
            style={{
              borderColor: LEVEL_COLORS[entry.level] ?? "#00D4AA",
              boxShadow: `inset 2px 0 4px -2px ${LEVEL_GLOW[entry.level] ?? "transparent"}`,
            }}
          >
            <span className="text-[#F1F5F9]">{entry.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
