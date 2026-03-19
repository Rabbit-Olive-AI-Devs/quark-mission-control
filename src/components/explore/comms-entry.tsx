"use client";

import { useState } from "react";
import { formatTimeShort } from "@/lib/utils";
import type { CommsMessage } from "@/lib/parsers/types";

interface CommsEntryProps {
  message: CommsMessage;
  agentName: string;
}

export function CommsEntry({ message, agentName }: CommsEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const preview =
    message.content.length > 100
      ? message.content.slice(0, 100) + "..."
      : message.content;

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
    >
      <div className="flex items-center gap-2 text-[10px]">
        {message.timestamp && (
          <span className="text-[#64748B] font-mono shrink-0">
            {formatTimeShort(message.timestamp)}
          </span>
        )}
        <span
          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
            message.direction === "inbound"
              ? "bg-[#7C3AED]/20 text-[#A78BFA]"
              : "bg-[#00D4AA]/20 text-[#00D4AA]"
          }`}
        >
          {agentName}
        </span>
        <span className="text-[#64748B]">
          {message.direction === "inbound" ? "\u2192" : "\u2190"}
        </span>
      </div>
      <p className="text-xs text-[#F1F5F9] mt-1 leading-relaxed">
        {expanded ? message.content : preview}
      </p>
      {message.content.length > 100 && (
        <span className="text-[9px] text-[#00D4AA] mt-0.5 inline-block">
          {expanded ? "Show less" : "Show more"}
        </span>
      )}
    </button>
  );
}
