"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { GlassCard } from "@/components/ui/glass-card";
import { PLATFORM_COLORS, PLATFORM_LABELS } from "@/lib/engagement-constants";
import { cn } from "@/lib/utils";
import type { EngagementDayData, FollowerSnapshot } from "@/lib/parsers/types";

/* ------------------------------------------------------------------ */
/*  Types & constants                                                 */
/* ------------------------------------------------------------------ */

interface Props {
  history: EngagementDayData[];
  followerSnapshots: FollowerSnapshot[];
}

type Platform = "x" | "tiktok" | "instagram" | "youtube" | "substack" | "all";

type Metric =
  | "total"
  | "reply"
  | "like"
  | "follow"
  | "reply_rate"
  | "follower_count"
  | "guardrail_failures";

type TimeRange = "7d" | "30d" | "90d" | "all";

const PLATFORMS: { key: Platform; label: string }[] = [
  { key: "x", label: "X" },
  { key: "tiktok", label: "TikTok" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
  { key: "substack", label: "Substack" },
  { key: "all", label: "All" },
];

const METRICS: { key: Metric; label: string }[] = [
  { key: "total", label: "Total Actions" },
  { key: "reply", label: "Replies" },
  { key: "like", label: "Likes" },
  { key: "follow", label: "Follows" },
  { key: "reply_rate", label: "Reply Rate" },
  { key: "follower_count", label: "Follower Count" },
  { key: "guardrail_failures", label: "Guardrail Failures" },
];

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "all", label: "All" },
];

const FOLLOWER_KEYS: Record<string, keyof FollowerSnapshot> = {
  x: "x_followers",
  tiktok: "tiktok_followers",
  instagram: "instagram_followers",
  youtube: "youtube_followers",
  substack: "substack_subscribers",
};

const ALL_PLATFORM_KEYS: Platform[] = PLATFORMS.filter((p) => p.key !== "all").map((p) => p.key);

