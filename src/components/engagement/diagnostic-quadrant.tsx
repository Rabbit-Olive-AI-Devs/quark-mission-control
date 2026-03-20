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
  ReferenceLine,
  Label,
  ReferenceArea,
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
        {p.hook.length > 80 ? p.hook.slice(0, 80) + "..." : p.hook}
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
  const { data, groups, impLine, erLine, maxImp, maxER } = useMemo(() => {
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

    // Threshold lines — use median of data as divider (not platform thresholds which may be way off)
    const sortedImp = points.map((p) => p.x).sort((a, b) => a - b);
    const sortedER = points.map((p) => p.y).sort((a, b) => a - b);
    const medianImp = sortedImp.length > 0 ? sortedImp[Math.floor(sortedImp.length / 2)] : 20;
    const medianER = sortedER.length > 0 ? sortedER[Math.floor(sortedER.length / 2)] : 0.05;

    const rawMax = Math.max(...points.map((d) => d.x), 10) * 1.2;
    const niceMax = Math.ceil(rawMax / 10) * 10;
    const erMax = Math.min(Math.max(...points.map((d) => d.y), 0.05) * 1.3, 1);

    return {
      data: points,
      groups: typeGroups,
      impLine: medianImp,
      erLine: medianER,
      maxImp: niceMax,
      maxER: erMax,
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
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 30, right: 30, bottom: 25, left: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            type="number"
            dataKey="x"
            name="Impressions"
            domain={[0, maxImp]}
            tick={{ fill: AXIS_COLOR, fontSize: 10 }}
            tickFormatter={(v: number) => String(Math.round(v))}
          >
            <Label value="Impressions" position="bottom" offset={5} style={{ fill: AXIS_COLOR, fontSize: 10 }} />
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

          {/* Quadrant divider lines */}
          <ReferenceLine x={impLine} stroke="rgba(255,255,255,0.12)" strokeDasharray="6 4" />
          <ReferenceLine y={erLine} stroke="rgba(255,255,255,0.12)" strokeDasharray="6 4" />

          {/* Quadrant background labels using ReferenceArea */}
          <ReferenceArea
            x1={0} x2={impLine} y1={erLine} y2={maxER}
            fill="transparent" ifOverflow="visible"
            label={{ value: "FIX DIST", fill: "#F59E0B", fontSize: 9, fontWeight: 600, opacity: 0.4, position: "center" }}
          />
          <ReferenceArea
            x1={impLine} x2={maxImp} y1={erLine} y2={maxER}
            fill="transparent" ifOverflow="visible"
            label={{ value: "SCALE", fill: "#10B981", fontSize: 9, fontWeight: 600, opacity: 0.4, position: "center" }}
          />
          <ReferenceArea
            x1={0} x2={impLine} y1={0} y2={erLine}
            fill="transparent" ifOverflow="visible"
            label={{ value: "RETHINK", fill: "#EF4444", fontSize: 9, fontWeight: 600, opacity: 0.4, position: "center" }}
          />
          <ReferenceArea
            x1={impLine} x2={maxImp} y1={0} y2={erLine}
            fill="transparent" ifOverflow="visible"
            label={{ value: "FIX HOOKS", fill: "#F59E0B", fontSize: 9, fontWeight: 600, opacity: 0.4, position: "center" }}
          />

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
