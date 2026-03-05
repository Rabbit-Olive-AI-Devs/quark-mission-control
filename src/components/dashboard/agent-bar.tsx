"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { StatusDot } from "@/components/ui/status-dot";
import { Users } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { AgentStatus, BroadcastStatus } from "@/lib/parsers/types";

const agentIcons: Record<string, string> = {
  Neo: "N",
  Fulcrum: "F",
  Cassian: "C",
  Chandler: "Ch",
};

export function AgentBar() {
  const { data, loading } = useApi<{ agents: AgentStatus[]; broadcast: BroadcastStatus }>(
    "/api/agents",
    ["comms"]
  );

  if (loading) {
    return (
      <GlassCard delay={0.15}>
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-[#00D4AA]" />
          <h3 className="text-sm font-medium">Agent Network</h3>
        </div>
        <div className="animate-pulse h-12 bg-white/5 rounded" />
      </GlassCard>
    );
  }

  const agents = data?.agents || [];
  const broadcast = data?.broadcast;

  return (
    <GlassCard delay={0.15}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[#00D4AA]" />
          <h3 className="text-sm font-medium">Agent Network</h3>
        </div>
        {broadcast && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            broadcast.mode === "NORMAL"
              ? "bg-[#10B981]/10 text-[#10B981]"
              : "bg-[#F59E0B]/10 text-[#F59E0B]"
          }`}>
            {broadcast.mode}
          </span>
        )}
      </div>

      <div className="flex gap-3">
        {agents.map((agent) => (
          <div
            key={agent.config.name}
            className="flex-1 flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-xs font-semibold text-[#7C3AED]">
                {agentIcons[agent.config.name] || agent.config.name[0]}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5">
                <StatusDot
                  status={agent.hasInbound ? "active" : "idle"}
                  size="sm"
                  pulse={agent.hasInbound}
                />
              </div>
            </div>
            <span className="text-xs text-[#F1F5F9]">{agent.config.name}</span>
            <span className="text-[10px] text-[#94A3B8] text-center line-clamp-1">
              {agent.config.description.split("—")[0]?.trim() || "Agent"}
            </span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
