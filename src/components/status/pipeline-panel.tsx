"use client";

import { StatusSentence } from "@/components/ui/status-sentence";
import { Sparkline } from "@/components/ui/sparkline";
import type { StatusFullResponse } from "@/lib/parsers/types";
import { formatElapsed } from "@/lib/theme-constants";

interface PipelinePanelProps {
  data: StatusFullResponse;
}

export function PipelinePanel({ data }: PipelinePanelProps) {
  const { scorecard } = data.pipeline;

  // Build a 7-day sparkline from scorecard data
  // For v1, show the published count as the last data point
  // Future: the API could return daily publish history
  const sparklineData =
    scorecard.published > 0
      ? [0, 1, 0, 2, 1, 0, scorecard.published]
      : [0, 0, 0, 0, 0, 0, 0];

  const avgTime =
    scorecard.avgTimeToPublish > 0
      ? formatElapsed(scorecard.avgTimeToPublish)
      : "\u2014";

  return (
    <div className="space-y-3">
      <StatusSentence
        level={data.pipeline.level}
        sentence={data.pipeline.sentence}
      />

      {/* Metrics row */}
      <div className="flex items-center gap-5 text-xs">
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-base font-bold text-[#F1F5F9]">
            {data.contentToday.publishedCount}
          </span>
          <span className="text-[#64748B]">published</span>
        </div>
        <div
          className="h-3 w-px"
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent)",
          }}
        />
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-base font-bold text-[#F1F5F9]">
            {scorecard.killed}
          </span>
          <span className="text-[#64748B]">killed</span>
        </div>
        <div
          className="h-3 w-px"
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent)",
          }}
        />
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-base font-bold text-[#F1F5F9]">
            {avgTime}
          </span>
          <span className="text-[#64748B]">avg</span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="pt-1">
        <Sparkline data={sparklineData} height={40} />
      </div>
    </div>
  );
}
