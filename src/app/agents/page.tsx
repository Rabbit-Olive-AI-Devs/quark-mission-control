"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { Users, Radio } from "lucide-react";
import { AgentCard } from "@/components/agents/agent-card";
import { useApi } from "@/hooks/use-api";
import type { AgentStatus, BroadcastStatus } from "@/lib/parsers/types";

function AgentsContent() {
  const { data, loading } = useApi<{ agents: AgentStatus[]; broadcast: BroadcastStatus }>(
    "/api/agents",
    { snapshotKey: "agents", refreshOn: ["comms"] }
  );
  const searchParams = useSearchParams();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(() => searchParams.get("agent"));

  const agents = data?.agents || [];
  const broadcast = data?.broadcast;

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-3">
          <Users size={24} className="text-[#00D4AA]" />
          Agent Network
        </h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          The Crew — {agents.length} agent{agents.length !== 1 ? "s" : ""} deployed
        </p>
      </div>

      {/* Broadcast status banner */}
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

      {/* Loading skeleton */}
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
        /* Agent card grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent, i) => (
            <AgentCard
              key={agent.config.name}
              agent={agent}
              index={i}
              isSelected={selectedAgent === agent.config.name}
              onSelect={() =>
                setSelectedAgent(
                  selectedAgent === agent.config.name ? null : agent.config.name
                )
              }
            />
          ))}
        </div>
      )}
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
