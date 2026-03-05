"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { Gauge } from "@/components/ui/gauge";
import { Cpu } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { MetricsData } from "@/lib/parsers/types";

export function CodexQuota() {
  const { data } = useApi<MetricsData>("/api/metrics", ["metrics"]);

  const quota = data?.codexQuota;
  const daily = quota?.dailyRemaining ?? 100;
  const weekly = quota?.weeklyRemaining ?? 100;

  const getColor = (pct: number) => {
    if (pct > 50) return "#10B981";
    if (pct > 20) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <GlassCard delay={0.15}>
      <div className="flex items-center gap-2 mb-3">
        <Cpu size={16} className="text-[#00D4AA]" />
        <h3 className="text-sm font-medium">Codex Quota</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center">
          <Gauge
            value={daily}
            max={100}
            size={72}
            color={getColor(daily)}
          />
          <span className="text-[10px] text-[#94A3B8] mt-1.5 text-center">Daily Window</span>
          {quota?.dailyLabel && (
            <span className="text-[9px] text-[#94A3B8]/70 text-center">{quota.dailyLabel}</span>
          )}
        </div>

        <div className="flex flex-col items-center">
          <Gauge
            value={weekly}
            max={100}
            size={72}
            color={getColor(weekly)}
          />
          <span className="text-[10px] text-[#94A3B8] mt-1.5 text-center">Weekly Quota</span>
          {quota?.weeklyLabel && (
            <span className="text-[9px] text-[#94A3B8]/70 text-center">{quota.weeklyLabel}</span>
          )}
        </div>
      </div>

      {data?.lastUpdated && (
        <div className="mt-3 pt-2 border-t border-white/5 text-center">
          <span className="text-[9px] text-[#F59E0B]/70">Last sync: {data.lastUpdated}</span>
        </div>
      )}
    </GlassCard>
  );
}
