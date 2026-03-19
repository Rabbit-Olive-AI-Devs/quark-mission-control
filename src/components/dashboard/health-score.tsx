"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/glass-card";
import { Gauge } from "@/components/ui/gauge";
import { CardFooter } from "@/components/ui/card-footer";
import { ShieldCheck } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useDashboardStore } from "@/stores/dashboard";
import type { CognitiveData, EngagementData } from "@/lib/parsers/types";

function computeMemoryScore(data: CognitiveData): number {
  const c = data.current;
  if (!c) return 0;
  const mh = c.memoryHealth;
  let score = 100;
  if (!mh.journalReflective) score -= 25;
  if (mh.kbUpdatedToday === 0) score -= 20;
  if (mh.userMdStaleDays >= 5) score -= 25;
  if (mh.memoryMdLineCount > 200) score -= 10;
  if (mh.captureQueuePromoted === 0) score -= 10;
  return Math.max(0, score);
}

function computeProactivityScore(data: CognitiveData): number {
  const c = data.current;
  if (!c) return 0;
  const p = c.proactivity;
  // ratio 0.5+ = 100, 0 = 0, linear between
  const ratioScore = Math.min(100, p.ratio * 200);
  // engagement bonus
  const engBonus = Math.min(20, p.socialEngagements * 5);
  return Math.min(100, Math.round(ratioScore * 0.7 + engBonus + (p.surpriseMeSent > 0 ? 10 : 0)));
}

function computeEngagementScore(data: EngagementData): number {
  const gap = data.inboundGap;
  const replyRate = gap?.replyRate ?? 0;
  // reply rate 100% = 100, 0% = 0
  let score = Math.round(replyRate * 100);
  // penalty for unanswered
  const unanswered = gap?.unansweredCount ?? 0;
  if (unanswered > 5) score -= 15;
  else if (unanswered > 0) score -= 5;
  return Math.max(0, Math.min(100, score));
}

function getScoreColor(score: number): string {
  if (score > 70) return "#10B981";
  if (score > 40) return "#F59E0B";
  return "#EF4444";
}

export function HealthScore() {
  const router = useRouter();

  const {
    data: cogData,
    error: cogErr,
    lastUpdated: cogUpdated,
    refetch: cogRefetch,
  } = useApi<CognitiveData>("/api/cognitive", {
    refreshOn: ["metrics"],
  });

  const {
    data: engData,
    error: engErr,
    lastUpdated: engUpdated,
    refetch: engRefetch,
  } = useApi<EngagementData>("/api/engagement", {
    refreshOn: ["engagement"],
  });

  const setCognitiveDegradation = useDashboardStore((s) => s.setCognitiveDegradation);
  const setEngagementUnanswered = useDashboardStore((s) => s.setEngagementUnanswered);

  useEffect(() => {
    if (cogData?.activeDegradation) {
      setCognitiveDegradation(cogData.activeDegradation);
    }
  }, [cogData?.activeDegradation, setCognitiveDegradation]);

  useEffect(() => {
    if (engData?.inboundGap) {
      setEngagementUnanswered(engData.inboundGap.unansweredCount);
    }
  }, [engData?.inboundGap, setEngagementUnanswered]);

  const memScore = cogData ? computeMemoryScore(cogData) : null;
  const proScore = cogData ? computeProactivityScore(cogData) : null;
  const engScore = engData ? computeEngagementScore(engData) : null;

  const scores = [memScore, proScore, engScore].filter((s): s is number => s !== null);
  const worstScore = scores.length > 0 ? Math.min(...scores) : 0;
  const worstLabel = scores.length === 0
    ? "No data"
    : worstScore === memScore
      ? "memory"
      : worstScore === proScore
        ? "proactivity"
        : "engagement";

  const unanswered = engData?.inboundGap?.unansweredCount ?? 0;

  const navigateTarget = worstLabel === "engagement" ? "/engagement" : "/cognitive";

  const handleRefresh = async () => {
    await Promise.all([cogRefetch(), engRefetch()]);
  };

  const lastUpdated = Math.max(cogUpdated ?? 0, engUpdated ?? 0) || null;
  const error = cogErr || engErr;

  return (
    <GlassCard delay={0.1}>
      <button
        onClick={() => router.push(navigateTarget)}
        className="block w-full text-left cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#00D4AA]" />
            <h3 className="text-sm font-medium">Health Score</h3>
          </div>
          {unanswered > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B]">
              {unanswered} unanswered
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Gauge
            value={worstScore}
            max={100}
            size={72}
            color={getScoreColor(worstScore)}
          />
          <div className="flex-1 space-y-1.5">
            {[
              { label: "Memory", score: memScore },
              { label: "Proactivity", score: proScore },
              { label: "Engagement", score: engScore },
            ].map(({ label, score }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[10px] text-[#94A3B8] w-16">{label}</span>
                <div className="flex-1 h-1 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${score ?? 0}%`,
                      background: getScoreColor(score ?? 0),
                    }}
                  />
                </div>
                <span className="text-[10px] text-[#94A3B8] w-6 text-right font-mono">
                  {score ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-2 text-[10px] text-[#94A3B8]">
          Worst: <span className="text-[#F1F5F9]">{worstLabel}</span>
          {" — "}
          <span className="text-[#00D4AA]">View details →</span>
        </div>
      </button>

      <CardFooter lastUpdated={lastUpdated} error={error} onRefresh={handleRefresh} />
    </GlassCard>
  );
}