const GRID_COLOR = "rgba(255,255,255,0.05)";
const AXIS_COLOR = "#64748B";
const ACCENT_GLOW = "#00D4AA";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatDate(date: string): string {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

function filterByRange<T extends { date: string }>(
  data: T[],
  range: TimeRange,
): T[] {
  if (range === "all") return data;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoff = daysAgo(days);
  return data.filter((d) => d.date >= cutoff);
}

function lineColor(platform: Platform): string {
  if (platform === "all") return ACCENT_GLOW;
  return PLATFORM_COLORS[platform] ?? "#94A3B8";
}

function formatValue(v: number, metric: Metric): string {
  if (metric === "reply_rate") return `${(v * 100).toFixed(1)}%`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(Math.round(v));
}

/* ------------------------------------------------------------------ */
/*  Tooltip                                                           */
/* ------------------------------------------------------------------ */

function ChartTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean;
  payload?: Array<{ value: number; color: string; name: string }>;
  label?: string;
  metric: Metric;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="glass-card p-3 text-xs border border-white/10 backdrop-blur-md">
      <p className="text-[#F1F5F9] font-medium mb-1.5 tracking-wide">
        {label}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-[#94A3B8]">{p.name}:</span>
          <span className="text-[#F1F5F9] font-mono">
            {formatValue(p.value, metric)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data builders                                                     */
/* ------------------------------------------------------------------ */

function buildHistorySeries(
  history: EngagementDayData[],
  platform: Platform,
  metric: Metric,
): Array<{ date: string; value: number }> {
  return history.map((day) => {
    let value = 0;

    if (metric === "reply_rate") {
      value = day.reply_rate;
    } else if (metric === "guardrail_failures") {
      value = day.guardrails.total_failures;
    } else if (metric === "total") {
      value =
        platform === "all"
          ? day.total
          : (day.platforms[platform] ?? 0);
    } else {
      // specific action: reply, like, follow
      if (platform === "all") {
        value = day.actions[metric] ?? 0;
      } else {
        // per-platform action breakdown
        value = day.platform_actions?.[platform]?.[metric] ?? 0;
      }
    }

    return { date: formatDate(day.date), value };
  });
}

function buildFollowerSeries(
  snapshots: FollowerSnapshot[],
  platform: Platform,
): Array<{ date: string; value: number }> {
  return snapshots.map((snap) => {
    let value = 0;
    if (platform === "all") {
      value =
        (snap.x_followers ?? 0) +
        (snap.tiktok_followers ?? 0) +
        (snap.instagram_followers ?? 0) +
        (snap.youtube_followers ?? 0) +
        (snap.substack_subscribers ?? 0);
    } else {
      const key = FOLLOWER_KEYS[platform];
      value = key ? ((snap[key] as number | undefined) ?? 0) : 0;
    }
    return { date: formatDate(snap.date), value };
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function HistoricalChart({ history, followerSnapshots }: Props) {
  const allPlatformKeys = ALL_PLATFORM_KEYS;
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<Platform>>(
    () => new Set(allPlatformKeys),
  );
  const [metric, setMetric] = useState<Metric>("total");
  const [range, setRange] = useState<TimeRange>("30d");

  const allSelected = allPlatformKeys.every((k) => selectedPlatforms.has(k));

  function togglePlatform(key: Platform) {
    if (key === "all") {
      // Toggle between all-selected and none-selected
      if (allSelected) {
        setSelectedPlatforms(new Set());
      } else {
        setSelectedPlatforms(new Set(allPlatformKeys));
      }
      return;
    }
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Build per-platform data series, reversed so oldest is on the left
  const platformSeries = useMemo(() => {
    const series: Record<string, Array<{ date: string; value: number }>> = {};
    const activePlatforms = Array.from(selectedPlatforms);

    for (const plat of activePlatforms) {
      if (metric === "follower_count") {
        const filtered = filterByRange(followerSnapshots, range);
        series[plat] = buildFollowerSeries(filtered, plat).slice().reverse();
      } else {
        const filtered = filterByRange(history, range);
        series[plat] = buildHistorySeries(filtered, plat, metric).slice().reverse();
      }
    }
    return series;
  }, [history, followerSnapshots, selectedPlatforms, metric, range]);

  // Merge all platform series into a single array with one key per platform
  const data = useMemo(() => {
    const activePlatforms = Array.from(selectedPlatforms);
    if (activePlatforms.length === 0) return [];

    // Use the first series for dates (all have the same dates)
    const baseSeries = platformSeries[activePlatforms[0]];
    if (!baseSeries) return [];

    return baseSeries.map((point, i) => {
      const row: Record<string, string | number> = { date: point.date };
      for (const plat of activePlatforms) {
        row[plat] = platformSeries[plat]?.[i]?.value ?? 0;
      }
      return row;
    });
  }, [platformSeries, selectedPlatforms]);

  const metricLabel =
    METRICS.find((m) => m.key === metric)?.label ?? "Value";

  const isEmpty = data.length === 0 || data.every((d) => {
    const activePlatforms = Array.from(selectedPlatforms);
    return activePlatforms.every((plat) => (d[plat] as number) === 0);
  });

  return (
    <GlassCard className="mb-6">
      {/* Header row: title + metric dropdown */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider">
          Historical Performance
        </h3>

        {/* Metric dropdown */}
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as Metric)}
          className={cn(
            "text-xs font-mono bg-white/[0.04] border border-white/[0.08]",
            "rounded px-2.5 py-1.5 text-[#F1F5F9] outline-none",
            "hover:border-white/[0.15] focus:border-[#00D4AA]/40",
            "transition-colors cursor-pointer appearance-none",
            "pr-6",
          )}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 8px center",
          }}
        >
          {METRICS.map((m) => (
            <option key={m.key} value={m.key} className="bg-[#0A0A0F]">
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Platform tab bar — multi-select toggle */}
      <div className="flex items-center gap-1 mb-4">
        {PLATFORMS.map((p) => {
          const active =
            p.key === "all" ? allSelected : selectedPlatforms.has(p.key);
          const tabColor =
            p.key === "all" ? ACCENT_GLOW : (PLATFORM_COLORS[p.key] ?? "#94A3B8");
          return (
            <button
              key={p.key}
              onClick={() => togglePlatform(p.key)}
              className={cn(
                "px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-sm",
                "transition-all duration-200 border",
                active
                  ? "text-[#F1F5F9] border-white/[0.12]"
                  : "text-[#64748B] border-transparent hover:text-[#94A3B8] hover:border-white/[0.06]",
              )}
              style={
                active
                  ? {
                      backgroundColor: `${tabColor}12`,
                      boxShadow: `0 0 12px ${tabColor}15, inset 0 1px 0 ${tabColor}20`,
                    }
                  : undefined
              }
            >
              {p.label}
            </button>
          );
        })}

        {/* Time range — pushed right */}
        <div className="ml-auto flex items-center gap-0.5 bg-white/[0.03] rounded border border-white/[0.06] p-0.5">
          {TIME_RANGES.map((tr) => {
            const active = range === tr.key;
            return (
              <button
                key={tr.key}
                onClick={() => setRange(tr.key)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-mono tracking-wide rounded-sm transition-all duration-150",
                  active
                    ? "bg-white/[0.08] text-[#F1F5F9]"
                    : "text-[#64748B] hover:text-[#94A3B8]",
                )}
              >
                {tr.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      {isEmpty ? (
        <div className="flex items-center justify-center h-[260px]">
          <p className="text-sm text-[#64748B]">
            No data for {metricLabel} in this range.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart
            data={data}
            margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
          >
            <defs>
              {Array.from(selectedPlatforms).map((plat) => {
                const c = lineColor(plat);
                return (
                  <linearGradient
                    key={`gradient-${plat}`}
                    id={`historical-fill-${plat}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={c} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={c} stopOpacity={0.0} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={GRID_COLOR}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: AXIS_COLOR, fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: GRID_COLOR }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: AXIS_COLOR, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={metric === "reply_rate"}
              tickFormatter={(v: number) => formatValue(v, metric)}
              width={48}
            />
            <Tooltip
              content={<ChartTooltip metric={metric} />}
              cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
            />
            {Array.from(selectedPlatforms).map((plat) => {
              const c = lineColor(plat);
              const label = PLATFORM_LABELS[plat] ?? plat;
              return (
                <Area
                  key={plat}
                  type="monotone"
                  dataKey={plat}
                  name={`${label} — ${metricLabel}`}
                  stroke={c}
                  strokeWidth={2}
                  fill={`url(#historical-fill-${plat})`}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: c,
                    stroke: "#0A0A0F",
                    strokeWidth: 2,
                  }}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      )}
    </GlassCard>
  );
}
