"use client";

import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusDot } from "@/components/ui/status-dot";
import { AgentAvatar } from "@/components/ui/agent-avatar";
import { Users } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { AgentStatus, BroadcastStatus } from "@/lib/parsers/types";

const agentRoles: Record<string, string> = {
  Neo: "Dev Operative",
  Fulcrum: "Intel Analyst",
  Cassian: "Content Strategist",
  Chandler: "Metrics & Reporting",
};

export function AgentBar() {
  const router = useRouter();
  const { data, loading } = useApi<{ agents: AgentStatus[]; broadcast: BroadcastStatus }>(
    "/api/agents",
    ["comms"]
  );

  if (loading) {
    return (
      <GlassCard delay={0.15}>
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-[#00D4AA]" />
          <h3 className="text-sm font-medium">The Crew</h3>
        </div>
        <div className="animate-pulse h-24 bg-white/5 rounded" />
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
          <h3 className="text-sm font-medium">The Crew</h3>
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

      <div className="grid grid-cols-4 gap-3">
        {agents.map((agent) => (
          <button
            key={agent.config.name}
            onClick={() => router.push(`/agents?agent=${agent.config.name}`)}
            className="flex flex-col items-center gap-3 p-5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-all hover:scale-[1.02] cursor-pointer"
          >
            <div className="relative">
              <AgentAvatar name={agent.config.name} size={72} glow={agent.hasInbound} />
              <div className="absolute -bottom-0.5 -right-0.5">
                <StatusDot
                  status={agent.hasInbound ? "active" : "idle"}
                  size="sm"
                  pulse={agent.hasInbound}
                />
              </div>
            </div>
            <span className="text-sm font-medium text-[#F1F5F9]">{agent.config.name}</span>
            <span className="text-[10px] text-[#94A3B8] text-center line-clamp-1">
              {agentRoles[agent.config.name] || agent.config.description.split("—")[0]?.trim()}
            </span>
          </button>
        ))}
      </div>
    </GlassCard>
  );
}
