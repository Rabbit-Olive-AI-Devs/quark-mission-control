"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { STATUS_COLORS, TYPE_COLORS } from "@/lib/theme-constants";
import { formatTimeAgo } from "@/lib/utils";
import { Lightbulb, ArrowRight } from "lucide-react";
import type { PipelineJob } from "@/lib/parsers/types";

interface ContentWhatsNextProps {
  jobs: PipelineJob[];
  suggestions: string[];
}

const TERMINAL_STATUSES = new Set([
  "published",
  "completed",
  "killed",
  "quarantined",
]);

export function ContentWhatsNext({ jobs, suggestions }: ContentWhatsNextProps) {
  const upcoming = jobs
    .filter((j) => !TERMINAL_STATUSES.has(j.status))
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    .slice(0, 5);

  const topSuggestions = suggestions.slice(0, 3);
  const isEmpty = upcoming.length === 0 && topSuggestions.length === 0;

  return (
    <GlassCard delay={0.2}>
      {isEmpty ? (
        <div className="py-12 text-center">
          <p className="text-xs text-[#94A3B8]">
            No queued content. Submit new ideas via the content pipeline.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Upcoming jobs */}
          {upcoming.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
                Pipeline Queue
              </h4>
              <div className="space-y-1.5">
                {upcoming.map((job) => {
                  const statusColor =
                    STATUS_COLORS[job.status] || "#94A3B8";
                  const typeColor =
                    TYPE_COLORS[job.contentType] || "#94A3B8";

                  return (
                    <div
                      key={job.jobId}
                      className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: statusColor }}
                      />
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0"
                        style={{
                          backgroundColor: `${typeColor}20`,
                          color: typeColor,
                        }}
                      >
                        {job.contentType.replace("_", " ")}
                      </span>
                      <span className="text-xs text-[#F1F5F9] truncate flex-1">
                        {job.topic || job.jobId}
                      </span>
                      <span className="text-[10px] text-[#64748B] font-mono shrink-0">
                        {formatTimeAgo(job.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Divider */}
          {upcoming.length > 0 && topSuggestions.length > 0 && (
            <div className="border-t border-white/5" />
          )}

          {/* Content suggestions */}
          {topSuggestions.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold text-[#00D4AA] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Lightbulb size={11} />
                Content Suggestions
              </h4>
              <div className="space-y-2">
                {topSuggestions.map((s, i) => (
                  <div
                    key={`suggestion-${i}`}
                    className="flex items-start gap-2 text-xs"
                  >
                    <ArrowRight
                      size={10}
                      className="text-[#00D4AA] mt-0.5 shrink-0"
                    />
                    <span className="text-[#F1F5F9] leading-relaxed">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
