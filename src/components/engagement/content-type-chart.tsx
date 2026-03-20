"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { GlassCard } from "@/components/ui/glass-card";
import { TYPE_COLORS } from "@/lib/theme-constants";
import type { HookStats } from "@/lib/parsers/types";

interface Props {
  hooks: HookStats;
}

const GRID_COLOR = "rgba(255,255,255,0.05)";
const AXIS_COLOR = "#94A3B8";

interface ChartRow {
  content_type: string;
  avg_impressions: number;
  avg_er: number;
  posts: number;
}

const RULE_COLORS: Record<string, string> = {
  double_down: "#10B981",
  testing: "#F59E0B",
  dropped: "#EF4444",
};

function ContentTypeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="glass-card p-3 text-xs border border-white/10">
      <p className="text-[#F1F5F9] font-medium mb-1">{label?.replace("_", " ")}</p>
      {payload
        .filter((p) => p.value > 0)
        .map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-[#94A3B8]">{p.name}:</span>
            <span className="text-[#F1F5F9]">
              {p.name === "Avg ER" ? `${(p.value * 100).toFixed(1)}%` : p.value.toLocaleString()}
            </span>
          </div>
        ))}
    </div>
  );
}

export function ContentTypeChart({ hooks }: Props) {
  const { chartData, rules } = useMemo(() => {
    const rows: ChartRow[] = [];
    const byCt = hooks.by_content_type;

    for (const [ct, stats] of Object.entries(byCt)) {
      rows.push({
        content_type: ct,
        avg_impressions: Math.round(stats.avg_impressions),
        avg_er: stats.avg_er,
        posts: stats.posts,
      });
    }

    rows.sort((a, b) => b.avg_impressions - a.avg_impressions);

    return { chartData: rows, rules: hooks.rules };
  }, [hooks]);

  if (chartData.length === 0) {
    return (
      <GlassCard>
        <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
          Content Type Performance
        </h3>
        <p className="text-sm text-[#94A3B8] text-center py-8">
          No content type data yet.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
        Content Type Performance
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis
            dataKey="content_type"
            tick={{ fill: AXIS_COLOR, fontSize: 10 }}
            tickFormatter={(v: string) => v.replace("_", " ")}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: AXIS_COLOR, fontSize: 10 }}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: AXIS_COLOR, fontSize: 10 }}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          />
          <Tooltip content={<ContentTypeTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 10, color: AXIS_COLOR }}
          />
          <Bar
            yAxisId="left"
            dataKey="avg_impressions"
            name="Avg Impressions"
            fill="#3B82F6"
            radius={[4, 4, 0, 0]}
            barSize={28}
          />
          <Bar
            yAxisId="right"
            dataKey="avg_er"
            name="Avg ER"
            fill="#00D4AA"
            radius={[4, 4, 0, 0]}
            barSize={28}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Rules badges */}
      {Object.keys(rules).length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(rules).map(([ct, rule]) => (
            <span
              key={ct}
              className="px-2 py-1 rounded-full text-[10px] font-medium border"
              style={{
                backgroundColor: `${RULE_COLORS[rule] ?? "#94A3B8"}10`,
                color: RULE_COLORS[rule] ?? "#94A3B8",
                borderColor: `${RULE_COLORS[rule] ?? "#94A3B8"}30`,
              }}
            >
              {ct.replace("_", " ")}: {rule.replace("_", " ")}
            </span>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
