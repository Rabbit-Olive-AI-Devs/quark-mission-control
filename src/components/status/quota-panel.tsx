"use client";

import { StatusSentence } from "@/components/ui/status-sentence";
import type { StatusFullResponse } from "@/lib/parsers/types";

interface QuotaPanelProps {
  data: StatusFullResponse;
}

function ProgressBar({ label, pct }: { label: string; pct: number }) {
  const clampedPct = Math.max(0, Math.min(100, pct));
  const color =
    clampedPct > 40 ? "#00D4AA" : clampedPct > 20 ? "#F59E0B" : "#EF4444";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-[#94A3B8]">{label}</span>
        <span className="font-mono font-bold text-[#F1F5F9]">
          {Math.round(clampedPct)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#1E293B]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${clampedPct}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}30`,
          }}
        />
      </div>
    </div>
  );
}

function computeResetTime(): string {
  const now = new Date();
  // Midnight Central Time
  const ct = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Chicago" })
  );
  const midnight = new Date(ct);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);

  const diffMs = midnight.getTime() - ct.getTime();
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);

  return `Daily resets in ${hours}h ${minutes}m`;
}

export function QuotaPanel({ data }: QuotaPanelProps) {
  const dailyPct = data.quota.raw?.dailyRemaining ?? 100;
  const weeklyPct = data.quota.raw?.weeklyRemaining ?? 100;

  return (
    <div className="space-y-3">
      <StatusSentence
        level={data.quota.level}
        sentence={data.quota.sentence}
      />

      <ProgressBar label="Daily" pct={dailyPct} />
      <ProgressBar label="Weekly" pct={weeklyPct} />

      <p className="font-mono text-[10px] text-[#475569]">
        {computeResetTime()}
      </p>
    </div>
  );
}
