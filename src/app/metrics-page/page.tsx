"use client";

import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { BarChart3, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import type { MetricsData } from "@/lib/parsers/types";

function statusIcon(status: string) {
  if (status.includes("\u2705") || status.toLowerCase().includes("ok")) return <CheckCircle size={14} className="text-[#10B981]" />;
  if (status.includes("\u26AA") || status.toLowerCase().includes("n/a")) return <AlertTriangle size={14} className="text-[#94A3B8]" />;
  if (status.includes("\u274C")) return <XCircle size={14} className="text-[#EF4444]" />;
  return <CheckCircle size={14} className="text-[#10B981]" />;
}

export default function MetricsPage() {
  const { data, loading } = useApi<MetricsData>("/api/metrics", ["metrics"]);

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
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <GlassCard>
                <div className="text-xs text-[#94A3B8] mb-1">Cron Reliability</div>
                <div className="text-2xl font-bold text-[#00D4AA]">{data?.cronReliability || "N/A"}</div>
              </GlassCard>
              <GlassCard delay={0.05}>
                <div className="text-xs text-[#94A3B8] mb-1">Codex Usage</div>
                <div className="text-2xl font-bold text-[#7C3AED]">{data?.codexUsage || "N/A"}</div>
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

            {/* Ops Health Table */}
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
                      <td className="py-3">{statusIcon(row.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>

            {/* Content Performance Table */}
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
