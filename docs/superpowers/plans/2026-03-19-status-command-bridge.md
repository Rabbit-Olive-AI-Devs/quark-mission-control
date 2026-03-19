# Status Page: Command Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the basic 5-card Status page with a dense, cinematic Command Bridge dashboard that surfaces data from 7+ API endpoints in 10 instrument panels.

**Architecture:** Single aggregated API endpoint (`/api/status-full`) calls all existing parsers in parallel. Client renders 4 sections: Hero Banner (health ring + KPIs), Alerts Strip (scrollable chips), Instrument Grid (10 panels, 3-column), Footer (SSE + timestamp). Each panel links to its detail page. SSE events trigger targeted refetches.

**Tech Stack:** Next.js 16, TypeScript, Tailwind v4, Recharts (sparklines), Framer Motion (transitions), Zustand, Vitest

**Spec:** `docs/superpowers/specs/2026-03-19-status-page-command-bridge-design.md`
**Repo:** `/Users/quark/projects/quark-mission-control`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/app/api/status-full/route.ts` | Aggregated API endpoint — calls all parsers in parallel, computes health score |
| `src/components/ui/circular-gauge.tsx` | Full-circle SVG gauge for hero health ring |
| `src/components/ui/sparkline.tsx` | SVG sparkline with gradient fill |
| `src/components/status/cron-heatmap.tsx` | Cron job status heatmap grid |
| `src/components/status/instrument-panel.tsx` | Reusable panel wrapper (chrome, click nav, status dot) |
| `src/components/status/hero-banner.tsx` | Health ring + title + KPI pills |
| `src/components/status/alerts-strip.tsx` | Scrollable alert chip bar |
| `src/components/status/pipeline-panel.tsx` | Pipeline instrument panel body |
| `src/components/status/cron-panel.tsx` | Cron health instrument panel body |
| `src/components/status/engagement-panel.tsx` | Engagement pulse instrument panel body |
| `src/components/status/quota-panel.tsx` | API quota instrument panel body |
| `src/components/status/quark-panel.tsx` | Quark health instrument panel body |
| `src/components/status/content-panel.tsx` | Content today instrument panel body |
| `src/components/status/system-panel.tsx` | System resources instrument panel body |
| `src/components/status/cognitive-panel.tsx` | Cognitive instrument panel body |
| `src/components/status/intel-panel.tsx` | Intel signals instrument panel body |
| `src/components/status/activity-panel.tsx` | Activity feed instrument panel body |
| `src/components/status/__tests__/command-bridge.test.tsx` | Tests for new status components |
| `src/lib/__tests__/health-score.test.ts` | Tests for health score computation |

### Modified Files
| File | Change |
|------|--------|
| `src/app/status/page.tsx` | Complete rewrite — consume `/api/status-full`, render 4 sections |
| `src/lib/parsers/types.ts` | Add `StatusFullResponse` interface |
| `src/lib/status-logic.ts` | Add `computeHealthScore()` function |

### Deleted Files (Task 12)
| File | Reason |
|------|--------|
| `src/components/status/pipeline-card.tsx` | Replaced by `pipeline-panel.tsx` |
| `src/components/status/cron-card.tsx` | Replaced by `cron-panel.tsx` |
| `src/components/status/quota-card.tsx` | Replaced by `quota-panel.tsx` |
| `src/components/status/quark-card.tsx` | Replaced by `quark-panel.tsx` |
| `src/components/status/system-card.tsx` | Replaced by `system-panel.tsx` |
| `src/components/status/detail-panel.tsx` | Panels navigate to detail pages instead of opening drawers |

---

## Task 1: StatusFullResponse type + /api/status-full endpoint

**Files:**
- Modify: `src/lib/parsers/types.ts`
- Modify: `src/lib/status-logic.ts`
- Create: `src/app/api/status-full/route.ts`

**tsc note:** After this task, `StatusFullResponse` will be importable but no consumer exists yet. No tsc errors expected.

- [ ] **Step 1: Add StatusFullResponse and supporting types to types.ts**

At the bottom of `src/lib/parsers/types.ts` (after the existing `StatusData` interface, around line 514), add:

```typescript
// === Command Bridge Types ===

export interface ActivityEntry {
  timestamp: string;
  text: string;
  level: "info" | "warning" | "error";
}

export interface ContentTodayData {
  publishedCount: number;
  platforms: string[];
  publishMode: "LIVE" | "WARMUP";
}

export interface StatusFullResponse {
  // Existing status cards
  pipeline: StatusCard & { stuckCount: number; scorecard: PipelineScorecard };
  cron: StatusCard & { jobs: CronJob[] };
  quota: StatusCard & { raw: CodexQuota | null };
  quark: StatusCard & { heartbeat: HeartbeatState | null };
  system: StatusCard & {
    cpu: number;
    memory: number;
    disk: number;
    uptime: number;
    osVersion: string;
  };

  // New sections for Command Bridge
  engagement: {
    today: { total: number; byPlatform: Record<string, number>; byAction: Record<string, number> };
    inboundGap: { replyRate: number; unansweredCount: number };
    guardrailBlocks: number;
  };
  cognitive: {
    memoryHealth: CognitiveMemoryHealth;
    proactivity: CognitiveProactivity;
    engagement: CognitiveEngagement;
    degradationFlags: string[];
  } | null;
  intel: {
    highSignal: IntelTrend[];
    updatedAt: string;
  };
  contentToday: ContentTodayData;
  activity: ActivityEntry[];

  // Metadata
  healthScore: number;
  timestamp: string;
}
```

- [ ] **Step 2: Add computeHealthScore() to status-logic.ts**

At the bottom of `src/lib/status-logic.ts`, add:

```typescript
export interface HealthScoreInput {
  cronOk: number;
  cronTotal: number;
  pipelineStuckCount: number;
  pipelineQuarantinedCount: number;
  quotaDailyPct: number;
  quotaWeeklyPct: number;
  systemCpu: number;
  systemMemory: number;
  systemDisk: number;
  quarkLevel: "healthy" | "warning" | "critical";
}

export function computeHealthScore(input: HealthScoreInput): number {
  // Cron: 30% weight (ok_count / total_count * 100)
  const cronScore = input.cronTotal > 0
    ? (input.cronOk / input.cronTotal) * 100
    : 100;

  // Pipeline: 20% weight (100 if no stuck, 50 if stuck, 0 if quarantined)
  const pipelineScore = input.pipelineQuarantinedCount > 0
    ? 0
    : input.pipelineStuckCount > 0
      ? 50
      : 100;

  // Quota: 20% weight (min of daily, weekly)
  const quotaScore = Math.min(input.quotaDailyPct, input.quotaWeeklyPct);

  // System: 15% weight (100 - max(cpu, memory, disk))
  const systemScore = 100 - Math.max(input.systemCpu, input.systemMemory, input.systemDisk);

  // Quark: 15% weight (100 if healthy, 50 if warning, 0 if critical)
  const quarkScore = input.quarkLevel === "healthy"
    ? 100
    : input.quarkLevel === "warning"
      ? 50
      : 0;

  const weighted =
    cronScore * 0.30 +
    pipelineScore * 0.20 +
    quotaScore * 0.20 +
    systemScore * 0.15 +
    quarkScore * 0.15;

  return Math.round(Math.max(0, Math.min(100, weighted)));
}
```

- [ ] **Step 3: Create /api/status-full/route.ts**

Create `src/app/api/status-full/route.ts`:

```typescript
import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

import { parsePipelineData } from "@/lib/parsers/pipeline";
import { parseCronList } from "@/lib/parsers/cron";
import { parseMetrics } from "@/lib/parsers/metrics";
import { parseHeartbeat } from "@/lib/parsers/heartbeat";
import { getSystemInfo } from "@/lib/parsers/system";
import { parseEngagement } from "@/lib/parsers/engagement";
import { parseCognitive } from "@/lib/parsers/cognitive";
import { parseIntel } from "@/lib/parsers/intel";
import { parseDigest } from "@/lib/parsers/digest";
import {
  derivePipelineStatus,
  deriveCronStatus,
  deriveQuotaStatus,
  deriveQuarkStatus,
  deriveSystemStatus,
  computeHealthScore,
} from "@/lib/status-logic";
import { WORKSPACE_PATH } from "@/lib/config";
import type { ActivityEntry, ContentTodayData, StatusFullResponse } from "@/lib/parsers/types";

const PUBLISH_AUDIT_PATH = path.join(WORKSPACE_PATH, "content-engine/state/publish-audit.jsonl");
const PUBLISH_MODE_PATH = path.join(WORKSPACE_PATH, "content-engine/state/publish-mode.json");

