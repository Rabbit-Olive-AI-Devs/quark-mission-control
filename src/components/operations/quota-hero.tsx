"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { Gauge } from "@/components/ui/gauge";
import { Cpu } from "lucide-react";
import type { OperationsQuota } from "@/lib/parsers/types";

interface QuotaHeroProps {
  quota: OperationsQuota;
  activeModel: string;
}

export function QuotaHero({ quota, activeModel }: QuotaHeroProps) {
  const dailyColor = quota.dailyRemaining > 50 ? "#00D4AA" : quota.dailyRemaining > 20 ? "#F59E0B" : "#EF4444";
  const weeklyColor = quota.weeklyRemaining > 50 ? "#00D4AA" : quota.weeklyRemaining > 20 ? "#F59E0B" : "#EF4444";

  return (
    <GlassCard className="mb-4">
      <div className="flex items-center gap-3 mb-4">
        <Cpu size={18} className="text-[#00D4AA]" />
        <h2 className="text-sm font-semibold text-[#F1F5F9]">Codex Quota</h2>
        <span className="ml-auto px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-[#00D4AA]/10 text-[#00D4AA] border border-[#00D4AA]/20">
          {activeModel}
        </span>
      </div>
      <div className="flex items-center justify-center gap-12">
        <Gauge
          value={quota.dailyRemaining}
          max={100}
          label="Daily"
          color={dailyColor}
          size={90}
        />
        <Gauge
          value={quota.weeklyRemaining}
          max={100}
          label="Weekly"
          color={weeklyColor}
          size={90}
        />
      </div>
      <div className="flex justify-center gap-12 mt-2">
        <span className="text-[10px] text-[#94A3B8] text-center w-[90px]">{quota.dailyLabel}</span>
        <span className="text-[10px] text-[#94A3B8] text-center w-[90px]">{quota.weeklyLabel}</span>
      </div>
    </GlassCard>
  );
}
