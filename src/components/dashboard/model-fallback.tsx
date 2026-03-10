"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { CardFooter } from "@/components/ui/card-footer";
import { Zap, ArrowRight } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { CommandCenterData } from "@/lib/parsers/types";

const MODEL_COLORS = ["#00D4AA", "#7C3AED", "#3B82F6", "#F59E0B", "#EF4444", "#10B981"];

export function ModelFallbackChain() {
  const { data, error, lastUpdated, refetch } = useApi<CommandCenterData>("/api/command-center", ["metrics"]);

  const chain = data ? [data.primaryModel, ...data.fallbackChain] : [];

  return (
    <GlassCard delay={0.25}>
      <div className="flex items-center gap-2 mb-4">
        <Zap size={16} className="text-[#00D4AA]" />
        <h3 className="text-sm font-medium">Model Fallback Chain</h3>
      </div>

      {chain.length === 0 ? (
        <div className="animate-pulse h-16 bg-white/5 rounded" />
      ) : (
        <div className="flex items-center justify-center gap-1 overflow-x-auto pb-2 flex-wrap sm:flex-nowrap">
          {chain.map((model, i) => {
            const color = MODEL_COLORS[i % MODEL_COLORS.length];
            const shortName = model.split("/").pop() || model;
            return (
              <div key={model} className="flex items-center gap-1">
                <div
                  className={`flex flex-col items-center px-3 py-2.5 rounded-xl border transition-all ${
                    i === 0
                      ? "bg-[#00D4AA]/10 border-[#00D4AA]/30 shadow-[0_0_20px_rgba(0,212,170,0.1)]"
                      : "bg-white/[0.03] border-white/5 hover:bg-white/[0.06]"
                  }`}
                  style={{ minWidth: "80px" }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold mb-1.5"
                    style={{ background: `${color}20`, color }}
                  >
                    {i + 1}
                  </div>
                  <span className="text-xs font-medium text-[#F1F5F9] text-center">{shortName}</span>
                  <span className="text-[9px] text-[#94A3B8] text-center mt-0.5">
                    {i === 0 ? "Primary" : `Fallback ${i}`}
                  </span>
                  {i === 0 && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#00D4AA]/20 text-[#00D4AA] mt-1.5 font-medium">
                      ACTIVE
                    </span>
                  )}
                </div>
                {i < chain.length - 1 && (
                  <ArrowRight size={14} className="text-[#94A3B8] shrink-0 mx-0.5" />
                )}
              </div>
            );
          })}
        </div>
      )}

      <CardFooter lastUpdated={lastUpdated} error={error} onRefresh={refetch} />
    </GlassCard>
  );
}
