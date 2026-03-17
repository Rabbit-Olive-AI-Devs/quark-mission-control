"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { Megaphone } from "lucide-react";
import { PLATFORM_COLORS, PLATFORM_LABELS } from "@/lib/theme-constants";

interface ContentPerformanceProps {
  platforms: string[];
}

export function ContentPerformance({ platforms }: ContentPerformanceProps) {
  return (
    <GlassCard className="mb-4" delay={0.15}>
      <div className="flex items-center gap-3 mb-4">
        <Megaphone size={18} className="text-[#7C3AED]" />
        <h2 className="text-sm font-semibold text-[#F1F5F9]">Content Performance</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {platforms.map((platform) => {
          const color = PLATFORM_COLORS[platform] || "#94A3B8";
          const label = PLATFORM_LABELS[platform] || platform;
          return (
            <div
              key={platform}
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-3 text-center"
              style={{ borderTopColor: color, borderTopWidth: 2 }}
            >
              <div className="text-xs font-medium text-[#F1F5F9] mb-1">{label}</div>
              <div className="text-[10px] text-[#94A3B8]">Coming soon</div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-[#94A3B8]/60 mt-3 text-center">
        Platform metrics will be wired in from Chandler daily reports.
      </p>
    </GlassCard>
  );
}
