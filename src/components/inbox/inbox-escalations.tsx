"use client";

import { InboxItem } from "./inbox-item";
import { formatTimeAgo } from "@/lib/utils";
import type { AgentStatus } from "@/lib/parsers/types";

const ESCALATION_KEYWORDS = ["escalat", "needs attention", "blocked", "failed", "urgent", "critical", "error"];

interface InboxEscalationsProps {
  agents: AgentStatus[];
}

export function InboxEscalations({ agents }: InboxEscalationsProps) {
  const escalations = agents
    .filter((a) => {
      const text = a.latestComms.toLowerCase();
      return ESCALATION_KEYWORDS.some((kw) => text.includes(kw));
    })
    .sort((a, b) => {
      const aTime = a.latestTimestamp ? new Date(a.latestTimestamp).getTime() : 0;
      const bTime = b.latestTimestamp ? new Date(b.latestTimestamp).getTime() : 0;
      return bTime - aTime; // most recent first
    });

  return (
    <div className="space-y-1">
      {escalations.map((agent) => (
        <InboxItem
          key={agent.config.name}
          icon={
            <span className="inline-block w-2 h-2 rounded-full bg-[#EF4444]" />
          }
          title={`${agent.config.name}: ${agent.latestComms.length > 80 ? agent.latestComms.slice(0, 80) + "..." : agent.latestComms}`}
          subtitle={agent.config.description.split("\u2014")[0]?.trim()}
          age={agent.latestTimestamp ? formatTimeAgo(agent.latestTimestamp) : "unknown"}
          ageColor="#EF4444"
        />
      ))}
    </div>
  );
}
