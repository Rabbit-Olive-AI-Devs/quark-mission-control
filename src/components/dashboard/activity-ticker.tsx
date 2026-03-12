"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { CardFooter } from "@/components/ui/card-footer";
import { Activity } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { DigestEntry } from "@/lib/parsers/types";

export function ActivityTicker() {
  const { data, loading, error, lastUpdated, refetch } = useApi<{ sections: DigestEntry[] }>("/api/digest", { snapshotKey: "digest", refreshOn: ["digest"] });

  if (loading) {
    return (
      <GlassCard delay={0.2}>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-[#00D4AA]" />
          <h3 className="text-sm font-medium">Activity</h3>
        </div>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-white/5 rounded" />
          ))}
        </div>
      </GlassCard>
    );
  }

  // Get last 10 items from most recent sections
  const allItems: { time: string; text: string }[] = [];
  for (const section of data?.sections || []) {
    for (const item of section.items) {
      allItems.push({ time: section.timeRange, text: item });
    }
  }
  const recentItems = allItems.slice(-10).reverse();

  return (
    <GlassCard delay={0.2}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-[#00D4AA]" />
          <h3 className="text-sm font-medium">Activity</h3>
        </div>
        <span className="text-xs text-[#94A3B8]">{allItems.length} entries today</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {recentItems.map((item, i) => (
          <div key={i} className="flex gap-3 text-xs py-1.5 border-b border-white/5 last:border-0">
            <span className="text-[#94A3B8] shrink-0 w-20 truncate">{item.time.split("–")[0]?.trim()}</span>
            <span className="text-[#F1F5F9] line-clamp-2">{item.text}</span>
          </div>
        ))}

        {recentItems.length === 0 && (
          <p className="text-xs text-[#94A3B8] text-center py-4">No activity yet today</p>
        )}
      </div>

      <CardFooter lastUpdated={lastUpdated} error={error} onRefresh={refetch} />
    </GlassCard>
  );
}
