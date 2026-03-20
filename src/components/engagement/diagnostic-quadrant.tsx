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

const GRID_COLOR = "rgba(255,255,255,0.05)";
const AXIS_COLOR = "#94A3B8";

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
        <span className="text-[#94A3B8]">{p.content_type}</span>
      </div>
      <p className="text-[#94A3B8]">
        Impressions: <span className="text-[#F1F5F9]">{p.x.toLocaleString()}</span>
      </p>
      <p className="text-[#94A3B8]">
        ER: <span className="text-[#F1F5F9]">{(p.y * 100).toFixed(1)}%</span>
      </p>
      <p className="text-[#94A3B8]">
        Diagnostic:{" "}
        <span
          className="font-medium"
          style={{
            color:
              p.diagnostic === "scale"
                ? "#10B981"
                : p.diagnostic === "rethink"
                  ? "#EF4444"
                  : "#F59E0B",
          }}
        >
          {p.diagnostic.replace("_", " ").toUpperCase()}
        </span>
      </p>
    </div>
  );
}

export function DiagnosticQuadrant({ posts, thresholds }: Props) {
  const { data, groups, impThreshold, erThreshold } = useMemo(() => {
    const withMetrics = posts.filter(
      (p) => p.metrics && "impressions" in p.metrics && (p.metrics as PostMetrics).impressions > 0
    );

    const points: ScatterPoint[] = withMetrics.map((p) => {
      const m = p.metrics as PostMetrics;
      return {
        x: m.impressions,
        y: m.engagement_rate,
        hook: p.hook,
        content_type: p.content_type,
        job_id: p.job_id,
        diagnostic: p.diagnostic,
      };
    });

    // Group by content type for colored series
    const typeGroups = new Map<string, ScatterPoint[]>();
    for (const pt of points) {
      const arr = typeGroups.get(pt.content_type) ?? [];
      arr.push(pt);
      typeGroups.set(pt.content_type, arr);
    }

    // Derive threshold lines from platform thresholds or defaults
    const xThresh = thresholds?.x;
    const impLine = xThresh?.min_impressions ?? 500;
    const erLine = xThresh?.good_engagement_rate ?? 0.03;

    return {
      data: points,
      groups: typeGroups,
      impThreshold: impLine,
      erThreshold: erLine,
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

  const maxImp = Math.max(...data.map((d) => d.x)) * 1.15;
  const maxER = Math.min(Math.max(...data.map((d) => d.y)) * 1.3, 1);

  return (
    <GlassCard>
      <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
        Diagnostic Quadrant
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis
            type="number"
            dataKey="x"
            name="Impressions"
            domain={[0, maxImp]}
            tick={{ fill: AXIS_COLOR, fontSize: 10 }}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
          >
            <Label value="Impressions" position="bottom" offset={0} style={{ fill: AXIS_COLOR, fontSize: 10 }} />
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

          {/* Quadrant reference lines */}
          <ReferenceLine
            x={impThreshold}
            stroke="rgba(255,255,255,0.15)"
            strokeDasharray="6 4"
          />
          <ReferenceLine
            y={erThreshold}
            stroke="rgba(255,255,255,0.15)"
            strokeDasharray="6 4"
          />

          {/* Quadrant labels */}
          <ReferenceLine
            x={impThreshold * 0.35}
            y={maxER * 0.92}
            ifOverflow="extendDomain"
            label={{
              value: "FIX DISTRIBUTION",
              position: "insideTop",
              fill: "#F59E0B",
              fontSize: 9,
              fontWeight: 600,
            }}
            stroke="transparent"
          />
          <ReferenceLine
            x={maxImp * 0.75}
            y={maxER * 0.92}
            ifOverflow="extendDomain"
            label={{
              value: "SCALE",
              position: "insideTop",
              fill: "#10B981",
              fontSize: 9,
              fontWeight: 600,
            }}
            stroke="transparent"
          />
          <ReferenceLine
            x={impThreshold * 0.35}
            y={erThreshold * 0.25}
            ifOverflow="extendDomain"
            label={{
              value: "RETHINK",
              position: "insideBottom",
              fill: "#EF4444",
              fontSize: 9,
              fontWeight: 600,
            }}
            stroke="transparent"
          />
          <ReferenceLine
            x={maxImp * 0.75}
            y={erThreshold * 0.25}
            ifOverflow="extendDomain"
            label={{
              value: "FIX HOOKS",
              position: "insideBottom",
              fill: "#F59E0B",
              fontSize: 9,
              fontWeight: 600,
            }}
            stroke="transparent"
          />

          {/* One Scatter per content type for color coding */}
          {[...groups.entries()].map(([ct, pts]) => (
            <Scatter
              key={ct}
              name={ct}
              data={pts}
              fill={getTypeColor(ct)}
              fillOpacity={0.8}
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