function getTodayStr(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

function parseContentToday(): ContentTodayData {
  const todayStr = getTodayStr();
  let publishedCount = 0;
  const platformSet = new Set<string>();
  let publishMode: "LIVE" | "WARMUP" = "WARMUP";

  // Parse publish-audit.jsonl for today's publishes
  try {
    const content = fs.readFileSync(PUBLISH_AUDIT_PATH, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (
          entry.published_at?.startsWith(todayStr) &&
          entry.outcome === "published"
        ) {
          publishedCount++;
          if (entry.format) platformSet.add(entry.format);
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // File doesn't exist yet
  }

  // Read publish mode
  try {
    const raw = fs.readFileSync(PUBLISH_MODE_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (data.mode === "LIVE" || data.mode === "live") {
      publishMode = "LIVE";
    }
  } catch {
    // Default to WARMUP
  }

  return {
    publishedCount,
    platforms: [...platformSet],
    publishMode,
  };
}

const ERROR_KEYWORDS = ["fail", "error", "blind", "degraded", "crash", "broken"];
const WARNING_KEYWORDS = ["stuck", "warn", "stale", "timeout", "slow", "retry"];

function parseActivity(
  digestSections: Array<{ timeRange: string; items: string[] }>
): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  for (const section of digestSections) {
    for (const item of section.items) {
      const lower = item.toLowerCase();
      let level: ActivityEntry["level"] = "info";

      if (ERROR_KEYWORDS.some((kw) => lower.includes(kw))) {
        level = "error";
      } else if (WARNING_KEYWORDS.some((kw) => lower.includes(kw))) {
        level = "warning";
      }

      entries.push({
        timestamp: section.timeRange,
        text: item,
        level,
      });
    }
  }

  // Newest first, max 8 entries
  return entries.reverse().slice(0, 8);
}

export async function GET() {
  try {
    const [pipeline, cronJobs, metrics, heartbeat, system, engagement, cognitive, intel, digest] =
      await Promise.all([
        parsePipelineData(),
        parseCronList(),
        parseMetrics(),
        parseHeartbeat(),
        getSystemInfo(),
        parseEngagement(),
        parseCognitive(),
        parseIntel(),
        parseDigest(),
      ]);

    // --- Derive status cards (same logic as /api/status) ---

    const jobs = pipeline?.jobs ?? [];
    const pipelineStatus = derivePipelineStatus({
      jobs: jobs.map((j) => ({
        status: String(j.status ?? ""),
        updated_at: String(j.createdAt ?? ""),
        stage: j.stages?.length
          ? String(j.stages[j.stages.length - 1].name)
          : "",
      })),
    });

    // Compute stuckCount explicitly
    const TERMINAL = new Set(["published", "completed", "killed", "quarantined"]);
    const APPROVAL_WAIT = new Set(["preview_sent"]);
    const STUCK_THRESHOLD_MS = 3600_000;
    const activeJobs = jobs.filter((j) => !TERMINAL.has(j.status));
    const stuckCount = activeJobs.filter((j) => {
      if (APPROVAL_WAIT.has(j.status)) return false;
      const age = Date.now() - new Date(j.createdAt).getTime();
      return age > STUCK_THRESHOLD_MS;
    }).length;
    const quarantinedCount = jobs.filter((j) => j.status === "quarantined").length;

    const cronArray = Array.isArray(cronJobs) ? cronJobs : [];
    const cronStatus = deriveCronStatus({
      jobs: cronArray.map((j) => ({
        name: String(j.name ?? ""),
        status: String(j.status ?? ""),
      })),
    });

    const quotaStatus = deriveQuotaStatus({
      dailyPct: Number(metrics?.codexQuota?.dailyRemaining ?? 100),
      weeklyPct: Number(metrics?.codexQuota?.weeklyRemaining ?? 100),
    });

    const recentRuns = cronArray.length;
    const recentFailures = cronArray.filter((j) => j.status === "error").length;
    const quarkStatus = deriveQuarkStatus({
      lastHeartbeat: String(heartbeat?.lastHeartbeat ?? new Date().toISOString()),
      recentRuns,
      recentFailures,
      windowHours: 6,
    });

    const systemStatus = deriveSystemStatus({
      cpu: Number(system?.cpuPercent ?? 0),
      memory: system
        ? Math.round((system.memoryUsedMb / system.memoryTotalMb) * 100)
        : 0,
      disk: system
        ? Math.round((system.diskUsedGb / system.diskTotalGb) * 100)
        : 0,
    });

    // --- Health score ---

    const cronOk = cronArray.filter((j) => j.status !== "error").length;
    const healthScore = computeHealthScore({
      cronOk,
      cronTotal: cronArray.length,
      pipelineStuckCount: stuckCount,
      pipelineQuarantinedCount: quarantinedCount,
      quotaDailyPct: Number(metrics?.codexQuota?.dailyRemaining ?? 100),
      quotaWeeklyPct: Number(metrics?.codexQuota?.weeklyRemaining ?? 100),
      systemCpu: systemStatus.cpu,
      systemMemory: systemStatus.memory,
      systemDisk: systemStatus.disk,
      quarkLevel: quarkStatus.level,
    });

    // --- New sections ---

    const contentToday = parseContentToday();
    const activity = parseActivity(digest);

    const cognitiveData = cognitive?.current
      ? {
          memoryHealth: cognitive.current.memoryHealth,
          proactivity: cognitive.current.proactivity,
          engagement: cognitive.current.engagement,
          degradationFlags: cognitive.current.degradationFlags,
        }
      : null;

    const response: StatusFullResponse = {
      pipeline: {
        ...pipelineStatus,
        stuckCount,
        scorecard: pipeline?.scorecard ?? {
          published: 0,
          killed: 0,
          stale: 0,
          pending: 0,
          avgTimeToPublish: 0,
          contentTypeBreakdown: {},
        },
      },
      cron: { ...cronStatus, jobs: cronArray },
      quota: { ...quotaStatus, raw: metrics?.codexQuota ?? null },
      quark: { ...quarkStatus, heartbeat: heartbeat ?? null },
      system: {
        ...systemStatus,
        uptime: system?.uptime ?? 0,
        osVersion: system?.osVersion ?? "",
      },
      engagement: {
        today: engagement?.today ?? { total: 0, byPlatform: {}, byAction: {} },
        inboundGap: {
          replyRate: engagement?.inboundGap?.replyRate ?? 0,
          unansweredCount: engagement?.inboundGap?.unansweredCount ?? 0,
        },
        guardrailBlocks: engagement?.guardrailBlocks?.length ?? 0,
      },
      cognitive: cognitiveData,
      intel: {
        highSignal: intel?.highSignal ?? [],
        updatedAt: intel?.compiled ?? new Date().toISOString(),
      },
      contentToday,
      activity,
      healthScore,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "CDN-Cache-Control": "s-maxage=15, stale-while-revalidate=45, stale-if-error=3600",
        "Cache-Control": "public, max-age=5",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to compute status-full", details: String(error) },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 4: Verify build compiles**

```bash
cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit 2>&1 | tail -20
```

Expected: zero errors. All new types are well-formed and the route imports existing parsers.

- [ ] **Step 5: Smoke test the endpoint**

```bash
cd /Users/quark/projects/quark-mission-control && npm run dev &
sleep 3
curl -s http://localhost:3000/api/status-full | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log('healthScore:', d.healthScore, 'pipeline:', d.pipeline.level, 'cron:', d.cron.level, 'sections:', Object.keys(d).join(', '));"
```

Expected: healthScore as integer 0-100, all section keys present.

- [ ] **Step 6: Commit**

```bash
git add src/lib/parsers/types.ts src/lib/status-logic.ts src/app/api/status-full/route.ts
git commit -m "feat(status): add StatusFullResponse type + /api/status-full aggregated endpoint"
```

---

## Task 2: Shared UI — CircularGauge component

**Files:**
- Create: `src/components/ui/circular-gauge.tsx`

**tsc note:** No consumers yet. No tsc errors expected.

- [ ] **Step 1: Create the CircularGauge component**

Create `src/components/ui/circular-gauge.tsx`:

```typescript
"use client";

interface CircularGaugeProps {
  /** Value 0-100 */
  value: number;
  /** Diameter in px. Default 120. */
  size?: number;
  /** Override color. If omitted, uses threshold-based color. */
  color?: string;
  /** Override glow color. If omitted, uses same as color. */
  glowColor?: string;
}

function getColor(value: number): string {
  if (value >= 80) return "#00D4AA";
  if (value >= 50) return "#F59E0B";
  return "#EF4444";
}

export function CircularGauge({
  value,
  size = 120,
  color,
  glowColor,
}: CircularGaugeProps) {
  const strokeWidth = size >= 100 ? 8 : 6;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.max(0, Math.min(100, value));
  const offset = circumference - (clampedValue / 100) * circumference;

  const strokeColor = color ?? getColor(clampedValue);
  const glow = glowColor ?? strokeColor;
  const center = size / 2;

  // Font size scales with gauge size
  const fontSize = Math.round(size / 3.5);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        {/* Value arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{
            transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease",
            filter: `drop-shadow(0 0 8px ${glow}40)`,
          }}
        />
        {/* Center value text */}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-[#F1F5F9] font-mono font-bold"
          style={{ fontSize }}
        >
          {Math.round(clampedValue)}
        </text>
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/circular-gauge.tsx
git commit -m "feat(ui): add CircularGauge full-circle SVG gauge component"
```

---

## Task 3: Shared UI — Sparkline component

**Files:**
- Create: `src/components/ui/sparkline.tsx`

- [ ] **Step 1: Create the Sparkline component**

Create `src/components/ui/sparkline.tsx`:

```typescript
"use client";

import { useMemo } from "react";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export function Sparkline({
  data,
  color = "#00D4AA",
  height = 40,
}: SparklineProps) {
  const width = 200; // viewBox width, stretches to container via 100% width

  const { linePath, areaPath, gradientId } = useMemo(() => {
    const id = `sparkline-grad-${Math.random().toString(36).slice(2, 8)}`;

    if (data.length === 0) {
      return {
        linePath: `M 0 ${height} L ${width} ${height}`,
        areaPath: `M 0 ${height} L ${width} ${height} L ${width} ${height} L 0 ${height} Z`,
        gradientId: id,
      };
    }

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1; // avoid division by zero

    const padding = 2; // top/bottom padding in viewBox units
    const usableHeight = height - padding * 2;

    const points = data.map((v, i) => {
      const x = data.length === 1 ? width / 2 : (i / (data.length - 1)) * width;
      const y = padding + usableHeight - ((v - min) / range) * usableHeight;
      return { x, y };
    });

    const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const area =
      line +
      ` L ${points[points.length - 1].x} ${height}` +
      ` L ${points[0].x} ${height} Z`;

    return { linePath: line, areaPath: area, gradientId: id };
  }, [data, height, width]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/sparkline.tsx
git commit -m "feat(ui): add Sparkline SVG component with gradient fill"
```

---

## Task 4: Shared UI — CronHeatmap component

**Files:**
- Create: `src/components/status/cron-heatmap.tsx`

- [ ] **Step 1: Create the CronHeatmap component**

Create `src/components/status/cron-heatmap.tsx`:

```typescript
"use client";

import { HoverCard } from "@/components/ui/hover-card";

interface CronHeatmapJob {
  name: string;
  status: string;
}

interface CronHeatmapProps {
  jobs: CronHeatmapJob[];
}

function getCellColor(status: string): string {
  if (status === "error") return "#EF4444";
  if (status === "disabled") return "#475569";
  return "#10B981"; // ok, enabled, any other active status
}

export function CronHeatmap({ jobs }: CronHeatmapProps) {
  if (jobs.length === 0) {
    return (
      <div className="flex h-12 items-center justify-center text-xs text-[#64748B]">
        No cron jobs configured
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-[2px] sm:grid-cols-5">
      {jobs.map((job, i) => (
        <HoverCard
          key={`${job.name}-${i}`}
          content={
            <div>
              <p className="font-medium text-[#F1F5F9]">{job.name}</p>
              <p className="text-[#64748B]">{job.status}</p>
            </div>
          }
        >
          <div
            className="h-4 w-4 rounded-[2px]"
            style={{ backgroundColor: getCellColor(job.status) }}
          />
        </HoverCard>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/status/cron-heatmap.tsx
git commit -m "feat(status): add CronHeatmap grid component"
```

---

## Task 5: InstrumentPanel wrapper component

**Files:**
- Create: `src/components/status/instrument-panel.tsx`

- [ ] **Step 1: Create the InstrumentPanel component**

Create `src/components/status/instrument-panel.tsx`:

```typescript
"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { StatusLevel } from "@/lib/parsers/types";
import type { ReactNode } from "react";

interface InstrumentPanelProps {
  title: string;
  icon: LucideIcon;
  level: StatusLevel;
  href: string;
  dataPriority: 1 | 2 | 3;
  span?: 2;
  children: ReactNode;
}

const DOT_STYLES: Record<StatusLevel, string> = {
  healthy: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]",
  warning: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)] animate-[slow-pulse_2s_ease-in-out_infinite]",
  critical: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)] animate-pulse",
};

export function InstrumentPanel({
  title,
  icon: Icon,
  level,
  href,
  dataPriority,
  span,
  children,
}: InstrumentPanelProps) {
  const router = useRouter();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(href);
        }
      }}
      data-priority={dataPriority}
      className={[
        "cursor-pointer rounded-xl border border-[#1E293B] bg-[#0E0E14] p-5",
        "transition-all duration-150 ease-in-out",
        "hover:border-white/10 hover:bg-white/[0.02]",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00D4AA]/50",
        span === 2 ? "col-span-1 md:col-span-2" : "",
      ].join(" ")}
      style={{ order: dataPriority }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} className="text-[#94A3B8]" />
        <span className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
          {title}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${DOT_STYLES[level]}`}
          />
          <ChevronRight size={14} className="text-[#475569]" />
        </span>
      </div>

      {/* Body */}
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Add slow-pulse keyframe to global CSS**

In the project's global CSS file (likely `src/app/globals.css`), add the following keyframe animations. Find the existing `@layer` declarations or the bottom of the file and append:

```css
@keyframes slow-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes glow-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/status/instrument-panel.tsx src/app/globals.css
git commit -m "feat(status): add InstrumentPanel reusable panel wrapper"
```

---

## Task 6: HeroBanner component

**Files:**
- Create: `src/components/status/hero-banner.tsx`

- [ ] **Step 1: Create the HeroBanner component**

Create `src/components/status/hero-banner.tsx`:

```typescript
"use client";

import { CircularGauge } from "@/components/ui/circular-gauge";
import type { StatusFullResponse, StatusLevel } from "@/lib/parsers/types";

interface HeroBannerProps {
  data: StatusFullResponse;
}

function getStatusSentence(healthScore: number, hasAnyCritical: boolean): { text: string; level: StatusLevel } {
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

function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return "—";
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

  return (
    <div
      className={`flex items-center gap-2 rounded-full border ${borderColor} bg-white/[0.06] px-3 py-1.5`}
    >
      <span className="font-mono text-[13px] font-semibold text-[#F1F5F9]">
        {value}
      </span>
      <span className="text-[11px] text-[#64748B]">{label}</span>
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
    <div
      className="rounded-xl border-b border-[#1E293B] p-6"
      style={{
        background: "radial-gradient(ellipse at center, #0E0E14, #0A0A0F)",
      }}
    >
      <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
        {/* Health Ring */}
        <div className="shrink-0">
          <CircularGauge
            value={data.healthScore}
            size={120}
          />
        </div>

        {/* Title + KPIs */}
        <div className="flex flex-1 flex-col items-center gap-3 md:items-start">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
              MISSION CONTROL
            </p>
            <p
              className="text-lg font-semibold"
              style={{ color: LEVEL_COLORS[statusLevel] }}
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
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/status/hero-banner.tsx
git commit -m "feat(status): add HeroBanner with health ring and KPI pills"
```

---

## Task 7: AlertsStrip component

**Files:**
- Create: `src/components/status/alerts-strip.tsx`

- [ ] **Step 1: Create the AlertsStrip component**

Create `src/components/status/alerts-strip.tsx`:

```typescript
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
    { key: "pipeline", level: data.pipeline.level, sentence: data.pipeline.sentence, href: "/content" },
    { key: "cron", level: data.cron.level, sentence: data.cron.sentence, href: "/schedule" },
    { key: "quota", level: data.quota.level, sentence: data.quota.sentence, href: "/settings" },
    { key: "quark", level: data.quark.level, sentence: data.quark.sentence, href: "/cognitive" },
    { key: "system", level: data.system.level, sentence: data.system.sentence, href: "/settings" },
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

  // 2. Cron failures (individual chips for failed jobs, skip if already covered by card alert)
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
    const pct = Math.min(data.quota.raw.dailyRemaining, data.quota.raw.weeklyRemaining);
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
      level: data.engagement.inboundGap.unansweredCount > 10 ? "critical" : "warning",
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

  // Deduplicate by id (cron card alert may overlap with individual cron failure chips)
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
      <div className="relative overflow-hidden px-6 py-3">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: "#00D4AA" }}
            />
            <span className="text-xs text-[#F1F5F9]">All systems nominal</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden px-6 py-3">
      <div
        className="flex gap-2 overflow-x-auto"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {alerts.map((alert) => (
          <button
            key={alert.id}
            onClick={() => router.push(alert.href)}
            className="flex shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 transition hover:bg-white/[0.06]"
            style={{ maxWidth: 320 }}
          >
            <span
              className={`inline-block h-2 w-2 shrink-0 rounded-full ${CHIP_ANIMATIONS[alert.level]}`}
              style={{ backgroundColor: DOT_COLORS[alert.level] }}
            />
            <span className="truncate text-xs text-[#F1F5F9]">
              {alert.text}
            </span>
          </button>
        ))}
      </div>

      {/* Right fade gradient */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-full w-4"
        style={{
          background: "linear-gradient(to right, transparent, #0A0A0F)",
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Add webkit scrollbar-hide to globals.css**

In `src/app/globals.css`, add (if not already present):

```css
/* Hide scrollbar for alerts strip */
.overflow-x-auto::-webkit-scrollbar {
  display: none;
}
```

Note: Check if this rule already exists. If it does, skip this step.

- [ ] **Step 3: Verify build**

```bash
cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/status/alerts-strip.tsx src/app/globals.css
git commit -m "feat(status): add AlertsStrip scrollable alert chip bar"
```

---

## Task 8: Priority 1 panels — Pipeline, Cron, Engagement

**Files:**
- Create: `src/components/status/pipeline-panel.tsx`
- Create: `src/components/status/cron-panel.tsx`
- Create: `src/components/status/engagement-panel.tsx`

- [ ] **Step 1: Create PipelinePanel**

Create `src/components/status/pipeline-panel.tsx`:

```typescript
"use client";

import { StatusSentence } from "@/components/ui/status-sentence";
import { Sparkline } from "@/components/ui/sparkline";
import type { StatusFullResponse } from "@/lib/parsers/types";
import { formatElapsed } from "@/lib/theme-constants";

interface PipelinePanelProps {
  data: StatusFullResponse;
}

export function PipelinePanel({ data }: PipelinePanelProps) {
  const { scorecard } = data.pipeline;

  // Build a 7-day sparkline from contentTypeBreakdown or fall back to single today value
  // For v1, we show the published count as a single-point sparkline
  // In future, the API could return daily publish history
  const sparklineData = scorecard.published > 0
    ? [0, 0, 0, 0, 0, 0, scorecard.published]
    : [0, 0, 0, 0, 0, 0, 0];

  const avgTime = scorecard.avgTimeToPublish > 0
    ? formatElapsed(scorecard.avgTimeToPublish)
    : "—";

  return (
    <div className="space-y-3">
      <StatusSentence level={data.pipeline.level} sentence={data.pipeline.sentence} />

      {/* Metrics row */}
      <div className="flex items-center gap-4 text-xs">
        <div>
          <span className="font-mono font-bold text-[#F1F5F9]">
            {data.contentToday.publishedCount}
          </span>
          <span className="ml-1 text-[#64748B]">published</span>
        </div>
        <div>
          <span className="font-mono font-bold text-[#F1F5F9]">
            {scorecard.killed}
          </span>
          <span className="ml-1 text-[#64748B]">killed</span>
        </div>
        <div>
          <span className="font-mono font-bold text-[#F1F5F9]">{avgTime}</span>
          <span className="ml-1 text-[#64748B]">avg time</span>
        </div>
      </div>

      {/* Sparkline */}
      <Sparkline data={sparklineData} height={40} />
    </div>
  );
}
```

- [ ] **Step 2: Create CronPanel**

Create `src/components/status/cron-panel.tsx`:

```typescript
"use client";

import { StatusSentence } from "@/components/ui/status-sentence";
import { CronHeatmap } from "@/components/status/cron-heatmap";
import type { StatusFullResponse } from "@/lib/parsers/types";
import { formatTimeAgo } from "@/lib/utils";

interface CronPanelProps {
  data: StatusFullResponse;
}

export function CronPanel({ data }: CronPanelProps) {
  const { jobs } = data.cron;

  // Heatmap data
  const heatmapJobs = jobs.map((j) => ({
    name: j.name,
    status: j.enabled ? j.status : "disabled",
  }));

  // 3 most recent jobs by lastRun
  const recentJobs = [...jobs]
    .filter((j) => j.lastRun)
    .sort((a, b) => {
      const aTime = a.lastRun ? new Date(a.lastRun).getTime() : 0;
      const bTime = b.lastRun ? new Date(b.lastRun).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 3);

  return (
    <div className="space-y-3">
      <StatusSentence level={data.cron.level} sentence={data.cron.sentence} />

      {/* Heatmap */}
      <CronHeatmap jobs={heatmapJobs} />

      {/* Recent jobs */}
      {recentJobs.length > 0 && (
        <div className="space-y-1">
          {recentJobs.map((job) => (
            <div
              key={job.id}
              className="flex items-center gap-2 text-xs"
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  job.status === "error"
                    ? "bg-red-500"
                    : "bg-emerald-500"
                }`}
              />
              <span
                className="truncate text-[#F1F5F9]"
                style={{ maxWidth: 160 }}
              >
                {job.name}
              </span>
              <span className="ml-auto text-[#64748B]">
                {job.lastRun ? formatTimeAgo(job.lastRun) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create EngagementPanel**

Create `src/components/status/engagement-panel.tsx`:

```typescript
"use client";

import type { StatusFullResponse, StatusLevel } from "@/lib/parsers/types";
import { PLATFORM_COLORS, PLATFORM_LABELS } from "@/lib/theme-constants";

interface EngagementPanelProps {
  data: StatusFullResponse;
}

const PLATFORMS = ["x", "instagram", "tiktok", "youtube", "substack"];

export function deriveEngagementLevel(data: StatusFullResponse): StatusLevel {
  const { unansweredCount } = data.engagement.inboundGap;
  const { replyRate } = data.engagement.inboundGap;
  if (unansweredCount > 10) return "critical";
  if (unansweredCount > 5 || replyRate < 50) return "warning";
  return "healthy";
}

export function EngagementPanel({ data }: EngagementPanelProps) {
  const { today, inboundGap, guardrailBlocks } = data.engagement;

  return (
    <div className="space-y-3">
      {/* 5-platform grid */}
      <div className="space-y-1">
        {PLATFORMS.map((platform) => {
          const count = today.byPlatform[platform] ?? 0;
          const color = PLATFORM_COLORS[platform] ?? "#94A3B8";
          const label = PLATFORM_LABELS[platform] ?? platform;

          return (
            <div key={platform} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-[#94A3B8]">{label}</span>
              <span className="ml-auto font-mono font-bold text-[#F1F5F9]">
                {count > 0 ? count : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary metrics */}
      <div className="border-t border-white/[0.06] pt-2">
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="font-mono font-bold text-[#F1F5F9]">
              {Math.round(inboundGap.replyRate)}%
            </span>
            <span className="ml-1 text-[#64748B]">reply rate</span>
          </div>
          <div>
            <span className="font-mono font-bold text-[#F1F5F9]">
              {inboundGap.unansweredCount}
            </span>
            <span className="ml-1 text-[#64748B]">unanswered</span>
          </div>
          <div>
            <span className="font-mono font-bold text-[#F1F5F9]">
              {guardrailBlocks}
            </span>
            <span className="ml-1 text-[#64748B]">blocks</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/status/pipeline-panel.tsx src/components/status/cron-panel.tsx src/components/status/engagement-panel.tsx
git commit -m "feat(status): add Priority 1 panels — Pipeline, Cron, Engagement"
```

---

## Task 9: Priority 2 panels — Quota, Quark, Content

**Files:**
- Create: `src/components/status/quota-panel.tsx`
- Create: `src/components/status/quark-panel.tsx`
- Create: `src/components/status/content-panel.tsx`

- [ ] **Step 1: Create QuotaPanel**

Create `src/components/status/quota-panel.tsx`:

```typescript
"use client";

import { StatusSentence } from "@/components/ui/status-sentence";
import type { StatusFullResponse } from "@/lib/parsers/types";

interface QuotaPanelProps {
  data: StatusFullResponse;
}

function ProgressBar({ label, pct }: { label: string; pct: number }) {
  const clampedPct = Math.max(0, Math.min(100, pct));
  const color =
    clampedPct > 40 ? "#00D4AA" : clampedPct > 20 ? "#F59E0B" : "#EF4444";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-[#94A3B8]">{label}</span>
        <span className="font-mono font-bold text-[#F1F5F9]">
          {Math.round(clampedPct)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#1E293B]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clampedPct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function computeResetTime(): string {
  const now = new Date();
  // Midnight Central Time
  const ct = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Chicago" })
  );
  const midnight = new Date(ct);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);

  const diffMs = midnight.getTime() - ct.getTime();
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);

  return `Daily resets in ${hours}h ${minutes}m`;
}

export function QuotaPanel({ data }: QuotaPanelProps) {
  const dailyPct = data.quota.raw?.dailyRemaining ?? 100;
  const weeklyPct = data.quota.raw?.weeklyRemaining ?? 100;

  return (
    <div className="space-y-3">
      <StatusSentence level={data.quota.level} sentence={data.quota.sentence} />

      <ProgressBar label="Daily" pct={dailyPct} />
      <ProgressBar label="Weekly" pct={weeklyPct} />

      <p className="text-xs text-[#64748B]">{computeResetTime()}</p>
    </div>
  );
}
```

- [ ] **Step 2: Create QuarkPanel**

Create `src/components/status/quark-panel.tsx`:

```typescript
"use client";

import { StatusSentence } from "@/components/ui/status-sentence";
import { Sparkline } from "@/components/ui/sparkline";
import type { StatusFullResponse } from "@/lib/parsers/types";
import { formatTimeAgo } from "@/lib/utils";

interface QuarkPanelProps {
  data: StatusFullResponse;
}

/**
 * Build 24-hour activity sparkline from cron job lastRun timestamps.
 * Each bucket = 1 hour. Count how many jobs ran in each hour.
 */
function buildActivitySparkline(jobs: StatusFullResponse["cron"]["jobs"]): number[] {
  const buckets = new Array(24).fill(0);
  const now = Date.now();

  for (const job of jobs) {
    if (!job.lastRun) continue;
    const runTime = new Date(job.lastRun).getTime();
    const hoursAgo = Math.floor((now - runTime) / 3600000);
    if (hoursAgo >= 0 && hoursAgo < 24) {
      buckets[23 - hoursAgo]++;
    }
  }

  return buckets;
}

export function QuarkPanel({ data }: QuarkPanelProps) {
  const heartbeat = data.quark.heartbeat;
  const lastHeartbeat = heartbeat?.lastHeartbeat;
  const lastDm = heartbeat?.lastDmTimestamp;

  const sparklineData = buildActivitySparkline(data.cron.jobs);

  return (
    <div className="space-y-3">
      <StatusSentence level={data.quark.level} sentence={data.quark.sentence} />

      {/* Key timestamps */}
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[#94A3B8]">Last heartbeat</span>
          <span className="font-mono text-[#F1F5F9]">
            {lastHeartbeat ? formatTimeAgo(lastHeartbeat) : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#94A3B8]">Last DM check</span>
          <span className="font-mono text-[#F1F5F9]">
            {lastDm ? formatTimeAgo(lastDm) : "—"}
          </span>
        </div>
      </div>

      {/* 24h activity sparkline */}
      <Sparkline data={sparklineData} height={40} />
    </div>
  );
}
```

- [ ] **Step 3: Create ContentPanel**

Create `src/components/status/content-panel.tsx`:

```typescript
"use client";

import type { StatusFullResponse, StatusLevel } from "@/lib/parsers/types";
import { PLATFORM_COLORS } from "@/lib/theme-constants";

interface ContentPanelProps {
  data: StatusFullResponse;
}

const PLATFORM_ABBREV: Record<string, string> = {
  x_post: "X",
  x_thread: "X",
  x: "X",
  tiktok_video: "TT",
  tiktok: "TT",
  reels_video: "IG",
  instagram: "IG",
  youtube: "YT",
  substack: "SS",
};

function getPlatformAbbrev(platform: string): string {
  return PLATFORM_ABBREV[platform] ?? platform.toUpperCase().slice(0, 2);
}

function getPlatformColorForFormat(format: string): string {
  // Map format strings to platform color keys
  if (format.startsWith("x_") || format === "x") return PLATFORM_COLORS.x ?? "#1DA1F2";
  if (format.startsWith("tiktok")) return PLATFORM_COLORS.tiktok ?? "#FF0050";
  if (format.startsWith("reels") || format === "instagram") return PLATFORM_COLORS.instagram ?? "#C13584";
  if (format === "youtube") return PLATFORM_COLORS.youtube ?? "#FF0000";
  if (format === "substack") return PLATFORM_COLORS.substack ?? "#FF6719";
  return "#94A3B8";
}

export function deriveContentLevel(data: StatusFullResponse): StatusLevel {
  const { publishedCount } = data.contentToday;
  if (publishedCount > 0) return "healthy";

  // Check if past noon CT
  const now = new Date();
  const ctHour = parseInt(
    now.toLocaleString("en-US", { timeZone: "America/Chicago", hour: "numeric", hour12: false })
  );
  if (ctHour >= 12) return "warning";
  return "healthy";
}

export function ContentPanel({ data }: ContentPanelProps) {
  const { publishedCount, platforms, publishMode } = data.contentToday;

  // Deduplicate platform abbreviations
  const uniquePlatforms = [...new Set(platforms.map(getPlatformAbbrev))];

  return (
    <div className="space-y-3">
      {/* Published count */}
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-2xl font-bold text-[#F1F5F9]">
          {publishedCount}
        </span>
        <span className="text-sm text-[#94A3B8]">published today</span>
      </div>

      {/* Platform badges */}
      {uniquePlatforms.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {platforms.map((format, i) => (
            <span
              key={`${format}-${i}`}
              className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: getPlatformColorForFormat(format) }}
            >
              {getPlatformAbbrev(format)}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#64748B]">No publishes yet today</p>
      )}

      {/* Publish mode badge */}
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            publishMode === "LIVE"
              ? "bg-[#00D4AA]/20 text-[#00D4AA]"
              : "bg-amber-500/20 text-amber-500"
          }`}
        >
          {publishMode}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/status/quota-panel.tsx src/components/status/quark-panel.tsx src/components/status/content-panel.tsx
git commit -m "feat(status): add Priority 2 panels — Quota, Quark, Content"
```

---

## Task 10: Priority 3 panels — System, Cognitive, Intel, Activity

**Files:**
- Create: `src/components/status/system-panel.tsx`
- Create: `src/components/status/cognitive-panel.tsx`
- Create: `src/components/status/intel-panel.tsx`
- Create: `src/components/status/activity-panel.tsx`

- [ ] **Step 1: Create SystemPanel**

Create `src/components/status/system-panel.tsx`:

```typescript
"use client";

import { RadialGauge } from "@/components/ui/radial-gauge";
import type { StatusFullResponse } from "@/lib/parsers/types";
import { useDashboardStore } from "@/stores/dashboard";

interface SystemPanelProps {
  data: StatusFullResponse;
}

function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `Up ${days}d ${hours}h`;
  return `Up ${hours}h`;
}

export function SystemPanel({ data }: SystemPanelProps) {
  const connected = useDashboardStore((s) => s.connected);
  const { cpu, memory, disk, uptime } = data.system;

  return (
    <div className="space-y-3">
      {/* 3 gauges */}
      <div className="flex items-center justify-around">
        <RadialGauge value={cpu} size={80} label="CPU" />
        <RadialGauge value={memory} size={80} label="MEM" />
        <RadialGauge value={disk} size={80} label="DISK" />
      </div>

      {/* Uptime + SSE */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-[#F1F5F9]">
          {formatUptime(uptime)}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              connected
                ? "bg-emerald-500 animate-[glow-pulse_2s_ease-in-out_infinite]"
                : "bg-red-500"
            }`}
          />
          <span className="text-[#64748B]">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create CognitivePanel**

Create `src/components/status/cognitive-panel.tsx`:

```typescript
"use client";

import type { StatusFullResponse, StatusLevel } from "@/lib/parsers/types";

interface CognitivePanelProps {
  data: StatusFullResponse;
}

function MiniProgressBar({
  label,
  value,
  maxLabel,
}: {
  label: string;
  value: number;
  maxLabel?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between text-xs">
        <span className="text-[#94A3B8]">{label}</span>
        <span className="font-mono text-[#F1F5F9]">
          {maxLabel ?? `${Math.round(pct)}%`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1E293B]">
        <div
          className="h-full rounded-full bg-[#00D4AA] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function deriveCognitiveLevel(data: StatusFullResponse): StatusLevel {
  if (!data.cognitive) return "healthy";
  return data.cognitive.degradationFlags.length > 0 ? "warning" : "healthy";
}

export function CognitivePanel({ data }: CognitivePanelProps) {
  const cog = data.cognitive;

  if (!cog) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-[#64748B]">
        No cognitive data
      </div>
    );
  }

  const { memoryHealth, proactivity, engagement, degradationFlags } = cog;

  // Memory bar: kbFileCount mapped to percentage (cap at 30 files = 100%)
  const memoryPct = Math.min(100, (memoryHealth.kbFileCount / 30) * 100);

  // Proactivity: ratio is 0-1 → percentage
  const proactivityPct = proactivity.ratio * 100;

  // Engagement: replyRate is 0-100
  const engagementPct = engagement.replyRate;

  // KB freshness: kbUpdatedToday / kbFileCount * 100
  const kbFreshPct =
    memoryHealth.kbFileCount > 0
      ? (memoryHealth.kbUpdatedToday / memoryHealth.kbFileCount) * 100
      : 0;

  return (
    <div className="space-y-2">
      <MiniProgressBar
        label="Memory"
        value={memoryPct}
        maxLabel={`${memoryHealth.kbFileCount} files`}
      />
      <MiniProgressBar
        label="Proactivity"
        value={proactivityPct}
      />
      <MiniProgressBar
        label="Engagement"
        value={engagementPct}
        maxLabel={`${Math.round(engagementPct)}%`}
      />
      <MiniProgressBar
        label="KB Fresh"
        value={kbFreshPct}
        maxLabel={`${memoryHealth.kbUpdatedToday}/${memoryHealth.kbFileCount}`}
      />

      {/* Degradation + journal */}
      <div className="flex items-center gap-2 pt-1 text-xs">
        {degradationFlags.length > 0 && (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-500">
            {degradationFlags.length} flag{degradationFlags.length > 1 ? "s" : ""}
          </span>
        )}
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            memoryHealth.journalReflective
              ? "bg-[#00D4AA]/20 text-[#00D4AA]"
              : "bg-white/[0.06] text-[#94A3B8]"
          }`}
        >
          {memoryHealth.journalReflective ? "Reflective" : "Factual"}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create IntelPanel**

Create `src/components/status/intel-panel.tsx`:

```typescript
"use client";

import type { StatusFullResponse } from "@/lib/parsers/types";
import { formatTimeAgo } from "@/lib/utils";

interface IntelPanelProps {
  data: StatusFullResponse;
}

function getViralityColor(virality: number): string {
  if (virality >= 8) return "#00D4AA";
  if (virality >= 5) return "#F59E0B";
  return "#94A3B8";
}

export function IntelPanel({ data }: IntelPanelProps) {
  const trends = data.intel.highSignal.slice(0, 3);

  if (trends.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-[#64748B]">No active signals</p>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-[#475569]">
            <span className="font-mono">—</span>
            <span>—</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {trends.map((trend, i) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <span
            className="shrink-0 font-mono font-bold"
            style={{ color: getViralityColor(trend.virality) }}
          >
            {trend.virality.toFixed(1)}
          </span>
          <span
            className="flex-1 text-[#F1F5F9]"
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "50ch",
            }}
          >
            {trend.title}
          </span>
          <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-[#94A3B8]">
            {trend.source}
          </span>
        </div>
      ))}

      {/* Updated timestamp */}
      <p className="pt-1 text-[10px] text-[#64748B]">
        Updated {formatTimeAgo(data.intel.updatedAt)}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Create ActivityPanel**

Create `src/components/status/activity-panel.tsx`:

```typescript
"use client";

import type { StatusFullResponse } from "@/lib/parsers/types";

interface ActivityPanelProps {
  data: StatusFullResponse;
}

const LEVEL_COLORS: Record<string, string> = {
  info: "#00D4AA",
  warning: "#F59E0B",
  error: "#EF4444",
};

export function ActivityPanel({ data }: ActivityPanelProps) {
  const entries = data.activity;

  if (entries.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-[#64748B]">No activity recorded today</p>
        <div className="flex items-start gap-3 text-xs">
          <span className="shrink-0 font-mono text-[#64748B]">——</span>
          <div className="border-l-2 border-[#475569] pl-3">
            <span className="text-[#64748B]">Waiting for events...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {entries.map((entry, i) => (
        <div key={i} className="flex items-start gap-3 text-xs">
          <span className="shrink-0 font-mono text-[#64748B]" style={{ minWidth: "5ch" }}>
            {entry.timestamp.length > 10
              ? entry.timestamp.slice(0, 10)
              : entry.timestamp}
          </span>
          <div
            className="flex-1 border-l-2 pl-3"
            style={{ borderColor: LEVEL_COLORS[entry.level] ?? "#00D4AA" }}
          >
            <span className="text-[#F1F5F9]">{entry.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/components/status/system-panel.tsx src/components/status/cognitive-panel.tsx src/components/status/intel-panel.tsx src/components/status/activity-panel.tsx
git commit -m "feat(status): add Priority 3 panels — System, Cognitive, Intel, Activity"
```

---

## Task 11: Status page rewrite

**Files:**
- Modify: `src/app/status/page.tsx`

This is the complete rewrite. The old page (67 lines) becomes the new Command Bridge page (~170 lines).

- [ ] **Step 1: Rewrite src/app/status/page.tsx**

Replace the entire contents of `src/app/status/page.tsx` with:

```typescript
"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useApi } from "@/hooks/use-api";
import { useDashboardStore } from "@/stores/dashboard";
import { formatChicago } from "@/lib/utils";
import type { StatusFullResponse } from "@/lib/parsers/types";

import { HeroBanner } from "@/components/status/hero-banner";
import { AlertsStrip } from "@/components/status/alerts-strip";
import { InstrumentPanel } from "@/components/status/instrument-panel";
import { PipelinePanel } from "@/components/status/pipeline-panel";
import { CronPanel } from "@/components/status/cron-panel";
import { EngagementPanel, deriveEngagementLevel } from "@/components/status/engagement-panel";
import { QuotaPanel } from "@/components/status/quota-panel";
import { QuarkPanel } from "@/components/status/quark-panel";
import { ContentPanel, deriveContentLevel } from "@/components/status/content-panel";
import { SystemPanel } from "@/components/status/system-panel";
import { CognitivePanel, deriveCognitiveLevel } from "@/components/status/cognitive-panel";
import { IntelPanel } from "@/components/status/intel-panel";
import { ActivityPanel } from "@/components/status/activity-panel";

import {
  GitBranch,
  Clock,
  MessageCircle,
  Gauge,
  Bot,
  FileText,
  Cpu,
  Brain,
  Radar,
  Activity,
} from "lucide-react";

export default function StatusPage() {
  const { data, loading, error, lastUpdated, refetch } =
    useApi<StatusFullResponse>("/api/status-full", {
      refreshOn: ["heartbeat", "pipeline", "metrics", "digest", "intel", "comms"],
    });

  const connected = useDashboardStore((s) => s.connected);

  // --- Loading state ---
  if (loading && !data) {
    return (
      <AppShell>
        <div className="p-6 space-y-4">
          {/* Hero skeleton */}
          <div className="h-36 animate-pulse rounded-xl bg-white/[0.03]" />
          {/* Alerts skeleton */}
          <div className="h-10 animate-pulse rounded-lg bg-white/[0.03]" />
          {/* Grid skeleton */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`h-44 animate-pulse rounded-xl bg-white/[0.03] ${
                  i >= 6 && i <= 7 ? "md:col-span-2 lg:col-span-1" : ""
                } ${i === 6 ? "lg:col-span-2" : ""} ${i === 9 ? "lg:col-span-2" : ""}`}
              />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  // --- Error state ---
  if (error && !data) {
    return (
      <AppShell>
        <div className="p-6 space-y-4">
          <div
            className="rounded-xl border-b border-[#1E293B] p-6"
            style={{ background: "radial-gradient(ellipse at center, #0E0E14, #0A0A0F)" }}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="font-mono text-4xl font-bold text-red-500">0</div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
                MISSION CONTROL
              </p>
              <p className="text-lg font-semibold text-red-500">Connection Error</p>
              <p className="text-sm text-[#64748B]">{error}</p>
              <button
                onClick={refetch}
                className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/20"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!data) return null;

  return (
    <AppShell>
      <div className="space-y-4 p-6 pb-16">
        {/* Section 1: Hero Banner */}
        <HeroBanner data={data} />

        {/* Section 2: Alerts Strip */}
        <AlertsStrip data={data} />

        {/* Section 3: Instrument Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Row 1: Priority 1 */}
          <InstrumentPanel title="Pipeline" icon={GitBranch} level={data.pipeline.level} href="/content" dataPriority={1}>
            <PipelinePanel data={data} />
          </InstrumentPanel>

          <InstrumentPanel title="Cron Health" icon={Clock} level={data.cron.level} href="/schedule" dataPriority={1}>
            <CronPanel data={data} />
          </InstrumentPanel>

          <InstrumentPanel title="Engagement" icon={MessageCircle} level={deriveEngagementLevel(data)} href="/engagement" dataPriority={1}>
            <EngagementPanel data={data} />
          </InstrumentPanel>

          {/* Row 2: Priority 2 */}
          <InstrumentPanel title="API Quota" icon={Gauge} level={data.quota.level} href="/settings" dataPriority={2}>
            <QuotaPanel data={data} />
          </InstrumentPanel>

          <InstrumentPanel title="Quark Health" icon={Bot} level={data.quark.level} href="/cognitive" dataPriority={2}>
            <QuarkPanel data={data} />
          </InstrumentPanel>

          <InstrumentPanel title="Content Today" icon={FileText} level={deriveContentLevel(data)} href="/content" dataPriority={2}>
            <ContentPanel data={data} />
          </InstrumentPanel>

          {/* Row 3: Priority 3 */}
          <InstrumentPanel title="System Resources" icon={Cpu} level={data.system.level} href="/settings" dataPriority={3} span={2}>
            <SystemPanel data={data} />
          </InstrumentPanel>

          <InstrumentPanel title="Cognitive" icon={Brain} level={deriveCognitiveLevel(data)} href="/cognitive" dataPriority={3}>
            <CognitivePanel data={data} />
          </InstrumentPanel>

          {/* Row 4: Priority 3 */}
          <InstrumentPanel title="Intel Signals" icon={Radar} level="healthy" href="/intel" dataPriority={3}>
            <IntelPanel data={data} />
          </InstrumentPanel>

          <InstrumentPanel title="Activity Feed" icon={Activity} level="healthy" href="/operations" dataPriority={3} span={2}>
            <ActivityPanel data={data} />
          </InstrumentPanel>
        </div>

        {/* Section 4: Footer */}
        <div className="fixed bottom-0 left-0 right-0 z-40 flex h-10 items-center gap-3 border-t border-[#1E293B] bg-[#0A0A0F] px-6 text-xs font-mono text-[#64748B] md:left-60">
          <span className="flex items-center gap-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                connected
                  ? "bg-[#00D4AA] animate-[glow-pulse_2s_ease-in-out_infinite]"
                  : "bg-red-500"
              }`}
            />
            {connected ? "Live" : "Disconnected"}
          </span>
          <span className="text-[#475569]">|</span>
          <span>
            Updated{" "}
            {lastUpdated
              ? formatChicago(lastUpdated, {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true,
                })
              : "—"}
          </span>
          <span className="text-[#475569]">|</span>
          <span>{connected ? "SSE active" : "Refresh: 60s"}</span>
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/status/page.tsx
git commit -m "feat(status): rewrite Status page as Command Bridge with 10 instrument panels"
```

---

## Task 12: Delete old components + cleanup

**Files:**
- Delete: `src/components/status/pipeline-card.tsx`
- Delete: `src/components/status/cron-card.tsx`
- Delete: `src/components/status/quota-card.tsx`
- Delete: `src/components/status/quark-card.tsx`
- Delete: `src/components/status/system-card.tsx`
- Delete: `src/components/status/detail-panel.tsx`

- [ ] **Step 1: Verify no other imports reference these files**

Before deleting, confirm that only the old `status/page.tsx` (now rewritten) imported these components:

```bash
cd /Users/quark/projects/quark-mission-control && grep -rl "pipeline-card\|cron-card\|quota-card\|quark-card\|system-card\|detail-panel" src/ --include="*.tsx" --include="*.ts" | grep -v "__tests__" | grep -v "node_modules"
```

Expected: only old test files (which we will update in Task 13). If any non-test file still imports them, update that file first.

- [ ] **Step 2: Delete the old card components**

```bash
cd /Users/quark/projects/quark-mission-control
rm src/components/status/pipeline-card.tsx
rm src/components/status/cron-card.tsx
rm src/components/status/quota-card.tsx
rm src/components/status/quark-card.tsx
rm src/components/status/system-card.tsx
rm src/components/status/detail-panel.tsx
```

- [ ] **Step 3: Delete old test file that references deleted components**

The file `src/components/status/__tests__/status-cards.test.tsx` imports `PipelineCard`, `CronCard`, and `SystemCard` from the deleted files. Delete it — replacement tests are created in Task 13.

```bash
rm src/components/status/__tests__/status-cards.test.tsx
```

- [ ] **Step 4: Verify build**

```bash
cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit
```

Expected: zero errors. The old page.tsx no longer imports these files.

- [ ] **Step 5: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add -u src/components/status/
git commit -m "chore(status): delete old card components replaced by Command Bridge panels"
```

---

## Task 13: Tests

**Files:**
- Create: `src/lib/__tests__/health-score.test.ts`
- Create: `src/components/status/__tests__/command-bridge.test.tsx`

- [ ] **Step 1: Create health score unit tests**

Create `src/lib/__tests__/health-score.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeHealthScore } from "../status-logic";

describe("computeHealthScore", () => {
  it("returns 100 when all systems are perfect", () => {
    const score = computeHealthScore({
      cronOk: 25,
      cronTotal: 25,
      pipelineStuckCount: 0,
      pipelineQuarantinedCount: 0,
      quotaDailyPct: 100,
      quotaWeeklyPct: 100,
      systemCpu: 0,
      systemMemory: 0,
      systemDisk: 0,
      quarkLevel: "healthy",
    });
    expect(score).toBe(100);
  });

  it("returns 0 when all systems are worst-case", () => {
    const score = computeHealthScore({
      cronOk: 0,
      cronTotal: 25,
      pipelineStuckCount: 0,
      pipelineQuarantinedCount: 3,
      quotaDailyPct: 0,
      quotaWeeklyPct: 0,
      systemCpu: 100,
      systemMemory: 100,
      systemDisk: 100,
      quarkLevel: "critical",
    });
    expect(score).toBe(0);
  });

  it("weights cron at 30% — half crons failed drops score", () => {
    const full = computeHealthScore({
      cronOk: 20,
      cronTotal: 20,
      pipelineStuckCount: 0,
      pipelineQuarantinedCount: 0,
      quotaDailyPct: 100,
      quotaWeeklyPct: 100,
      systemCpu: 0,
      systemMemory: 0,
      systemDisk: 0,
      quarkLevel: "healthy",
    });

    const halfCrons = computeHealthScore({
      cronOk: 10,
      cronTotal: 20,
      pipelineStuckCount: 0,
      pipelineQuarantinedCount: 0,
      quotaDailyPct: 100,
      quotaWeeklyPct: 100,
      systemCpu: 0,
      systemMemory: 0,
      systemDisk: 0,
      quarkLevel: "healthy",
    });

    // Should drop by 15 points (30% * 50 point loss)
    expect(full - halfCrons).toBe(15);
  });

  it("pipeline quarantined zeroes its 20% contribution", () => {
    const noQuarantine = computeHealthScore({
      cronOk: 20,
      cronTotal: 20,
      pipelineStuckCount: 0,
      pipelineQuarantinedCount: 0,
      quotaDailyPct: 100,
      quotaWeeklyPct: 100,
      systemCpu: 0,
      systemMemory: 0,
      systemDisk: 0,
      quarkLevel: "healthy",
    });

    const quarantined = computeHealthScore({
      cronOk: 20,
      cronTotal: 20,
      pipelineStuckCount: 0,
      pipelineQuarantinedCount: 1,
      quotaDailyPct: 100,
      quotaWeeklyPct: 100,
      systemCpu: 0,
      systemMemory: 0,
      systemDisk: 0,
      quarkLevel: "healthy",
    });

    expect(noQuarantine - quarantined).toBe(20);
  });

  it("quark warning drops its 15% contribution by half", () => {
    const healthy = computeHealthScore({
      cronOk: 20,
      cronTotal: 20,
      pipelineStuckCount: 0,
      pipelineQuarantinedCount: 0,
      quotaDailyPct: 100,
      quotaWeeklyPct: 100,
      systemCpu: 0,
      systemMemory: 0,
      systemDisk: 0,
      quarkLevel: "healthy",
    });

    const warning = computeHealthScore({
      cronOk: 20,
      cronTotal: 20,
      pipelineStuckCount: 0,
      pipelineQuarantinedCount: 0,
      quotaDailyPct: 100,
      quotaWeeklyPct: 100,
      systemCpu: 0,
      systemMemory: 0,
      systemDisk: 0,
      quarkLevel: "warning",
    });

    // 15% * 50 = 7.5, rounded
    expect(healthy - warning).toBe(8);
  });

  it("handles zero cron jobs (should default to 100% score for cron)", () => {
    const score = computeHealthScore({
      cronOk: 0,
      cronTotal: 0,
      pipelineStuckCount: 0,
      pipelineQuarantinedCount: 0,
      quotaDailyPct: 100,
      quotaWeeklyPct: 100,
      systemCpu: 0,
      systemMemory: 0,
      systemDisk: 0,
      quarkLevel: "healthy",
    });
    expect(score).toBe(100);
  });

  it("clamps to 0-100 range", () => {
    const score = computeHealthScore({
      cronOk: 30,
      cronTotal: 20, // more OK than total — shouldn't exceed 100
      pipelineStuckCount: 0,
      pipelineQuarantinedCount: 0,
      quotaDailyPct: 150,
      quotaWeeklyPct: 150,
      systemCpu: -10,
      systemMemory: -10,
      systemDisk: -10,
      quarkLevel: "healthy",
    });
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Create Command Bridge component tests**

Create `src/components/status/__tests__/command-bridge.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { StatusFullResponse } from "@/lib/parsers/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock dashboard store
vi.mock("@/stores/dashboard", () => ({
  useDashboardStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({ connected: true, lastEvent: null, refreshKey: 0 }),
    { setState: vi.fn(), getState: () => ({ connected: true }) }
  ),
}));

import { HeroBanner } from "../hero-banner";
import { AlertsStrip } from "../alerts-strip";
import { InstrumentPanel } from "../instrument-panel";
import { PipelinePanel } from "../pipeline-panel";
import { CognitivePanel } from "../cognitive-panel";
import { Activity } from "lucide-react";

function makeMockData(overrides?: Partial<StatusFullResponse>): StatusFullResponse {
  return {
    pipeline: {
      level: "healthy",
      sentence: "No active jobs",
      details: {},
      stuckCount: 0,
      scorecard: {
        published: 3,
        killed: 1,
        stale: 0,
        pending: 0,
        avgTimeToPublish: 1200,
        contentTypeBreakdown: { proof: 2, hot_take: 1 },
      },
    },
    cron: {
      level: "healthy",
      sentence: "All 25 jobs healthy",
      details: {},
      jobs: [
        {
          id: "1",
          name: "Morning",
          schedule: "0 5 * * *",
          scheduleHuman: "5:00 AM",
          timezone: "America/Chicago",
          model: "codex",
          status: "ok",
          lastRun: new Date(Date.now() - 600000).toISOString(),
          nextRun: null,
          lastRunMs: null,
          nextRunMs: null,
          agentId: null,
          enabled: true,
        },
      ],
    },
    quota: {
      level: "healthy",
      sentence: "68% remaining, pace normal",
      details: {},
      raw: { dailyRemaining: 68, dailyLabel: "68%", weeklyRemaining: 55, weeklyLabel: "55%" },
    },
    quark: {
      level: "healthy",
      sentence: "Active, 14/14 runs OK (6h)",
      details: {},
      heartbeat: {
        lastHeartbeat: new Date(Date.now() - 300000).toISOString(),
        lastDmTimestamp: new Date(Date.now() - 600000).toISOString(),
        lastMentionId: null,
        lastDigestTimestamp: null,
        lastProactiveSuggestionDate: null,
      },
    },
    system: {
      level: "healthy",
      sentence: "CPU 35% · Mem 52% · Disk 45%",
      details: {},
      cpu: 35,
      memory: 52,
      disk: 45,
      uptime: 864000,
      osVersion: "Darwin 25.3.0",
    },
    engagement: {
      today: { total: 17, byPlatform: { x: 10, tiktok: 5, instagram: 2 }, byAction: { reply: 12, like: 5 } },
      inboundGap: { replyRate: 85, unansweredCount: 3 },
      guardrailBlocks: 1,
    },
    cognitive: {
      memoryHealth: {
        kbFileCount: 26,
        kbUpdatedToday: 4,
        userMdLastModified: null,
        userMdStaleDays: 1,
        identityMdLastModified: null,
        identityMdStaleDays: 2,
        journalWordCount: 350,
        journalReflectiveMarkers: 3,
        journalReflective: true,
        memoryMdLineCount: 200,
        captureQueuePromoted: 2,
      },
      proactivity: {
        surpriseMeSent: 1,
        curiosityQuestions: 2,
        socialEngagements: 5,
        commentReplies: 3,
        proactiveTotal: 8,
        reactiveTotal: 6,
        ratio: 0.57,
      },
      engagement: {
        xReplies: 4,
        tiktokReplies: 2,
        youtubeReplies: 0,
        instagramReplies: 1,
        substackReplies: 0,
        totalReceived: 20,
        totalReplied: 17,
        replyRate: 85,
      },
      degradationFlags: [],
    },
    intel: {
      highSignal: [
        { title: "Claude 4.5 released", source: "HN", virality: 9.2, confidence: "high", expiry: "48h", angle: "test" },
      ],
      updatedAt: new Date().toISOString(),
    },
    contentToday: {
      publishedCount: 2,
      platforms: ["x_post", "tiktok_video"],
      publishMode: "LIVE",
    },
    activity: [
      { timestamp: "5-7 AM", text: "Morning routine completed", level: "info" },
      { timestamp: "7-9 AM", text: "Pipeline job published", level: "info" },
    ],
    healthScore: 92,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe("HeroBanner", () => {
  it("renders health score and status sentence", () => {
    render(<HeroBanner data={makeMockData()} />);
    expect(screen.getByText("92")).toBeInTheDocument();
    expect(screen.getByText("Systems Operational")).toBeInTheDocument();
    expect(screen.getByText("MISSION CONTROL")).toBeInTheDocument();
  });

  it("shows Degraded when health score < 80", () => {
    render(<HeroBanner data={makeMockData({ healthScore: 65 })} />);
    expect(screen.getByText("Degraded Performance")).toBeInTheDocument();
  });

  it("shows Critical when any card is critical", () => {
    render(
      <HeroBanner
        data={makeMockData({
          cron: {
            level: "critical",
            sentence: "3/25 failed",
            details: {},
            jobs: [],
          },
        })}
      />
    );
    expect(screen.getByText("Critical Issues Detected")).toBeInTheDocument();
  });

  it("renders all 5 KPI pills", () => {
    render(<HeroBanner data={makeMockData()} />);
    expect(screen.getByText("Crons OK")).toBeInTheDocument();
    expect(screen.getByText("Stuck")).toBeInTheDocument();
    expect(screen.getByText("Quota")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getByText("Uptime")).toBeInTheDocument();
  });
});

describe("AlertsStrip", () => {
  it("shows 'All systems nominal' when all healthy", () => {
    render(<AlertsStrip data={makeMockData()} />);
    // With publishedCount > 0, there will be an informational chip
    expect(screen.getByText("2 published today")).toBeInTheDocument();
  });

  it("shows nominal chip when no alerts and no publishes", () => {
    const data = makeMockData({
      contentToday: { publishedCount: 0, platforms: [], publishMode: "WARMUP" },
    });
    render(<AlertsStrip data={data} />);
    expect(screen.getByText("All systems nominal")).toBeInTheDocument();
  });

  it("generates critical chips for failed crons", () => {
    const data = makeMockData({
      cron: {
        level: "critical",
        sentence: "2/25 failed",
        details: {},
        jobs: [
          {
            id: "a",
            name: "Evening",
            schedule: "",
            scheduleHuman: "",
            timezone: "",
            model: "",
            status: "error",
            lastRun: null,
            nextRun: null,
            lastRunMs: null,
            nextRunMs: null,
            agentId: null,
            enabled: true,
          },
        ],
      },
    });
    render(<AlertsStrip data={data} />);
    expect(screen.getByText('Cron "Evening" failed')).toBeInTheDocument();
  });
});

describe("InstrumentPanel", () => {
  it("renders title, icon, status dot, and children", () => {
    render(
      <InstrumentPanel
        title="Activity Feed"
        icon={Activity}
        level="healthy"
        href="/operations"
        dataPriority={3}
      >
        <p>Test content</p>
      </InstrumentPanel>
    );
    expect(screen.getByText("Activity Feed")).toBeInTheDocument();
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });
});

describe("PipelinePanel", () => {
  it("renders metrics from scorecard", () => {
    render(<PipelinePanel data={makeMockData()} />);
    expect(screen.getByText("No active jobs")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // published today
    expect(screen.getByText("1")).toBeInTheDocument(); // killed
  });
});

describe("CognitivePanel", () => {
  it("renders progress bars when cognitive data present", () => {
    render(<CognitivePanel data={makeMockData()} />);
    expect(screen.getByText("Memory")).toBeInTheDocument();
    expect(screen.getByText("Proactivity")).toBeInTheDocument();
    expect(screen.getByText("Engagement")).toBeInTheDocument();
    expect(screen.getByText("KB Fresh")).toBeInTheDocument();
    expect(screen.getByText("Reflective")).toBeInTheDocument();
  });

  it("shows empty state when cognitive is null", () => {
    render(<CognitivePanel data={makeMockData({ cognitive: null })} />);
    expect(screen.getByText("No cognitive data")).toBeInTheDocument();
  });

  it("shows degradation badge when flags present", () => {
    const cog = makeMockData().cognitive!;
    render(
      <CognitivePanel
        data={makeMockData({
          cognitive: {
            ...cog,
            degradationFlags: ["stale_memory", "low_proactivity"],
          },
        })}
      />
    );
    expect(screen.getByText("2 flags")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/quark/projects/quark-mission-control && npx vitest run 2>&1 | tail -30
```

Expected: all tests pass, including the new `health-score.test.ts` and `command-bridge.test.tsx`.

If existing tests fail because they imported deleted components (the old `status-cards.test.tsx` was deleted in Task 12), that is expected and already handled.

- [ ] **Step 4: Commit**

```bash
git add src/lib/__tests__/health-score.test.ts src/components/status/__tests__/command-bridge.test.tsx
git commit -m "test(status): add health score and Command Bridge component tests"
```

---

## Task 14: Build + smoke test

**Files:** None (verification only)

- [ ] **Step 1: TypeScript check**

```bash
cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 2: Production build**

```bash
cd /Users/quark/projects/quark-mission-control && npm run build 2>&1 | tail -30
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Run all tests**

```bash
cd /Users/quark/projects/quark-mission-control && npx vitest run 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 4: Smoke test API**

```bash
cd /Users/quark/projects/quark-mission-control && npm run dev &
sleep 4
curl -s http://localhost:3000/api/status-full | python3 -m json.tool | head -40
```

Verify the response includes:
- `healthScore` (integer 0-100)
- `pipeline` with `stuckCount` and `scorecard`
- `cron` with `jobs` array
- `engagement` with `today`, `inboundGap`, `guardrailBlocks`
- `cognitive` (object or null)
- `intel` with `highSignal`
- `contentToday` with `publishedCount`, `platforms`, `publishMode`
- `activity` array
- `timestamp`

- [ ] **Step 5: Visual smoke test**

Open `http://localhost:3000/status` in a browser and verify:

1. Hero banner shows health ring, "MISSION CONTROL" title, and 5 KPI pills
2. Alerts strip shows chips (or "All systems nominal")
3. 10 instrument panels render in a 3-column grid on desktop
4. Each panel shows a status dot, title, chevron, and data content
5. Clicking a panel navigates to the correct detail page
6. Footer shows SSE status, timestamp, and refresh info
7. Responsive: resize to mobile width (375px) and verify panels stack in 1 column, ordered by priority

- [ ] **Step 6: Stop dev server**

```bash
kill %1 2>/dev/null || true
```

No commit for this task (verification only).

---

## Summary of All Commits

| Order | Message |
|-------|---------|
| 1 | `feat(status): add StatusFullResponse type + /api/status-full aggregated endpoint` |
| 2 | `feat(ui): add CircularGauge full-circle SVG gauge component` |
| 3 | `feat(ui): add Sparkline SVG component with gradient fill` |
| 4 | `feat(status): add CronHeatmap grid component` |
| 5 | `feat(status): add InstrumentPanel reusable panel wrapper` |
| 6 | `feat(status): add HeroBanner with health ring and KPI pills` |
| 7 | `feat(status): add AlertsStrip scrollable alert chip bar` |
| 8 | `feat(status): add Priority 1 panels — Pipeline, Cron, Engagement` |
| 9 | `feat(status): add Priority 2 panels — Quota, Quark, Content` |
| 10 | `feat(status): add Priority 3 panels — System, Cognitive, Intel, Activity` |
| 11 | `feat(status): rewrite Status page as Command Bridge with 10 instrument panels` |
| 12 | `chore(status): delete old card components replaced by Command Bridge panels` |
| 13 | `test(status): add health score and Command Bridge component tests` |
| 14 | (verification only, no commit) |
