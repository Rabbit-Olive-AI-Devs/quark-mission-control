"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusDot } from "@/components/ui/status-dot";
import { Users, MessageSquare, Radio } from "lucide-react";
import { AgentAvatar } from "@/components/ui/agent-avatar";
import { useApi } from "@/hooks/use-api";
import type { AgentStatus, BroadcastStatus, CommsMessage } from "@/lib/parsers/types";

const agentFiction: Record<string, string> = {
  Neo: "The Matrix",
  Fulcrum: "Star Wars: Ahsoka",
  Cassian: "Star Wars: Andor",
  Chandler: "Friends",
  MSE6: "Star Wars: A New Hope",
};

function AgentDetail({ agentName }: { agentName: string }) {
  const { data } = useApi<{ messages: CommsMessage[] }>(`/api/comms?agent=${agentName}`, ["comms"]);
  const messages = data?.messages || [];

  return (
    <GlassCard delay={0.2}>
      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
        <MessageSquare size={14} className="text-[#94A3B8]" />
        Comms — {agentName}
      </h3>

      {messages.length === 0 ? (
        <p className="text-xs text-[#94A3B8] py-4 text-center">No messages yet</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`px-3 py-2 rounded-lg text-xs ${
                msg.direction === "inbound"
                  ? "bg-[#7C3AED]/10 border-l-2 border-[#7C3AED]"
                  : "bg-[#00D4AA]/10 border-l-2 border-[#00D4AA]"
              }`}
            >
              <div className="text-[10px] text-[#94A3B8] mb-1">
                {msg.direction === "inbound" ? `${agentName} → Quark` : `Quark → ${agentName}`}
              </div>
              <p className="text-[#F1F5F9]">{msg.content}</p>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function AgentsContent() {
  const { data, loading } = useApi<{ agents: AgentStatus[]; broadcast: BroadcastStatus }>(
    "/api/agents",
    ["comms"]
  );
  const searchParams = useSearchParams();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Auto-select agent from URL query param (e.g. /agents?agent=Fulcrum)
  useEffect(() => {
    const agentParam = searchParams.get("agent");
    if (agentParam && !selectedAgent) {
      setSelectedAgent(agentParam);
    }
  }, [searchParams, selectedAgent]);

  const agents = data?.agents || [];
  const broadcast = data?.broadcast;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-3">
          <Users size={24} className="text-[#00D4AA]" />
          Agent Network
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">The Crew — 5 agents deployed</p>
      </div>

      {/* Broadcast banner */}
      {broadcast && (
        <GlassCard className="mb-4 flex items-center gap-3">
          <Radio size={16} className="text-[#00D4AA]" />
          <span className="text-sm">
            Broadcast Mode: <strong className={broadcast.mode === "NORMAL" ? "text-[#10B981]" : "text-[#F59E0B]"}>{broadcast.mode}</strong>
          </span>
        </GlassCard>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <GlassCard key={i}>
              <div className="animate-pulse h-32 bg-white/5 rounded" />
            </GlassCard>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {agents.map((agent, i) => {
            const isSelected = selectedAgent === agent.config.name;

            return (
              <GlassCard
                key={agent.config.name}
                hover
                delay={i * 0.05}
                className={`cursor-pointer ${isSelected ? "!border-white/20" : ""}`}
              >
                <div onClick={() => setSelectedAgent(isSelected ? null : agent.config.name)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <AgentAvatar name={agent.config.name} size={52} glow={agent.hasInbound} />
                      <div>
                        <h3 className="font-semibold text-[#F1F5F9]">{agent.config.name}</h3>
                        <p className="text-[10px] text-[#94A3B8] italic">{agentFiction[agent.config.name]}</p>
                        <p className="text-xs text-[#94A3B8] mt-0.5">{agent.config.description.split("—")[0]?.trim()}</p>
                      </div>
                    </div>
                    <StatusDot
                      status={agent.hasInbound ? "active" : "idle"}
                      pulse={agent.hasInbound}
                    />
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Model</span>
                      <span className="text-[#F1F5F9] font-mono text-[10px]">{agent.config.model.split("/").pop()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Timeout</span>
                      <span className="text-[#F1F5F9]">{agent.config.timeoutSeconds}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Latest</span>
                      <span className="text-[#F1F5F9] truncate ml-4 max-w-[45vw] md:max-w-48">{agent.latestComms}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Comms detail */}
      {selectedAgent && <AgentDetail agentName={selectedAgent} />}
    </>
  );
}

export default function AgentsPage() {
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <Suspense fallback={<div className="animate-pulse h-64 bg-white/5 rounded" />}>
          <AgentsContent />
        </Suspense>
      </div>
    </AppShell>
  );
}
