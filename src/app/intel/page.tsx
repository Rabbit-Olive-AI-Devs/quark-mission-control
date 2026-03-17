"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { TrendCard } from "@/components/intel/trend-card";
import {
  Radio,
  TrendingUp,
  Eye,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Flame,
  Zap,
  Radar,
} from "lucide-react";
import { getSourceLabel } from "@/components/intel/source-badge";
import {
  RadarChart,
  Radar as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { useApi } from "@/hooks/use-api";
import type { IntelReport, IntelTrend } from "@/lib/parsers/types";

function TrendRadar({ data }: { data: IntelReport }) {
  const allTrends = [...data.highSignal, ...data.rising, ...data.nicheSignals];
  const categories: Record<string, number> = {};

  for (const t of allTrends) {
    const title = t.title.toLowerCase();
    let cat = "Other";
    if (/\bopenclaw\b/.test(title)) cat = "OpenClaw";
    else if (
      /\bai\b|artificial intelligence|\bagent[s]?\b|\bmodel[s]?\b|\bllm\b|\bgpt\b|\bclaude\b|\bsora\b|\bxai\b|\bopenai\b/.test(
        title,
      )
    )
      cat = "AI/Agents";
    else if (/\bsecurity\b|\btrust\b|\bgovernance\b/.test(title))
      cat = "Security";
    else if (
      /\bgithub\b|\bdev\b|\bcli\b|\binfra\b|\bframework\b/.test(title)
    )
      cat = "Dev Tools";
    else if (
      /\bcontent\b|\bproduct hunt\b|\btiktok\b|\bcreator\b|\bvideo\b/.test(
        title,
      )
    )
      cat = "Content";
    else if (/\blocal\b|\bqwen\b|\bon-device\b/.test(title))
      cat = "Local Models";
    else if (/\bhn\b|\bhacker news\b|\breddit\b/.test(title))
      cat = "Community";

    categories[cat] = Math.max(categories[cat] || 0, t.virality);
  }

  const radarData = Object.entries(categories).map(([name, value]) => ({
    category: name,
    virality: value,
    fullMark: 10,
  }));

  if (radarData.length < 3) return null;

  return (
    <GlassCard delay={0.1}>
      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
        <Radar size={14} className="text-[#00D4AA]" />
        Signal Radar
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="rgba(255,255,255,0.06)" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: "#94A3B8", fontSize: 10 }}
          />
          <RechartsRadar
            name="Virality"
            dataKey="virality"
            stroke="#00D4AA"
            fill="#00D4AA"
            fillOpacity={0.12}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </GlassCard>
  );
}

