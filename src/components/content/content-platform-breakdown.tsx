"use client";

import { useMemo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { PLATFORM_COLORS, PLATFORM_LABELS } from "@/lib/theme-constants";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ContentPost } from "@/lib/parsers/types";

interface ContentPlatformBreakdownProps {
  posts: ContentPost[];
}

interface PlatformBar {
  platform: string;
  label: string;
  avgEngagement: number;
  count: number;
  color: string;
}

function totalEngagement(post: ContentPost): number {
  const m = post.metrics;
  return m.views + m.likes + m.comments + m.shares;
}

export function ContentPlatformBreakdown({
  posts,
}: ContentPlatformBreakdownProps) {
  const data = useMemo<PlatformBar[]>(() => {
    const groups: Record<string, { total: number; count: number }> = {};
    for (const post of posts) {
      if (!groups[post.platform]) {
        groups[post.platform] = { total: 0, count: 0 };
      }
      groups[post.platform].total += totalEngagement(post);
      groups[post.platform].count += 1;
    }

    return Object.entries(groups)
      .map(([platform, { total, count }]) => ({
        platform,
        label: PLATFORM_LABELS[platform] || platform,
        avgEngagement: Math.round(total / count),
        count,
        color: PLATFORM_COLORS[platform] || "#94A3B8",
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);
  }, [posts]);

  if (data.length === 0) {
    return (
      <GlassCard delay={0.15}>
        <div className="py-12 text-center">
          <p className="text-xs text-[#94A3B8]">
            Publish to multiple platforms to see comparison.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard delay={0.15}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "#94A3B8", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#64748B", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            width={50}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#12121A",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 11,
              color: "#F1F5F9",
            }}
            formatter={(value, _name, props) => {
              const v = Number(value ?? 0);
              const pl = (props?.payload as PlatformBar) ?? { count: 0, label: "" };
              return [
                `${v.toLocaleString()} avg engagement (${pl.count} post${pl.count !== 1 ? "s" : ""})`,
                pl.label,
              ];
            }}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Bar dataKey="avgEngagement" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.platform}
                fill={entry.color}
                fillOpacity={0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </GlassCard>
  );
}
