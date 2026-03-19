"use client";

import { InboxItem } from "./inbox-item";
import { formatTimeAgo } from "@/lib/utils";
import { TYPE_COLORS } from "@/lib/theme-constants";
import type { PipelineJob } from "@/lib/parsers/types";

interface InboxApprovalsProps {
  jobs: PipelineJob[];
}

export function InboxApprovals({ jobs }: InboxApprovalsProps) {
  const pending = jobs
    .filter((j) => j.status === "preview_sent")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // oldest first

  return (
    <div className="space-y-1">
      {pending.map((job) => (
        <InboxItem
          key={job.jobId}
          icon={
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: TYPE_COLORS[job.contentType] || "#94A3B8" }}
            />
          }
          title={job.topic || job.jobId}
          subtitle={`${job.contentType} \u2014 virality ${job.viralityScore}/10`}
          age={formatTimeAgo(job.createdAt)}
          ageColor="#7C3AED"
          action={{ label: "Review", onClick: () => {} }}
        />
      ))}
    </div>
  );
}