function SignalSummary({ data }: { data: IntelReport }) {
  const allTrends = [...data.highSignal, ...data.rising, ...data.nicheSignals];
  const avgVirality =
    allTrends.length > 0
      ? (allTrends.reduce((s, t) => s + t.virality, 0) / allTrends.length).toFixed(1)
      : "0";
  const topSource = (() => {
    const counts: Record<string, number> = {};
    const labelMap: Record<string, string> = {};
    for (const t of allTrends) {
      const label = getSourceLabel(t.source);
      // Group by primary label (first label if multi-source)
      const primary = label.split(" + ")[0];
      const key = primary.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
      labelMap[key] = primary;
    }
    let best = "";
    let max = 0;
    for (const [k, v] of Object.entries(counts)) {
      if (v > max) {
        max = v;
        best = k;
      }
    }
    return best ? labelMap[best] : "—";
  })();

  const stats = [
    {
      label: "Total Signals",
      value: allTrends.length,
      color: "#00D4AA",
    },
    {
      label: "High-Signal",
      value: data.highSignal.length,
      color: "#EF4444",
    },
    {
      label: "Avg Virality",
      value: avgVirality,
      color: "#F59E0B",
    },
    {
      label: "Top Source",
      value: topSource,
      color: "#7C3AED",
    },
  ];

  return (
    <GlassCard delay={0.05}>
      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
        <Zap size={14} className="text-[#00D4AA]" />
        Signal Summary
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div
              className="text-xl font-bold tabular-nums"
              style={{ color: s.color }}
            >
              {s.value}
            </div>
            <div className="text-[10px] text-[#64748B] uppercase tracking-wider mt-0.5">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function TrendSection({
  title,
  icon,
  color,
  trends,
  baseIndex,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  trends: IntelTrend[];
  baseIndex: number;
}) {
  if (trends.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-1 h-5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <h2
          className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2"
          style={{ color }}
        >
          {icon}
          {title}
          <span className="text-[#64748B] font-normal normal-case tracking-normal text-xs">
            ({trends.length})
          </span>
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {trends.map((trend, i) => (
          <TrendCard
            key={trend.title || i}
            trend={trend}
            index={baseIndex + i}
          />
        ))}
      </div>
    </div>
  );
}

export default function IntelPage() {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Chicago",
  });
  const [archiveDate, setArchiveDate] = useState(today);
  const { data, loading } = useApi<IntelReport>(
    `/api/intel?date=${archiveDate}`,
    ["intel"],
  );

  const navigateDate = (delta: number) => {
    const d = new Date(archiveDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setArchiveDate(d.toLocaleDateString("en-CA"));
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-3">
              <Radio size={24} className="text-[#00D4AA]" />
              Intel Feed
            </h1>
            <p className="text-sm text-[#64748B] mt-1">
              {data?.date || "Loading..."} — {data?.compiled || ""}
            </p>
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-[#64748B]" />
            <button
              onClick={() => navigateDate(-1)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={14} className="text-[#94A3B8]" />
            </button>
            <input
              type="date"
              value={archiveDate}
              onChange={(e) => setArchiveDate(e.target.value)}
              className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-[#F1F5F9] [color-scheme:dark]"
            />
            <button
              onClick={() => navigateDate(1)}
              disabled={archiveDate >= today}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-30"
            >
              <ChevronRight size={14} className="text-[#94A3B8]" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <GlassCard key={i}>
                <div className="animate-pulse space-y-3">
                  <div className="h-3 bg-white/5 rounded w-16" />
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-full" />
                  <div className="h-1.5 bg-white/5 rounded-full w-full" />
                </div>
              </GlassCard>
            ))}
          </div>
        ) : data ? (
          <>
            {/* Summary + Radar row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <SignalSummary data={data} />
              <TrendRadar data={data} />
            </div>

            {/* Content Suggestions */}
            {data.suggestions.length > 0 && (
              <GlassCard
                delay={0.12}
                className="mb-8 !border-[#00D4AA]/20 !bg-[#00D4AA]/[0.03]"
              >
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb size={14} className="text-[#00D4AA]" />
                  <span className="text-[#00D4AA]">Content Suggestions</span>
                </h3>
                <div className="space-y-2">
                  {data.suggestions.map((s, i) => (
                    <div key={`suggestion-${i}`} className="flex gap-2 text-xs">
                      <span className="text-[#00D4AA] font-semibold shrink-0">
                        {i + 1}.
                      </span>
                      <span className="text-[#F1F5F9]">{s}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Trend Sections */}
            <TrendSection
              title="High-Signal"
              icon={<Flame size={14} />}
              color="#EF4444"
              trends={data.highSignal}
              baseIndex={0}
            />

            <TrendSection
              title="Rising"
              icon={<TrendingUp size={14} />}
              color="#F59E0B"
              trends={data.rising}
              baseIndex={data.highSignal.length}
            />

            <TrendSection
              title="Niche Signals"
              icon={<Eye size={14} />}
              color="#10B981"
              trends={data.nicheSignals}
              baseIndex={data.highSignal.length + data.rising.length}
            />
          </>
        ) : (
          <GlassCard>
            <p className="text-center text-[#94A3B8] py-12">
              No intel data available
            </p>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
