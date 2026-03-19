"use client";

import { CircularGauge } from "@/components/ui/circular-gauge";
import type { StatusFullResponse, StatusLevel } from "@/lib/parsers/types";

interface HeroBannerProps {
  data: StatusFullResponse;
}

function getStatusSentence(
  healthScore: number,
  hasAnyCritical: boolean
): { text: string; level: StatusLevel } {
  if (hasAnyCritical || healthScore < 50) {
    return { text: "Critical Issues Detected", level: "critical" };
  }
  if (healthScore < 80) {
    return { text: "Degraded Performance", level: "warning" };
  }
  return { text: "Systems Operational", level: "healthy" };
}

const LEVEL_COLORS: Record<StatusLevel, string> = {
  healthy: "#00D4AA",
  warning: "#F59E0B",
  critical: "#EF4444",
};

const LEVEL_GLOW: Record<StatusLevel, string> = {
  healthy: "rgba(0,212,170,0.15)",
  warning: "rgba(245,158,11,0.15)",
  critical: "rgba(239,68,68,0.15)",
};

function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return "\u2014";
  const hours = Math.floor(seconds / 3600);
  if (hours >= 24) return `${Math.floor(hours / 24)}d`;
  return `${hours}h`;
}

interface KpiPillProps {
  label: string;
  value: string;
  warn?: boolean;
  critical?: boolean;
}

function KpiPill({ label, value, warn, critical }: KpiPillProps) {
  const borderColor = critical
    ? "border-red-500/40"
    : warn
      ? "border-amber-500/40"
      : "border-white/[0.08]";

  const glowStyle = critical
    ? { boxShadow: "0 0 8px rgba(239,68,68,0.15)" }
    : warn
      ? { boxShadow: "0 0 8px rgba(245,158,11,0.1)" }
      : {};

  return (
    <div
      className={`flex items-center gap-2 rounded-full border ${borderColor} bg-white/[0.04] px-3 py-1.5 backdrop-blur-sm transition-colors duration-200 hover:bg-white/[0.08]`}
      style={glowStyle}
    >
      <span className="font-mono text-[13px] font-semibold text-[#F1F5F9]">
        {value}
      </span>
      <span className="text-[11px] uppercase tracking-wider text-[#64748B]">
        {label}
      </span>
    </div>
  );
}

export function HeroBanner({ data }: HeroBannerProps) {
  const hasAnyCritical =
    data.pipeline.level === "critical" ||
    data.cron.level === "critical" ||
    data.quota.level === "critical" ||
    data.quark.level === "critical" ||
    data.system.level === "critical";

  const { text: statusText, level: statusLevel } = getStatusSentence(
    data.healthScore,
    hasAnyCritical
  );

  // KPI computations
  const cronOk = data.cron.jobs.filter((j) => j.status !== "error").length;
  const cronTotal = data.cron.jobs.length;
  const quotaPct = data.quota.raw
    ? Math.min(data.quota.raw.dailyRemaining, data.quota.raw.weeklyRemaining)
    : 100;

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#1E293B]">
      {/* Top light-line accent */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${LEVEL_COLORS[statusLevel]}40, transparent)`,
        }}
      />

      {/* Atmospheric background */}
      <div
        className="relative p-6"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(0,212,170,0.04), transparent 50%), radial-gradient(ellipse at center, #0E0E14, #0A0A0F)",
        }}
      >
        <div className="flex flex-col items-center gap-5 md:flex-row md:gap-8">
          {/* Health Ring with ambient glow */}
          <div className="relative shrink-0">
            <div
              className="absolute inset-0 rounded-full blur-2xl"
              style={{ backgroundColor: LEVEL_GLOW[statusLevel] }}
            />
            <div className="relative">
              <div className="hidden md:block">
                <CircularGauge value={data.healthScore} size={120} />
              </div>
              <div className="md:hidden">
                <CircularGauge value={data.healthScore} size={80} />
              </div>
            </div>
          </div>

          {/* Title + KPIs */}
          <div className="flex flex-1 flex-col items-center gap-3 md:items-start">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#64748B]">
                MISSION CONTROL
              </p>
              <p
                className="mt-1 text-lg font-semibold tracking-wide"
                style={{
                  color: LEVEL_COLORS[statusLevel],
                  textShadow: `0 0 20px ${LEVEL_COLORS[statusLevel]}30`,
                }}
              >
                {statusText}
              </p>
            </div>

            {/* KPI Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <KpiPill
                label="Crons OK"
                value={`${cronOk}/${cronTotal}`}
                critical={cronOk < cronTotal * 0.8}
                warn={cronOk < cronTotal}
              />
              <KpiPill
                label="Stuck"
                value={String(data.pipeline.stuckCount)}
                warn={data.pipeline.stuckCount > 0}
                critical={data.pipeline.stuckCount > 2}
              />
              <KpiPill
                label="Quota"
                value={`${Math.round(quotaPct)}%`}
                warn={quotaPct <= 40}
                critical={quotaPct <= 20}
              />
              <KpiPill
                label="Actions"
                value={String(data.engagement.today.total)}
              />
              <KpiPill
                label="Uptime"
                value={formatUptime(data.system.uptime)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom light-line */}
      <div
        className="h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
        }}
      />
    </div>
  );
}
