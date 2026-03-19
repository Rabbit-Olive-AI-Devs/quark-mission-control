# MC Remaining Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the 4 remaining MC pages (Schedule, Inbox, Content, Explore) to complete the 6-page redesign.

**Architecture:** Each page uses `useApi` hook with SSE-triggered refetch. Pages wrap in `AppShell`. Cinematic Ops visual language. Reuse shared components (InstrumentPanel, Sparkline, StatusSentence, etc.).

**Tech Stack:** Next.js 16, TypeScript, Tailwind v4, Framer Motion, Zustand, Vitest

**Spec:** `docs/superpowers/specs/2026-03-19-mc-remaining-pages-design.md`

**Repo:** `/Users/quark/projects/quark-mission-control`

---

## Existing Codebase Reference

### Shared Components Available for Reuse

| Component | File | Props |
|-----------|------|-------|
| `AppShell` | `src/components/layout/app-shell.tsx` | `children` — page wrapper with sidebar nav |
| `GlassCard` | `src/components/ui/glass-card.tsx` | `children, className?, hover?, delay?` — motion.div with fade-in, glass styling |
| `StatusDot` | `src/components/ui/status-dot.tsx` | `status: "ok"|"warning"|"error"|"idle"|"active", size?: "sm"|"md"|"lg", pulse?` |
| `StatusSentence` | `src/components/ui/status-sentence.tsx` | `level: StatusLevel, sentence: string` — dot + text |
| `Sparkline` | `src/components/ui/sparkline.tsx` | `data: number[], color?, height?` — SVG mini chart |
| `HoverCard` | `src/components/ui/hover-card.tsx` | `children, content` — hover tooltip |
| `ErrorBoundary` | `src/components/ui/error-boundary.tsx` | `children` — catches render errors |
| `InstrumentPanel` | `src/components/status/instrument-panel.tsx` | `title, icon, level, href, dataPriority, span?, children` — dashboard card with nav |
| `CardFooter` | `src/components/ui/card-footer.tsx` | Footer utility |
| `AgentAvatar` | `src/components/ui/agent-avatar.tsx` | `name, size?, glow?` |

### Data Hook

`useApi<T>(url, { refreshOn?: string[] })` — returns `{ data: T|null, loading, error, lastUpdated, refetch }`. SSE-triggered refetch on event types, 60s poll fallback.

### Available Formatters (`src/lib/utils.ts`)

- `formatRelativeTime(date: Date)` — "5m ago", "2h ago", "3d ago"
- `formatTimeAgo(input: string|number|Date)` — same, accepts any input
- `formatTimeShort(input)` — "3:45 PM" in Chicago
- `formatDateTime(input)` — "Mar 16, 3:45 PM" in Chicago
- `formatChicago(input, options?)` — custom Intl formatting in Chicago TZ
- `todayDateString()` — "2026-03-19" in Chicago
- `cn(...inputs)` — Tailwind merge

### Theme Constants (`src/lib/theme-constants.ts`)

- `STATUS_COLORS` — ok/error/warning/idle/published/killed/etc.
- `TYPE_COLORS` — proof/news_relay/viral_ride/hot_take/war_story/reaction
- `PLATFORM_COLORS` — x/tiktok/youtube/instagram/substack
- `ACTION_COLORS` — like/reply/retweet/follow/bookmark/etc.
- `ACCENT` — `{ primary: "#00D4AA", purple: "#7C3AED", bg: "#0A0A0F", text: "#F1F5F9", muted: "#94A3B8", border: "rgba(255,255,255,0.08)" }`
- `formatElapsed(seconds)` — "45s", "3m 12s", "1h 5m"
- `getPlatformColor(platform)`, `getActionColor(action)`

### Key TypeScript Interfaces (`src/lib/parsers/types.ts`)

- `CronJob` — `{ id, name, schedule, scheduleHuman, timezone, model, status, lastRun, nextRun, lastRunMs, nextRunMs, agentId, enabled }`
- `PipelineJob` — `{ jobId, status, contentType, lane, viralityScore, viralitySource, topic, createdAt, elapsed, publishTargets, stages, killedReason? }`
- `PipelineScorecard` — `{ published, killed, stale, pending, avgTimeToPublish, contentTypeBreakdown }`
- `PipelineData` — `{ activeJob, jobs[], scorecard, weights }`
- `EngagementData` — `{ actions[], today, trends[], guardrailBlocks[], inboundGap, mode, unifiedKpis, sourceCoverage }`
- `EngagementAction` — `{ timestamp, platform, action, targetId, targetAuthor, text, autonomous, guardrailResult, source }`
- `InboundGap` — `{ totalReceived, totalReplied, replyRate, byPlatform, unansweredCount, dataDate }`
- `EngagementUnifiedKpis` — `{ visibility, engagement, responsiveness, growth, conversion }`
- `AgentStatus` — `{ config: AgentConfig, latestComms, latestTimestamp, hasInbound, hasOutbound }`
- `CommsMessage` — `{ content, direction, timestamp }`
- `BroadcastStatus` — `{ mode, standingOrders[], log[] }`
- `IntelReport` — `{ date, compiled, highSignal[], rising[], nicheSignals[], suggestions[] }`
- `IntelTrend` — `{ title, source, virality, confidence, expiry, angle }`
- `ContentPost` — `{ id, date, hook, hookType, platform, metrics: { views, likes, comments, shares } }`
- `PendingActions` — `{ dmDrafts[], xDrafts[], emailDrafts[], notes[] }`
- `StatusFullResponse` — includes `contentToday: { publishedCount, platforms, publishMode }`, `engagement`, `cognitive`, `intel`, `activity`, `oauth`, `healthScore`
- `StatusLevel` — `"healthy" | "warning" | "critical"`

### Existing API Endpoints

| Endpoint | Returns | Notes |
|----------|---------|-------|
| `/api/schedule` | `{ jobs: CronJob[], summary: { total, ok, failed } }` | Calls `parseCronList()` |
| `/api/cron-history` | `{ history: [], reliability, note }` | **Stub** — returns empty, says use `/api/command-center` |
| `/api/pipeline` | `PipelineData` | `parsePipelineData()` |
| `/api/engagement` | `EngagementData` | `parseEngagement()` |
| `/api/agents` | `{ agents: AgentStatus[], broadcast: BroadcastStatus, comms: Record<string, CommsMessage[]> }` | Ensures MSE-6 always present |
| `/api/comms?agent=name` | `{ messages: CommsMessage[] }` | Per-agent comms history |
| `/api/intel?date=YYYY-MM-DD` | `IntelReport` | Date-navigable |
| `/api/knowledge?slug=path` | File content or `{ files: KnowledgeFile[] }` | Dual-mode: list or read |
| `/api/memory?slug=path` | File content or `{ files: MemoryFile[] }` | Dual-mode |
| `/api/pending` | `PendingActions` | `parsePending()` |
| `/api/content` | `{ posts: ContentPost[], hookCategories, calendar, hookLibrary }` | Content log + trackers |
| `/api/status-full` | `StatusFullResponse` | Aggregated status with all subsystems |

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `src/components/schedule/reliability-dots.tsx` | 7-day pass/fail sparkline dots |
| `src/components/inbox/inbox-section.tsx` | Collapsible section with count badge |
| `src/components/inbox/inbox-item.tsx` | Generic action item row |
| `src/components/inbox/inbox-unanswered.tsx` | Unanswered comments/DMs section |
| `src/components/inbox/inbox-approvals.tsx` | Pending pipeline approvals section |
| `src/components/inbox/inbox-escalations.tsx` | Agent escalation items section |
| `src/components/inbox/inbox-stale.tsx` | Stale items section |
| `src/components/content/content-hero-kpis.tsx` | 4-card KPI hero row |
| `src/components/content/content-top-posts.tsx` | Sortable post performance table |
| `src/components/content/content-platform-breakdown.tsx` | Recharts bar chart by platform |
| `src/components/content/content-whats-next.tsx` | Pipeline queue + suggestions |
| `src/components/explore/explore-tabs.tsx` | 3-tab controller with URL param |
| `src/components/explore/explore-knowledge.tsx` | Knowledge tab body (extracted from page) |
| `src/components/explore/explore-intel.tsx` | Intel tab body (extracted from page) |
| `src/components/explore/explore-agents.tsx` | Agents tab body (extracted from page) |
| `src/components/explore/agent-comms-timeline.tsx` | Structured comms feed |
| `src/components/explore/comms-entry.tsx` | Single comms message row |

