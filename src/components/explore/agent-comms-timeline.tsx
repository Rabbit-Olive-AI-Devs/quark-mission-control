"use client";

import { useState, useMemo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { CommsEntry } from "./comms-entry";
import { MessageSquare } from "lucide-react";
import type { CommsMessage } from "@/lib/parsers/types";

interface AgentCommsTimelineProps {
  comms: Record<string, CommsMessage[]>;
  agentNames: string[];
}

export function AgentCommsTimeline({
  comms,
  agentNames,
}: AgentCommsTimelineProps) {
  const [filter, setFilter] = useState<string>("all");

  const entries = useMemo(() => {
    const all: Array<{ agentName: string; message: CommsMessage }> = [];
    for (const name of agentNames) {
      const key = name.toLowerCase();
      const messages = comms[key] || [];
      for (const msg of messages) {
        all.push({ agentName: name, message: msg });
      }
    }
    return all
      .filter(
        (e) => filter === "all" || e.agentName.toLowerCase() === filter
      )
      .sort((a, b) => {
        const aTime = a.message.timestamp
          ? new Date(a.message.timestamp).getTime()
          : 0;
        const bTime = b.message.timestamp
          ? new Date(b.message.timestamp).getTime()
          : 0;
        return bTime - aTime;
      })
      .slice(0, 50);
  }, [comms, agentNames, filter]);

  return (
    <GlassCard delay={0.15}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[#F1F5F9] flex items-center gap-2">
          <MessageSquare size={14} className="text-[#00D4AA]" />
          Comms Timeline
        </h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-[#94A3B8] focus:outline-none"
        >
          <option value="all">All agents</option>
          {agentNames.map((name) => (
            <option key={name} value={name.toLowerCase()}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-[#94A3B8] py-4 text-center">
          No comms messages
        </p>
      ) : (
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {entries.map((entry, i) => (
            <CommsEntry
              key={`${entry.agentName}-${i}`}
              message={entry.message}
              agentName={entry.agentName}
            />
          ))}
        </div>
      )}
    </GlassCard>
  );
}
