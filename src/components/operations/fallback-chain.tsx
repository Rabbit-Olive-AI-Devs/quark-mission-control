"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { GitBranch, ChevronRight } from "lucide-react";
import type { OperationsFallbackNode } from "@/lib/parsers/types";

interface FallbackChainProps {
  chain: OperationsFallbackNode[];
}

const STATUS_DOT: Record<string, string> = {
  active: "bg-[#10B981]",
  standby: "bg-[#94A3B8]",
  error: "bg-[#EF4444]",
};

const STATUS_GLOW: Record<string, string> = {
  active: "shadow-[0_0_6px_rgba(16,185,129,0.5)]",
  standby: "",
  error: "shadow-[0_0_6px_rgba(239,68,68,0.5)]",
};

export function FallbackChain({ chain }: FallbackChainProps) {
  return (
    <GlassCard className="mb-4" delay={0.05}>
      <div className="flex items-center gap-3 mb-4">
        <GitBranch size={18} className="text-[#7C3AED]" />
        <h2 className="text-sm font-semibold text-[#F1F5F9]">Fallback Chain</h2>
      </div>
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {chain.map((node, i) => (
          <div key={node.name} className="flex items-center gap-1">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              <div
                className={`w-2 h-2 rounded-full ${STATUS_DOT[node.status]} ${STATUS_GLOW[node.status]}`}
              />
              <div>
                <div className="text-xs font-medium text-[#F1F5F9]">{node.name}</div>
                <div className="text-[9px] text-[#94A3B8]">{node.provider}</div>
              </div>
            </div>
            {i < chain.length - 1 && (
              <ChevronRight size={14} className="text-[#94A3B8]/40 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
