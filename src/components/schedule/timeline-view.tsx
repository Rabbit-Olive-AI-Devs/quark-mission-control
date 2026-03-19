"use client";

import { useMemo, useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import type { CronJob } from "@/lib/parsers/types";
import { JobCard } from "./job-card";

const TZ = "America/Chicago";

/** Get the current hour in Chicago timezone (0-23). */
function chicagoHour(): number {
  return parseInt(
    new Date().toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hour12: false }),
    10
  );
}

/** Format an hour number to a display label like "5 AM", "12 PM". */
function hourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

/** Parse cron schedule and extract the hours it runs at (best-effort). */
function cronHours(schedule: string): number[] {
  // cron format: min hour dom month dow
  const parts = schedule.trim().split(/\s+/);
  if (parts.length < 5) return [];
  const hourField = parts[1];
  if (hourField === "*") return Array.from({ length: 24 }, (_, i) => i);

  const hours: number[] = [];
  for (const segment of hourField.split(",")) {
    if (segment.includes("/")) {
      // */N or start-end/step
      const [range, stepStr] = segment.split("/");
      const step = parseInt(stepStr, 10) || 1;
      let start = 0;
      let end = 23;
      if (range !== "*") {
        const [s, e] = range.split("-").map(Number);
        start = s;
        if (!isNaN(e)) end = e;
      }
      for (let i = start; i <= end; i += step) hours.push(i);
    } else if (segment.includes("-")) {
      const [s, e] = segment.split("-").map(Number);
      for (let i = s; i <= e; i++) hours.push(i);
    } else {
      const n = parseInt(segment, 10);
      if (!isNaN(n)) hours.push(n);
    }
  }
  return [...new Set(hours)].sort((a, b) => a - b);
}

interface TimelineViewProps {
  jobs: CronJob[];
  view: "daily" | "weekly";
  failedFirst?: boolean;
  recentRunsMap?: Record<string, Array<{ status: "ok" | "error" }>>;
}

export function TimelineView({ jobs, view, failedFirst = false, recentRunsMap = {} }: TimelineViewProps) {
  const [nowHour, setNowHour] = useState(chicagoHour);

  // Update current hour every 60s
  useEffect(() => {
    const id = setInterval(() => setNowHour(chicagoHour()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Map each hour to its jobs
  const hourSlots = useMemo(() => {
    const slots: Map<number, CronJob[]> = new Map();
    for (let h = 0; h < 24; h++) slots.set(h, []);

    for (const job of jobs) {
      if (!job.enabled) continue;
      const hrs = cronHours(job.schedule);
      for (const h of hrs) {
        slots.get(h)?.push(job);
      }
    }
    return slots;
  }, [jobs]);

  // Sort jobs within a slot if failedFirst is enabled
  function sortSlotJobs(slotJobs: CronJob[]): CronJob[] {
    if (!failedFirst) return slotJobs;
    return [...slotJobs].sort((a, b) => {
      const aFailed = a.status === "error" ? 0 : 1;
      const bFailed = b.status === "error" ? 0 : 1;
      return aFailed - bFailed;
    });
  }

  // For weekly: group jobs by day-of-week from nextRunMs
  const weekSlots = useMemo(() => {
    if (view !== "weekly") return null;
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const slots: { day: string; dayIndex: number; jobs: CronJob[] }[] = days.map((d, i) => ({
      day: d,
      dayIndex: i,
      jobs: [],
    }));

    for (const job of jobs) {
      if (!job.enabled) continue;
      // For weekly, distribute across all days the cron would run
      const parts = job.schedule.trim().split(/\s+/);
      const dowField = parts.length >= 5 ? parts[4] : "*";
      let dowList: number[];
      if (dowField === "*") {
        dowList = [0, 1, 2, 3, 4, 5, 6];
      } else {
        dowList = [];
        for (const seg of dowField.split(",")) {
          const n = parseInt(seg, 10);
          if (!isNaN(n) && n >= 0 && n <= 6) dowList.push(n);
        }
        if (dowList.length === 0) dowList = [0, 1, 2, 3, 4, 5, 6];
      }
      for (const d of dowList) {
        slots[d].jobs.push(job);
      }
    }
    return slots;
  }, [jobs, view]);

  const todayDow = new Date().toLocaleString("en-US", { timeZone: TZ, weekday: "short" });

  if (view === "weekly" && weekSlots) {
    return (
      <div className="space-y-2">
        {weekSlots.map((slot) => {
          const isToday = slot.day === todayDow.slice(0, 3);
          const sorted = sortSlotJobs(slot.jobs);
          return (
            <GlassCard key={slot.day} delay={slot.dayIndex * 0.03} className="p-3">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`text-xs font-mono font-bold w-10 ${
                    isToday ? "text-[#00D4AA]" : "text-[#94A3B8]"
                  }`}
                >
                  {slot.day}
                </span>
                {isToday && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#00D4AA]/20 text-[#00D4AA]">
                    TODAY
                  </span>
                )}
                <span className="text-[10px] text-[#64748B]">
                  {slot.jobs.length} job{slot.jobs.length !== 1 ? "s" : ""}
                </span>
              </div>
              {sorted.length > 0 ? (
                <div className="space-y-1">
                  {sorted.map((job) => (
                    <JobCard key={job.id} job={job} compact recentRuns={recentRunsMap[job.id] || []} />
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-[#64748B] italic pl-12">No jobs scheduled</div>
              )}
            </GlassCard>
          );
        })}
      </div>
    );
  }

  // Daily view: vertical timeline with 24 hour rows
  return (
    <div className="relative">
      {/* Timeline spine */}
      <div className="absolute left-[52px] top-0 bottom-0 w-px bg-white/5" />

      <div className="space-y-0">
        {Array.from({ length: 24 }, (_, h) => {
          const slotJobs = sortSlotJobs(hourSlots.get(h) || []);
          const isCurrent = h === nowHour;
          const isPast = h < nowHour;

          return (
            <div
              key={h}
              className={`relative flex items-start gap-4 py-2 px-2 rounded-lg transition-colors ${
                isCurrent ? "bg-[#00D4AA]/5" : ""
              }`}
            >
              {/* Hour label */}
              <div
                className={`w-12 text-right text-xs font-mono shrink-0 pt-0.5 ${
                  isCurrent
                    ? "text-[#00D4AA] font-bold"
                    : isPast
                      ? "text-[#64748B]"
                      : "text-[#94A3B8]"
                }`}
              >
                {hourLabel(h)}
              </div>

              {/* Timeline dot */}
              <div className="relative shrink-0 pt-1">
                {isCurrent ? (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D4AA] opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00D4AA]" />
                  </span>
                ) : slotJobs.length > 0 ? (
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#7C3AED]/60" />
                ) : (
                  <span className="inline-flex h-2 w-2 rounded-full bg-white/10" />
                )}
              </div>

              {/* Job cards */}
              <div className="flex-1 min-w-0">
                {slotJobs.length > 0 ? (
                  <div className="space-y-1">
                    {slotJobs.map((job) => (
                      <JobCard key={job.id} job={job} compact recentRuns={recentRunsMap[job.id] || []} />
                    ))}
                  </div>
                ) : isCurrent ? (
                  <div className="text-[10px] text-[#00D4AA]/60 italic pt-0.5">Current hour</div>
                ) : null}
              </div>

              {/* Job count badge */}
              {slotJobs.length > 0 && (
                <div className="text-[9px] text-[#64748B] font-mono shrink-0 pt-1">
                  {slotJobs.length}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