### Modified Files

| File | Change |
|------|--------|
| `src/app/schedule/page.tsx` | Add sort-by-failure toggle, reliability data, remove model name from cards |
| `src/app/inbox/page.tsx` | Replace placeholder with full inbox page |
| `src/app/content/page.tsx` | Replace pipeline-only view with performance page |
| `src/app/explore/page.tsx` | Replace placeholder with 3-tab explore page |
| `src/app/intel/page.tsx` | Replace with redirect to `/explore?tab=intel` |
| `src/app/knowledge/page.tsx` | Replace with redirect to `/explore?tab=knowledge` |
| `src/app/agents/page.tsx` | Replace with redirect to `/explore?tab=agents` |
| `src/components/schedule/timeline-view.tsx` | Accept sort toggle prop, pass reliability to JobCard |
| `src/components/schedule/job-card.tsx` | Add reliability dots, last-run outcome text, remove model name |
| `src/components/intel/trend-card.tsx` | Add uniform virality bar, confidence badge, relevance badge |
| `src/components/knowledge/file-list.tsx` | Add search filter, file size labels, relative time |
| `src/components/knowledge/reader-pane.tsx` | Add 200-line limit with "Show more" button |
| `src/components/agents/agent-card.tsx` | Add tasks-today count, improved status logic, remove fiction references |
| `src/app/api/schedule/route.ts` | Extend response to include `recentRuns` per job |

---

## Tasks

### Task 1: Schedule Page Rewrite

**Goal:** Enhance the existing Schedule page with failure sorting, reliability sparklines per job, and improved job cards that show outcome text instead of model names.

**Files:**
- Modify: `src/app/api/schedule/route.ts`
- Modify: `src/app/schedule/page.tsx`
- Modify: `src/components/schedule/timeline-view.tsx`
- Modify: `src/components/schedule/job-card.tsx`
- Create: `src/components/schedule/reliability-dots.tsx`

#### Step 1: Extend `/api/schedule` with recent run data

- [ ] **Step 1a: Add `recentRuns` to schedule API response**

In `src/app/api/schedule/route.ts`, the current response shape is `{ jobs: CronJob[], summary }`. Extend each job with a `recentRuns` array. Since the `cron-history` API is a stub, derive reliability from the `lastRunMs` + `status` fields for now — each job gets a synthetic `recentRuns` based on available state data.

Replace the entire file content:

```typescript
import { NextResponse } from "next/server";
import { parseCronList } from "@/lib/parsers/cron";

export const dynamic = "force-dynamic";

export interface CronRunEntry {
  timestamp: string;
  status: "ok" | "error";
  durationMs: number;
}

export interface ScheduleJob {
  id: string;
  name: string;
  schedule: string;
  scheduleHuman: string;
  timezone: string;
  model: string;
  status: string;
  lastRun: string | null;
  nextRun: string | null;
  lastRunMs: number | null;
  nextRunMs: number | null;
  agentId: string | null;
  enabled: boolean;
  recentRuns: CronRunEntry[];
}

export async function GET() {
  const jobs = parseCronList();

  // Build recentRuns from available state.
  // Currently we only have the latest run per job from openclaw cron list.
  // Generate a single-entry array from lastRunMs + status.
  // When cron-history API is implemented, replace this with real 7-day data.
  const enriched: ScheduleJob[] = jobs.map((job) => {
    const recentRuns: CronRunEntry[] = [];
    if (job.lastRunMs) {
      recentRuns.push({
        timestamp: new Date(job.lastRunMs).toISOString(),
        status: job.status === "error" ? "error" : "ok",
        durationMs: 0, // Duration not available from cron list
      });
    }
    return { ...job, recentRuns };
  });

  return NextResponse.json({
    jobs: enriched,
    summary: {
      total: jobs.length,
      ok: jobs.filter((j) => j.status === "ok").length,
      failed: jobs.filter(
        (j) => j.status !== "ok" && j.status !== "idle" && j.status !== "unknown" && j.status !== "disabled"
      ).length,
    },
  });
}
```

#### Step 2: Create reliability dots component

- [ ] **Step 2a: Create `src/components/schedule/reliability-dots.tsx`**

A compact 7-dot indicator showing pass/fail history. Each dot is green (ok) or red (error). If fewer than 7 runs available, remaining dots are gray.

```typescript
"use client";

interface ReliabilityDotsProps {
  /** Array of "ok" | "error" statuses, most recent last. Max 7 shown. */
  runs: Array<{ status: "ok" | "error" }>;
}

const DOT_COLORS = {
  ok: "bg-emerald-500",
  error: "bg-red-500",
  empty: "bg-white/10",
};

export function ReliabilityDots({ runs }: ReliabilityDotsProps) {
  // Pad to 7 entries (empty on the left, recent on the right)
  const padded = Array.from({ length: 7 }, (_, i) => {
    const idx = i - (7 - runs.length);
    return idx >= 0 ? runs[idx] : null;
  });

  return (
    <div className="flex items-center gap-0.5" title={`${runs.filter(r => r.status === "ok").length}/${runs.length} recent runs passed`}>
      {padded.map((run, i) => (
        <span
          key={i}
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            run ? DOT_COLORS[run.status] : DOT_COLORS.empty
          }`}
        />
      ))}
    </div>
  );
}
```

#### Step 3: Update JobCard

- [ ] **Step 3a: Modify `src/components/schedule/job-card.tsx`**

Changes to the existing `JobCard`:
1. Import and render `ReliabilityDots` in both compact and expanded views
2. Add last-run outcome text: "completed in 45s" (green) or "failed: timeout" (red)
3. **Remove** model name display (line `{job.model.split("/").pop()}` in the expanded card)
4. Accept new `recentRuns` prop

In the compact view, add reliability dots after the last-run time:
```tsx
// After the formatRelative span in compact view:
{recentRuns.length > 0 && <ReliabilityDots runs={recentRuns} />}
```

In the expanded view, replace the model name section with last-run outcome:
```tsx
// Replace: <div className="mt-2 text-[10px] text-[#64748B] font-mono truncate">{job.model.split("/").pop()}</div>
// With:
<div className="flex items-center gap-2 mt-2">
  <ReliabilityDots runs={recentRuns} />
  {job.lastRunMs && (
    <span className={`text-[10px] font-mono ${job.status === "error" ? "text-[#EF4444]" : "text-[#10B981]"}`}>
      {job.status === "error" ? "failed" : "completed"} {formatRelative(job.lastRunMs)}
    </span>
  )}
