"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { Radio, TrendingUp, Flame, Eye, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useApi } from "@/hooks/use-api";
import type { IntelReport, IntelTrend } from "@/lib/parsers/types";

function TrendCard({ trend, index }: { trend: IntelTrend; index: number }) {
  const viralityColor =
    trend.virality >= 8 ? "#EF4444" : trend.virality >= 6 ? "#F59E0B" : "#10B981";

  return (
    <GlassCard delay={index * 0.05} hover>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-[#F1F5F9] flex-1 pr-3">{trend.title}</h3>
        <div className="flex items-center gap-1 shrink-0">
          <Flame size={12} style={{ color: viralityColor }} />
          <span className="text-xs font-semibold" style={{ color: viralityColor }}>
            {trend.virality}/10
          </span>
        </div>
      </div>

      <p className="text-xs text-[#94A3B8] mb-3 line-clamp-2">{trend.angle}</p>

      <div className="flex items-center gap-3 text-[10px] text-[#94A3B8]">
        <span className="flex items-center gap-1">
          <Eye size={10} />
          {trend.confidence}
        </span>
        <span>Expires: {trend.expiry}</span>
      </div>

      <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${trend.virality * 10}%`, background: viralityColor }}
        />
      </div>
    </GlassCard>
  );
}

function TrendRadar({ data }: { data: IntelReport }) {
  // Build radar from trend categories
  const allTrends = [...data.highSignal, ...data.rising, ...data.nicheSignals];
  const categories: Record<string, number> = {};

  for (const t of allTrends) {
    // Extract category from title keywords
    const title = t.title.toLowerCase();
    let cat = "Other";
    if (title.includes("ai") || title.includes("agent") || title.includes("model")) cat = "AI/Agents";
    else if (title.includes("security") || title.includes("trust")) cat = "Security";
    else if (title.includes("github") || title.includes("dev") || title.includes("cli")) cat = "Dev Tools";
    else if (title.includes("content") || title.includes("product hunt")) cat = "Content";
    else if (title.includes("local") || title.includes("qwen")) cat = "Local Models";
    else if (title.includes("openclaw")) cat = "OpenClaw";

    categories[cat] = Math.max(categories[cat] || 0, t.virality);
  }

  const radarData = Object.entries(categories).map(([name, value]) => ({
    category: name,
    virality: value,
    fullMark: 10,
  }));

  if (radarData.length < 3) return null;

  return (
    <GlassCard delay={0.15}>
      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
        <Radio size={14} className="text-[#00D4AA]" />
        Trend Radar
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis dataKey="category" tick={{ fill: "#94A3B8", fontSize: 10 }} />
          <Radar
            name="Virality"
            dataKey="virality"
            stroke="#00D4AA"
            fill="#00D4AA"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </GlassCard>
  );
}

function ViralityDistribution({ data }: { data: IntelReport }) {
  const allTrends = [...data.highSignal, ...data.rising, ...data.nicheSignals];
  const distribution = [
    { name: "High (8-10)", value: allTrends.filter((t) => t.virality >= 8).length, color: "#EF4444" },
    { name: "Medium (5-7)", value: allTrends.filter((t) => t.virality >= 5 && t.virality < 8).length, color: "#F59E0B" },
    { name: "Low (1-4)", value: allTrends.filter((t) => t.virality < 5).length, color: "#10B981" },
  ].filter((d) => d.value > 0);

  return (
    <GlassCard delay={0.2}>
      <h3 className="text-sm font-medium mb-2">Virality Distribution</h3>
      <div className="flex flex-col items-center gap-3">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={distribution} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
              {distribution.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11, color: "#F1F5F9" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex gap-4 justify-center">
          {distribution.map((d) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
              <span className="text-[#F1F5F9]">{d.name}</span>
              <span className="text-[#94A3B8] ml-1">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

export default function IntelPage() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  const [archiveDate, setArchiveDate] = useState(today);
  const { data, loading } = useApi<IntelReport>("/api/intel", ["intel"]);

  const navigateDate = (delta: number) => {
    const d = new Date(archiveDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setArchiveDate(d.toLocaleDateString("en-CA"));
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-3">
              <Radio size={24} className="text-[#00D4AA]" />
              Intel Feed
            </h1>
            <p className="text-sm text-[#94A3B8] mt-1">
              {data?.date || "Loading..."} — {data?.compiled || ""}
            </p>
          </div>

          {/* Archive date nav */}
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-[#94A3B8]" />
            <button onClick={() => navigateDate(-1)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
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
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <GlassCard key={i}><div className="animate-pulse h-20 bg-white/5 rounded" /></GlassCard>
            ))}
          </div>
        ) : data ? (
          <>
            {/* Charts row */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <TrendRadar data={data} />
              <ViralityDistribution data={data} />
            </div>

            {/* Content Suggestions — prominent position */}
            {data.suggestions.length > 0 && (
              <GlassCard delay={0.1} className="mb-6 !border-[#00D4AA]/20 !bg-[#00D4AA]/[0.03]">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <TrendingUp size={14} className="text-[#00D4AA]" />
                  Content Suggestions for Cassian
                </h3>
                <div className="space-y-2">
                  {data.suggestions.map((s, i) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <span className="text-[#00D4AA] font-semibold shrink-0">{i + 1}.</span>
                      <span className="text-[#F1F5F9]">{s}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* High Signal */}
            {data.highSignal.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-medium text-[#EF4444] flex items-center gap-2 mb-3">
                  <TrendingUp size={14} />
                  High-Signal Trends ({data.highSignal.length})
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {data.highSignal.map((trend, i) => (
                    <TrendCard key={i} trend={trend} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Rising */}
            {data.rising.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-medium text-[#F59E0B] flex items-center gap-2 mb-3">
                  <TrendingUp size={14} />
                  Rising Topics ({data.rising.length})
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {data.rising.map((trend, i) => (
                    <TrendCard key={i} trend={trend} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Niche */}
            {data.nicheSignals.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-medium text-[#10B981] flex items-center gap-2 mb-3">
                  <Eye size={14} />
                  Niche Signals ({data.nicheSignals.length})
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {data.nicheSignals.map((trend, i) => (
                    <TrendCard key={i} trend={trend} index={i} />
                  ))}
                </div>
              </div>
            )}

          </>
        ) : (
          <GlassCard>
            <p className="text-center text-[#94A3B8] py-12">No intel data available</p>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
