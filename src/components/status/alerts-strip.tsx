"use client";

import { useRouter } from "next/navigation";
import type { StatusFullResponse, StatusLevel } from "@/lib/parsers/types";

interface AlertChip {
  id: string;
  text: string;
  level: "critical" | "warning" | "info";
  href: string;
}

function generateAlerts(data: StatusFullResponse): AlertChip[] {
  const alerts: AlertChip[] = [];

  // 1. Status cards with level != healthy
  const cardChecks: Array<{
    key: string;
    level: StatusLevel;
    sentence: string;
    href: string;
  }> = [
    {
      key: "pipeline",
      level: data.pipeline.level,
      sentence: data.pipeline.sentence,
      href: "/content",
    },
    {
      key: "cron",
      level: data.cron.level,
      sentence: data.cron.sentence,
      href: "/schedule",
    },
    {
      key: "quota",
      level: data.quota.level,
      sentence: data.quota.sentence,
      href: "/settings",
    },
    {
      key: "quark",
      level: data.quark.level,
      sentence: data.quark.sentence,
      href: "/cognitive",
    },
    {
      key: "system",
      level: data.system.level,
      sentence: data.system.sentence,
      href: "/settings",
    },
  ];

  for (const card of cardChecks) {
    if (card.level !== "healthy") {
      alerts.push({
        id: `card-${card.key}`,
        text: card.sentence,
        level: card.level === "critical" ? "critical" : "warning",
        href: card.href,
      });
    }
  }

  // 2. Cron failures (individual chips for failed jobs)
  const failedCrons = data.cron.jobs.filter((j) => j.status === "error");
  for (const job of failedCrons) {
    alerts.push({
      id: `cron-fail-${job.id}`,
      text: `Cron "${job.name}" failed`,
      level: "critical",
      href: "/schedule",
    });
  }

  // 3. Pipeline stuck jobs
  if (data.pipeline.stuckCount > 0) {
    alerts.push({
      id: "pipeline-stuck",
      text: `${data.pipeline.stuckCount} pipeline job${data.pipeline.stuckCount > 1 ? "s" : ""} stuck`,
      level: "warning",
      href: "/content",
    });
  }

  // 4. Quota warning
  if (data.quota.raw) {
    const pct = Math.min(
      data.quota.raw.dailyRemaining,
      data.quota.raw.weeklyRemaining
    );
    if (pct < 20) {
      alerts.push({
        id: "quota-low",
        text: `Quota critically low: ${Math.round(pct)}%`,
        level: "critical",
        href: "/settings",
      });
    } else if (pct < 40) {
      alerts.push({
        id: "quota-warn",
        text: `Quota at ${Math.round(pct)}%`,
        level: "warning",
        href: "/settings",
      });
    }
  }

  // 5. Recent publishes (informational)
  if (data.contentToday.publishedCount > 0) {
    alerts.push({
      id: "published-today",
      text: `${data.contentToday.publishedCount} published today`,
      level: "info",
      href: "/content",
    });
  }

  // 6. Engagement gaps
  if (data.engagement.inboundGap.unansweredCount > 5) {
    alerts.push({
      id: "engagement-gap",
      text: `${data.engagement.inboundGap.unansweredCount} unanswered engagements`,
      level:
        data.engagement.inboundGap.unansweredCount > 10
          ? "critical"
          : "warning",
      href: "/engagement",
    });
  }

  // 7. Cognitive degradation
  if (data.cognitive && data.cognitive.degradationFlags.length > 0) {
    for (const flag of data.cognitive.degradationFlags) {
      alerts.push({
        id: `cognitive-${flag}`,
        text: `Cognitive: ${flag}`,
        level: "warning",
        href: "/cognitive",
      });
    }
  }

  // Deduplicate by id
  const seen = new Set<string>();
  return alerts.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

const DOT_COLORS: Record<AlertChip["level"], string> = {
  critical: "#EF4444",
  warning: "#F59E0B",
  info: "#00D4AA",
};

const CHIP_BG: Record<AlertChip["level"], string> = {
  critical: "rgba(239,68,68,0.06)",
  warning: "rgba(245,158,11,0.04)",
  info: "rgba(0,212,170,0.04)",
};

const CHIP_BORDER: Record<AlertChip["level"], string> = {
  critical: "rgba(239,68,68,0.15)",
  warning: "rgba(245,158,11,0.1)",
  info: "rgba(255,255,255,0.08)",
};

const CHIP_ANIMATIONS: Record<AlertChip["level"], string> = {
  critical: "animate-pulse",
  warning: "animate-[slow-pulse_2s_ease-in-out_infinite]",
  info: "",
};

interface AlertsStripProps {
  data: StatusFullResponse;
}

export function AlertsStrip({ data }: AlertsStripProps) {
  const router = useRouter();
  const alerts = generateAlerts(data);

  if (alerts.length === 0) {
    return (
      <div className="relative overflow-hidden px-1 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#00D4AA]/[0.04] px-3.5 py-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{
                backgroundColor: "#00D4AA",
                boxShadow: "0 0 6px rgba(0,212,170,0.4)",
              }}
            />
            <span className="text-xs font-medium text-[#F1F5F9]">
              All systems nominal
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden px-1 py-2">
      <div
        className="scrollbar-hide flex gap-2 overflow-x-auto"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {alerts.map((alert) => (
          <button
            key={alert.id}
            onClick={() => router.push(alert.href)}
            className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 transition-all duration-200 hover:brightness-125"
            style={{
              maxWidth: 340,
              backgroundColor: CHIP_BG[alert.level],
              borderColor: CHIP_BORDER[alert.level],
            }}
          >
            <span
              className={`inline-block h-2 w-2 shrink-0 rounded-full ${CHIP_ANIMATIONS[alert.level]}`}
              style={{
                backgroundColor: DOT_COLORS[alert.level],
                boxShadow: `0 0 6px ${DOT_COLORS[alert.level]}60`,
              }}
            />
            <span className="truncate text-xs text-[#F1F5F9]">
              {alert.text}
            </span>
          </button>
        ))}
      </div>

      {/* Right fade gradient */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-8"
        style={{
          background:
            "linear-gradient(to right, transparent, #0A0A0F)",
        }}
      />
    </div>
  );
}
