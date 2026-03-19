"use client";

import type { StatusFullResponse, StatusLevel } from "@/lib/parsers/types";
import { PLATFORM_COLORS, PLATFORM_LABELS } from "@/lib/theme-constants";

interface EngagementPanelProps {
  data: StatusFullResponse;
}

const PLATFORMS = ["x", "instagram", "tiktok", "youtube", "substack"];

export function deriveEngagementLevel(data: StatusFullResponse): StatusLevel {
  const { unansweredCount, replyRate } = data.engagement.inboundGap;
  if (unansweredCount > 10) return "critical";
  if (unansweredCount > 5 || replyRate < 50) return "warning";
  return "healthy";
}

export function EngagementPanel({ data }: EngagementPanelProps) {
  const { today, inboundGap, guardrailBlocks } = data.engagement;

  return (
    <div className="space-y-3">
      {/* 5-platform grid */}
      <div className="space-y-1.5">
        {PLATFORMS.map((platform) => {
          const count = today.byPlatform[platform] ?? 0;
          const color = PLATFORM_COLORS[platform] ?? "#94A3B8";
          const label = PLATFORM_LABELS[platform] ?? platform;

          return (
            <div
              key={platform}
              className="flex items-center gap-2 text-xs"
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: color,
                  boxShadow: count > 0 ? `0 0 4px ${color}40` : "none",
                }}
              />
              <span className="text-[#94A3B8]">{label}</span>
              <span className="ml-auto font-mono font-bold text-[#F1F5F9]">
                {count > 0 ? count : "\u2014"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary metrics with separator */}
      <div className="border-t border-white/[0.06] pt-2">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-baseline gap-1">
            <span className="font-mono font-bold text-[#F1F5F9]">
              {Math.round(inboundGap.replyRate)}%
            </span>
            <span className="text-[#64748B]">reply</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className="font-mono font-bold"
              style={{
                color:
                  inboundGap.unansweredCount > 5 ? "#F59E0B" : "#F1F5F9",
              }}
            >
              {inboundGap.unansweredCount}
            </span>
            <span className="text-[#64748B]">unanswered</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className="font-mono font-bold"
              style={{
                color: guardrailBlocks > 0 ? "#F59E0B" : "#F1F5F9",
              }}
            >
              {guardrailBlocks}
            </span>
            <span className="text-[#64748B]">blocks</span>
          </div>
        </div>
      </div>
    </div>
  );
}
