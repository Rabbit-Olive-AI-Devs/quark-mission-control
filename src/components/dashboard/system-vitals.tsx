"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { CardFooter } from "@/components/ui/card-footer";
import { Gauge } from "@/components/ui/gauge";
import { Cpu } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { SystemInfo } from "@/lib/parsers/types";

export function SystemVitals() {
  const { data, loading, error, lastUpdated, refetch } = useApi<SystemInfo>("/api/system", ["heartbeat"]);

  if (loading) {
    return (
      <GlassCard delay={0.1}>
        <div className="flex items-center gap-2 mb-3">
          <Cpu size={16} className="text-[#7C3AED]" />
          <h3 className="text-sm font-medium">System Vitals</h3>
        </div>
        <div className="animate-pulse h-20 bg-white/5 rounded" />
      </GlassCard>
    );
  }

  return (
    <GlassCard delay={0.1}>
      <div className="flex items-center gap-2 mb-4">
        <Cpu size={16} className="text-[#7C3AED]" />
        <h3 className="text-sm font-medium">System Vitals</h3>
      </div>

      <div className="flex justify-around">
        <Gauge
          value={data?.cpuPercent || 0}
          max={100}
          label="CPU"
          color="#00D4AA"
        />
        <Gauge
          value={data?.memoryUsedMb || 0}
          max={data?.memoryTotalMb || 1}
          label="Memory"
          color="#7C3AED"
        />
        <Gauge
          value={data?.diskUsedGb || 0}
          max={data?.diskTotalGb || 1}
          label="Disk"
          color="#F59E0B"
        />
      </div>

      {data && (
        <div className="mt-1 text-center">
          <span className="text-[10px] text-[#94A3B8]">
            Uptime: {Math.floor((data.uptime || 0) / 3600)}h {Math.floor(((data.uptime || 0) % 3600) / 60)}m
          </span>
        </div>
      )}

      <CardFooter lastUpdated={lastUpdated} error={error} onRefresh={refetch} />
    </GlassCard>
  );
}
