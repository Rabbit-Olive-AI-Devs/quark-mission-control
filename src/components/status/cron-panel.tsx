"use client";

import { StatusSentence } from "@/components/ui/status-sentence";
import { CronHeatmap } from "@/components/status/cron-heatmap";
import type { StatusFullResponse } from "@/lib/parsers/types";
import { formatTimeAgo } from "@/lib/utils";

interface CronPanelProps {
  data: StatusFullResponse;
}

export function CronPanel({ data }: CronPanelProps) {
  const { jobs } = data.cron;

  // Heatmap data
  const heatmapJobs = jobs.map((j) => ({
    name: j.name,
    status: j.enabled ? j.status : "disabled",
  }));

  // 3 most recent jobs by lastRun
  const recentJobs = [...jobs]
    .filter((j) => j.lastRun)
    .sort((a, b) => {
      const aTime = a.lastRun ? new Date(a.lastRun).getTime() : 0;
      const bTime = b.lastRun ? new Date(b.lastRun).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 3);

  return (
    <div className="space-y-3">
      <StatusSentence
        level={data.cron.level}
        sentence={data.cron.sentence}
      />

      {/* Heatmap */}
      <CronHeatmap jobs={heatmapJobs} />

      {/* Recent jobs */}
      {recentJobs.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {recentJobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center gap-2 text-xs"
            >
              <span
                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    job.status === "error" ? "#EF4444" : "#10B981",
                  boxShadow:
                    job.status === "error"
                      ? "0 0 4px rgba(239,68,68,0.3)"
                      : "0 0 4px rgba(16,185,129,0.2)",
                }}
              />
              <span
                className="truncate text-[#F1F5F9]"
                style={{ maxWidth: 150 }}
              >
                {job.name}
              </span>
              <span className="ml-auto font-mono text-[#64748B]">
                {job.lastRun ? formatTimeAgo(job.lastRun) : "\u2014"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
