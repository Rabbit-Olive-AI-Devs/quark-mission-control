"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { AgentAvatar } from "@/components/ui/agent-avatar";
import { StatusDot } from "@/components/ui/status-dot";
import { MessageSquare, ChevronDown, Clock } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import { useApi } from "@/hooks/use-api";
import type { AgentStatus, CommsMessage } from "@/lib/parsers/types";

const agentFiction: Record<string, string> = {
  neo: "The Matrix",
  fulcrum: "Star Wars: Ahsoka",
  cassian: "Star Wars: Andor",
  chandler: "Friends",
  "mse-6": "Star Wars: A New Hope",
  mse6: "Star Wars: A New Hope",
};

interface AgentCardProps {
  agent: AgentStatus;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
}

function CommsHistory({ agentName }: { agentName: string }) {
  const { data } = useApi<{ messages: CommsMessage[] }>(`/api/comms?agent=${agentName}`, ["comms"]);
  const messages = data?.messages || [];

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <div className="pt-3 mt-3 border-t border-white/5">
        <h4 className="text-xs font-medium text-[#94A3B8] mb-2 flex items-center gap-1.5">
          <MessageSquare size={12} />
          Comms History
        </h4>

        {messages.length === 0 ? (
          <p className="text-[10px] text-[#94A3B8] py-3 text-center">No messages yet</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
            {messages.map((msg, i) => (
              <div
                key={`${msg.direction}-${i}`}
                className={`px-3 py-2 rounded text-[11px] ${
                  msg.direction === "inbound"
                    ? "bg-[#7C3AED]/10 border-l-2 border-[#7C3AED]"
                    : "bg-[#00D4AA]/10 border-l-2 border-[#00D4AA]"
                }`}
              >
                <div className="text-[9px] text-[#94A3B8] mb-0.5 flex justify-between">
                  <span>{msg.direction === "inbound" ? `${agentName} \u2192 Quark` : `Quark \u2192 ${agentName}`}</span>
                  {msg.timestamp && <span className="font-mono">{msg.timestamp}</span>}
                </div>
                <p className="text-[#F1F5F9] leading-relaxed">{msg.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function AgentCard({ agent, index, isSelected, onSelect }: AgentCardProps) {
  const key = agent.config.name.toLowerCase();
  const fiction = agentFiction[key];
  const modelShort = agent.config.model.split("/").pop() || agent.config.model;
  const commsPreview = agent.latestComms
    ? agent.latestComms.length > 100
      ? agent.latestComms.slice(0, 100) + "\u2026"
      : agent.latestComms
    : null;

  return (
    <GlassCard
      hover
      delay={index * 0.06}
      className={`transition-all duration-200 ${isSelected ? "!border-white/20 ring-1 ring-white/5" : ""}`}
    >
      <div className="cursor-pointer" onClick={onSelect}>
        {/* Top row: avatar + info + status */}
        <div className="flex items-start gap-3">
          <AgentAvatar name={agent.config.name} size={52} glow={agent.hasInbound} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[#F1F5F9] text-sm">{agent.config.name}</h3>
                <StatusDot
                  status={agent.hasInbound ? "active" : "idle"}
                  pulse={agent.hasInbound}
                  size="sm"
                />
              </div>
              <motion.div
                animate={{ rotate: isSelected ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={14} className="text-[#94A3B8]" />
              </motion.div>
            </div>

            {fiction && (
              <p className="text-[10px] text-[#94A3B8] italic mt-0.5">{fiction}</p>
            )}

            <p className="text-xs text-[#94A3B8] mt-0.5 truncate">
              {agent.config.description.split("\u2014")[0]?.trim()}
            </p>
          </div>
        </div>

        {/* Meta row: model badge + last active */}
        <div className="flex items-center gap-2 mt-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/20">
            {modelShort}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/5 text-[#94A3B8]">
            {agent.config.timeoutSeconds}s timeout
          </span>
          {agent.latestTimestamp && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-[#94A3B8] font-mono">
              <Clock size={10} />
              {formatTimeAgo(agent.latestTimestamp)}
            </span>
          )}
        </div>

        {/* Comms preview */}
        {commsPreview && (
          <div className="mt-3 px-3 py-2 rounded bg-white/[0.03] border-l-2 border-[#7C3AED]/40">
            <p className="text-[11px] text-[#94A3B8] leading-relaxed truncate">{commsPreview}</p>
          </div>
        )}
      </div>

      {/* Expanded comms history */}
      <AnimatePresence>
        {isSelected && <CommsHistory agentName={agent.config.name} />}
      </AnimatePresence>
    </GlassCard>
  );
}
