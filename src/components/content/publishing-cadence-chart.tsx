"use client";

import { useState, useMemo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { CadenceDay } from "@/lib/parsers/types";

interface PublishingCadenceChartProps {
  daily: CadenceDay[];
  avgPerDay7d: number;
  trend: "up" | "flat" | "down";
}

type RangeFilter = "7d" | "14d" | "30d";

const RANGE_FILTERS: { key: RangeFilter; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "14d", label: "14d" },
  { key: "30d", label: "30d" },
];

const PLATFORM_STACK = [
  { key: "x", color: "#3B82F6", label: "X" },
  { key: "tiktok", color: "#EC4899", label: "TikTok" },
  { key: "instagram", color: "#8B5CF6", label: "Instagram" },
  { key: "youtube", color: "#EF4444", label: "YouTube" },
  { key: "substack", color: "#F59E0B", label: "Substack" },
] as const;

const TREND_ICONS: Record<string, string> = {
  up: "\u2191",
  flat: "\u2192",
  down: "\u2193",
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export function PublishingCadenceChart({
  daily,
  avgPerDay7d,
  trend,
}: PublishingCadenceChartProps) {
  const [range, setRange] = useState<RangeFilter>("7d");

  const filteredData = useMemo(() => {
    const days = range === "7d" ? 7 : range === "14d" ? 14 : 30;
    const sorted = [...daily].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    return sorted.slice(-days).map((d) => ({
      ...d,
      label: formatDateLabel(d.date),
    }));
  }, [daily, range]);

  const hasData = filteredData.length > 0;

  return (
    <GlassCard delay={0.12}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-[#3B82F6]" />
          <h3 className="text-sm font-semibold text-[#F1F5F9]">
            Publishing Cadence
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#94A3B8] font-mono">
            Avg {avgPerDay7d.toFixed(1)}/day (7d){" "}
            <span
              className={
                trend === "up"
                  ? "text-emerald-400"
                  : trend === "down"
                  ? "text-red-400"
                  : "text-[#94A3B8]"
              }
            >
              {TREND_ICONS[trend]}
            </span>
          </span>
          <div className="flex gap-1">
            {RANGE_FILTERS.map((rf) => (
              <button
                key={rf.key}
                onClick={() => setRange(rf.key)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  range === rf.key
                    ? "bg-[#3B82F6]/20 text-[#3B82F6]"
                    : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5"
                }`}
              >
                {rf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {hasData ? (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredData} barCategoryGap="15%">
              <XAxis
                dataKey="label"
                tick={{ fill: "#94A3B8", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval={range === "30d" ? 4 : range === "14d" ? 1 : 0}
              />
              <YAxis
                tick={{ fill: "#94A3B8", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(10,10,15,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#F1F5F9",
                }}
                labelFormatter={(label: React.ReactNode) => `${label}`}
              />
              <Legend
                iconSize={8}
                wrapperStyle={{ fontSize: 10, color: "#94A3B8" }}
              />
              {PLATFORM_STACK.map(({ key, color, label }) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={label}
                  stackId="platforms"
                  fill={color}
                  radius={key === "substack" ? [3, 3, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[220px] flex items-center justify-center">
          <p className="text-xs text-[#94A3B8]/60">
            No publishing data available yet.
          </p>
        </div>
      )}
    </GlassCard>
  );
}
