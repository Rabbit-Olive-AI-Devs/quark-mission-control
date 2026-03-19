"use client";

import type { StatusFullResponse, StatusLevel } from "@/lib/parsers/types";

interface CognitivePanelProps {
  data: StatusFullResponse;
}

function MiniProgressBar({
  label,
  value,
  maxLabel,
  color,
}: {
  label: string;
  value: number;
  maxLabel?: string;
  color?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const barColor = color ?? "#00D4AA";

  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-xs">
        <span className="text-[#94A3B8]">{label}</span>
        <span className="font-mono text-[#F1F5F9]">
          {maxLabel ?? `${Math.round(pct)}%`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1E293B]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: barColor,
            boxShadow: `0 0 6px ${barColor}25`,
          }}
        />
      </div>
    </div>
  );
}

export function deriveCognitiveLevel(data: StatusFullResponse): StatusLevel {
  if (!data.cognitive) return "healthy";
  return data.cognitive.degradationFlags.length > 0 ? "warning" : "healthy";
}

export function CognitivePanel({ data }: CognitivePanelProps) {
  const cog = data.cognitive;

  if (!cog) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-[#64748B]">
        No cognitive data
      </div>
    );
  }

  const { memoryHealth, proactivity, engagement, degradationFlags } = cog;

  // Memory bar: kbFileCount mapped to percentage (cap at 30 files = 100%)
  const memoryPct = Math.min(100, (memoryHealth.kbFileCount / 30) * 100);

  // Proactivity: ratio is 0-1
  const proactivityPct = proactivity.ratio * 100;

  // Engagement: replyRate is 0-100
  const engagementPct = engagement.replyRate;

  // KB freshness: kbUpdatedToday / kbFileCount * 100
  const kbFreshPct =
    memoryHealth.kbFileCount > 0
      ? (memoryHealth.kbUpdatedToday / memoryHealth.kbFileCount) * 100
      : 0;

  return (
    <div className="space-y-2">
      <MiniProgressBar
        label="Memory"
        value={memoryPct}
        maxLabel={`${memoryHealth.kbFileCount} files`}
      />
      <MiniProgressBar
        label="Proactivity"
        value={proactivityPct}
        color="#7C3AED"
      />
      <MiniProgressBar
        label="Engagement"
        value={engagementPct}
        maxLabel={`${Math.round(engagementPct)}%`}
        color="#1DA1F2"
      />
      <MiniProgressBar
        label="KB Fresh"
        value={kbFreshPct}
        maxLabel={`${memoryHealth.kbUpdatedToday}/${memoryHealth.kbFileCount}`}
        color="#F59E0B"
      />

      {/* Degradation + journal */}
      <div className="flex items-center gap-2 pt-1 text-xs">
        {degradationFlags.length > 0 && (
          <span
            className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-500"
            style={{ boxShadow: "0 0 6px rgba(245,158,11,0.1)" }}
          >
            {degradationFlags.length} flag
            {degradationFlags.length > 1 ? "s" : ""}
          </span>
        )}
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            memoryHealth.journalReflective
              ? "bg-[#00D4AA]/20 text-[#00D4AA]"
              : "bg-white/[0.06] text-[#94A3B8]"
          }`}
        >
          {memoryHealth.journalReflective ? "Reflective" : "Factual"}
        </span>
      </div>
    </div>
  );
}
