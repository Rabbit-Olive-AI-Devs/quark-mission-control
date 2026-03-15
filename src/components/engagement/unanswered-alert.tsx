"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { InboundGap } from "@/lib/parsers/types";
import { PLATFORM_LABELS } from "@/lib/engagement-constants";

interface Props {
  inboundGap: InboundGap;
}

export function UnansweredAlert({ inboundGap }: Props) {
  if (inboundGap.unansweredCount <= 0) return null;

  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  const isStale = inboundGap.dataDate !== todayStr;

  const platformGaps = Object.entries(inboundGap.byPlatform)
    .filter(([, v]) => v.received > v.replied)
    .map(([p, v]) => `${PLATFORM_LABELS[p] ?? p}: ${v.received - v.replied}`)
    .join(" · ");

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 relative overflow-hidden rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-4"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-[#F59E0B]/20 to-transparent animate-[shimmer_3s_ease-in-out_infinite] top-0" />
      </div>

      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-[#F59E0B] mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-[#F59E0B]">
            {inboundGap.unansweredCount} unanswered mention{inboundGap.unansweredCount !== 1 ? "s" : ""}
          </p>
          {platformGaps && (
            <p className="text-xs text-[#F1F5F9]/70 mt-1">{platformGaps}</p>
          )}
          {isStale && (
            <p className="text-xs text-[#94A3B8] mt-1">
              Data from {new Date(inboundGap.dataDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