</div>
```

The `JobCardProps` interface must be updated:
```typescript
interface JobCardProps {
  job: CronJob;
  compact?: boolean;
  delay?: number;
  recentRuns?: Array<{ status: "ok" | "error" }>;
}
```

#### Step 4: Update TimelineView with sort toggle

- [ ] **Step 4a: Modify `src/components/schedule/timeline-view.tsx`**

Add a `failedFirst` prop to `TimelineViewProps`:
```typescript
interface TimelineViewProps {
  jobs: CronJob[];
  view: "daily" | "weekly";
  failedFirst?: boolean;
  recentRunsMap?: Record<string, Array<{ status: "ok" | "error" }>>;
}
```

When `failedFirst` is true, in both the daily and weekly views, sort jobs within each slot so that failed/error jobs appear first:
```typescript
const sortedJobs = failedFirst
  ? [...slotJobs].sort((a, b) => {
      const aFailed = a.status === "error" ? 0 : 1;
      const bFailed = b.status === "error" ? 0 : 1;
      return aFailed - bFailed;
    })
  : slotJobs;
```

Pass `recentRuns` through to each `JobCard`:
```tsx
<JobCard key={job.id} job={job} compact recentRuns={recentRunsMap?.[job.id] || []} />
```

#### Step 5: Update Schedule page

- [ ] **Step 5a: Modify `src/app/schedule/page.tsx`**

Add state for `failedFirst` toggle. Build a `recentRunsMap` from the extended API response. Wire into `TimelineView`.

Add the sort toggle in the header (between the view toggle and refresh button):
```tsx
<label className="flex items-center gap-2 text-xs text-[#94A3B8] cursor-pointer">
  <input
    type="checkbox"
    checked={failedFirst}
    onChange={(e) => setFailedFirst(e.target.checked)}
    className="rounded border-white/20 bg-white/5 text-[#EF4444] focus:ring-[#EF4444]/50"
  />
  Failed first
</label>
```

Add red left-border glow to the Failed summary card when `summary.failed > 0`:
```tsx
<GlassCard className={`text-center ${summary.failed > 0 ? "border-l-2 border-[#EF4444] shadow-[inset_4px_0_8px_-4px_rgba(239,68,68,0.3)]" : ""}`} delay={0.15}>
```

Update the data type to use the extended `ScheduleJob` instead of `CronJob`:
```typescript
const { data, loading, refetch } = useApi<{
  jobs: Array<CronJob & { recentRuns: Array<{ status: "ok" | "error" }> }>;
  summary: { total: number; ok: number; failed: number };
}>("/api/schedule", { refreshOn: ["heartbeat"] });
```

Build `recentRunsMap`:
```typescript
const recentRunsMap = useMemo(() => {
  const map: Record<string, Array<{ status: "ok" | "error" }>> = {};
  for (const job of jobs) {
    map[job.id] = (job as any).recentRuns || [];
  }
  return map;
}, [jobs]);
```

**Verification:**
- `npx tsc --noEmit` — zero new errors
- Schedule page loads with sort toggle, reliability dots visible on job cards
- Failed card glows red when there are failures

---

### Task 2: Inbox Page

**Goal:** Replace the placeholder Inbox page with a consolidated "needs your attention" queue. Four collapsible sections: Unanswered, Pending Approvals, Escalations, Stale Items. Data composed from multiple existing APIs.

**Files:**
- Rewrite: `src/app/inbox/page.tsx`
- Create: `src/components/inbox/inbox-section.tsx`
- Create: `src/components/inbox/inbox-item.tsx`
- Create: `src/components/inbox/inbox-unanswered.tsx`
- Create: `src/components/inbox/inbox-approvals.tsx`
- Create: `src/components/inbox/inbox-escalations.tsx`
- Create: `src/components/inbox/inbox-stale.tsx`

#### Step 1: Create InboxSection component

- [ ] **Step 1a: Create `src/components/inbox/inbox-section.tsx`**

A collapsible section wrapper with icon, title, count badge, and expand/collapse toggle.

```typescript
"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import type { LucideIcon } from "lucide-react";

interface InboxSectionProps {
  title: string;
  icon: LucideIcon;
  count: number;
  color: string;
  emptyMessage: string;
  delay?: number;
  children: ReactNode;
}

