"use client";

import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { Gauge } from "@/components/ui/gauge";
import { BarChart3, CheckCircle, AlertTriangle, XCircle, Cpu } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { MetricsData, MetricRow } from "@/lib/parsers/types";

function parsePercent(value: string): number | null {
  const match = value.match(/(\d+(?:\.\d+)?)%/);
  return match ? Number(match[1]) : null;
}


function evaluateRow(row: MetricRow): "good" | "warn" | "bad" | "unknown" {
  // Primary: use the markdown Status emoji (set by metrics writer)
  const status = row.status.trim();
  if (status.includes("✅")) return "good";
  if (status.includes("⚠️")) return "warn";
  if (status.includes("❌")) return "bad";

  // Fallback: heuristic evaluation when no emoji is present
  const value = row.value.toLowerCase();
  if (/n\/a|unknown/.test(value)) return "unknown";
  if (/✅|ok\b|healthy|normal|available/.test(value)) return "good";
  if (/⚠️|warn|degraded|attention/.test(value)) return "warn";
  if (/❌|error|fail|expired|invalid/.test(value)) return "bad";

  return "unknown";
}

function statusIcon(row: MetricRow) {
  const state = evaluateRow(row);
  if (state === "good") return <CheckCircle size={14} className="text-[#10B981]" />;
  if (state === "warn") return <AlertTriangle size={14} className="text-[#F59E0B]" />;
  if (state === "bad") return <XCircle size={14} className="text-[#EF4444]" />;
  return <AlertTriangle size={14} className="text-[#94A3B8]" />;
}

function gaugeColor(pct: number) {
  if (pct > 50) return "#10B981";
  if (pct > 20) return "#F59E0B";
  return "#EF4444";
}

export default function MetricsPage() {
  const { data, loading } = useApi<MetricsData>("/api/metrics", { snapshotKey: "metrics", refreshOn: ["metrics"] });
  const quota = data?.codexQuota;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <BarChart3 size={24} className="text-[#00D4AA]" />
            Metrics & Analytics
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            Last updated: {data?.lastUpdated || "Loading..."}
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <GlassCard key={i}>
                <div className="animate-pulse h-20 bg-white/5 rounded" />
              </GlassCard>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <GlassCard>
                <div className="text-xs text-[#94A3B8] mb-1">Cron Reliability</div>
                <div className={`text-2xl font-bold ${
                  !data?.cronReliability || data.cronReliability === "N/A"
                    ? "text-[#94A3B8]"
                    : parsePercent(data.cronReliability) !== null && parsePercent(data.cronReliability)! >= 98
                      ? "text-[#10B981]"
                      : parsePercent(data.cronReliability) !== null && parsePercent(data.cronReliability)! >= 90
                        ? "text-[#F59E0B]"
                        : "text-[#EF4444]"
                }`}>{data?.cronReliability || "N/A"}</div>
              </GlassCard>

              <GlassCard delay={0.05}>
                <div className="flex items-center gap-2 mb-3">
                  <Cpu size={16} className="text-[#7C3AED]" />
                  <div className="text-xs text-[#94A3B8]">Codex Usage</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center rounded-xl bg-white/[0.03] py-3">
                    <Gauge
                      value={quota?.dailyRemaining ?? 0}
                      max={100}
                      size={76}
                      color={gaugeColor(quota?.dailyRemaining ?? 0)}
                    />
                    <div className="mt-2 text-[11px] text-[#F1F5F9]">5h window</div>
                    <div className="text-[10px] text-[#94A3B8] text-center px-2">{quota?.dailyLabel || "Unavailable"}</div>
                  </div>

                  <div className="flex flex-col items-center rounded-xl bg-white/[0.03] py-3">
                    <Gauge
                      value={quota?.weeklyRemaining ?? 0}
                      max={100}
                      size={76}
                      color={gaugeColor(quota?.weeklyRemaining ?? 0)}
                    />
                    <div className="mt-2 text-[11px] text-[#F1F5F9]">Weekly quota</div>
                    <div className="text-[10px] text-[#94A3B8] text-center px-2">{quota?.weeklyLabel || "Unavailable"}</div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard delay={0.1}>
                <div className="text-xs text-[#94A3B8] mb-1">Degradation</div>
                <div className={`text-2xl font-bold ${
                  data?.degradationStatus === "NORMAL" ? "text-[#10B981]" : "text-[#F59E0B]"
                }`}>
                  {data?.degradationStatus || "UNKNOWN"}
                </div>
              </GlassCard>
            </div>

            <GlassCard delay={0.15}>
              <h3 className="text-sm font-medium mb-4">Ops Health</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#94A3B8] text-xs border-b border-white/5">
                    <th className="pb-3 font-medium">Metric</th>
                    <th className="pb-3 font-medium">Value</th>
                    <th className="pb-3 font-medium">Target</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(data?.opsHealth || []).map((row, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="py-3 text-[#F1F5F9]">{row.metric}</td>
                      <td className="py-3 text-[#94A3B8]">{row.value}</td>
                      <td className="py-3 text-[#94A3B8]">{row.target}</td>
                      <td className="py-3">{statusIcon(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>

            {(data?.contentPerf?.length || 0) > 0 && (
              <GlassCard delay={0.2} className="mt-4">
                <h3 className="text-sm font-medium mb-4">Content Performance (7-Day)</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[#94A3B8] text-xs border-b border-white/5">
                      <th className="pb-3 font-medium">Metric</th>
                      <th className="pb-3 font-medium">Today</th>
                      <th className="pb-3 font-medium">7-Day Total</th>
                      <th className="pb-3 font-medium">7-Day Avg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data!.contentPerf.map((row, i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="py-3 text-[#F1F5F9]">{row.metric}</td>
                        <td className="py-3 text-[#94A3B8]">{row.today}</td>
                        <td className="py-3 text-[#94A3B8]">{row.sevenDayTotal}</td>
                        <td className="py-3 text-[#94A3B8]">{row.sevenDayAvg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassCard>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
