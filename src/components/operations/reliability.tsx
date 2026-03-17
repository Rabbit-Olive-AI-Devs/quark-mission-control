"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { Gauge } from "@/components/ui/gauge";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import type { OperationsCronReliability } from "@/lib/parsers/types";

interface ReliabilityProps {
  reliability: OperationsCronReliability;
}

export function Reliability({ reliability }: ReliabilityProps) {
  const rateColor =
    reliability.successRate >= 90 ? "#10B981" : reliability.successRate >= 70 ? "#F59E0B" : "#EF4444";

  return (
    <GlassCard delay={0.2}>
      <div className="flex items-center gap-3 mb-4">
        <ShieldCheck size={18} className="text-[#00D4AA]" />
        <h2 className="text-sm font-semibold text-[#F1F5F9]">Cron Reliability</h2>
        <span className="ml-auto text-[10px] text-[#94A3B8]">
          {reliability.totalJobs} jobs ({reliability.disabledJobs} disabled)
        </span>
      </div>

      <div className="flex items-start gap-6">
        {/* Gauge */}
        <div className="flex-shrink-0">
          <Gauge
            value={reliability.successRate}
            max={100}
            label="Success Rate"
            color={rateColor}
            size={90}
          />
        </div>

        {/* Stats + Failures */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <div className="text-sm font-semibold text-[#10B981]">{reliability.okJobs}</div>
              <div className="text-[10px] text-[#94A3B8]">OK</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-[#EF4444]">{reliability.failedJobs}</div>
              <div className="text-[10px] text-[#94A3B8]">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-[#94A3B8]">{reliability.disabledJobs}</div>
              <div className="text-[10px] text-[#94A3B8]">Disabled</div>
            </div>
          </div>

          {reliability.recentFailures.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-[#FCA5A5] font-medium">
                <AlertTriangle size={10} />
                Recent failures
              </div>
              {reliability.recentFailures.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-white/5"
                >
                  <span className="text-[#F1F5F9] truncate mr-2">{f.name}</span>
                  <span className="text-[#94A3B8] flex-shrink-0">{f.lastRun || "never"}</span>
                </div>
              ))}
            </div>
          )}

          {reliability.recentFailures.length === 0 && (
            <div className="flex items-center gap-2 text-[10px] text-[#10B981]">
              <ShieldCheck size={12} />
              All enabled jobs passing
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
