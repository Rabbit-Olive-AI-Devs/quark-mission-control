"use client";

import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusDot } from "@/components/ui/status-dot";
import { Calendar, Clock } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { CronJob } from "@/lib/parsers/types";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Parse "in Xh" or "in Xm" to get approximate target hour
function resolveHour(timeStr: string | null, isNext: boolean): number | null {
  if (!timeStr) return null;
  const hMatch = timeStr.match(/(\d+)h/);
  const mMatch = timeStr.match(/(\d+)m/);
  const dMatch = timeStr.match(/(\d+)d/);

  let offsetHours = 0;
  if (hMatch) offsetHours = parseInt(hMatch[1]);
  if (mMatch) offsetHours = Math.round(parseInt(mMatch[1]) / 60 * 10) / 10;
  if (dMatch) return null; // too far out

  const now = new Date().getHours();
  if (isNext) return Math.round((now + offsetHours) % 24);
  return Math.round((now - offsetHours + 24) % 24);
}

// Color per job (cycle through palette)
const JOB_COLORS = ["#00D4AA", "#7C3AED", "#F59E0B", "#3B82F6", "#EF4444", "#10B981", "#EC4899", "#06B6D4", "#8B5CF6", "#F97316", "#14B8A6", "#E879F9", "#22D3EE", "#FB923C"];

export default function CalendarPage() {
  const { data, loading } = useApi<{ jobs: CronJob[] }>("/api/cron", ["heartbeat"]);

  const jobs = data?.jobs || [];

  // Build schedule: which jobs fire at which hours
  const schedule: { hour: number; jobs: { name: string; color: string; type: "next" | "last" }[] }[] = HOURS.map((h) => ({
    hour: h,
    jobs: [],
  }));

  jobs.forEach((job, idx) => {
    const color = JOB_COLORS[idx % JOB_COLORS.length];

    const nextHour = resolveHour(job.nextRun, true);
    if (nextHour !== null) {
      schedule[nextHour].jobs.push({ name: job.name, color, type: "next" });
    }

    const lastHour = resolveHour(job.lastRun, false);
    if (lastHour !== null && !schedule[lastHour].jobs.find((j) => j.name === job.name)) {
      schedule[lastHour].jobs.push({ name: job.name, color, type: "last" });
    }
  });

  const nowHour = new Date().getHours();

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <Calendar size={24} className="text-[#00D4AA]" />
            Calendar
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            24-hour cron schedule overlay — {jobs.length} jobs mapped
          </p>
        </div>

        {/* Legend */}
        <GlassCard className="mb-4">
          <div className="flex items-center gap-6 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[#00D4AA]/30 border border-[#00D4AA]/50" />
              <span className="text-[#94A3B8]">Scheduled (next run)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-white/10 border border-white/20" />
              <span className="text-[#94A3B8]">Completed (last run)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[#F59E0B]/20 border border-[#F59E0B]/40" />
              <span className="text-[#94A3B8]">Current hour</span>
            </div>
          </div>
        </GlassCard>

        {loading ? (
          <GlassCard>
            <div className="animate-pulse space-y-2">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-12 bg-white/5 rounded" />)}
            </div>
          </GlassCard>
        ) : (
          <GlassCard delay={0.1}>
            <div className="space-y-0">
              {schedule.map((slot) => {
                const isNow = slot.hour === nowHour;
                return (
                  <div
                    key={slot.hour}
                    className={`flex items-start gap-4 py-2.5 px-3 border-b border-white/5 last:border-0 rounded-lg transition-colors ${
                      isNow ? "bg-[#F59E0B]/5" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    {/* Hour label */}
                    <div className="w-14 shrink-0 flex items-center gap-2">
                      {isNow && <StatusDot status="active" size="sm" pulse />}
                      <span className={`text-xs font-mono ${isNow ? "text-[#F59E0B] font-semibold" : "text-[#94A3B8]"}`}>
                        {slot.hour.toString().padStart(2, "0")}:00
                      </span>
                    </div>

                    {/* Jobs at this hour */}
                    <div className="flex-1 flex flex-wrap gap-1.5 min-h-[24px]">
                      {slot.jobs.map((j, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-all"
                          style={{
                            background: j.type === "next" ? `${j.color}15` : "rgba(255,255,255,0.04)",
                            border: `1px solid ${j.type === "next" ? `${j.color}40` : "rgba(255,255,255,0.08)"}`,
                            color: j.type === "next" ? j.color : "#94A3B8",
                          }}
                        >
                          <Clock size={10} />
                          <span className="truncate max-w-40">{j.name}</span>
                          {j.type === "last" && (
                            <span className="text-[8px] opacity-60">done</span>
                          )}
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
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
