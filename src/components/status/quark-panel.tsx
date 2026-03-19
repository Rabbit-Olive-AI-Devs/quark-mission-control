"use client";

import { StatusSentence } from "@/components/ui/status-sentence";
import { Sparkline } from "@/components/ui/sparkline";
import type { StatusFullResponse } from "@/lib/parsers/types";
import { formatTimeAgo } from "@/lib/utils";

interface QuarkPanelProps {
  data: StatusFullResponse;
}

/**
 * Build 24-hour activity sparkline from cron job lastRun timestamps.
 * Each bucket = 1 hour. Count how many jobs ran in each hour.
 */
function buildActivitySparkline(
  jobs: StatusFullResponse["cron"]["jobs"]
): number[] {
  const buckets = new Array(24).fill(0);
  const now = Date.now();

  for (const job of jobs) {
    if (!job.lastRun) continue;
    const runTime = new Date(job.lastRun).getTime();
    const hoursAgo = Math.floor((now - runTime) / 3600000);
    if (hoursAgo >= 0 && hoursAgo < 24) {
      buckets[23 - hoursAgo]++;
    }
  }

  return buckets;
}

export function QuarkPanel({ data }: QuarkPanelProps) {
  const heartbeat = data.quark.heartbeat;
  const lastHeartbeat = heartbeat?.lastHeartbeat;
  const lastDm = heartbeat?.lastDmTimestamp;

  const sparklineData = buildActivitySparkline(data.cron.jobs);

  return (
    <div className="space-y-3">
      <StatusSentence
        level={data.quark.level}
        sentence={data.quark.sentence}
      />

      {/* Key timestamps */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[#94A3B8]">Last heartbeat</span>
          <span className="font-mono text-[#F1F5F9]">
            {lastHeartbeat ? formatTimeAgo(lastHeartbeat) : "\u2014"}
          </span>
        </div>
        <div
          className="h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-[#94A3B8]">Last DM check</span>
          <span className="font-mono text-[#F1F5F9]">
            {lastDm ? formatTimeAgo(lastDm) : "\u2014"}
          </span>
        </div>
      </div>

      {/* 24h activity sparkline */}
      <div className="pt-1">
        <Sparkline data={sparklineData} height={40} color="#7C3AED" />
      </div>
    </div>
  );
}
