"use client";

import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusDot } from "@/components/ui/status-dot";
import { Clock, RefreshCw, BarChart2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useApi } from "@/hooks/use-api";
import type { CronJob } from "@/lib/parsers/types";

function ExecutionTimeline({ jobs }: { jobs: CronJob[] }) {
  // Build 24h timeline showing which jobs have nextRun values
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, "0")}:00`,
    jobs: 0,
    names: [] as string[],
  }));

  for (const job of jobs) {
    if (job.nextRun) {
      // Parse relative "in Xh" format
      const match = job.nextRun.match(/in (\d+)h/);
      if (match) {
        const hoursFromNow = parseInt(match[1]);
        const targetHour = (new Date().getHours() + hoursFromNow) % 24;
        hours[targetHour].jobs++;
        hours[targetHour].names.push(job.name);
      }
    }
    // Also check lastRun for recent executions
    if (job.lastRun) {
      const match = job.lastRun.match(/(\d+)([hm]) ago/);
      if (match) {
        const ago = match[2] === "h" ? parseInt(match[1]) : 0;
        const targetHour = (new Date().getHours() - ago + 24) % 24;
        hours[targetHour].jobs = Math.max(hours[targetHour].jobs, 0.5); // half-height for past runs
      }
    }
  }

  return (
    <GlassCard delay={0.2}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={16} className="text-[#7C3AED]" />
        <h3 className="text-sm font-medium">24h Execution Timeline</h3>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={hours}>
          <XAxis
            dataKey="hour"
            tick={{ fill: "#94A3B8", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            interval={2}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11, color: "#F1F5F9" }}
            labelStyle={{ color: "#F1F5F9" }}
            itemStyle={{ color: "#00D4AA" }}
            formatter={(value) => [`${Math.ceil(value as number)} job(s)`, "Scheduled"]}
          />
          <Bar dataKey="jobs" radius={[3, 3, 0, 0]}>
            {hours.map((h, i) => (
              <Cell key={i} fill={h.jobs > 0 ? "#00D4AA" : "rgba(255,255,255,0.03)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </GlassCard>
  );
}

export default function CronPage() {
  const { data, loading, refetch } = useApi<{ jobs: CronJob[]; summary: { total: number; ok: number; failed: number } }>(
    "/api/cron",
    ["heartbeat"]
  );

  const jobs = data?.jobs || [];
  const summary = data?.summary || { total: 0, ok: 0, failed: 0 };

  // Separate active/idle
  const activeJobs = jobs.filter((j) => j.status === "ok");
  const idleJobs = jobs.filter((j) => j.status !== "ok");

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-3">
              <Clock size={24} className="text-[#00D4AA]" />
              Cron Monitor
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">
              {summary.ok}/{summary.total} jobs running normally
            </p>
          </div>
          <button
            onClick={refetch}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <RefreshCw size={16} className="text-[#94A3B8]" />
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <GlassCard className="text-center">
            <div className="text-3xl font-bold text-[#00D4AA]">{summary.total}</div>
            <div className="text-xs text-[#94A3B8] mt-1">Total Jobs</div>
          </GlassCard>
          <GlassCard className="text-center" delay={0.05}>
            <div className="text-3xl font-bold text-[#10B981]">{summary.ok}</div>
            <div className="text-xs text-[#94A3B8] mt-1">Healthy</div>
          </GlassCard>
          <GlassCard className="text-center" delay={0.1}>
            <div className="text-3xl font-bold text-[#94A3B8]">{idleJobs.length}</div>
            <div className="text-xs text-[#94A3B8] mt-1">Idle</div>
          </GlassCard>
          <GlassCard className="text-center" delay={0.15}>
            <div className="text-3xl font-bold text-[#EF4444]">{summary.failed}</div>
            <div className="text-xs text-[#94A3B8] mt-1">Failed</div>
          </GlassCard>
        </div>

        {/* Timeline */}
        {!loading && jobs.length > 0 && (
          <div className="mb-6">
            <ExecutionTimeline jobs={jobs} />
          </div>
        )}

        {/* Job table */}
        <GlassCard delay={0.25}>
          <h3 className="text-sm font-medium mb-4">All Jobs</h3>
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-white/5 rounded" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#94A3B8] text-xs border-b border-white/5">
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Schedule</th>
                    <th className="pb-3 font-medium">Last Run</th>
                    <th className="pb-3 font-medium">Next Run</th>
                    <th className="pb-3 font-medium">Model</th>
                    <th className="pb-3 font-medium">ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-3">
                        <StatusDot
                          status={job.status === "ok" ? "ok" : job.status === "idle" ? "idle" : "error"}
                          size="md"
                          pulse={job.status === "ok"}
                        />
                      </td>
                      <td className="py-3 text-[#F1F5F9] font-medium">{job.name}</td>
                      <td className="py-3 text-[#94A3B8] font-mono text-xs max-w-40 truncate">{job.schedule}</td>
                      <td className="py-3 text-[#94A3B8] text-xs">{job.lastRun || "—"}</td>
                      <td className="py-3 text-[#94A3B8] text-xs">{job.nextRun || "—"}</td>
                      <td className="py-3 text-[#94A3B8] text-xs truncate max-w-28">{job.model}</td>
                      <td className="py-3 text-[#94A3B8] font-mono text-xs">{job.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {jobs.length === 0 && (
                <p className="text-center text-[#94A3B8] py-8">
                  No cron jobs found. Is `openclaw` installed?
                </p>
              )}
            </div>
          )}
        </GlassCard>
      </div>
    </AppShell>
  );
}
