"use client";

import { RadialGauge } from "@/components/ui/radial-gauge";
import type { StatusFullResponse } from "@/lib/parsers/types";
import { useDashboardStore } from "@/stores/dashboard";

interface SystemPanelProps {
  data: StatusFullResponse;
}

function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return "\u2014";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `Up ${days}d ${hours}h`;
  return `Up ${hours}h`;
}

export function SystemPanel({ data }: SystemPanelProps) {
  const connected = useDashboardStore((s) => s.connected);
  const { cpu, memory, disk, uptime } = data.system;

  return (
    <div className="space-y-3">
      {/* 3 gauges */}
      <div className="flex items-center justify-around">
        <RadialGauge value={cpu} size={80} label="CPU" />
        <RadialGauge value={memory} size={80} label="MEM" />
        <RadialGauge value={disk} size={80} label="DISK" />
      </div>

      {/* Uptime + SSE */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-[#F1F5F9]">
          {formatUptime(uptime)}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              connected
                ? "bg-emerald-500 animate-[glow-pulse_2s_ease-in-out_infinite]"
                : "bg-red-500"
            }`}
            style={{
              boxShadow: connected
                ? "0 0 6px rgba(16,185,129,0.4)"
                : "0 0 6px rgba(239,68,68,0.3)",
            }}
          />
          <span className="text-[#64748B]">
            {connected ? "SSE Connected" : "Disconnected"}
          </span>
        </span>
      </div>
    </div>
  );
}
