"use client";

import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import type { CognitiveDay } from "@/lib/parsers/types";

interface DegradationAlertProps {
  current: CognitiveDay;
  history: CognitiveDay[];
}

function getFlagLabel(flag: string): string {
  const labels: Record<string, string> = {
    journal_operational_3d: "Journal operational (not reflective)",
    kb_stale_5d: "Knowledge-base not updated",
    user_md_stale_7d: "USER.md stale",
    zero_proactive_3d: "Zero proactive actions",
  };
  if (flag.startsWith("tier1_oversize:")) {
    const file = flag.split(":")[1];
    return `Tier 1 oversize: ${file}`;
  }
  return labels[flag] || flag.replace(/_/g, " ");
}

function getPersistenceCount(flag: string, history: CognitiveDay[]): number {
  let count = 0;
  for (const day of history) {
    if (day.degradationFlags.includes(flag)) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

export function DegradationAlert({ current, history }: DegradationAlertProps) {
  if (current.degradationFlags.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#F59E0B]/15 via-[#F59E0B]/10 to-[#F59E0B]/15 border border-[#F59E0B]/25 px-5 py-4 mb-6"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#F59E0B]/40 to-transparent"
          animate={{ y: [0, 60, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
        />
      </div>

      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
        <div className="space-y-1.5">
          <div className="text-sm font-medium text-[#FCD34D]">Cognitive Drift Detected</div>
          <div className="space-y-1">
            {current.degradationFlags.map((flag) => {
              const count = getPersistenceCount(flag, history);
              return (
                <div key={flag} className="flex items-center gap-2 text-xs">
                  <span className="text-[#F1F5F9]">{getFlagLabel(flag)}</span>
                  {count > 1 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#FCD34D]">
                      {count} days
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
