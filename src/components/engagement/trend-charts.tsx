"use client";

import { GlassCard } from "@/components/ui/glass-card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { DailyAggregate } from "@/lib/parsers/types";
import { PLATFORM_COLORS, ACTION_COLORS, PLATFORM_LABELS } from "@/lib/engagement-constants";

interface Props {
  trends: DailyAggregate[];
}

const GRID_COLOR = "rgba(255,255,255,0.05)";
const AXIS_COLOR = "#94A3B8";

function formatDate(date: string): string {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" });
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="glass-card p-3 text-xs border border-white/10">
      <p className="text-[#F1F5F9] font-medium mb-1">{label}</p>
      {payload.filter((p) => p.value > 0).map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[#94A3B8]">{p.name}:</span>
          <span className="text-[#F1F5F9]">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendCharts({ trends }: Props) {
  if (trends.length < 2) {
    return (
      <GlassCard className="mb-6">
        <p className="text-sm text-[#94A3B8] text-center py-6">
          Not enough data for trends — needs 2+ days of engagement activity.
        </p>
      </GlassCard>
    );
  }

  const allPlatforms = new Set<string>();
  const allActions = new Set<string>();
  for (const t of trends) {
    Object.keys(t.byPlatform).forEach((p) => allPlatforms.add(p));
    Object.keys(t.byAction).forEach((a) => allActions.add(a));
  }

  const platformData = trends.map((t) => ({
    date: formatDate(t.date),
    ...Object.fromEntries([...allPlatforms].map((p) => [p, t.byPlatform[p] ?? 0])),
  }));

  const actionData = trends.map((t) => ({
    date: formatDate(t.date),
    ...Object.fromEntries([...allActions].map((a) => [a, t.byAction[a] ?? 0])),
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <GlassCard>
        <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
          Volume by Platform
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={platformData}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis dataKey="date" tick={{ fill: AXIS_COLOR, fontSize: 10 }} />
            <YAxis tick={{ fill: AXIS_COLOR, fontSize: 10 }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            {[...allPlatforms].map((p) => (
              <Bar
                key={p}
                dataKey={p}
                name={PLATFORM_LABELS[p] ?? p}
                stackId="platform"
                fill={PLATFORM_COLORS[p] ?? "#94A3B8"}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
          Action Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={actionData}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis dataKey="date" tick={{ fill: AXIS_COLOR, fontSize: 10 }} />
            <YAxis tick={{ fill: AXIS_COLOR, fontSize: 10 }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            {[...allActions].map((a) => (
              <Bar
                key={a}
                dataKey={a}
                name={a}
                stackId="action"
                fill={ACTION_COLORS[a] ?? "#94A3B8"}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}
