"use client";

import { GlassCard } from "@/components/ui/glass-card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { CognitiveDay } from "@/lib/parsers/types";

interface TrendChartsProps {
  history: CognitiveDay[];
}

const CHART_COLORS = {
  journalWords: "#00D4AA",
  proactivityRatio: "#7C3AED",
  x: "#1DA1F2",
  tiktok: "#FF0050",
  youtube: "#FF0000",
  instagram: "#C13584",
  substack: "#FF6719",
  grid: "#1E293B",
  threshold: "#F59E0B",
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0A0A0F]/95 border border-white/10 rounded-lg px-3 py-2 text-xs">
      <div className="text-[#94A3B8] mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[#F1F5F9]">{p.name}: {typeof p.value === "number" ? p.value.toFixed(p.name.includes("Ratio") ? 2 : 0) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendCharts({ history }: TrendChartsProps) {
  const last7 = history.slice(0, 7).reverse();

  const lineData = last7.map((d) => ({
    date: d.date.slice(5),
    "Journal Words": d.memoryHealth.journalWordCount,
    "Proactivity Ratio": d.proactivity.ratio,
  }));

  const barData = last7.map((d) => ({
    date: d.date.slice(5),
    X: d.engagement.xReplies,
    TikTok: d.engagement.tiktokReplies,
    YouTube: d.engagement.youtubeReplies,
    Instagram: d.engagement.instagramReplies,
    Substack: d.engagement.substackReplies,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <GlassCard delay={0.2}>
        <h3 className="text-sm font-medium mb-4">Journal & Proactivity — 7 Day</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} />
            <YAxis yAxisId="words" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} width={35} />
            <YAxis yAxisId="ratio" orientation="right" domain={[0, 1]} tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} width={35} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine yAxisId="words" y={200} stroke={CHART_COLORS.journalWords} strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.4} />
            <ReferenceLine yAxisId="ratio" y={0.2} stroke={CHART_COLORS.proactivityRatio} strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.4} />
            <Line
              yAxisId="words"
              type="monotone"
              dataKey="Journal Words"
              stroke={CHART_COLORS.journalWords}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.journalWords, r: 3 }}
              animationDuration={800}
            />
            <Line
              yAxisId="ratio"
              type="monotone"
              dataKey="Proactivity Ratio"
              stroke={CHART_COLORS.proactivityRatio}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.proactivityRatio, r: 3 }}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-4 mt-2 text-[9px] text-[#94A3B8]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-0.5 rounded" style={{ backgroundColor: CHART_COLORS.journalWords }} />
            Words
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-0.5 rounded" style={{ backgroundColor: CHART_COLORS.proactivityRatio }} />
            Ratio
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0 border-t border-dashed" style={{ borderColor: CHART_COLORS.journalWords, opacity: 0.4 }} />
            Min 200w
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0 border-t border-dashed" style={{ borderColor: CHART_COLORS.proactivityRatio, opacity: 0.4 }} />
            Min 0.2 ratio
          </div>
        </div>
      </GlassCard>

      <GlassCard delay={0.25}>
        <h3 className="text-sm font-medium mb-4">Engagement by Platform — 7 Day</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} />
            <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} width={25} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="X" stackId="a" fill={CHART_COLORS.x} animationDuration={800} />
            <Bar dataKey="TikTok" stackId="a" fill={CHART_COLORS.tiktok} animationDuration={800} />
            <Bar dataKey="YouTube" stackId="a" fill={CHART_COLORS.youtube} animationDuration={800} />
            <Bar dataKey="Instagram" stackId="a" fill={CHART_COLORS.instagram} animationDuration={800} />
            <Bar dataKey="Substack" stackId="a" fill={CHART_COLORS.substack} radius={[2, 2, 0, 0]} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-3 mt-2 text-[9px] text-[#94A3B8]">
          {[
            { label: "X", color: CHART_COLORS.x },
            { label: "TikTok", color: CHART_COLORS.tiktok },
            { label: "YT", color: CHART_COLORS.youtube },
            { label: "IG", color: CHART_COLORS.instagram },
            { label: "Sub", color: CHART_COLORS.substack },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
