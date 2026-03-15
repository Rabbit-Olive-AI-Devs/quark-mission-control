"use client";

import { Shield, CheckCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import type { GuardrailBlock, DailyAggregate } from "@/lib/parsers/types";
import { getPlatformColor, PLATFORM_LABELS, formatTimeAgo } from "@/lib/engagement-constants";

interface Props {
  blocks: GuardrailBlock[];
  trends: DailyAggregate[];
}

const REASON_LABELS: Record<string, string> = {
  sensitive_topic: "Sensitive Topic",
  rate_limit: "Rate Limit",
  blocked_handle: "Blocked Handle",
  length_limit: "Length Limit",
};

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 120;
  const h = 24;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`)
    .join(" ");

  return (
    <svg width={w} height={h} className="inline-block ml-2">
      <polyline
        points={points}
        fill="none"
        stroke="#EF4444"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GuardrailBlocks({ blocks, trends }: Props) {
  const reasonCounts: Record<string, number> = {};
  for (const b of blocks) {
    reasonCounts[b.reason] = (reasonCounts[b.reason] ?? 0) + 1;
  }

  const sparkData = trends.map((t) => t.blocks);

  return (
    <GlassCard className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-[#EF4444]" />
          <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider">
            Guardrail Blocks
          </h3>
        </div>
        {sparkData.length >= 2 && <Sparkline data={sparkData} />}
      </div>

      {blocks.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-[#94A3B8] py-4 justify-center">
          <CheckCircle size={16} className="text-[#10B981]" />
          No blocks recorded
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(reasonCounts).map(([reason, count]) => (
              <span
                key={reason}
                className="px-2 py-1 rounded-full text-[10px] font-medium bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20"
              >
                {REASON_LABELS[reason] ?? reason}: {count}
              </span>
            ))}
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {blocks.map((b, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-xs p-2 rounded-lg bg-white/[0.02] border border-white/5 md:flex-row flex-col md:text-left text-center"
              >
                <span className="text-[#94A3B8] shrink-0">{formatTimeAgo(b.timestamp)}</span>
                <span
                  className="w-2 h-2 rounded-full shrink-0 hidden md:block"
                  style={{ backgroundColor: getPlatformColor(b.platform) }}
                />
                <span className="text-[#F1F5F9] shrink-0">{PLATFORM_LABELS[b.platform] ?? b.platform}</span>
                <span className="text-[#94A3B8]">{b.action}</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#EF4444]/10 text-[#EF4444]">
                  {REASON_LABELS[b.reason] ?? b.reason}
                </span>
                {b.targetAuthor && (
                  <span className="text-[#94A3B8] ml-auto hidden md:inline">{b.targetAuthor}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </GlassCard>
  );
}
