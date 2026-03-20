"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { GitBranch } from "lucide-react";
import type { PipelineFunnelData } from "@/lib/parsers/types";

interface PipelineFunnelProps {
  funnel: PipelineFunnelData | null;
}

function pctOf(count: number, total: number): string {
  if (total === 0) return "--";
  return `${Math.round((count / total) * 100)}%`;
}

export function PipelineFunnel({ funnel }: PipelineFunnelProps) {
  if (!funnel || funnel.totalSubmitted === 0) {
    return (
      <GlassCard delay={0.16}>
        <div className="flex items-center gap-2 mb-4">
          <GitBranch size={16} className="text-[#7C3AED]" />
          <h3 className="text-sm font-semibold text-[#F1F5F9]">
            Pipeline Funnel
          </h3>
        </div>
        <div className="py-8 text-center">
          <p className="text-xs text-[#94A3B8]">
            No pipeline data yet. Jobs will appear after the first submission.
          </p>
        </div>
      </GlassCard>
    );
  }

  const { stages, rejectionReasons, quarantineReasons, totalSubmitted, conversionRate } =
    funnel;

  // Separate main flow from side branches
  const mainStages = stages.filter(
    (s) => s.stage !== "rejected" && s.stage !== "quarantined"
  );
  const rejectedStage = stages.find((s) => s.stage === "rejected");
  const quarantinedStage = stages.find((s) => s.stage === "quarantined");

  const maxCount = Math.max(...mainStages.map((s) => s.count), 1);

  return (
    <GlassCard delay={0.16}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-[#7C3AED]" />
          <h3 className="text-sm font-semibold text-[#F1F5F9]">
            Pipeline Funnel
          </h3>
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded font-bold"
          style={{
            backgroundColor:
              conversionRate >= 50
                ? "rgba(16,185,129,0.2)"
                : conversionRate >= 25
                ? "rgba(245,158,11,0.2)"
                : "rgba(239,68,68,0.2)",
            color:
              conversionRate >= 50
                ? "#10B981"
                : conversionRate >= 25
                ? "#F59E0B"
                : "#EF4444",
          }}
        >
          {Math.round(conversionRate)}% conversion
        </span>
      </div>

      {/* Main flow bars */}
      <div className="space-y-2 mb-4">
        {mainStages.map((stage, idx) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, 8);
          const prevCount = idx > 0 ? mainStages[idx - 1].count : totalSubmitted;
          const stepPct =
            prevCount > 0 ? pctOf(stage.count, prevCount) : "--";

          return (
            <div key={stage.stage}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                  {stage.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono tabular-nums text-[#F1F5F9]">
                    {stage.count}
                  </span>
                  {idx > 0 && (
                    <span className="text-[9px] font-mono text-[#64748B]">
                      ({stepPct})
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: stage.color,
                    opacity: 0.75,
                    boxShadow: `0 0 8px ${stage.color}40`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Side branches */}
      {(rejectedStage || quarantinedStage) && (
        <div className="border-t border-white/5 pt-3 space-y-3">
          {rejectedStage && rejectedStage.count > 0 && (
            <SideBranch
              label={rejectedStage.label}
              count={rejectedStage.count}
              color={rejectedStage.color}
              total={totalSubmitted}
              reasons={rejectionReasons}
            />
          )}
          {quarantinedStage && quarantinedStage.count > 0 && (
            <SideBranch
              label={quarantinedStage.label}
              count={quarantinedStage.count}
              color={quarantinedStage.color}
              total={totalSubmitted}
              reasons={quarantineReasons}
            />
          )}
        </div>
      )}
    </GlassCard>
  );
}

function SideBranch({
  label,
  count,
  color,
  total,
  reasons,
}: {
  label: string;
  count: number;
  color: string;
  total: number;
  reasons: Record<string, number>;
}) {
  const entries = Object.entries(reasons).sort(([, a], [, b]) => b - a);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color }}
        >
          {label}
        </span>
        <span className="text-xs font-mono tabular-nums text-[#F1F5F9]">
          {count}
        </span>
        <span className="text-[9px] font-mono text-[#64748B]">
          ({pctOf(count, total)} of submitted)
        </span>
      </div>

      {entries.length > 0 && (
        <div className="ml-4 space-y-0.5">
          {entries.map(([reason, n]) => (
            <div key={reason} className="flex items-center gap-2">
              <span className="text-[10px] text-[#94A3B8] font-mono">
                {reason.replace(/_/g, " ")}
              </span>
              <span className="text-[10px] font-mono tabular-nums text-[#64748B]">
                {n}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
