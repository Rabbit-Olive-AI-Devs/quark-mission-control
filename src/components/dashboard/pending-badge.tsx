"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { AlertCircle } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { PendingActions } from "@/lib/parsers/types";

export function PendingBadge() {
  const { data, loading } = useApi<PendingActions>("/api/pending", ["pending"]);

  const total = data
    ? data.dmDrafts.length + data.xDrafts.length + data.emailDrafts.length
    : 0;

  if (loading) {
    return (
      <GlassCard delay={0.05} className="flex items-center gap-3">
        <div className="animate-pulse w-10 h-10 bg-white/5 rounded-full" />
        <div className="animate-pulse h-4 w-20 bg-white/5 rounded" />
      </GlassCard>
    );
  }

  return (
    <GlassCard delay={0.05} className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
        total > 0 ? "bg-[#F59E0B]/10" : "bg-[#10B981]/10"
      }`}>
        <AlertCircle size={20} className={total > 0 ? "text-[#F59E0B]" : "text-[#10B981]"} />
      </div>
      <div>
        <div className="text-2xl font-semibold">{total}</div>
        <div className="text-xs text-[#94A3B8]">Pending Approvals</div>
      </div>
      {total > 0 && (
        <div className="ml-auto text-xs text-[#94A3B8] space-y-0.5">
          {data!.dmDrafts.length > 0 && <div>{data!.dmDrafts.length} DMs</div>}
          {data!.xDrafts.length > 0 && <div>{data!.xDrafts.length} X replies</div>}
          {data!.emailDrafts.length > 0 && <div>{data!.emailDrafts.length} emails</div>}
        </div>
      )}
    </GlassCard>
  );
}
