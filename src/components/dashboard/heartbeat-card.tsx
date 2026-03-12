"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { CardFooter } from "@/components/ui/card-footer";
import { Heart, Clock, Mail, FileText } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { formatRelativeTime } from "@/lib/utils";
import type { HeartbeatState } from "@/lib/parsers/types";

export function HeartbeatCard() {
  const { data, loading, error, lastUpdated, refetch } = useApi<HeartbeatState>("/api/heartbeat", { snapshotKey: "heartbeat", refreshOn: ["heartbeat"] });

  if (loading) {
    return (
      <GlassCard delay={0.1}>
        <div className="animate-pulse h-full min-h-[120px] bg-white/5 rounded" />
      </GlassCard>
    );
  }

  const lastBeat = data?.lastHeartbeat ? new Date(data.lastHeartbeat) : null;
  const isRecent = lastBeat && Date.now() - lastBeat.getTime() < 3 * 60 * 60 * 1000;

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

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#EF4444]/10 flex items-center justify-center">
            <Clock size={14} className="text-[#EF4444]" />
          </div>
          <div>
            <div className="text-xs text-[#94A3B8]">Last heartbeat</div>
            <div className="text-sm font-medium text-[#F1F5F9]">{lastBeat ? formatRelativeTime(lastBeat) : "Never"}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
            <Mail size={14} className="text-[#7C3AED]" />
          </div>
          <div>
            <div className="text-xs text-[#94A3B8]">Last DM check</div>
            <div className="text-sm font-medium text-[#F1F5F9]">
              {data?.lastDmTimestamp ? formatRelativeTime(new Date(data.lastDmTimestamp)) : "Never"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center">
            <FileText size={14} className="text-[#3B82F6]" />
          </div>
          <div>
            <div className="text-xs text-[#94A3B8]">Last digest</div>
            <div className="text-sm font-medium text-[#F1F5F9]">
              {data?.lastDigestTimestamp ? formatRelativeTime(new Date(data.lastDigestTimestamp)) : "Never"}
            </div>
          </div>
        </div>
      </div>

      <CardFooter lastUpdated={lastUpdated} error={error} onRefresh={refetch} />
    </GlassCard>
  );
}
