"use client";

import { InboxItem } from "./inbox-item";
import { formatTimeAgo } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/theme-constants";
import type { PipelineJob } from "@/lib/parsers/types";

const TERMINAL_STATUSES = new Set(["published", "completed", "killed", "quarantined", "preview_sent"]);
const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

interface InboxStaleProps {
  jobs: PipelineJob[];
}

export function InboxStale({ jobs }: InboxStaleProps) {
  const stale = jobs
    .filter((j) => {
      if (TERMINAL_STATUSES.has(j.status)) return false;
      const age = Date.now() - new Date(j.createdAt).getTime();
      return age > STALE_THRESHOLD_MS;
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // oldest first

  return (
    <div className="space-y-1">
      {stale.map((job) => {
        const ageHours = Math.floor((Date.now() - new Date(job.createdAt).getTime()) / 3600000);
        return (
          <InboxItem
            key={job.jobId}
            icon={
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[job.status] || "#F59E0B" }}
              />
            }
            title={`${job.jobId}: stuck at "${job.status}" for ${ageHours}h`}
            subtitle={job.topic || "No topic"}
            age={formatTimeAgo(job.createdAt)}
            ageColor="#F59E0B"
          />
        );
      })}
    </div>
  );
}
