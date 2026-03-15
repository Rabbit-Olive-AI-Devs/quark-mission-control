"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusDot } from "@/components/ui/status-dot";
import { CardFooter } from "@/components/ui/card-footer";
import { useApi } from "@/hooks/use-api";
import { useDashboardStore } from "@/stores/dashboard";
import type { EngagementData } from "@/lib/parsers/types";

export function EngagementWidget({ delay = 0 }: { delay?: number }) {
  const { data, error, lastUpdated, refetch } = useApi<EngagementData>("/api/engagement", {
    snapshotKey: "engagement",
    refreshOn: ["engagement"],
  });

  const setEngagementUnanswered = useDashboardStore((s) => s.setEngagementUnanswered);

  useEffect(() => {
    if (data?.inboundGap) {
      setEngagementUnanswered(data.inboundGap.unansweredCount);
    }
  }, [data?.inboundGap, setEngagementUnanswered]);

  const hasUnanswered = (data?.inboundGap?.unansweredCount ?? 0) > 0;

  const replyRate = data?.inboundGap?.replyRate ?? 0;
  const replyStatus: "active" | "warning" | "error" =
    replyRate >= 0.5 ? "active" : replyRate >= 0.3 ? "warning" : "error";

  const modeStatus: "active" | "warning" =
    data?.mode === "autonomous" ? "active" : "warning";

  return (
    <GlassCard
      delay={delay}
      className={hasUnanswered ? "ring-1 ring-[#F59E0B]/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : ""}
    >
      <Link href="/engagement" className="block">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle size={16} className="text-[#00D4AA]" />
          <h3 className="text-sm font-medium">Engagement</h3>
        </div>

        {!data ? (
          <div className="animate-pulse h-12 bg-white/5 rounded" />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center text-center gap-1">
              <span className="text-lg font-bold text-[#00D4AA]">{data.today.total}</span>
              <span className="text-[9px] text-[#94A3B8]">Today</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1">
              <StatusDot status={replyStatus} size="sm" pulse={replyStatus === "error"} />
              <span className="text-[10px] text-[#F1F5F9]">{Math.round(replyRate * 100)}%</span>
              <span className="text-[9px] text-[#94A3B8]">Reply Rate</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1">
              {hasUnanswered ? (
                <span className="text-lg font-bold text-[#F59E0B]">{data.inboundGap.unansweredCount}</span>
              ) : (
                <StatusDot status={modeStatus} size="sm" />
              )}
              <span className="text-[9px] text-[#94A3B8]">
                {hasUnanswered ? "Unanswered" : data.mode === "autonomous" ? "Auto" : "Approval"}
              </span>
            </div>
          </div>
        )}
      </Link>

      <CardFooter lastUpdated={lastUpdated} error={error} onRefresh={refetch} />
    </GlassCard>
  );
}
