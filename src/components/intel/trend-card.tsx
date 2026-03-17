"use client";

import { GlassCard } from "@/components/ui/glass-card";
import { SourceBadge } from "@/components/intel/source-badge";
import { Eye, Flame, Clock } from "lucide-react";
import type { IntelTrend } from "@/lib/parsers/types";

function viralityColor(v: number): string {
  if (v >= 8) return "#EF4444";
  if (v >= 6) return "#F59E0B";
  if (v >= 4) return "#10B981";
  return "#94A3B8";
}

function expiryOpacity(expiry: string): number {
  // Parse expiry like "24h", "48h", "12h" — lower remaining = more urgent = full opacity
  const match = expiry.match(/(\d+)/);
  if (!match) return 0.7;
  const hours = parseInt(match[1], 10);
  if (hours <= 6) return 1;
  if (hours <= 12) return 0.9;
  if (hours <= 24) return 0.8;
  if (hours <= 48) return 0.65;
  return 0.5;
}

function confidenceIcon(confidence: string): string {
  const c = confidence.toLowerCase();
  if (c === "high" || c === "confirmed") return "H";
  if (c === "medium" || c === "likely") return "M";
  return "L";
}

function confidenceColor(confidence: string): string {
  const c = confidence.toLowerCase();
  if (c === "high" || c === "confirmed") return "#10B981";
  if (c === "medium" || c === "likely") return "#F59E0B";
  return "#94A3B8";
}

interface TrendCardProps {
  trend: IntelTrend;
  index: number;
}

export function TrendCard({ trend, index }: TrendCardProps) {
  const vColor = viralityColor(trend.virality);
  const opacity = expiryOpacity(trend.expiry);
  const confColor = confidenceColor(trend.confidence);
  const confLabel = confidenceIcon(trend.confidence);

  return (
    <GlassCard delay={index * 0.04} hover>
      <div style={{ opacity }}>
        {/* Top row: source badge */}
        <div className="flex items-center justify-between mb-2.5">
          <SourceBadge source={trend.source} />
          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
              style={{ backgroundColor: `${confColor}15`, color: confColor }}
            >
              <Eye size={10} />
              {confLabel}
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-[#F1F5F9] mb-1.5 leading-snug">
          {trend.title}
        </h3>

        {/* Angle / summary */}
        <p className="text-xs text-[#94A3B8] mb-3 line-clamp-3 leading-relaxed">
          {trend.angle}
        </p>

        {/* Virality bar */}
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Flame size={11} style={{ color: vColor }} />
              <span className="text-[10px] font-semibold" style={{ color: vColor }}>
                Virality {trend.virality}/10
              </span>
            </div>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${trend.virality * 10}%`,
                background: `linear-gradient(90deg, ${vColor}80, ${vColor})`,
              }}
            />
          </div>
        </div>

        {/* Footer: expiry */}
        <div className="flex items-center gap-1 text-[10px] text-[#64748B]">
          <Clock size={9} />
          <span>Expires {trend.expiry}</span>
        </div>
      </div>
    </GlassCard>
  );
}
