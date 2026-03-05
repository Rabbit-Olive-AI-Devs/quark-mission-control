"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { Heart } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { formatRelativeTime } from "@/lib/utils";
import type { HeartbeatState } from "@/lib/parsers/types";

export function HeartbeatCard() {
  const { data, loading } = useApi<HeartbeatState>("/api/heartbeat", ["heartbeat"]);

  if (loading) {
    return (
      <GlassCard delay={0.1}>
        <div className="flex items-center gap-2 mb-3">
          <Heart size={16} className="text-[#EF4444]" />
          <h3 className="text-sm font-medium">Heartbeat</h3>
        </div>
        <div className="animate-pulse h-16 bg-white/5 rounded" />
      </GlassCard>
    );
  }

  const lastBeat = data?.lastHeartbeat ? new Date(data.lastHeartbeat) : null;
  const isRecent = lastBeat && Date.now() - lastBeat.getTime() < 3 * 60 * 60 * 1000; // within 3h

  return (
    <GlassCard delay={0.1}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart size={16} className={isRecent ? "text-[#EF4444]" : "text-[#94A3B8]"} />
          <h3 className="text-sm font-medium">Heartbeat</h3>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
          isRecent ? "bg-[#10B981]/10 text-[#10B981]" : "bg-[#F59E0B]/10 text-[#F59E0B]"
        }`}>
          {isRecent ? "Healthy" : "Stale"}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">Last heartbeat</span>
          <span className="text-[#F1F5F9]">{lastBeat ? formatRelativeTime(lastBeat) : "Never"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#94A3B8]">Last DM check</span>
          <span className="text-[#F1F5F9]">
            {data?.lastDmTimestamp ? formatRelativeTime(new Date(data.lastDmTimestamp)) : "Never"}
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
