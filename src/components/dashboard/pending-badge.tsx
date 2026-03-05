"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { AlertCircle, Mail, MessageSquare, AtSign } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { PendingActions } from "@/lib/parsers/types";

export function PendingBadge() {
  const { data, loading } = useApi<PendingActions>("/api/pending", ["pending"]);

  const dm = data?.dmDrafts.length || 0;
  const x = data?.xDrafts.length || 0;
  const email = data?.emailDrafts.length || 0;
  const total = dm + x + email;

  if (loading) {
    return (
      <GlassCard delay={0.05}>
        <div className="animate-pulse h-full min-h-[120px] bg-white/5 rounded" />
      </GlassCard>
    );
  }

  return (
    <GlassCard delay={0.05}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className={total > 0 ? "text-[#F59E0B]" : "text-[#10B981]"} />
          <h3 className="text-sm font-medium">Pending Approvals</h3>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
          total > 0 ? "bg-[#F59E0B]/10 text-[#F59E0B]" : "bg-[#10B981]/10 text-[#10B981]"
        }`}>
          {total > 0 ? `${total} pending` : "Clear"}
        </span>
      </div>

      <div className="text-3xl font-bold mb-4">{total}</div>

      <div className="grid grid-cols-3 gap-2">
        <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
          <MessageSquare size={12} />
          <span>{dm} DMs</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
          <AtSign size={12} />
          <span>{x} X</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
          <Mail size={12} />
          <span>{email} Email</span>
        </div>
      </div>
    </GlassCard>
  );
}
