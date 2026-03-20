"use client";

import { useMemo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Lightbulb } from "lucide-react";
import { PLATFORM_COLORS } from "@/lib/theme-constants";
import type {
  ContentFeedback,
  HookEntry,
  CadenceDay,
} from "@/lib/parsers/types";

interface ContentRecommendationsProps {
  feedback: ContentFeedback | null;
  cadenceDaily: CadenceDay[];
}

const HEATMAP_PLATFORMS = [
  { key: "x" as const, label: "X" },
  { key: "tiktok" as const, label: "TikTok" },
  { key: "instagram" as const, label: "IG" },
  { key: "youtube" as const, label: "YouTube" },
  { key: "substack" as const, label: "Substack" },
] as const;

function truncateHook(hook: string, max: number = 50): string {
  if (hook.length <= max) return hook;
  return hook.slice(0, max - 3) + "...";
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export function ContentRecommendations({
  feedback,
  cadenceDaily,
}: ContentRecommendationsProps) {
  // Last 7 days of cadence for heatmap
  const last7Days = useMemo(() => {
    const sorted = [...cadenceDaily].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    return sorted.slice(-7);
  }, [cadenceDaily]);

  const noFeedback = !feedback || feedback.posts_analyzed < 1;

  const recs = feedback?.recommendations;
  const doubleDown = recs?.double_down ?? [];
  const avoid = recs?.avoid ?? [];
  const testing = recs?.testing ?? [];
  const bestHooks = recs?.best_hooks ?? [];
  const worstHooks = recs?.worst_hooks ?? [];

  const postCount = feedback?.posts_analyzed ?? 0;
  const insufficientData = postCount < 5;

  return (
    <GlassCard delay={0.1}>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb size={16} className="text-[#F59E0B]" />
        <h3 className="text-sm font-semibold text-[#F1F5F9]">
          Recommendations
        </h3>
        {postCount > 0 && (
          <span className="text-[10px] text-[#64748B] font-mono ml-auto">
            n={postCount} posts
          </span>
        )}
      </div>

      {noFeedback ? (
        <div className="py-8 text-center">
          <p className="text-xs text-[#94A3B8]">
            No performance data yet. Publish 5+ posts per type to unlock
            recommendations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Content Type Diagnostics */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
              Content Types
            </h4>

            {insufficientData ? (
              <span className="inline-flex text-[10px] px-2 py-1 rounded bg-[#64748B]/20 text-[#64748B] font-medium">
                insufficient data (n&lt;5)
              </span>
            ) : (
              <div className="space-y-2">
                {doubleDown.length > 0 && (
                  <div className="space-y-1">
                    {doubleDown.map((type) => (
                      <div key={type} className="flex items-center gap-2">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                          double down
                        </span>
                        <span className="text-[11px] text-[#F1F5F9]">
                          {type.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {avoid.length > 0 && (
                  <div className="space-y-1">
                    {avoid.map((type) => (
                      <div key={type} className="flex items-center gap-2">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-red-500/20 text-red-400 uppercase">
                          avoid
                        </span>
                        <span className="text-[11px] text-[#F1F5F9]">
                          {type.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {testing.length > 0 && (
                  <div className="space-y-1">
                    {testing.map((type) => (
                      <div key={type} className="flex items-center gap-2">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-400 uppercase">
                          testing
                        </span>
                        <span className="text-[11px] text-[#F1F5F9]">
                          {type.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {doubleDown.length === 0 &&
                  avoid.length === 0 &&
                  testing.length === 0 && (
                    <p className="text-[10px] text-[#64748B]">
                      No type diagnostics yet
                    </p>
                  )}
              </div>
            )}
          </div>

          {/* Center: Best/Worst Hooks */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
              Hooks
            </h4>

            {bestHooks.length === 0 && worstHooks.length === 0 ? (
              <p className="text-[10px] text-[#64748B]">
                Not enough hook data yet
              </p>
            ) : (
              <div className="space-y-3">
                {bestHooks.length > 0 && (
                  <div>
                    <span className="text-[9px] text-emerald-400 font-semibold uppercase mb-1 block">
                      Best
                    </span>
                    <div className="space-y-1.5">
                      {bestHooks.slice(0, 3).map((h: HookEntry, i: number) => (
                        <HookRow key={i} hook={h} variant="best" />
                      ))}
                    </div>
                  </div>
                )}
                {worstHooks.length > 0 && (
                  <div>
                    <span className="text-[9px] text-red-400 font-semibold uppercase mb-1 block">
                      Worst
                    </span>
                    <div className="space-y-1.5">
                      {worstHooks.slice(0, 3).map((h: HookEntry, i: number) => (
                        <HookRow key={i} hook={h} variant="worst" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Platform Coverage Heatmap */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
              Platform Coverage (7d)
            </h4>

            {last7Days.length === 0 ? (
              <p className="text-[10px] text-[#64748B]">No cadence data</p>
            ) : (
              <div className="space-y-1">
                {/* Day headers */}
                <div className="flex items-center">
                  <div className="w-16 shrink-0" />
                  <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${last7Days.length}, 1fr)` }}>
                    {last7Days.map((d) => (
                      <span
                        key={d.date}
                        className="text-[8px] text-[#64748B] text-center font-mono"
                      >
                        {formatShortDate(d.date).split(" ")[1]}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Platform rows */}
                {HEATMAP_PLATFORMS.map(({ key, label }) => {
                  const color = PLATFORM_COLORS[key] || "#94A3B8";
                  return (
                    <div key={key} className="flex items-center">
                      <span className="w-16 shrink-0 text-[9px] font-bold uppercase tracking-wider" style={{ color }}>
                        {label}
                      </span>
                      <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${last7Days.length}, 1fr)` }}>
                        {last7Days.map((d) => {
                          const posted = d[key] > 0;
                          return (
                            <div
                              key={d.date}
                              className="aspect-square rounded-sm"
                              style={{
                                backgroundColor: posted
                                  ? `${color}40`
                                  : "rgba(255,255,255,0.04)",
                                border: posted
                                  ? `1px solid ${color}60`
                                  : "1px solid rgba(255,255,255,0.06)",
                                boxShadow: posted
                                  ? `0 0 4px ${color}30`
                                  : "none",
                              }}
                              title={`${label} on ${d.date}: ${d[key]} post${d[key] !== 1 ? "s" : ""}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function HookRow({
  hook,
  variant,
}: {
  hook: HookEntry;
  variant: "best" | "worst";
}) {
  const erColor = variant === "best" ? "#10B981" : "#EF4444";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[#F1F5F9] truncate flex-1" title={hook.hook}>
        {truncateHook(hook.hook)}
      </span>
      <span
        className="text-[9px] font-mono tabular-nums shrink-0"
        style={{ color: erColor }}
      >
        {(hook.er * 100).toFixed(1)}%
      </span>
      <span className="text-[9px] font-mono tabular-nums text-[#64748B] shrink-0">
        {hook.impressions >= 1000
          ? `${(hook.impressions / 1000).toFixed(1)}K`
          : hook.impressions}{" "}
        imp
      </span>
    </div>
  );
}
