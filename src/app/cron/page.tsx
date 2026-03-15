"use client";

import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusDot } from "@/components/ui/status-dot";
import { Clock, RefreshCw, BarChart2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useApi } from "@/hooks/use-api";
import type { CronJob } from "@/lib/parsers/types";

const TZ = "America/Chicago";

function formatRelativeClient(ms: number | null): string {
  if (!ms) return "—";
  const diff = ms - Date.now();
  const absDiff = Math.abs(diff);
  const hours = Math.floor(absDiff / 3600000);
  const mins = Math.floor((absDiff % 3600000) / 60000);

  if (diff > 0) {
    if (hours > 24) return `in ${Math.floor(hours / 24)}d`;
    if (hours > 0) return `in ${hours}h ${mins}m`;
    return `in ${mins}m`;
  } else {
    if (hours > 24) return `${Math.floor(hours / 24)}d ago`;
    if (hours > 0) return `${hours}h ${mins}m ago`;
    return `${mins}m ago`;
  }
}

function formatTimestamp(ms: number | null): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function ExecutionTimeline({ jobs }: { jobs: CronJob[] }) {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, "0")}:00`,
    upcoming: 0,
    recent: 0,
    names: [] as string[],
  }));

  for (const job of jobs) {
    // Use raw timestamps for accurate placement
    if (job.nextRunMs) {
      const d = new Date(job.nextRunMs);
      const h = parseInt(d.toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hour12: false }));
      if (h >= 0 && h < 24) {
        hours[h].upcoming++;
        hours[h].names.push(job.name);
      }
    }
    if (job.lastRunMs) {
      const elapsed = Date.now() - job.lastRunMs;
      if (elapsed < 24 * 3600000) {
        const d = new Date(job.lastRunMs);
        const h = parseInt(d.toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hour12: false }));
        if (h >= 0 && h < 24 && hours[h].upcoming === 0) {
          hours[h].recent = Math.max(hours[h].recent, 0.5);
          if (!hours[h].names.includes(job.name)) hours[h].names.push(job.name);
        }
      }
    }
  }

  const nowHour = parseInt(new Date().toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hour12: false }));

  return (
    <GlassCard delay={0.2}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={16} className="text-[#7C3AED]" />
        <h3 className="text-sm font-medium">24h Timeline (CT)</h3>
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
            formatter={(_: unknown, __: unknown, props: { payload?: { names?: string[] } }) => {
              const names = props?.payload?.names || [];
              return [names.join(", ") || "—", "Jobs"];
            }}
          />
          <Bar dataKey="upcoming" stackId="a" radius={[3, 3, 0, 0]}>
            {hours.map((h, i) => (
              <Cell key={i} fill={i === nowHour ? "#7C3AED" : h.upcoming > 0 ? "#00D4AA" : "rgba(255,255,255,0.03)"} />
            ))}
          </Bar>
          <Bar dataKey="recent" stackId="a" radius={[3, 3, 0, 0]}>
            {hours.map((h, i) => (
              <Cell key={i} fill={h.recent > 0 ? "rgba(0,212,170,0.3)" : "transparent"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-[9px] text-[#94A3B8]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#00D4AA] inline-block" /> Upcoming</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#00D4AA]/30 inline-block" /> Recent</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#7C3AED] inline-block" /> Now</span>
      </div>
    </GlassCard>
  );
}

export default function CronPage() {
  const { data, loading, refetch } = useApi<{ jobs: CronJob[]; summary: { total: number; ok: number; failed: number } }>(
    "/api/cron",
    { snapshotKey: "cron", refreshOn: ["heartbeat"] }
  );

  const jobs = data?.jobs || [];
  const summary = data?.summary || { total: 0, ok: 0, failed: 0 };

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <GlassCard className="text-center">
            <div className="text-3xl font-bold text-[#00D4AA]">{summary.total}</div>
            <div className="text-xs text-[#94A3B8] mt-1">Total Jobs</div>
          </GlassCard>
          <GlassCard className="text-center" delay={0.05}>
            <div className="text-3xl font-bold text-[#10B981]">{summary.ok}</div>
            <div className="text-xs text-[#94A3B8] mt-1">Healthy</div>
          </GlassCard>
          <GlassCard className="text-center" delay={0.1}>
            <div className="text-3xl font-bold text-[#94A3B8]">
              {jobs.filter((j) => j.status === "idle" || j.status === "disabled").length}
            </div>
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
                    <th className="pb-3 font-medium">Schedule (CT)</th>
                    <th className="pb-3 font-medium">Last Run</th>
                    <th className="pb-3 font-medium">Next Run</th>
                    <th className="pb-3 font-medium">Model</th>
                    <th className="pb-3 font-medium">Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-3">
                        <StatusDot
                          status={job.status === "ok" ? "ok" : job.status === "error" ? "error" : "idle"}
                          size="md"
                          pulse={job.status === "ok"}
                        />
                      </td>
                      <td className="py-3 text-[#F1F5F9] font-medium">{job.name}</td>
                      <td className="py-3 text-[#94A3B8] text-xs">
                        <span className="text-[#F1F5F9]">{job.scheduleHuman}</span>
                      </td>
                      <td className="py-3 text-xs">
                        <span className="text-[#F1F5F9]">{formatRelativeClient(job.lastRunMs)}</span>
                        {job.lastRunMs && (
                          <span className="text-[#94A3B8] block text-[10px] font-mono">{formatTimestamp(job.lastRunMs)}</span>
                        )}
                      </td>
                      <td className="py-3 text-xs">
                        <span className="text-[#F1F5F9]">{formatRelativeClient(job.nextRunMs)}</span>
                        {job.nextRunMs && (
                          <span className="text-[#94A3B8] block text-[10px] font-mono">{formatTimestamp(job.nextRunMs)}</span>
                        )}
                      </td>
                      <td className="py-3 text-[#94A3B8] font-mono text-[10px] truncate max-w-28">
                        {job.model.split("/").pop()}
                      </td>
                      <td className="py-3 text-[#94A3B8] text-xs">{job.agentId || "—"}</td>
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
