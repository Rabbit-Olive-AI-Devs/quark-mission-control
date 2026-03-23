"use client";

import { Shield, CheckCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import type { GuardrailBlock, DailyAggregate, GuardrailBreakdown } from "@/lib/parsers/types";
import { getPlatformColor, PLATFORM_LABELS, formatTimeAgo } from "@/lib/engagement-constants";
import { humanizeGuardrail } from "@/lib/guardrail-labels";

interface Props {
  blocks: GuardrailBlock[];
  trends: DailyAggregate[];
  guardrails?: GuardrailBreakdown;
}

const GUARDRAIL_CATEGORIES: {
  key: keyof Omit<GuardrailBreakdown, "total_failures">;
  label: string;
  bg: string;
  text: string;
  border: string;
}[] = [
  { key: "api_errors",     label: "API Errors",    bg: "bg-[#EF4444]/10", text: "text-[#EF4444]", border: "border-[#EF4444]/20" },
  { key: "rate_limits",    label: "Rate Limits",   bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", border: "border-[#F59E0B]/20" },
  { key: "content_blocks", label: "Content Blocks", bg: "bg-[#3B82F6]/10", text: "text-[#3B82F6]", border: "border-[#3B82F6]/20" },
  { key: "infra_degraded", label: "Infra Degraded", bg: "bg-[#A855F7]/10", text: "text-[#A855F7]", border: "border-[#A855F7]/20" },
  { key: "other",          label: "Other",          bg: "bg-[#94A3B8]/10", text: "text-[#94A3B8]", border: "border-[#94A3B8]/20" },
];

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

export function GuardrailBlocks({ blocks, trends, guardrails }: Props) {
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

      {guardrails && guardrails.total_failures > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
              Failure Breakdown
            </span>
            <span className="text-[10px] text-[#94A3B8]/60">
              {guardrails.total_failures} total
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {GUARDRAIL_CATEGORIES.map(({ key, label, bg, text, border }) => {
              const count = guardrails[key];
              if (count === 0) return null;
              return (
                <span
                  key={key}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${bg} ${text} border ${border}`}
                >
                  {label}: {count}
                </span>
              );
            })}
          </div>
        </div>
      )}

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
                title={reason}
              >
                {humanizeGuardrail(reason)}: {count}
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
                <span className="flex flex-col gap-0.5">
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#EF4444]/10 text-[#EF4444]">
                    {humanizeGuardrail(b.reason)}
                  </span>
                  <span className="text-[8px] text-[#94A3B8]/40 px-1.5">{b.reason}</span>
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
