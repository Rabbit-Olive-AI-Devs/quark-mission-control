"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Brain } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusDot } from "@/components/ui/status-dot";
import { CardFooter } from "@/components/ui/card-footer";
import { useApi } from "@/hooks/use-api";
import { useDashboardStore } from "@/stores/dashboard";
import type { CognitiveData } from "@/lib/parsers/types";

type HealthLevel = "good" | "warn" | "bad";

function getMemoryHealth(data: CognitiveData): { level: HealthLevel; summary: string } {
  const c = data.current;
  if (!c) return { level: "bad", summary: "No data" };
  const mh = c.memoryHealth;

  let fails = 0;
  if (!mh.journalReflective) fails++;
  if (mh.kbUpdatedToday === 0) fails++;
  if (mh.userMdStaleDays >= 5) fails++;

  const level: HealthLevel = fails >= 2 ? "bad" : fails === 1 ? "warn" : "good";
  const summary = `${mh.kbFileCount} files, ${mh.kbUpdatedToday} today`;
  return { level, summary };
}

function getProactivityHealth(data: CognitiveData): { level: HealthLevel; summary: string } {
  const c = data.current;
  if (!c) return { level: "bad", summary: "No data" };
  const p = c.proactivity;

  const level: HealthLevel =
    p.ratio < 0.15 || p.socialEngagements === 0
      ? "bad"
      : p.ratio < 0.3
        ? "warn"
        : "good";
  const summary = `ratio ${p.ratio.toFixed(2)}`;
  return { level, summary };
}

function getIdentityHealth(data: CognitiveData): { level: HealthLevel; summary: string } {
  const c = data.current;
  if (!c) return { level: "bad", summary: "No data" };
  const days = c.memoryHealth.identityMdStaleDays;

  const level: HealthLevel = days >= 7 ? "bad" : days >= 5 ? "warn" : "good";
  const summary = days === 0 ? "updated today" : `${days}d stale`;
  return { level, summary };
}

const STATUS_MAP: Record<HealthLevel, "active" | "warning" | "error"> = {
  good: "active",
  warn: "warning",
  bad: "error",
};

export function CognitiveWidget({ delay = 0 }: { delay?: number }) {
  const { data, error, lastUpdated, refetch } = useApi<CognitiveData>("/api/cognitive", {
    snapshotKey: "cognitive",
    refreshOn: ["metrics"],
  });

  const setCognitiveDegradation = useDashboardStore((s) => s.setCognitiveDegradation);

  // Sync degradation flags to store (for sidebar warning dot)
  useEffect(() => {
    if (data?.activeDegradation) {
      setCognitiveDegradation(data.activeDegradation);
    }
  }, [data?.activeDegradation, setCognitiveDegradation]);

  const memory = data ? getMemoryHealth(data) : null;
  const proactivity = data ? getProactivityHealth(data) : null;
  const identity = data ? getIdentityHealth(data) : null;
  const hasDegradation = (data?.activeDegradation?.length ?? 0) > 0;

  return (
    <GlassCard
      delay={delay}
      className={hasDegradation ? "ring-1 ring-[#EF4444]/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : ""}
    >
      <Link href="/cognitive" className="block">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} className="text-[#00D4AA]" />
          <h3 className="text-sm font-medium">Cognitive Health</h3>
        </div>

        {!data ? (
          <div className="animate-pulse h-12 bg-white/5 rounded" />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Memory", ...memory! },
              { label: "Proactivity", ...proactivity! },
              { label: "Identity", ...identity! },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center text-center gap-1">
                <StatusDot status={STATUS_MAP[item.level]} size="sm" pulse={item.level === "bad"} />
                <span className="text-[10px] font-medium text-[#F1F5F9]">{item.label}</span>
                <span className="text-[9px] text-[#94A3B8]">{item.summary}</span>
              </div>
            ))}
          </div>
        )}
      </Link>

      <CardFooter lastUpdated={lastUpdated} error={error} onRefresh={refetch} />
    </GlassCard>
  );
}
