"use client";

import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusDot } from "@/components/ui/status-dot";
import { Calendar, Clock } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { CronJob } from "@/lib/parsers/types";

// 48 slots = 24 hours x 2 (every 30 minutes)
const SLOTS = Array.from({ length: 48 }, (_, i) => ({
  hour: Math.floor(i / 2),
  minute: (i % 2) * 30,
}));

// Parse cron schedule string to extract exact time slots
// Format: "cron M H * * *" or "cron M H1,H2,H3 * * *"
function parseCronSchedule(schedule: string): { hour: number; minute: number }[] {
  const slots: { hour: number; minute: number }[] = [];

  // Match "cron <minute> <hour> ..."
  const match = schedule.match(/cron\s+(\d+)\s+([\d,*\/]+)/);
  if (!match) return slots;

  const minute = parseInt(match[1]);
  const hourPart = match[2];

  if (hourPart === "*") {
    // Every hour at this minute
    for (let h = 0; h < 24; h++) {
      slots.push({ hour: h, minute });
    }
  } else if (hourPart.includes("/")) {
    // Every N hours (e.g., */6)
    const interval = parseInt(hourPart.split("/")[1]);
    for (let h = 0; h < 24; h += interval) {
      slots.push({ hour: h, minute });
    }
  } else if (hourPart.includes(",")) {
    // Specific hours (e.g., 0,6,12,18)
    hourPart.split(",").forEach((h) => {
      slots.push({ hour: parseInt(h), minute });
    });
  } else {
    // Single hour
    slots.push({ hour: parseInt(hourPart), minute });
  }

  return slots;
}

// Which 30-min slot does a given time fall into?
function timeToSlotIndex(hour: number, minute: number): number {
  return hour * 2 + (minute >= 30 ? 1 : 0);
}

// Color per job (cycle through palette)
const JOB_COLORS = ["#00D4AA", "#7C3AED", "#F59E0B", "#3B82F6", "#EF4444", "#10B981", "#EC4899", "#06B6D4", "#8B5CF6", "#F97316", "#14B8A6", "#E879F9", "#22D3EE", "#FB923C"];

export default function CalendarPage() {
  const { data, loading } = useApi<{ jobs: CronJob[] }>("/api/cron", ["heartbeat"]);

  const jobs = data?.jobs || [];

  // Build schedule grid from actual cron expressions
  const schedule: { hour: number; minute: number; jobs: { name: string; color: string; exactMinute: number }[] }[] =
    SLOTS.map((s) => ({ ...s, jobs: [] }));

  jobs.forEach((job, idx) => {
    const color = JOB_COLORS[idx % JOB_COLORS.length];
    const times = parseCronSchedule(job.schedule);

    times.forEach((t) => {
      const slotIdx = timeToSlotIndex(t.hour, t.minute);
      if (slotIdx < schedule.length) {
        schedule[slotIdx].jobs.push({ name: job.name, color, exactMinute: t.minute });
      }
    });
  });

  const now = new Date();
  const nowSlot = timeToSlotIndex(now.getHours(), now.getMinutes());

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <Calendar size={24} className="text-[#00D4AA]" />
            Cron Schedule
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            30-min intervals — {jobs.length} jobs mapped
          </p>
        </div>

        {/* Legend */}
        <GlassCard className="mb-4">
          <div className="flex items-center gap-6 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[#00D4AA]/30 border border-[#00D4AA]/50" />
              <span className="text-[#94A3B8]">Scheduled job</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[#F59E0B]/20 border border-[#F59E0B]/40" />
              <span className="text-[#94A3B8]">Current slot</span>
            </div>
          </div>
        </GlassCard>

        {loading ? (
          <GlassCard>
            <div className="animate-pulse space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-10 bg-white/5 rounded" />)}
            </div>
          </GlassCard>
        ) : (
          <GlassCard delay={0.1}>
            <div className="space-y-0">
              {schedule.map((slot, slotIdx) => {
                const isNow = slotIdx === nowSlot;
                const timeLabel = `${slot.hour.toString().padStart(2, "0")}:${slot.minute.toString().padStart(2, "0")}`;
                const isHourBoundary = slot.minute === 0;

                return (
                  <div
                    key={slotIdx}
                    className={`flex items-start gap-4 py-2 px-3 border-b transition-colors ${
                      isHourBoundary ? "border-white/8" : "border-white/[0.03]"
                    } last:border-0 rounded-lg ${
                      isNow ? "bg-[#F59E0B]/5" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    {/* Time label */}
                    <div className="w-16 shrink-0 flex items-center gap-2">
                      {isNow && <StatusDot status="active" size="sm" pulse />}
                      <span className={`text-xs font-mono ${
                        isNow ? "text-[#F59E0B] font-semibold" :
                        isHourBoundary ? "text-[#94A3B8]" : "text-[#94A3B8]/50"
                      }`}>
                        {timeLabel}
                      </span>
                    </div>

                    {/* Jobs at this slot */}
                    <div className="flex-1 flex flex-wrap gap-1.5 min-h-[22px]">
                      {slot.jobs.map((j, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-all"
                          style={{
                            background: `${j.color}15`,
                            border: `1px solid ${j.color}40`,
                            color: j.color,
                          }}
                        >
                          <Clock size={10} />
                          <span className="truncate max-w-40">{j.name}</span>
                          <span className="text-[8px] opacity-60">:{j.exactMinute.toString().padStart(2, "0")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* Job color legend */}
        <GlassCard delay={0.2} className="mt-4">
          <h3 className="text-xs font-medium text-[#94A3B8] mb-3">Job Colors</h3>
          <div className="flex flex-wrap gap-3">
            {jobs.map((job, i) => (
              <div key={job.id} className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: JOB_COLORS[i % JOB_COLORS.length] }} />
                <span className="text-[#F1F5F9]">{job.name}</span>
                <span className="text-[#94A3B8]/50 font-mono">{job.schedule.replace("cron ", "")}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