export function InboxSection({ title, icon: Icon, count, color, emptyMessage, delay = 0, children }: InboxSectionProps) {
  const [open, setOpen] = useState(count > 0);

  return (
    <GlassCard delay={delay}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 text-left"
      >
        <Icon size={16} style={{ color }} />
        <span className="text-sm font-medium text-[#F1F5F9] flex-1">{title}</span>
        {count > 0 && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {count}
          </span>
        )}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} className="text-[#94A3B8]" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-white/5">
              {count === 0 ? (
                <p className="text-xs text-[#94A3B8] py-2 text-center">{emptyMessage}</p>
              ) : (
                children
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
```

#### Step 2: Create InboxItem component

- [ ] **Step 2a: Create `src/components/inbox/inbox-item.tsx`**

Generic item row: platform/type icon on left, description text in middle, age badge on right.

```typescript
"use client";

import type { ReactNode } from "react";

interface InboxItemProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  age: string;
  ageColor?: string;
  action?: { label: string; onClick: () => void };
}

export function InboxItem({ icon, title, subtitle, age, ageColor = "#94A3B8", action }: InboxItemProps) {
  return (
    <div className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-white/[0.03] transition-colors">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#F1F5F9] truncate">{title}</p>
        {subtitle && <p className="text-[10px] text-[#94A3B8] truncate mt-0.5">{subtitle}</p>}
      </div>
      <span className="text-[10px] font-mono shrink-0" style={{ color: ageColor }}>{age}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="text-[10px] px-2 py-1 rounded bg-[#00D4AA]/10 text-[#00D4AA] hover:bg-[#00D4AA]/20 transition-colors shrink-0"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
```

#### Step 3: Create section components

- [ ] **Step 3a: Create `src/components/inbox/inbox-unanswered.tsx`**

Renders unanswered items from `EngagementData`. Filters `actions` for inbound items that haven't been replied to, groups by platform. Shows platform icon, author, text preview (60 chars), and age.

Data source: `EngagementData.inboundGap.byPlatform` for counts, `EngagementData.actions` filtered by `direction: "inbound"` type actions. Since `EngagementAction` doesn't have a "replied" flag directly, use `inboundGap.unansweredCount` for the count and show the most recent inbound actions.

```typescript
"use client";

import { InboxItem } from "./inbox-item";
import { formatTimeAgo } from "@/lib/utils";
import { getPlatformColor } from "@/lib/theme-constants";
import type { EngagementAction, InboundGap } from "@/lib/parsers/types";

interface InboxUnansweredProps {
  actions: EngagementAction[];
  inboundGap: InboundGap;
}

export function InboxUnanswered({ actions, inboundGap }: InboxUnansweredProps) {
  // Show recent inbound actions as representative unanswered items
  // Filter for actions that look like inbound (received comments, mentions, DMs)
  const inbound = actions
    .filter((a) => ["comment", "mention", "dm", "reply"].includes(a.action) && a.targetAuthor)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) // oldest first
    .slice(0, inboundGap.unansweredCount || 5);

  return (
    <div className="space-y-1">
      {inbound.map((item, i) => (
        <InboxItem
          key={`${item.platform}-${item.targetId}-${i}`}
          icon={
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: getPlatformColor(item.platform) }}
            />
          }
          title={item.text.length > 60 ? item.text.slice(0, 60) + "..." : item.text}
          subtitle={`${item.targetAuthor} on ${item.platform}`}
          age={formatTimeAgo(item.timestamp)}
          ageColor={
            Date.now() - new Date(item.timestamp).getTime() > 86400000
              ? "#EF4444"
              : "#F59E0B"
          }
        />
      ))}
      {inbound.length === 0 && inboundGap.unansweredCount > 0 && (
        <p className="text-xs text-[#94A3B8] py-2">
          {inboundGap.unansweredCount} unanswered across platforms (details unavailable)
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3b: Create `src/components/inbox/inbox-approvals.tsx`**

Shows pipeline jobs with `status === "preview_sent"` — these are awaiting Thiago's go/kill/redo decision.

```typescript
"use client";

import { InboxItem } from "./inbox-item";
import { formatTimeAgo } from "@/lib/utils";
import { TYPE_COLORS } from "@/lib/theme-constants";
import type { PipelineJob } from "@/lib/parsers/types";

interface InboxApprovalsProps {
  jobs: PipelineJob[];
}

export function InboxApprovals({ jobs }: InboxApprovalsProps) {
  const pending = jobs
    .filter((j) => j.status === "preview_sent")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // oldest first

  return (
    <div className="space-y-1">
      {pending.map((job) => (
        <InboxItem
          key={job.jobId}
          icon={
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: TYPE_COLORS[job.contentType] || "#94A3B8" }}
            />
          }
          title={job.topic || job.jobId}
          subtitle={`${job.contentType} — virality ${job.viralityScore}/10`}
          age={formatTimeAgo(job.createdAt)}
          ageColor="#7C3AED"
          action={{ label: "Review", onClick: () => {} }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3c: Create `src/components/inbox/inbox-escalations.tsx`**

Scans agent comms for escalation keywords.

```typescript
"use client";

import { InboxItem } from "./inbox-item";
import { formatTimeAgo } from "@/lib/utils";
import type { AgentStatus } from "@/lib/parsers/types";

const ESCALATION_KEYWORDS = ["escalat", "needs attention", "blocked", "failed", "urgent", "critical", "error"];

interface InboxEscalationsProps {
  agents: AgentStatus[];
}

export function InboxEscalations({ agents }: InboxEscalationsProps) {
  const escalations = agents
    .filter((a) => {
      const text = a.latestComms.toLowerCase();
      return ESCALATION_KEYWORDS.some((kw) => text.includes(kw));
    })
    .sort((a, b) => {
      const aTime = a.latestTimestamp ? new Date(a.latestTimestamp).getTime() : 0;
      const bTime = b.latestTimestamp ? new Date(b.latestTimestamp).getTime() : 0;
      return bTime - aTime; // most recent first
    });

  return (
    <div className="space-y-1">
      {escalations.map((agent) => (
        <InboxItem
          key={agent.config.name}
          icon={
            <span className="inline-block w-2 h-2 rounded-full bg-[#EF4444]" />
          }
          title={`${agent.config.name}: ${agent.latestComms.length > 80 ? agent.latestComms.slice(0, 80) + "..." : agent.latestComms}`}
          subtitle={agent.config.description.split("\u2014")[0]?.trim()}
          age={agent.latestTimestamp ? formatTimeAgo(agent.latestTimestamp) : "unknown"}
          ageColor="#EF4444"
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3d: Create `src/components/inbox/inbox-stale.tsx`**

Shows pipeline jobs that are non-terminal and older than 4 hours (excluding `preview_sent`).

```typescript
"use client";

import { InboxItem } from "./inbox-item";
import { formatTimeAgo } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/theme-constants";
import type { PipelineJob } from "@/lib/parsers/types";

const TERMINAL_STATUSES = new Set(["published", "completed", "killed", "quarantined", "preview_sent"]);
const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

interface InboxStaleProps {
  jobs: PipelineJob[];
}

export function InboxStale({ jobs }: InboxStaleProps) {
  const stale = jobs
    .filter((j) => {
      if (TERMINAL_STATUSES.has(j.status)) return false;
      const age = Date.now() - new Date(j.createdAt).getTime();
      return age > STALE_THRESHOLD_MS;
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // oldest first

  return (
    <div className="space-y-1">
      {stale.map((job) => {
        const ageHours = Math.floor((Date.now() - new Date(job.createdAt).getTime()) / 3600000);
        return (
          <InboxItem
            key={job.jobId}
            icon={
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[job.status] || "#F59E0B" }}
              />
            }
            title={`${job.jobId}: stuck at "${job.status}" for ${ageHours}h`}
            subtitle={job.topic || "No topic"}
            age={formatTimeAgo(job.createdAt)}
            ageColor="#F59E0B"
          />
        );
      })}
    </div>
  );
}
```

#### Step 4: Write the Inbox page

- [ ] **Step 4a: Rewrite `src/app/inbox/page.tsx`**

Composes data from `/api/engagement`, `/api/pipeline`, `/api/agents`, `/api/pending`. Renders header with total count badge, summary sentence, and 4 collapsible sections.

```typescript
"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { StatusSentence } from "@/components/ui/status-sentence";
import { InboxSection } from "@/components/inbox/inbox-section";
import { InboxUnanswered } from "@/components/inbox/inbox-unanswered";
import { InboxApprovals } from "@/components/inbox/inbox-approvals";
import { InboxEscalations } from "@/components/inbox/inbox-escalations";
import { InboxStale } from "@/components/inbox/inbox-stale";
import { useApi } from "@/hooks/use-api";
import { Inbox, MessageCircle, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { formatTimeShort } from "@/lib/utils";
import type { EngagementData, PipelineData, AgentStatus } from "@/lib/parsers/types";

const ESCALATION_KEYWORDS = ["escalat", "needs attention", "blocked", "failed", "urgent", "critical", "error"];
const TERMINAL_STATUSES = new Set(["published", "completed", "killed", "quarantined", "preview_sent"]);
const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000;

export default function InboxPage() {
  const { data: engagement, lastUpdated: engUpdated } = useApi<EngagementData>("/api/engagement", { refreshOn: ["engagement"] });
  const { data: pipeline } = useApi<PipelineData>("/api/pipeline", { refreshOn: ["pipeline"] });
  const { data: agentsData } = useApi<{ agents: AgentStatus[] }>("/api/agents", { refreshOn: ["comms"] });

  const agents = agentsData?.agents || [];
  const jobs = pipeline?.jobs || [];

  const counts = useMemo(() => {
    const unanswered = engagement?.inboundGap?.unansweredCount || 0;
    const approvals = jobs.filter((j) => j.status === "preview_sent").length;
    const escalations = agents.filter((a) => {
      const text = a.latestComms.toLowerCase();
      return ESCALATION_KEYWORDS.some((kw) => text.includes(kw));
    }).length;
    const stale = jobs.filter((j) => {
      if (TERMINAL_STATUSES.has(j.status)) return false;
      return Date.now() - new Date(j.createdAt).getTime() > STALE_THRESHOLD_MS;
    }).length;
    return { unanswered, approvals, escalations, stale, total: unanswered + approvals + escalations + stale };
  }, [engagement, jobs, agents]);

  const summaryLevel = counts.total === 0 ? "healthy" : counts.total <= 3 ? "warning" : "critical";
  const summarySentence = counts.total === 0
    ? "Nothing needs your attention"
    : `${counts.total} item${counts.total !== 1 ? "s" : ""} need${counts.total === 1 ? "s" : ""} your attention`;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold flex items-center gap-3 text-[#F1F5F9]">
            <Inbox size={24} className="text-[#00D4AA]" />
            Inbox
            {counts.total > 0 && (
              <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-[#00D4AA]/20 text-[#00D4AA]">
                {counts.total}
              </span>
            )}
          </h1>
          {engUpdated && (
            <span className="text-[10px] text-[#64748B] font-mono">
              Updated {formatTimeShort(engUpdated)}
            </span>
          )}
        </div>

        <div className="mb-6">
          <StatusSentence level={summaryLevel} sentence={summarySentence} />
        </div>

        {/* Full-page empty state */}
        {counts.total === 0 && !engagement && !pipeline ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
            <Inbox size={48} className="mb-4 opacity-20" />
            <p className="text-sm">Nothing needs your attention right now.</p>
            <p className="text-[10px] mt-1 opacity-50">Check back later.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <InboxSection
              title="Unanswered"
              icon={MessageCircle}
              count={counts.unanswered}
              color="#F59E0B"
              emptyMessage="All caught up — no unanswered comments or DMs"
              delay={0}
            >
              {engagement && (
                <InboxUnanswered
                  actions={engagement.actions}
                  inboundGap={engagement.inboundGap}
                />
              )}
            </InboxSection>

            <InboxSection
              title="Pending Approvals"
              icon={CheckCircle2}
              count={counts.approvals}
              color="#7C3AED"
              emptyMessage="No pipeline jobs awaiting approval"
              delay={0.05}
            >
              <InboxApprovals jobs={jobs} />
            </InboxSection>

            <InboxSection
              title="Agent Escalations"
              icon={AlertTriangle}
              count={counts.escalations}
              color="#EF4444"
              emptyMessage="No agent escalations"
              delay={0.1}
            >
              <InboxEscalations agents={agents} />
            </InboxSection>

            <InboxSection
              title="Stale Items"
              icon={Clock}
              count={counts.stale}
              color="#F59E0B"
              emptyMessage="Nothing stale — all items are progressing"
              delay={0.15}
            >
              <InboxStale jobs={jobs} />
            </InboxSection>
          </div>
        )}
      </div>
    </AppShell>
  );
}
```

**Verification:**
- `npx tsc --noEmit` — zero new errors
- Inbox page loads, shows correct section counts
- Empty state appears when all sections are empty
- Sections collapse/expand with animation

---

### Task 3: Content Page Rewrite

**Goal:** Replace the pipeline-only Content page with a publishing performance view. Four zones: Hero KPIs (4 cards), Top Posts table, Platform Breakdown chart, and What's Next queue.

**Files:**
- Rewrite: `src/app/content/page.tsx`
- Create: `src/components/content/content-hero-kpis.tsx`
- Create: `src/components/content/content-top-posts.tsx`
- Create: `src/components/content/content-platform-breakdown.tsx`
- Create: `src/components/content/content-whats-next.tsx`

**Note:** Keep existing `pipeline-tracker.tsx`, `pipeline-scorecard.tsx`, `job-history.tsx` files untouched — they are still used by the Status/Command Bridge page.

#### Step 1: Create ContentHeroKpis

- [ ] **Step 1a: Create `src/components/content/content-hero-kpis.tsx`**

4 `GlassCard`s in a 2x2/4x1 grid. Cards: Best Performer, Published This Week, Engagement Rate (with Sparkline), Followers.

Data sources:
- `ContentPost[]` from `/api/content` for best performer
- `PipelineScorecard.published` from `/api/pipeline` for published count
- `EngagementUnifiedKpis` from `/api/engagement` for engagement rate + followers
- `DailyAggregate[]` from `EngagementData.trends` for sparkline data

Props:
```typescript
interface ContentHeroKpisProps {
  posts: ContentPost[];
  scorecard: PipelineScorecard | null;
  kpis: EngagementUnifiedKpis | null;
  trends: DailyAggregate[];
  publishMode: "LIVE" | "WARMUP" | null;
}
```

Each card:
1. **Best Performer** — Find post with highest `views + likes + comments + shares`. Show hook text (60 chars), platform badge, total engagement. Empty: "No posts this week".
2. **Published This Week** — `scorecard.published` big number. Subtext: platforms list.
3. **Engagement Rate** — `kpis.engagement.engagementRate` as percentage. 7-day `Sparkline` from `trends.map(t => t.total)`. `HoverCard`: "Interactions / impressions. Above 3% is strong."
4. **Followers** — `kpis.growth.followerDelta`. Green if positive, red if negative.

#### Step 2: Create ContentTopPosts

- [ ] **Step 2a: Create `src/components/content/content-top-posts.tsx`**

Sortable table of `ContentPost[]` ranked by total engagement. Columns: hook preview (60 chars), platform badge, likes, comments, shares, views. Click to expand inline showing full text.

Props:
```typescript
interface ContentTopPostsProps {
  posts: ContentPost[];
}
```

Features:
- Time filter pills: 7d | 30d | All (default 7d). Filter by `post.date` relative to today.
- Platform filter pills: All | X | TikTok | IG | YouTube | Substack. Filter by `post.platform`.
- Sort by total engagement (descending) by default.
- Click row to expand and show full `hook` text.
- Empty: "No published posts yet. Posts will appear here after publishing."
- Mobile: horizontal-scroll wrapper on the table.

#### Step 3: Create ContentPlatformBreakdown

- [ ] **Step 3a: Create `src/components/content/content-platform-breakdown.tsx`**

Recharts `BarChart` showing average engagement per post per platform. One bar per platform, colored by `PLATFORM_COLORS`.

Props:
```typescript
interface ContentPlatformBreakdownProps {
  posts: ContentPost[];
}
```

Logic:
- Group posts by platform.
- For each platform: compute average total engagement (views + likes + comments + shares) / post count.
- Render as a `BarChart` with `ResponsiveContainer`.
- `HoverCard` on each bar for exact numbers.
- Empty: "Publish to multiple platforms to see comparison."

Uses: `import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"` and `PLATFORM_COLORS`.

#### Step 4: Create ContentWhatsNext

- [ ] **Step 4a: Create `src/components/content/content-whats-next.tsx`**

Shows pipeline queue (upcoming non-terminal jobs) and content suggestions from intel.

Props:
```typescript
interface ContentWhatsNextProps {
  jobs: PipelineJob[];
  suggestions: string[];
}
```

Layout:
- List of upcoming jobs: status dot, content type badge, topic (truncated), age.
- Divider.
- Content suggestions (top 3) from `IntelReport.suggestions`.
- Empty: "No queued content. Submit new ideas via the content pipeline."

#### Step 5: Rewrite Content page

- [ ] **Step 5a: Rewrite `src/app/content/page.tsx`**

Composes data from `/api/pipeline`, `/api/engagement`, `/api/content`, `/api/status-full`, and `/api/intel`.

```typescript
"use client";

import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/ui/glass-card";
import { ContentHeroKpis } from "@/components/content/content-hero-kpis";
import { ContentTopPosts } from "@/components/content/content-top-posts";
import { ContentPlatformBreakdown } from "@/components/content/content-platform-breakdown";
import { ContentWhatsNext } from "@/components/content/content-whats-next";
import { useApi } from "@/hooks/use-api";
import { Clapperboard } from "lucide-react";
import { formatTimeShort } from "@/lib/utils";
import type { PipelineData, EngagementData, ContentPost, IntelReport, StatusFullResponse } from "@/lib/parsers/types";

export default function ContentPage() {
  const { data: pipeline } = useApi<PipelineData>("/api/pipeline", { refreshOn: ["pipeline"] });
  const { data: engagement } = useApi<EngagementData>("/api/engagement", { refreshOn: ["engagement"] });
  const { data: content } = useApi<{ posts: ContentPost[] }>("/api/content");
  const { data: statusFull, lastUpdated } = useApi<StatusFullResponse>("/api/status-full", { refreshOn: ["heartbeat"] });
  const { data: intel } = useApi<IntelReport>("/api/intel");

  const posts = content?.posts || [];
  const publishMode = statusFull?.contentToday?.publishMode || null;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clapperboard size={22} className="text-[#00D4AA]" />
            <h1 className="text-xl font-semibold text-[#F1F5F9]">Content</h1>
            {publishMode && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                publishMode === "LIVE"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/20 text-amber-400"
              }`}>
                {publishMode}
              </span>
            )}
          </div>
          {lastUpdated && (
            <span className="text-[10px] text-[#64748B] font-mono">
              Updated {formatTimeShort(lastUpdated)}
            </span>
          )}
        </div>

        {/* Hero KPIs */}
        <ContentHeroKpis
          posts={posts}
          scorecard={pipeline?.scorecard || null}
          kpis={engagement?.unifiedKpis || null}
          trends={engagement?.trends || []}
          publishMode={publishMode}
        />

        {/* Top Posts */}
        <div>
          <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">Top Posts</h2>
          <ContentTopPosts posts={posts} />
        </div>

        {/* Bottom split: Platform Breakdown + What's Next */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">Platform Breakdown</h2>
            <ContentPlatformBreakdown posts={posts} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">What's Next</h2>
            <ContentWhatsNext
              jobs={pipeline?.jobs || []}
              suggestions={intel?.suggestions || []}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
```

**Verification:**
- `npx tsc --noEmit` — zero new errors
- Content page loads with hero KPIs, posts table, platform chart, what's next queue
- Publish mode badge shows LIVE (green) or WARMUP (amber)
- Empty states display correctly when no data

---

### Task 4: Explore Page (3 tabs)

**Goal:** Replace the placeholder Explore page with a 3-tab layout (Knowledge, Intel, Agents). Each tab extracts the body from the existing standalone page into a reusable component. URL param controls active tab.

**Files:**
- Rewrite: `src/app/explore/page.tsx`
- Create: `src/components/explore/explore-tabs.tsx`
- Create: `src/components/explore/explore-knowledge.tsx`
- Create: `src/components/explore/explore-intel.tsx`
- Create: `src/components/explore/explore-agents.tsx`
- Create: `src/components/explore/agent-comms-timeline.tsx`
- Create: `src/components/explore/comms-entry.tsx`

#### Step 1: Create ExploreTabs controller

- [ ] **Step 1a: Create `src/components/explore/explore-tabs.tsx`**

3 pill buttons (Knowledge | Intel | Agents) with count badges. Uses URL searchParam `?tab=` for state, defaulting to `knowledge`. Tab changes update URL without page reload via `useRouter().replace()`.

```typescript
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { BookOpen, Radio, Users } from "lucide-react";

export type ExploreTab = "knowledge" | "intel" | "agents";

interface ExploreTabsProps {
  counts: {
    knowledge: number;
    intel: number;
    agents: number;
  };
  activeTab: ExploreTab;
  onTabChange: (tab: ExploreTab) => void;
}

const TABS: Array<{ key: ExploreTab; label: string; icon: typeof BookOpen }> = [
  { key: "knowledge", label: "Knowledge", icon: BookOpen },
  { key: "intel", label: "Intel", icon: Radio },
  { key: "agents", label: "Agents", icon: Users },
];

export function ExploreTabs({ counts, activeTab, onTabChange }: ExploreTabsProps) {
  return (
    <div className="flex gap-2">
      {TABS.map(({ key, label, icon: Icon }) => {
        const isActive = activeTab === key;
        const count = counts[key];
        return (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? "bg-[#00D4AA]/20 text-[#00D4AA]"
                : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-white/5"
            }`}
          >
            <Icon size={14} />
            {label}
            {count > 0 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                isActive ? "bg-[#00D4AA]/30" : "bg-white/10"
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

#### Step 2: Create ExploreKnowledge tab

- [ ] **Step 2a: Create `src/components/explore/explore-knowledge.tsx`**

Extract the body of `src/app/knowledge/page.tsx` (everything inside `<AppShell>`) into this component. The component receives no props — it fetches its own data with `useApi`.

Key differences from the standalone page:
1. No `<AppShell>` wrapper (the parent Explore page provides it)
2. No `<h1>` header (the parent Explore page provides it)
3. **Add search input** above the file list: `<input>` that filters files by name match (client-side, instant). Filter `memoryFiles` and `kbFiles` by `file.name.toLowerCase().includes(searchTerm)`.
4. **File size labels**: In `FileList`, replace raw KB count with human terms: `< 1 KB` = "short note", `1-5 KB` = "quick read", `5-20 KB` = "detailed doc", `> 20 KB` = "reference".
5. **Relative time**: Show `formatTimeAgo(file.modified)` next to each file instead of formatted date.

For the search filter, add state in this component and pass a `searchFilter` prop to `FileList`:
```typescript
const [search, setSearch] = useState("");
const filteredMemory = memoryFiles.filter((f) =>
  f.name.toLowerCase().includes(search.toLowerCase())
);
const filteredKb = kbFiles.filter((f) =>
  f.name.toLowerCase().includes(search.toLowerCase())
);
```

The search input should appear above the `TabBar`:
```tsx
<input
  type="text"
  placeholder="Search files..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="w-full px-3 py-2 mb-3 rounded-lg bg-white/5 border border-white/10 text-xs text-[#F1F5F9] placeholder-[#64748B] focus:border-[#00D4AA]/50 focus:outline-none"
/>
```

#### Step 3: Create ExploreIntel tab

- [ ] **Step 3a: Create `src/components/explore/explore-intel.tsx`**

Extract the body of `src/app/intel/page.tsx` into this component.

Key differences:
1. No `<AppShell>` wrapper or `<h1>` header
2. **Remove** `TrendRadar` component entirely (the radar chart)
3. **Keep:** `SignalSummary`, date navigation, `TrendSection`s, content suggestions
4. **Modify `TrendCard`** (in a separate file change — see Task 4 Step 6): Add uniform virality bar for all cards, confidence badge ("High" green / "Medium" amber / "Low" gray), relevance badge

This component handles its own data fetching:
```typescript
const today = todayDateString();
const [archiveDate, setArchiveDate] = useState(today);
const { data, loading } = useApi<IntelReport>(`/api/intel?date=${archiveDate}`, ["intel"]);
```

The `SignalSummary` and `TrendSection` helper components from the original intel page should be inlined in this file (they are not exported or shared).

#### Step 4: Create ExploreAgents tab

- [ ] **Step 4a: Create `src/components/explore/explore-agents.tsx`**

Extract the body of `src/app/agents/page.tsx` into this component.

Key differences:
1. No `<AppShell>` wrapper or `<h1>` header
2. **Remove** fiction/lore references from `AgentCard` (the `agentFiction` map and its rendering — this is a modification to `src/components/agents/agent-card.tsx`, see Step 7)
3. **Add** `AgentCommsTimeline` below the agent cards grid
4. **Keep:** Agent cards grid, broadcast mode banner, `StatusDot`, model badge

Data fetching:
```typescript
const { data, loading } = useApi<{ agents: AgentStatus[]; broadcast: BroadcastStatus; comms: Record<string, CommsMessage[]> }>(
  "/api/agents",
  { refreshOn: ["comms"] }
);
```

#### Step 5: Create AgentCommsTimeline and CommsEntry

- [ ] **Step 5a: Create `src/components/explore/comms-entry.tsx`**

A single comms message row: timestamp, agent name badge, direction indicator, one-line summary. Expandable to show full content.

```typescript
"use client";

import { useState } from "react";
import { formatTimeAgo, formatTimeShort } from "@/lib/utils";
import type { CommsMessage } from "@/lib/parsers/types";

interface CommsEntryProps {
  message: CommsMessage;
  agentName: string;
}

export function CommsEntry({ message, agentName }: CommsEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const preview = message.content.length > 100
    ? message.content.slice(0, 100) + "..."
    : message.content;

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
    >
      <div className="flex items-center gap-2 text-[10px]">
        {message.timestamp && (
          <span className="text-[#64748B] font-mono shrink-0">
            {formatTimeShort(message.timestamp)}
          </span>
        )}
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
          message.direction === "inbound"
            ? "bg-[#7C3AED]/20 text-[#A78BFA]"
            : "bg-[#00D4AA]/20 text-[#00D4AA]"
        }`}>
          {agentName}
        </span>
        <span className="text-[#64748B]">
          {message.direction === "inbound" ? "\u2192" : "\u2190"}
        </span>
      </div>
      <p className="text-xs text-[#F1F5F9] mt-1 leading-relaxed">
        {expanded ? message.content : preview}
      </p>
      {message.content.length > 100 && (
        <span className="text-[9px] text-[#00D4AA] mt-0.5 inline-block">
          {expanded ? "Show less" : "Show more"}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 5b: Create `src/components/explore/agent-comms-timeline.tsx`**

A timeline of all agent comms, merged and sorted by timestamp. Filter dropdown by agent.

```typescript
"use client";

import { useState, useMemo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { CommsEntry } from "./comms-entry";
import { MessageSquare } from "lucide-react";
import type { CommsMessage } from "@/lib/parsers/types";

interface AgentCommsTimelineProps {
  comms: Record<string, CommsMessage[]>;
  agentNames: string[];
}

export function AgentCommsTimeline({ comms, agentNames }: AgentCommsTimelineProps) {
  const [filter, setFilter] = useState<string>("all");

  const entries = useMemo(() => {
    const all: Array<{ agentName: string; message: CommsMessage }> = [];
    for (const name of agentNames) {
      const key = name.toLowerCase();
      const messages = comms[key] || [];
      for (const msg of messages) {
        all.push({ agentName: name, message: msg });
      }
    }
    // Sort by timestamp, most recent first
    return all
      .filter((e) => filter === "all" || e.agentName.toLowerCase() === filter)
      .sort((a, b) => {
        const aTime = a.message.timestamp ? new Date(a.message.timestamp).getTime() : 0;
        const bTime = b.message.timestamp ? new Date(b.message.timestamp).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 50); // Limit to 50 entries
  }, [comms, agentNames, filter]);

  return (
    <GlassCard delay={0.15}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[#F1F5F9] flex items-center gap-2">
          <MessageSquare size={14} className="text-[#00D4AA]" />
          Comms Timeline
        </h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-[#94A3B8] focus:outline-none"
        >
          <option value="all">All agents</option>
          {agentNames.map((name) => (
            <option key={name} value={name.toLowerCase()}>{name}</option>
          ))}
        </select>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-[#94A3B8] py-4 text-center">No comms messages</p>
      ) : (
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {entries.map((entry, i) => (
            <CommsEntry
              key={`${entry.agentName}-${i}`}
              message={entry.message}
              agentName={entry.agentName}
            />
          ))}
        </div>
      )}
    </GlassCard>
  );
}
```

#### Step 6: Modify TrendCard for uniform virality + badges

- [ ] **Step 6a: Modify `src/components/intel/trend-card.tsx`**

Changes:
1. The virality bar already exists — ensure it always renders even when `virality` is 0 (currently it does).
2. Replace the raw confidence icon ("H"/"M"/"L") with a full badge label: "High" (green bg), "Medium" (amber bg), "Low" (gray bg). Change the existing `confidenceIcon` function to return the full word.
3. Add a "Relevant to you" badge when the trend title matches keywords from the content pillars. For now, hardcode a check against common keywords: `["openclaw", "ai agent", "cli", "developer tool", "automation", "local llm", "mcp"]`. If the title (lowercased) contains any keyword, show a small cyan badge "Relevant".

In the top-right area next to the confidence badge, add:
```tsx
{isRelevant && (
  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00D4AA]/15 text-[#00D4AA] font-medium">
    Relevant
  </span>
)}
```

Compute relevance:
```typescript
const RELEVANCE_KEYWORDS = ["openclaw", "ai agent", "cli", "developer tool", "automation", "local llm", "mcp", "claude", "cursor", "codex"];
const isRelevant = RELEVANCE_KEYWORDS.some((kw) => trend.title.toLowerCase().includes(kw));
```

Change `confidenceIcon` to return full labels:
```typescript
function confidenceLabel(confidence: string): string {
  const c = confidence.toLowerCase();
  if (c === "high" || c === "confirmed") return "High";
  if (c === "medium" || c === "likely") return "Medium";
  return "Low";
}
```

#### Step 7: Modify AgentCard

- [ ] **Step 7a: Modify `src/components/agents/agent-card.tsx`**

Changes:
1. **Remove** the `agentFiction` map and the fiction rendering: delete the `const agentFiction` object and the `{fiction && (...)}` JSX block.
2. **Add** "Tasks today" count — derive from comms today. Accept a new prop `tasksToday?: number` and show it as a badge if > 0:
```tsx
{tasksToday !== undefined && tasksToday > 0 && (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#00D4AA]/15 text-[#00D4AA]">
    {tasksToday} today
  </span>
)}
```
3. **Improve status logic**: Instead of just checking `hasInbound`, add error detection:
```typescript
const statusKey = (() => {
  const commsLower = agent.latestComms.toLowerCase();
  if (["error", "failed", "crash"].some((kw) => commsLower.includes(kw))) return "error" as const;
  if (agent.latestTimestamp) {
    const hoursSince = (Date.now() - new Date(agent.latestTimestamp).getTime()) / 3600000;
    if (hoursSince < 1) return "active" as const;
  }
  return "idle" as const;
})();
```

Update `AgentCardProps`:
```typescript
interface AgentCardProps {
  agent: AgentStatus;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  tasksToday?: number;
}
```

#### Step 8: Write the Explore page

- [ ] **Step 8a: Rewrite `src/app/explore/page.tsx`**

```typescript
"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ExploreTabs, type ExploreTab } from "@/components/explore/explore-tabs";
import { ExploreKnowledge } from "@/components/explore/explore-knowledge";
import { ExploreIntel } from "@/components/explore/explore-intel";
import { ExploreAgents } from "@/components/explore/explore-agents";
import { useApi } from "@/hooks/use-api";
import { Compass } from "lucide-react";
import type { IntelReport, AgentStatus } from "@/lib/parsers/types";

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get("tab") as ExploreTab) || "knowledge";
  const [tab, setTab] = useState<ExploreTab>(initialTab);

  // Lightweight data for tab count badges
  const { data: intelData } = useApi<IntelReport>("/api/intel");
  const { data: agentsData } = useApi<{ agents: AgentStatus[] }>("/api/agents", { refreshOn: ["comms"] });

  const handleTabChange = (newTab: ExploreTab) => {
    setTab(newTab);
    router.replace(`/explore?tab=${newTab}`, { scroll: false });
  };

  const intelCount = intelData
    ? (intelData.highSignal?.length || 0) + (intelData.rising?.length || 0) + (intelData.nicheSignals?.length || 0)
    : 0;

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-3 text-[#F1F5F9]">
          <Compass size={24} className="text-[#00D4AA]" />
          Explore
        </h1>
        <ExploreTabs
          counts={{
            knowledge: 0, // Will be populated once knowledge tab loads
            intel: intelCount,
            agents: agentsData?.agents?.length || 0,
          }}
          activeTab={tab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Tab content */}
      {tab === "knowledge" && <ExploreKnowledge />}
      {tab === "intel" && <ExploreIntel />}
      {tab === "agents" && <ExploreAgents />}
    </>
  );
}

export default function ExplorePage() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto">
        <Suspense fallback={<div className="animate-pulse h-64 bg-white/5 rounded" />}>
          <ExploreContent />
        </Suspense>
      </div>
    </AppShell>
  );
}
```

**Verification:**
- `npx tsc --noEmit` — zero new errors
- Explore page loads with 3 tabs
- URL param updates when switching tabs
- Each tab renders its content correctly
- Knowledge tab has search, Intel tab has no radar chart, Agents tab has comms timeline

---

### Task 5: Old Route Redirects + Cleanup

**Goal:** Redirect old standalone pages (/intel, /knowledge, /agents) to their new Explore tab locations. Verify all pages load.

**Files:**
- Modify: `src/app/intel/page.tsx`
- Modify: `src/app/knowledge/page.tsx`
- Modify: `src/app/agents/page.tsx`

#### Step 1: Add redirects

- [ ] **Step 1a: Replace `src/app/intel/page.tsx` with redirect**

```typescript
import { redirect } from "next/navigation";

export default function IntelRedirect() {
  redirect("/explore?tab=intel");
}
```

- [ ] **Step 1b: Replace `src/app/knowledge/page.tsx` with redirect**

```typescript
import { redirect } from "next/navigation";

export default function KnowledgeRedirect() {
  redirect("/explore?tab=knowledge");
}
```

- [ ] **Step 1c: Replace `src/app/agents/page.tsx` with redirect**

```typescript
import { redirect } from "next/navigation";

export default function AgentsRedirect() {
  redirect("/explore?tab=agents");
}
```

#### Step 2: Verify navigation

- [ ] **Step 2a: Check sidebar navigation**

In `src/components/ui/sidebar.tsx`, verify that the navigation links point to the correct routes. The sidebar should have entries for: Status, Schedule, Inbox, Content, Explore, Settings. Old entries for /intel, /knowledge, /agents should either be removed or point to /explore?tab=... if they still exist.

- [ ] **Step 2b: Verify no broken imports**

After replacing the three pages with redirects, the old imports (`TrendCard`, `AgentCard`, `FileList`, `ReaderPane`, `TabBar`, etc.) are only used by the new `explore-*.tsx` components. Verify there are no orphaned imports.

**Verification:**
- Visiting `/intel` redirects to `/explore?tab=intel`
- Visiting `/knowledge` redirects to `/explore?tab=knowledge`
- Visiting `/agents` redirects to `/explore?tab=agents`
- Sidebar navigation works for all 6 pages

---

### Task 6: Tests + Build Verification

**Goal:** Add basic render tests for each new page, verify TypeScript compilation, production build, and test suite.

**Files:**
- Create: `src/app/schedule/__tests__/schedule.test.tsx`
- Create: `src/app/inbox/__tests__/inbox.test.tsx`
- Create: `src/app/content/__tests__/content.test.tsx`
- Create: `src/app/explore/__tests__/explore.test.tsx`

#### Step 1: Write render tests

- [ ] **Step 1a: Schedule page test**

Test that the Schedule page renders without crashing. Mock `useApi` to return sample data with `recentRuns`. Verify summary cards appear, sort toggle exists, timeline renders.

- [ ] **Step 1b: Inbox page test**

Test that the Inbox page renders without crashing. Mock multiple `useApi` calls for engagement, pipeline, agents. Verify 4 sections appear. Test empty state when all counts are 0.

- [ ] **Step 1c: Content page test**

Test that the Content page renders without crashing. Mock multiple APIs. Verify hero KPIs render, publish mode badge appears.

- [ ] **Step 1d: Explore page test**

Test that the Explore page renders with tab navigation. Mock `useSearchParams`. Verify all 3 tabs render when clicked. Test that URL updates on tab change.

#### Step 2: Build verification

- [ ] **Step 2a: TypeScript check**

```bash
cd /Users/quark/projects/quark-mission-control
npx tsc --noEmit
```

Must produce zero errors.

- [ ] **Step 2b: Production build**

```bash
cd /Users/quark/projects/quark-mission-control
npm run build
```

Must complete successfully.

- [ ] **Step 2c: Test suite**

```bash
cd /Users/quark/projects/quark-mission-control
npx vitest run
```

All tests must pass.

- [ ] **Step 2d: Smoke test all pages**

Manually navigate to each page and verify:
- `/status` — existing, still works
- `/schedule` — sort toggle, reliability dots, no model names
- `/inbox` — 4 sections, counts, empty states
- `/content` — hero KPIs, posts table, platform chart, what's next
- `/explore` — 3 tabs work, URL params persist
- `/explore?tab=knowledge` — search input, file browser
- `/explore?tab=intel` — no radar chart, confidence badges, relevance badges
- `/explore?tab=agents` — no fiction refs, comms timeline, tasks today
- `/intel` (old) — redirects to `/explore?tab=intel`
- `/knowledge` (old) — redirects to `/explore?tab=knowledge`
- `/agents` (old) — redirects to `/explore?tab=agents`
- `/settings` — existing, still works

---

## Summary

| Task | New Files | Modified Files | New Components | Effort |
|------|-----------|----------------|----------------|--------|
| 1. Schedule | 1 | 4 | 1 (ReliabilityDots) | Small |
| 2. Inbox | 6 | 1 (page) | 6 | Medium |
| 3. Content | 4 | 1 (page) | 4 | Medium |
| 4. Explore | 6 | 3 (TrendCard, AgentCard, page) | 6 | Large |
| 5. Redirects | 0 | 3 (old pages) | 0 | Tiny |
| 6. Tests | 4 | 0 | 0 | Small |
| **Total** | **21** | **12** | **17** | |

Estimated total: 2-3 sessions. Tasks are independent and can be built in parallel (except Task 5 depends on Task 4 being complete).
