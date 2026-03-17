"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { OperationsDailyUsage } from "@/lib/parsers/types";

interface UsageChartProps {
  dailyUsage: OperationsDailyUsage[];
  tokenUsage: {
    sessionTokens: number;
    sessionCostUSD: number;
    last30DaysTokens: number;
    last30DaysCostUSD: number;
  };
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function UsageChart({ dailyUsage, tokenUsage }: UsageChartProps) {
  const chartData = dailyUsage.map((d) => ({
    day: d.dayKey.slice(5), // "MM-DD"
    tokens: d.totalTokens,
    cost: d.costUSD,
  }));

  const hasData = chartData.length > 0;

  return (
    <GlassCard className="mb-4" delay={0.1}>
      <div className="flex items-center gap-3 mb-4">
        <TrendingUp size={18} className="text-[#00D4AA]" />
        <h2 className="text-sm font-semibold text-[#F1F5F9]">Token Usage (7 days)</h2>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
          <div className="text-[10px] text-[#94A3B8]">Session</div>
          <div className="text-sm font-semibold text-[#F1F5F9]">{formatTokens(tokenUsage.sessionTokens)}</div>
          {tokenUsage.sessionCostUSD > 0 && (
            <div className="text-[10px] text-[#94A3B8]">${tokenUsage.sessionCostUSD.toFixed(2)}</div>
          )}
        </div>
        <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2">
          <div className="text-[10px] text-[#94A3B8]">Last 30 days</div>
          <div className="text-sm font-semibold text-[#F1F5F9]">{formatTokens(tokenUsage.last30DaysTokens)}</div>
          {tokenUsage.last30DaysCostUSD > 0 && (
            <div className="text-[10px] text-[#94A3B8]">${tokenUsage.last30DaysCostUSD.toFixed(2)}</div>
          )}
        </div>
      </div>

      {/* Bar chart */}
      {hasData ? (
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <XAxis
                dataKey="day"
                tick={{ fill: "#94A3B8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94A3B8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatTokens}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(10,10,15,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#F1F5F9",
                }}
                formatter={(value: number | undefined) => [formatTokens(value ?? 0), "Tokens"]}
                labelFormatter={(label: React.ReactNode) => `Date: ${label}`}
              />
              <Bar dataKey="tokens" fill="#00D4AA" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[180px] flex items-center justify-center">
          <p className="text-xs text-[#94A3B8]/60">No usage data available from CodexBar.</p>
        </div>
      )}
    </GlassCard>
  );
}
