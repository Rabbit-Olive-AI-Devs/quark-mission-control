"use client";

import type { StatusFullResponse, StatusLevel } from "@/lib/parsers/types";

interface EngagementPanelProps {
  data: StatusFullResponse;
}

export function deriveEngagementLevel(data: StatusFullResponse): StatusLevel {
  const { unansweredCount, replyRate } = data.engagement.inboundGap;
  if (unansweredCount > 10) return "critical";
  if (unansweredCount > 5 || replyRate < 50) return "warning";
  return "healthy";
}

function formatImpressions(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDelta(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return String(n);
  return "—";
}

export function EngagementPanel({ data }: EngagementPanelProps) {
  const { inboundGap, guardrailBlocks } = data.engagement;
  const { totalImpressions, avgER, followerDelta, diagnosticSummary } =
    data.postPerformance;

  const hasPostData = totalImpressions > 0 || avgER > 0;

  return (
    <div className="space-y-3">
      {/* Post performance metrics */}
      <div className="space-y-1.5">
        {/* Impressions row */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#94A3B8]">Impressions</span>
          <span className="ml-auto font-mono font-bold text-[#F1F5F9]">
            {hasPostData ? formatImpressions(totalImpressions) : "—"}
          </span>
        </div>

        {/* Avg ER row */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#94A3B8]">Avg ER</span>
          <span
            className="ml-auto font-mono font-bold"
            style={{
              color:
                avgER >= 3
                  ? "#22D3EE"
                  : avgER >= 1
                  ? "#F1F5F9"
                  : hasPostData
                  ? "#F59E0B"
                  : "#F1F5F9",
            }}
          >
            {hasPostData ? `${avgER.toFixed(1)}%` : "—"}
          </span>
        </div>

        {/* Follower delta row */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#94A3B8]">Followers</span>
          <span
            className="ml-auto font-mono font-bold"
            style={{
              color:
                followerDelta > 0
                  ? "#22D3EE"
                  : followerDelta < 0
                  ? "#F59E0B"
                  : "#F1F5F9",
            }}
          >
            {formatDelta(followerDelta)}
          </span>
        </div>

        {/* Diagnostic summary row */}
        <div className="flex items-start gap-2 text-xs">
          <span className="shrink-0 text-[#94A3B8]">Diagnostics</span>
          <span className="ml-auto text-right font-mono font-bold text-[#F1F5F9] opacity-80">
            {diagnosticSummary}
          </span>
        </div>
      </div>

      {/* Reply rate / unanswered / blocks with separator */}
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
