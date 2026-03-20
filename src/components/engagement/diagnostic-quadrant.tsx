"use client";

import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";
import { GlassCard } from "@/components/ui/glass-card";
import { TYPE_COLORS } from "@/lib/theme-constants";
import type { TrackedPost, PostMetrics, PlatformThresholds } from "@/lib/parsers/types";

interface Props {
  posts: TrackedPost[];
  thresholds: Record<string, PlatformThresholds>;
}

interface ScatterPoint {
  x: number;
  y: number;
  hook: string;
  content_type: string;
  job_id: string;
  diagnostic: string;
}

const AXIS_COLOR = "#64748B";

function getTypeColor(ct: string): string {
  return TYPE_COLORS[ct] ?? "#94A3B8";
}

function QuadrantTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ScatterPoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="glass-card p-3 text-xs border border-white/10 max-w-[260px]">
      <p className="text-[#F1F5F9] font-medium mb-1 break-words">
        {(p.hook || "").length > 80 ? p.hook.slice(0, 80) + "..." : p.hook || "No hook"}
      </p>
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: getTypeColor(p.content_type) }}
        />
        <span className="text-[#94A3B8]">{p.content_type.replace("_", " ")}</span>
      </div>
      <p className="text-[#94A3B8]">
        Impressions: <span className="text-[#F1F5F9]">{p.x.toLocaleString()}</span>
      </p>
      <p className="text-[#94A3B8]">
        ER: <span className="text-[#F1F5F9]">{(p.y * 100).toFixed(1)}%</span>
      </p>
    </div>
  );
}

export function DiagnosticQuadrant({ posts, thresholds }: Props) {
  const { data, groups, impLine, erLine, maxImp, maxER, useLog } = useMemo(() => {
    // Include posts with either impressions or views > 0
    const withMetrics = posts.filter((p) => {
      if (!p.metrics) return false;
      const m = p.metrics as PostMetrics;
      return (m.impressions || 0) > 0 || (m.views || 0) > 0;
    });

    const points: ScatterPoint[] = withMetrics.map((p) => {
      const m = p.metrics as PostMetrics;
      const imp = (m.impressions || 0) > 0 ? m.impressions : (m.views || 0);
      return {
        x: imp,
        y: m.engagement_rate || 0,
        hook: p.hook || "",
        content_type: p.content_type || "unknown",
        job_id: p.job_id || "",
        diagnostic: p.diagnostic || "unclassified",
      };
    });

    // Group by content type
    const typeGroups = new Map<string, ScatterPoint[]>();
    for (const pt of points) {
      if (pt.content_type === "unknown" || pt.content_type === "series") continue;
      const arr = typeGroups.get(pt.content_type) ?? [];
      arr.push(pt);
      typeGroups.set(pt.content_type, arr);
    }

    // Threshold lines — use percentile-based dividers that adapt to the data
    const sortedImp = points.map((p) => p.x).sort((a, b) => a - b);
    const sortedER = points.map((p) => p.y).sort((a, b) => a - b);
    // Use p50 (median) as the divider — splits data into equal halves
    const medianImp = sortedImp.length > 0 ? sortedImp[Math.floor(sortedImp.length / 2)] : 20;
    const medianER = sortedER.length > 0 ? sortedER[Math.floor(sortedER.length / 2)] : 0.05;

    const minImp = Math.max(Math.min(...points.map((d) => d.x)), 1);
    const maxImpRaw = Math.max(...points.map((d) => d.x), 10);
    const erMax = Math.min(Math.max(...points.map((d) => d.y), 0.05) * 1.3, 1);

    // Determine if we need log scale (range > 10x between min and max)
    const useLog = maxImpRaw / minImp > 10;

    return {
      data: points,
      groups: typeGroups,
      impLine: medianImp,
      erLine: medianER,
      maxImp: maxImpRaw,
      maxER: erMax,
      useLog,
    };
  }, [posts, thresholds]);

  if (data.length === 0) {
    return (
      <GlassCard>
        <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
          Diagnostic Quadrant
        </h3>
        <p className="text-sm text-[#94A3B8] text-center py-8">
          No posts with impression data yet.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
        Diagnostic Quadrant
      </h3>
      {/* Chart with quadrant labels as a 2x2 grid behind the scatter */}
      <div className="relative">
        {/* Quadrant labels — 2x2 grid, absolute over chart area (inset matches chart margins) */}
        <div className="absolute pointer-events-none z-10 grid grid-cols-2 grid-rows-2" style={{ top: 30, left: 55, right: 30, bottom: 45 }}>
          <div className="flex items-center justify-center border-r border-b border-white/[0.08]">
            <span className="text-[11px] font-bold tracking-wide" style={{ color: "#F59E0B", opacity: 0.35 }}>FIX DIST</span>
          </div>
          <div className="flex items-center justify-center border-b border-white/[0.08]">
            <span className="text-[11px] font-bold tracking-wide" style={{ color: "#10B981", opacity: 0.35 }}>SCALE</span>
          </div>
          <div className="flex items-center justify-center border-r border-white/[0.08]">
            <span className="text-[11px] font-bold tracking-wide" style={{ color: "#EF4444", opacity: 0.35 }}>RETHINK</span>
          </div>
          <div className="flex items-center justify-center">
            <span className="text-[11px] font-bold tracking-wide" style={{ color: "#F59E0B", opacity: 0.35 }}>FIX HOOKS</span>
          </div>
        </div>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 30, right: 30, bottom: 25, left: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            type="number"
            dataKey="x"
            name="Impressions"
            scale={useLog ? "log" : "auto"}
            domain={useLog ? [1, "auto"] : [0, "auto"]}
            tick={{ fill: AXIS_COLOR, fontSize: 10 }}
            tickFormatter={(v: number) => {
              const r = Math.round(v);
              if (r >= 1000) return `${(r / 1000).toFixed(r >= 10000 ? 0 : 1)}K`;
              return String(r);
            }}
            allowDataOverflow={false}
          >
            <Label value={useLog ? "Impressions / Views (log)" : "Impressions / Views"} position="bottom" offset={5} style={{ fill: AXIS_COLOR, fontSize: 10 }} />
          </XAxis>
          <YAxis
            type="number"
            dataKey="y"
            name="ER"
            domain={[0, maxER]}
            tick={{ fill: AXIS_COLOR, fontSize: 10 }}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          >
            <Label value="Engagement Rate" angle={-90} position="left" offset={5} style={{ fill: AXIS_COLOR, fontSize: 10 }} />
          </YAxis>
          <Tooltip content={<QuadrantTooltip />} />

          {/* No Recharts reference lines/areas — CSS grid handles quadrant visuals */}

          {/* Scatter per content type */}
          {[...groups.entries()].map(([ct, pts]) => (
            <Scatter
              key={ct}
              name={ct}
              data={pts}
              fill={getTypeColor(ct)}
              fillOpacity={0.85}
              strokeWidth={0}
              r={6}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {[...groups.keys()].map((ct) => (
          <div key={ct} className="flex items-center gap-1.5 text-[10px] text-[#94A3B8]">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: getTypeColor(ct) }}
            />
            {ct.replace("_", " ")}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
