"use client";

import { InboxItem } from "./inbox-item";
import { formatTimeAgo } from "@/lib/utils";
import { getPlatformColor } from "@/lib/theme-constants";
import type { EngagementAction, InboundGap } from "@/lib/parsers/types";

interface InboxUnansweredProps {
  actions: EngagementAction[];
  inboundGap: InboundGap;
}

export function InboxUnanswered({ actions, inboundGap }: InboxUnansweredProps) {
  // Show recent inbound actions as representative unanswered items
  // Filter for actions that look like inbound (received comments, mentions, DMs)
  const inbound = actions
    .filter((a) => ["comment", "mention", "dm", "reply"].includes(a.action) && a.targetAuthor)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) // oldest first
    .slice(0, inboundGap.unansweredCount || 5);

  return (
    <div className="space-y-1">
      {inbound.map((item, i) => (
        <InboxItem
          key={`${item.platform}-${item.targetId}-${i}`}
          icon={
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: getPlatformColor(item.platform) }}
            />
          }
          title={item.text.length > 60 ? item.text.slice(0, 60) + "..." : item.text}
          subtitle={`${item.targetAuthor} on ${item.platform}`}
          age={formatTimeAgo(item.timestamp)}
          ageColor={
            Date.now() - new Date(item.timestamp).getTime() > 86400000
              ? "#EF4444"
              : "#F59E0B"
          }
        />
      ))}
      {inbound.length === 0 && inboundGap.unansweredCount > 0 && (
        <p className="text-xs text-[#94A3B8] py-2">
          {inboundGap.unansweredCount} unanswered across platforms (details unavailable)
        </p>
      )}
    </div>
  );
}
