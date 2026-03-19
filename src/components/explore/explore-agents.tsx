"use client";

import { useState, useMemo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Radio } from "lucide-react";
import { AgentCard } from "@/components/agents/agent-card";
import { AgentCommsTimeline } from "./agent-comms-timeline";
import { useApi } from "@/hooks/use-api";
import type {
  AgentStatus,
  BroadcastStatus,
  CommsMessage,
} from "@/lib/parsers/types";

export function ExploreAgents() {
  const { data, loading } = useApi<{
    agents: AgentStatus[];
    broadcast: BroadcastStatus;
    comms: Record<string, CommsMessage[]>;
  }>("/api/agents", { refreshOn: ["comms"] });

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const agents = data?.agents || [];
  const broadcast = data?.broadcast;
  const comms = data?.comms || {};

  // Derive tasks-today count per agent from today's comms
  const tasksTodayMap = useMemo(() => {
    const map: Record<string, number> = {};
    const todayStr = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Chicago",
    });
    for (const [agentKey, messages] of Object.entries(comms)) {
      const todayCount = (messages as CommsMessage[]).filter((m) =>
        m.timestamp?.startsWith(todayStr)
      ).length;
      map[agentKey] = todayCount;
    }
    return map;
  }, [comms]);

  const agentNames = agents.map((a) => a.config.name);

  return (
    <div>
      {/* Subtitle */}
      <p className="text-sm text-[#94A3B8] mb-4">
        {agents.length} agent{agents.length !== 1 ? "s" : ""} deployed
      </p>

      {/* Broadcast mode banner */}
      {broadcast && broadcast.mode !== "NORMAL" && (
        <GlassCard className="mb-4">
          <div className="flex items-center gap-3">
            <Radio size={16} className="text-[#F59E0B]" />
            <div>
              <span className="text-sm">
                Broadcast Mode:{" "}
                <strong className="text-[#F59E0B]">{broadcast.mode}</strong>
              </span>
              {broadcast.standingOrders.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {broadcast.standingOrders.map((order, i) => (
                    <p key={i} className="text-xs text-[#94A3B8] pl-1">
                      {order}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Agent cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <GlassCard key={i}>
              <div className="animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-[52px] h-[52px] rounded-full bg-white/5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/5 rounded w-24" />
                    <div className="h-3 bg-white/5 rounded w-40" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-5 bg-white/5 rounded-full w-20" />
                  <div className="h-5 bg-white/5 rounded-full w-16" />
                </div>
                <div className="h-10 bg-white/5 rounded" />
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent, i) => (
            <AgentCard
              key={agent.config.name}
              agent={agent}
              index={i}
              isSelected={selectedAgent === agent.config.name}
              onSelect={() =>
                setSelectedAgent(
                  selectedAgent === agent.config.name
                    ? null
                    : agent.config.name
                )
              }
              tasksToday={
                tasksTodayMap[agent.config.name.toLowerCase()] || 0
              }
            />
          ))}
        </div>
      )}

      {/* Comms Timeline */}
      {!loading && (
        <div className="mt-6">
          <AgentCommsTimeline comms={comms} agentNames={agentNames} />
        </div>
      )}
    </div>
  );
}
