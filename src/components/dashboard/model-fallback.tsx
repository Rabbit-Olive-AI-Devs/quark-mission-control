"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { Zap, ArrowRight } from "lucide-react";

const FALLBACK_CHAIN = [
  { name: "gpt-5.3-codex", short: "Codex", color: "#00D4AA", status: "primary", desc: "ChatGPT Plus OAuth, ~free" },
  { name: "MiniMax-M2.5", short: "MiniMax", color: "#7C3AED", status: "fallback-1", desc: "Paid, 1st fallback" },
  { name: "gemini-2.5-flash", short: "Gemini", color: "#3B82F6", status: "fallback-2", desc: "Free, 250 RPD" },
  { name: "gpt-5-nano", short: "GPT-5n", color: "#F59E0B", status: "fallback-3", desc: "Lightweight" },
  { name: "gpt-4.1-mini", short: "GPT-4.1m", color: "#EF4444", status: "fallback-4", desc: "Last resort" },
];

export function ModelFallbackChain() {
  return (
    <GlassCard delay={0.25}>
      <div className="flex items-center gap-2 mb-4">
        <Zap size={16} className="text-[#00D4AA]" />
        <h3 className="text-sm font-medium">Model Fallback Chain</h3>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {FALLBACK_CHAIN.map((model, i) => (
          <div key={model.name} className="flex items-center gap-1">
            <div
              className={`flex flex-col items-center px-3 py-2.5 rounded-xl border transition-all ${
                i === 0
                  ? "bg-[#00D4AA]/10 border-[#00D4AA]/30 shadow-[0_0_20px_rgba(0,212,170,0.1)]"
                  : "bg-white/[0.03] border-white/5 hover:bg-white/[0.06]"
              }`}
              style={{ minWidth: "90px" }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold mb-1.5"
                style={{ background: `${model.color}20`, color: model.color }}
              >
                {i + 1}
              </div>
              <span className="text-xs font-medium text-[#F1F5F9] text-center">{model.short}</span>
              <span className="text-[9px] text-[#94A3B8] text-center mt-0.5">{model.desc}</span>
              {i === 0 && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#00D4AA]/20 text-[#00D4AA] mt-1.5 font-medium">
                  ACTIVE
                </span>
              )}
            </div>
            {i < FALLBACK_CHAIN.length - 1 && (
              <ArrowRight size={14} className="text-[#94A3B8] shrink-0 mx-0.5" />
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
