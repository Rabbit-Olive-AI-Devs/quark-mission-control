"use client";

import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { Gauge } from "@/components/ui/gauge";
import { useApi } from "@/hooks/use-api";
import type { CommandCenterData } from "@/lib/parsers/types";
import { BrainCircuit, TriangleAlert, ShieldAlert, Activity, Coins, TimerReset } from "lucide-react";

function fmtNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function fmtMs(ms: number) {
  if (!ms) return "0s";
  if (ms >= 60000) return `${Math.round(ms / 60000 * 10) / 10}m`;
  return `${Math.round(ms / 1000)}s`;
}

function severityClasses(severity: "info" | "warning" | "critical") {
  if (severity === "critical") return "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#FCA5A5]";
  if (severity === "warning") return "border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#FCD34D]";
  return "border-[#00D4AA]/30 bg-[#00D4AA]/10 text-[#86EFAC]";
}

export default function CommandCenterPage() {
  const { data, loading } = useApi<CommandCenterData>("/api/command-center", { snapshotKey: "commandCenter", refreshOn: ["metrics", "cron"] });

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <BrainCircuit size={24} className="text-[#00D4AA]" />
            Command Center
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Read-only model usage, quota headroom, and anomaly visibility.
          </p>
        </div>

        {loading || !data ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <GlassCard key={i}>
                <div className="animate-pulse h-24 bg-white/5 rounded" />
              </GlassCard>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
              <GlassCard>
                <div className="flex items-center gap-2 mb-2 text-[#94A3B8] text-xs uppercase tracking-wide">
                  <ShieldAlert size={14} className="text-[#00D4AA]" /> Quota
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center">
                    <Gauge value={data.quota.dailyRemaining} max={100} size={76} color="#00D4AA" />
                    <span className="text-[11px] mt-2 text-[#F1F5F9]">Daily</span>
                    <span className="text-[10px] text-[#94A3B8] text-center">{data.quota.dailyLabel}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Gauge value={data.quota.weeklyRemaining} max={100} size={76} color="#7C3AED" />
                    <span className="text-[11px] mt-2 text-[#F1F5F9]">Weekly</span>
                    <span className="text-[10px] text-[#94A3B8] text-center">{data.quota.weeklyLabel}</span>
                  </div>
                </div>
              </GlassCard>

              <GlassCard delay={0.05}>
                <div className="flex items-center gap-2 mb-2 text-[#94A3B8] text-xs uppercase tracking-wide">
                  <Activity size={14} className="text-[#00D4AA]" /> Last 24h
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-2xl font-semibold text-[#F1F5F9]">{fmtNumber(data.windows.last24h.totalRuns)}</div>
                    <div className="text-xs text-[#94A3B8]">cron runs tracked</div>
                  </div>
                  <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Success</span><span>{data.windows.last24h.successRate}%</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Primary share</span><span>{data.windows.last24h.primarySharePct}%</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Fallback share</span><span>{data.windows.last24h.fallbackSharePct}%</span></div>
                </div>
              </GlassCard>

              <GlassCard delay={0.1}>
                <div className="flex items-center gap-2 mb-2 text-[#94A3B8] text-xs uppercase tracking-wide">
                  <TimerReset size={14} className="text-[#00D4AA]" /> Last 7d
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="text-2xl font-semibold text-[#F1F5F9]">{fmtNumber(data.windows.last7d.totalRuns)}</div>
                    <div className="text-xs text-[#94A3B8]">cron runs tracked</div>
                  </div>
                  <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Success</span><span>{data.windows.last7d.successRate}%</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Tokens</span><span>{fmtNumber(data.windows.last7d.totalTokens)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Avg duration</span><span>{fmtMs(data.windows.last7d.avgDurationMs)}</span></div>
                </div>
              </GlassCard>

              <GlassCard delay={0.15}>
                <div className="flex items-center gap-2 mb-2 text-[#94A3B8] text-xs uppercase tracking-wide">
                  <Coins size={14} className="text-[#00D4AA]" /> Cost visibility
                </div>
                <div className="text-2xl font-semibold text-[#F1F5F9]">
                  {data.cost.visibility === "estimated" ? `$${data.cost.estimatedUsd7d.toFixed(2)}` : "Unpriced"}
                </div>
                <p className="text-xs text-[#94A3B8] mt-2 leading-relaxed">{data.cost.note}</p>
                <div className="mt-4 pt-3 border-t border-white/5 text-xs text-[#94A3B8]">
                  Primary: <span className="text-[#F1F5F9]">{data.primaryModel}</span>
                </div>
              </GlassCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
              <GlassCard className="xl:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={16} className="text-[#00D4AA]" />
                  <h3 className="text-sm font-medium">Top models — last 24h</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="text-left text-[#94A3B8] text-xs border-b border-white/5">
                        <th className="pb-3 font-medium">Model</th>
                        <th className="pb-3 font-medium">Provider</th>
                        <th className="pb-3 font-medium">Runs</th>
                        <th className="pb-3 font-medium">Share</th>
                        <th className="pb-3 font-medium">Tokens</th>
                        <th className="pb-3 font-medium">Avg duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.topModels24h.map((row) => (
                        <tr key={`${row.provider}-${row.model}`}>
                          <td className="py-3 text-[#F1F5F9]">{row.model}</td>
                          <td className="py-3 text-[#94A3B8]">{row.provider}</td>
                          <td className="py-3">{fmtNumber(row.runs)}</td>
                          <td className="py-3">{row.sharePct}%</td>
                          <td className="py-3">{fmtNumber(row.totalTokens)}</td>
                          <td className="py-3">{fmtMs(row.avgDurationMs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>

              <GlassCard delay={0.05}>
                <div className="flex items-center gap-2 mb-4">
                  <TriangleAlert size={16} className="text-[#F59E0B]" />
                  <h3 className="text-sm font-medium">Anomalies</h3>
                </div>
                <div className="space-y-3">
                  {data.anomalies.map((item) => (
                    <div key={item.id} className={`rounded-xl border p-3 ${severityClasses(item.severity)}`}>
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="text-xs mt-1 opacity-90">{item.detail}</div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GlassCard>
                <h3 className="text-sm font-medium mb-4">Fallback chain</h3>
                <div className="space-y-2">
                  {[data.primaryModel, ...data.fallbackChain].map((item, index) => (
                    <div key={item} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2">
                      <div>
                        <div className="text-sm text-[#F1F5F9]">{item}</div>
                        <div className="text-[11px] text-[#94A3B8]">{index === 0 ? "Primary" : `Fallback ${index}`}</div>
                      </div>
                      <div className={`text-[10px] px-2 py-1 rounded-full ${index === 0 ? "bg-[#00D4AA]/20 text-[#00D4AA]" : "bg-white/5 text-[#94A3B8]"}`}>
                        {index === 0 ? "ACTIVE TARGET" : "STANDBY"}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard delay={0.05}>
                <h3 className="text-sm font-medium mb-4">7-day model mix</h3>
                <div className="space-y-3">
                  {data.topModels7d.map((row) => (
                    <div key={`${row.provider}-${row.model}`}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#F1F5F9] truncate pr-3">{row.model}</span>
                        <span className="text-[#94A3B8]">{row.sharePct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#00D4AA] to-[#7C3AED]" style={{ width: `${Math.min(row.sharePct, 100)}%` }} />
                      </div>
                      <div className="text-[11px] text-[#94A3B8] mt-1">{fmtNumber(row.runs)} runs · {fmtNumber(row.totalTokens)} tokens</div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
