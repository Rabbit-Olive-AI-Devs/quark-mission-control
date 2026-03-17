# Mission Control Revamp — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul Mission Control performance (eliminate blocking `execSync`, parallelize parsers, trim payloads) and rebuild all non-cinematic pages with consolidated page structure (14→10 pages, 10→6 dashboard widgets).

**Architecture:** Two-phase approach. Phase 1 fixes shared infrastructure (snapshot endpoint, caching, theme constants, timezone utils). Phase 2 rebuilds pages one at a time, each with its own parser optimization and cinematic UI. Pages that merge (Cron+Calendar→Schedule, Metrics+CommandCenter→Operations, MemoryBrowser+Knowledge→Knowledge) get new combined parsers.

**Tech Stack:** Next.js 16 (App Router), React 19, TailwindCSS 4, Framer Motion, Recharts, Zustand, TypeScript 5.9

**Design Spec:** `docs/superpowers/specs/2026-03-16-mission-control-revamp-design.md`

**Dev Guide:** `~/.openclaw/workspace/shared/mission-control/mission-control-dev-guide.md`

**Critical Rules:**
- NEVER create `src/middleware.ts` — Next.js 16 uses `src/proxy.ts`
- Visual direction: "Cinematic Ops" — dark sci-fi, glassmorphism, `#0A0A0F` bg, `#00D4AA` accent, `#7C3AED` accent-purple
- All timestamps must display in `America/Chicago` timezone
- Existing cinematic pages (`/content`, `/cognitive`, `/engagement`) are reference implementations — match their quality

---

## Phase 1 — Performance Foundation

### Task 1: Snapshot Endpoint — Parallelize Parsers & Cache execSync

**Goal:** Convert sequential parser calls to parallel. Replace blocking `execSync` with cached async wrappers. Target: snapshot response time from ~10-15s to ~2-3s.

**Files:**
- Create: `src/lib/async-cache.ts`
- Modify: `src/app/api/snapshot/route.ts`
- Modify: `src/lib/parsers/cron.ts`
- Modify: `src/lib/parsers/agents.ts`
- Modify: `src/lib/parsers/system.ts`
- Modify: `src/lib/data-source.ts`

- [ ] **Step 1: Create async cache utility**

Create `src/lib/async-cache.ts` — a simple TTL cache for expensive operations:

```typescript
type CacheEntry<T> = { value: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();

export function cachedAsync<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() < entry.expiresAt) return Promise.resolve(entry.value);
  return fn().then((value) => {
    cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  });
}

export function cachedSync<T>(key: string, ttlMs: number, fn: () => T): T {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() < entry.expiresAt) return entry.value;
  const value = fn();
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}
```

- [ ] **Step 2: Add caching to cron parser**

Modify `src/lib/parsers/cron.ts`. Wrap the `execSync` call in `cachedSync` with 60s TTL:

```typescript
import { cachedSync } from "../async-cache";

export function parseCronList(): CronJob[] {
  return cachedSync("cron-list", 60_000, () => {
    try {
      const bin = findOpenclawBin();
      const output = execSync(`${bin} cron list --json 2>/dev/null`, {
        timeout: 10000,
        encoding: "utf-8",
      });
      // ... existing parsing logic
    } catch {
      return [];
    }
  });
}
```

- [ ] **Step 3: Remove redundant execSync from agents parser**

Modify `src/lib/parsers/agents.ts` (lines 24-38). Replace the standalone `execSync("openclaw cron list --json")` call with a call to `parseCronList()` from `cron.ts` (which is now cached):

```typescript
import { parseCronList } from "./cron";

// Replace execSync block with:
const cronJobs = parseCronList();
const agentModels: Record<string, string> = {};
for (const job of cronJobs) {
  if (job.agentId && job.model && job.model !== "default") {
    if (!agentModels[job.agentId]) {
      agentModels[job.agentId] = job.model;
    }
  }
}
```

- [ ] **Step 4: Add caching to system parser**

Modify `src/lib/parsers/system.ts`. Wrap `df` calls in `cachedSync` with 30s TTL:

```typescript
import { cachedSync } from "../async-cache";

// Inside getSystemInfo(), wrap the df block:
const diskInfo = cachedSync("disk-info", 30_000, () => {
  try {
    const df = execSync("df -g / 2>/dev/null", { encoding: "utf-8" });
    const parts = df.split("\n")[1]?.split(/\s+/) || [];
    return { totalGb: parseFloat(parts[1] || "0"), usedGb: parseFloat(parts[2] || "0") };
  } catch {
    try {
      const df = execSync("df -BG / 2>/dev/null", { encoding: "utf-8" });
      const parts = df.split("\n")[1]?.split(/\s+/) || [];
      return {
        totalGb: parseFloat((parts[1] || "0").replace("G", "")),
        usedGb: parseFloat((parts[2] || "0").replace("G", "")),
      };
    } catch {
      return { totalGb: 0, usedGb: 0 };
    }
  }
});
```

- [ ] **Step 5: Parallelize snapshot endpoint**

Modify `src/app/api/snapshot/route.ts`. Replace sequential parser calls (lines 40-81) with `Promise.all`:

```typescript
const [cron, heartbeat, digest, pending, intel, metrics, commandCenter,
       agents, broadcast, commsNeo, commsFullcrum, commsCassian, commsChandler,
       sessionLog, content, hookTracker, contentCalendar, hookLibrary,
       system, pipeline, cognitive, engagement, memoryFiles, knowledgeFiles] =
  await Promise.all([
    Promise.resolve(parseCronList()),
    Promise.resolve(parseHeartbeat()),
    Promise.resolve(parseDigest()),
    Promise.resolve(parsePending()),
    Promise.resolve(parseIntel()),
    Promise.resolve(parseMetrics()),
    Promise.resolve(parseCommandCenter()),
    Promise.resolve(parseAgents()),
    Promise.resolve(parseBroadcast()),
    Promise.resolve(parseComms("neo")),
    Promise.resolve(parseComms("fulcrum")),
    Promise.resolve(parseComms("cassian")),
    Promise.resolve(parseComms("chandler")),
    Promise.resolve(parseSessionLog()),
    Promise.resolve(parseContentLog()),
    Promise.resolve(parseHookTracker()),
    Promise.resolve(parseContentCalendar()),
    Promise.resolve(parseHookLibrary()),
    Promise.resolve(getSystemInfo()),
    Promise.resolve(parsePipelineData()),
    Promise.resolve(parseCognitive()),
    Promise.resolve(parseEngagement()),
    Promise.resolve(listMemoryFiles()),        // metadata only!
    Promise.resolve(listKnowledgeFiles()),      // metadata only!
  ]);
```

Note: `listMemoryFilesWithContent()` → `listMemoryFiles()` and `listKnowledgeFilesWithContent()` → `listKnowledgeFiles()`. Full content is now served on demand (Task 3).

- [ ] **Step 6: Increase snapshot cache TTL**

Modify `src/lib/data-source.ts` line 9:

```typescript
const CACHE_TTL_MS = 10_000; // 10 seconds (was 2s)
```

- [ ] **Step 7: Optimize hash computation**

Modify `src/lib/hash.ts`. Replace recursive `dirMtimes()` with directory-level stat for large directories:

```typescript
async function dirMaxMtime(dirPath: string): Promise<number> {
  // Stat the directory itself — mtime updates when files are added/removed
  const stat = await safeStat(dirPath);
  return stat;
}

export async function computeWorkspaceHash(): Promise<string> {
  const allMtimes: number[] = [];
  for (const file of WATCHED_FILES) {
    allMtimes.push(await safeStat(path.join(WORKSPACE_PATH, file)));
  }
  for (const dir of WATCHED_DIRS) {
    allMtimes.push(await dirMaxMtime(path.join(WORKSPACE_PATH, dir)));
  }
  allMtimes.sort((a, b) => a - b);
  const hash = createHash("md5").update(allMtimes.join(",")).digest("hex");
  return hash.slice(0, 12);
}
```

- [ ] **Step 8: Verify performance improvement**

Run `npm run build` in `/Users/quark/projects/quark-mission-control` to confirm no build errors. Then start dev server with `npm run dev` and time a snapshot fetch:

```bash
time curl -s http://localhost:3000/api/snapshot | wc -c
```

Expected: response in <3s, payload size significantly reduced (was ~100KB, target ~20KB).

- [ ] **Step 9: Commit**

```bash
git add src/lib/async-cache.ts src/app/api/snapshot/route.ts src/lib/parsers/cron.ts src/lib/parsers/agents.ts src/lib/parsers/system.ts src/lib/data-source.ts src/lib/hash.ts
git commit -m "perf: parallelize snapshot parsers, cache execSync calls, optimize hash"
```

---

### Task 2: Theme Constants & Timezone Utility

**Goal:** Consolidate color constants. Create shared timezone-aware date formatting.

**Files:**
- Create: `src/lib/theme-constants.ts`
- Modify: `src/lib/utils.ts`
- Modify: `src/lib/pipeline-constants.ts` (re-export from theme)
- Modify: `src/lib/engagement-constants.ts` (re-export from theme)

- [ ] **Step 1: Create consolidated theme constants**

Create `src/lib/theme-constants.ts`:

```typescript
// Status colors (used across all pages)
export const STATUS_COLORS: Record<string, string> = {
  completed: "#10B981",
  active: "#3B82F6",
  pending: "#6B7280",
  failed: "#EF4444",
  killed: "#F59E0B",
  stale: "#F97316",
  quarantined: "#DC2626",
  preview_sent: "#8B5CF6",
  approved: "#10B981",
  idle: "#6B7280",
  disabled: "#374151",
  ok: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
};

// Content type colors
export const TYPE_COLORS: Record<string, string> = {
  proof: "#3B82F6",
  news_relay: "#8B5CF6",
  viral_ride: "#EC4899",
  hot_take: "#F97316",
  war_story: "#10B981",
  reaction: "#F59E0B",
};

// Platform colors
export const PLATFORM_COLORS: Record<string, string> = {
  x: "#1DA1F2",
  tiktok: "#FF0050",
  instagram: "#E1306C",
  youtube: "#FF0000",
  substack: "#FF6719",
};

// Action colors
export const ACTION_COLORS: Record<string, string> = {
  like: "#F59E0B",
  reply: "#3B82F6",
  comment: "#8B5CF6",
  follow: "#10B981",
  check: "#6B7280",
  skip: "#374151",
};

// Accent colors
export const ACCENT = {
  primary: "#00D4AA",
  purple: "#7C3AED",
  bg: "#0A0A0F",
  text: "#F1F5F9",
  muted: "#94A3B8",
  border: "rgba(255,255,255,0.08)",
};

export function formatElapsed(ms: number | null | undefined): string {
  if (!ms) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
```

- [ ] **Step 2: Add timezone utility to utils.ts**

Add to `src/lib/utils.ts`:

```typescript
const TIMEZONE = "America/Chicago";

/** Format a date/timestamp in Chicago time */
export function formatChicago(
  input: string | number | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    timeZone: TIMEZONE,
    ...options,
  });
}

/** Format as relative time ("2h ago", "just now") in Chicago context */
export function formatTimeAgo(input: string | number | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) return "—";
  const now = Date.now();
  const diffMs = now - date.getTime();
  if (diffMs < 0) return "just now";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatChicago(date, { month: "short", day: "numeric" });
}

/** Format as short time "3:45 PM" in Chicago */
export function formatTimeShort(input: string | number | Date): string {
  return formatChicago(input, { hour: "numeric", minute: "2-digit", hour12: true });
}

/** Format as date+time "Mar 16, 3:45 PM" in Chicago */
export function formatDateTime(input: string | number | Date): string {
  return formatChicago(input, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}
```

- [ ] **Step 3: Update pipeline-constants.ts to re-export**

Replace contents of `src/lib/pipeline-constants.ts` with re-exports:

```typescript
export { STATUS_COLORS, TYPE_COLORS, formatElapsed } from "./theme-constants";
```

- [ ] **Step 4: Update engagement-constants.ts to re-export**

Replace contents of `src/lib/engagement-constants.ts` with:

```typescript
export { PLATFORM_COLORS, ACTION_COLORS } from "./theme-constants";
export { formatTimeAgo } from "./utils";
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme-constants.ts src/lib/utils.ts src/lib/pipeline-constants.ts src/lib/engagement-constants.ts
git commit -m "feat: consolidate theme constants, add Chicago timezone formatters"
```

---

### Task 3: On-Demand Content API

**Goal:** New API route to fetch individual file content. Decouples file reading from snapshot.

**Files:**
- Create: `src/app/api/knowledge/[...path]/route.ts`
- Modify: `src/lib/parsers/memory.ts` (export `listMemoryFiles` separately)
- Modify: `src/lib/parsers/knowledge.ts` (export `listKnowledgeFiles` separately)

- [ ] **Step 1: Create catch-all API route**

Create `src/app/api/knowledge/[...path]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { WORKSPACE_PATH } from "@/lib/config";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

const ALLOWED_ROOTS = ["memory", "shared/knowledge-base"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const segments = (await params).path;
  const filePath = segments.join("/");

  // Validate path is under allowed roots
  const isAllowed = ALLOWED_ROOTS.some((root) => filePath.startsWith(root));
  if (!isAllowed) {
    return NextResponse.json({ error: "Forbidden path" }, { status: 403 });
  }

  // Block directory traversal
  if (filePath.includes("..") || filePath.includes("~")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const fullPath = path.join(WORKSPACE_PATH, filePath);

  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    return NextResponse.json({ path: filePath, content });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
```

- [ ] **Step 2: Ensure parsers export metadata-only functions**

Verify `src/lib/parsers/memory.ts` exports `listMemoryFiles()` (it does — line 32). Verify `src/lib/parsers/knowledge.ts` exports `listKnowledgeFiles()` (it does — line 13).

No changes needed if already exported. The snapshot endpoint (Task 1, Step 5) already switched to these.

- [ ] **Step 3: Verify route works**

```bash
curl -s http://localhost:3000/api/knowledge/memory/2026-03-16.md | head -20
```

Expected: JSON with `{ path: "memory/2026-03-16.md", content: "..." }`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/knowledge/
git commit -m "feat: add on-demand content API for knowledge/memory files"
```

---

### Task 4: Sidebar Navigation Update

**Goal:** Update sidebar to reflect new page structure (10 pages).

**Files:**
- Modify: `src/components/ui/sidebar.tsx`

- [ ] **Step 1: Update navItems array**

Modify `src/components/ui/sidebar.tsx` (lines 28-43). Replace with:

```typescript
const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/content", label: "Pipeline", icon: FileText },
  { href: "/cognitive", label: "Cognitive", icon: Brain },
  { href: "/engagement", label: "Engagement", icon: MessageCircle },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/operations", label: "Operations", icon: BarChart3 },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/intel", label: "Intel", icon: Radio },
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];
```

Remove unused icon imports: `Clock`, `Database`, `BrainCircuit`, `Activity`.

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/sidebar.tsx
git commit -m "feat: update sidebar nav for consolidated page structure (14→10)"
```

---

## Phase 2 — Page Rebuilds

### Task 5: Dashboard Rebuild — 6 Consolidated Widgets

**Goal:** Replace 10 widgets with 6 consolidated ones. Responsive 3×2 grid (desktop), 1-col (mobile).

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/dashboard/system-pulse.tsx` (replaces heartbeat + system-vitals + cron-grid)
- Create: `src/components/dashboard/health-score.tsx` (replaces cognitive-widget + engagement-widget)
- Modify: `src/components/dashboard/activity-ticker.tsx` (absorb pending-badge)
- Modify: `src/components/dashboard/agent-bar.tsx` (add last-active timestamps)
- Keep: `src/components/dashboard/codex-quota.tsx` (already done)
- Keep: `src/components/dashboard/pipeline-widget.tsx`

- [ ] **Step 1: Create SystemPulse widget**

Create `src/components/dashboard/system-pulse.tsx`:

Merges HeartbeatCard + SystemVitals + CronGrid into one card. Shows:
- Heartbeat age (relative time since last heartbeat) as hero number
- CPU / Memory / Disk as inline mini-bars (not full Gauge components)
- Cron status: row of small colored dots, each with tooltip showing job name + last successful run time

Uses: `useApi<HeartbeatState>`, `useApi<SystemInfo>`, `useApi<{ jobs: CronJob[] }>` with snapshot keys. All timestamps via `formatTimeAgo()` from utils.

- [ ] **Step 2: Create HealthScore widget**

Create `src/components/dashboard/health-score.tsx`:

Merges CognitiveWidget + EngagementWidget. Shows:
- Single Gauge showing worst-of score across memory/proactivity/engagement
- Color: green >70, yellow >40, red ≤40
- Unanswered engagement count as a badge
- Click anywhere → navigates to `/cognitive` or `/engagement` (whichever is worse)

Uses: `useApi<CognitiveData>` + `useApi<EngagementData>` with snapshot keys.

- [ ] **Step 3: Update ActivityTicker to absorb PendingBadge**

Modify `src/components/dashboard/activity-ticker.tsx`:
- Add pending action count as a header badge (e.g., "Activity Feed (3 pending)")
- Fetch pending data alongside digest data
- Keep scrolling feed behavior

- [ ] **Step 4: Update AgentBar with last-active timestamps**

Modify `src/components/dashboard/agent-bar.tsx`:
- Add "last active" relative timestamp under each agent avatar
- Use `formatTimeAgo()` on latest comms timestamp
- Add subtle status color ring (green=recent, gray=stale)

- [ ] **Step 5: Rebuild dashboard page layout**

Modify `src/app/page.tsx` to use 6 widgets in responsive grid:

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <ErrorBoundary><SystemPulse /></ErrorBoundary>
  <ErrorBoundary><CodexQuota /></ErrorBoundary>
  <ErrorBoundary><PipelineWidget /></ErrorBoundary>
  <ErrorBoundary><HealthScore /></ErrorBoundary>
  <ErrorBoundary><ActivityTicker /></ErrorBoundary>
  <ErrorBoundary><AgentBar /></ErrorBoundary>
</div>
```

- [ ] **Step 6: Verify on desktop and mobile viewport**

Open browser at `http://localhost:3000`. Check:
- Desktop: 3×2 grid, all cards visible
- Mobile (toggle responsive mode or resize to 375px): single column, all cards stack

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx src/components/dashboard/
git commit -m "feat: rebuild dashboard with 6 consolidated widgets"
```

---

### Task 6: Schedule Page (Cron + Calendar Merge)

**Goal:** New `/schedule` page replacing `/cron` and `/calendar`. Timeline view with cron jobs and calendar events.

**Files:**
- Create: `src/app/schedule/page.tsx`
- Create: `src/components/schedule/timeline-view.tsx`
- Create: `src/components/schedule/job-card.tsx`
- Create: `src/app/api/schedule/route.ts`

- [ ] **Step 1: Create schedule API route**

Create `src/app/api/schedule/route.ts` — combines cron + calendar data:

```typescript
import { NextResponse } from "next/server";
import { parseCronList } from "@/lib/parsers/cron";
import { parseCalendar } from "@/lib/parsers/calendar";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isRemote()) {
    const cron = await getSnapshotSection("cron");
    // Calendar may not be in snapshot — fetch separately if needed
    if (cron) return NextResponse.json(cron);
  }
  const jobs = parseCronList();
  const calendar = parseCalendar ? parseCalendar() : [];
  return NextResponse.json({
    jobs,
    calendarEvents: calendar,
    summary: {
      total: jobs.length,
      ok: jobs.filter(j => j.status === "ok").length,
      failed: jobs.filter(j => j.status === "error").length,
    },
  });
}
```

Note: check if `parseCalendar` exists in the codebase. If the calendar page used AppleScript or gws CLI, the parser may need adaptation or the calendar data may come from a different source. The timeline-view component should handle both cron jobs and calendar events.

- [ ] **Step 2: Create job-card component**

Create `src/components/schedule/job-card.tsx` — displays a single cron job with:
- Status dot (green/yellow/red)
- Job name + agent ID
- Schedule (human-readable)
- Last successful run date/time (formatted in Chicago timezone)
- Next run time
- Model name

- [ ] **Step 3: Create timeline-view component**

Create `src/components/schedule/timeline-view.tsx`:
- Vertical timeline for daily view
- Each hour row shows jobs scheduled at that time
- Current time marker (animated line)
- Cron jobs as colored markers with status dots
- Daily/Weekly toggle at top

- [ ] **Step 4: Create schedule page**

Create `src/app/schedule/page.tsx`:

```tsx
"use client";
import { AppShell } from "@/components/layout/app-shell";
import { TimelineView } from "@/components/schedule/timeline-view";
import { useApi } from "@/hooks/use-api";
// ... layout with GlassCard, view toggle, timeline
```

- [ ] **Step 5: Verify page**

Navigate to `http://localhost:3000/schedule`. Confirm:
- Timeline renders with cron jobs at correct hours
- Last successful run shows for each job
- Chicago timezone for all times
- View toggle works
- Mobile responsive (single column)

- [ ] **Step 6: Commit**

```bash
git add src/app/schedule/ src/components/schedule/ src/app/api/schedule/
git commit -m "feat: add Schedule page (merges Cron + Calendar)"
```

---

### Task 7: Operations Page (Metrics + Command Center Merge)

**Goal:** New `/operations` page with 5 zones: Codex quota, fallback chain, usage, content performance, reliability.

**Files:**
- Create: `src/app/operations/page.tsx`
- Create: `src/components/operations/quota-hero.tsx`
- Create: `src/components/operations/fallback-chain.tsx`
- Create: `src/components/operations/usage-chart.tsx`
- Create: `src/components/operations/content-performance.tsx`
- Create: `src/components/operations/reliability.tsx`
- Create: `src/app/api/operations/route.ts`
- Create: `src/lib/parsers/operations.ts`

- [ ] **Step 1: Create operations parser**

Create `src/lib/parsers/operations.ts`:
- Reads CodexBar widget snapshot for quota + usage data
- Reads `metrics/daily/` for content performance (parse latest daily report for platform metrics)
- Reads command-center JSONL for reliability stats
- Reads cron data (cached) for success rate
- No `execSync` calls

- [ ] **Step 2: Create operations API route**

Create `src/app/api/operations/route.ts` — dual-source pattern.

- [ ] **Step 3: Create quota-hero component**

Zone 1: Codex daily + weekly gauges (reuse Gauge component) + active model label.

- [ ] **Step 4: Create fallback-chain component**

Zone 2: Visual chain — three nodes (codex → MiniMax → Gemini) connected by arrows. Each node has a status dot (active/standby/error). GlassCard styling.

- [ ] **Step 5: Create usage-chart component**

Zone 3: Bar chart (Recharts) of daily token usage for last 7 days. Data from CodexBar `dailyUsage` array.

- [ ] **Step 6: Create content-performance component**

Zone 4: Platform cards (X, TikTok, Instagram, YouTube, Substack) each showing daily impressions/likes/comments. Top posts list. 7-day sparkline. Data from `metrics/daily/*.md` parsed.

- [ ] **Step 7: Create reliability component**

Zone 5: Cron success rate gauge + recent failures list.

- [ ] **Step 8: Create operations page**

Create `src/app/operations/page.tsx` — 5-zone layout with GlassCards, responsive grid.

- [ ] **Step 9: Commit**

```bash
git add src/app/operations/ src/components/operations/ src/app/api/operations/ src/lib/parsers/operations.ts
git commit -m "feat: add Operations page (merges Metrics + Command Center + Content Performance)"
```

---

### Task 8: Knowledge Page (Memory Browser + KB Merge)

**Goal:** New `/knowledge` page with tabbed file browser and expandable reader pane.

**Files:**
- Modify: `src/app/knowledge/page.tsx` (full rewrite)
- Create: `src/components/knowledge/file-list.tsx`
- Create: `src/components/knowledge/reader-pane.tsx`
- Create: `src/components/knowledge/tab-bar.tsx`

- [ ] **Step 1: Create tab-bar component**

Create `src/components/knowledge/tab-bar.tsx`:
- Three tabs: Journals | Memory | Knowledge Base
- Active tab styling with accent underline
- Counts per tab

- [ ] **Step 2: Create file-list component**

Create `src/components/knowledge/file-list.tsx`:
- Renders file list based on active tab
- Journals: sorted by date desc, shows date + first-line preview
- Memory: grouped by type (user/feedback/project/reference/session), shows name + description from frontmatter
- KB: tree view with expandable folders
- Click handler passes selected file path to parent
- Search filter input at top

- [ ] **Step 3: Create reader-pane component**

Create `src/components/knowledge/reader-pane.tsx`:
- Fetches content via `/api/knowledge/{path}` on file selection
- Renders markdown content with monospace font
- **Expand button** (top-right): toggles between split view and full-width view
- In expanded mode: file list collapses, reader fills content area. Back button to return.
- On mobile: always full-screen with back navigation
- Loading state while fetching

- [ ] **Step 4: Rewrite knowledge page**

Rewrite `src/app/knowledge/page.tsx`:
- Split layout: file list (left, ~300px) + reader pane (right, flex-1)
- Tab bar at top of file list
- Fetches file metadata via `/api/memory` and `/api/knowledge` (existing routes)
- State: activeTab, selectedFile, expanded

- [ ] **Step 5: Verify features**

- Tab switching shows correct file lists
- Clicking a file loads content in reader pane
- Expand button toggles to full-width reader
- Mobile: single column, back navigation
- Search filters file list
- All timestamps in Chicago time

- [ ] **Step 6: Commit**

```bash
git add src/app/knowledge/ src/components/knowledge/
git commit -m "feat: rebuild Knowledge page (merges Memory Browser + KB with expandable reader)"
```

---

### Task 9: Intel Page Rebuild

**Goal:** Cinematic card-based layout for intel feed.

**Files:**
- Modify: `src/app/intel/page.tsx` (rewrite)
- Create: `src/components/intel/trend-card.tsx`
- Create: `src/components/intel/source-badge.tsx`

- [ ] **Step 1: Create source-badge component**

Tiny colored pill showing source (HN, Reddit, X, Tavily, Product Hunt) with platform color.

- [ ] **Step 2: Create trend-card component**

GlassCard for each intel item: source badge, headline, summary snippet, virality bar (0-10), confidence, timestamp with time-decay (opacity fades for older items).

- [ ] **Step 3: Rewrite intel page**

Card grid (2-col desktop, 1-col mobile). Date navigation (existing). Remove or simplify radar/donut charts — the cards themselves convey the information. Keep suggestions section.

- [ ] **Step 4: Commit**

```bash
git add src/app/intel/ src/components/intel/
git commit -m "feat: rebuild Intel page with cinematic trend cards"
```

---

### Task 10: Agents Page Rebuild

**Goal:** Agent cards with status, model, last active, comms preview. No execSync.

**Files:**
- Modify: `src/app/agents/page.tsx` (rewrite)
- Create: `src/components/agents/agent-card.tsx`

- [ ] **Step 1: Create agent-card component**

GlassCard per agent: avatar image, name + description, model badge, status indicator (idle/running/error), last active relative time, latest inbound comms preview (first 100 chars). Click expands to show full comms.

- [ ] **Step 2: Rewrite agents page**

Card grid (2-col desktop, 1-col mobile). Each agent as an AgentCard. Broadcast status banner at top if mode != NORMAL.

- [ ] **Step 3: Commit**

```bash
git add src/app/agents/ src/components/agents/
git commit -m "feat: rebuild Agents page with cinematic agent cards"
```

---

### Task 11: Settings Page Rebuild

**Goal:** Compact cinematic settings page.

**Files:**
- Modify: `src/app/settings/page.tsx` (rewrite)

- [ ] **Step 1: Rewrite settings page**

Four GlassCard sections:
1. **Connection** — status dot, mode (Local/Remote), last successful fetch time
2. **Publish Mode** — LIVE/WARMUP indicator (reads from pipeline data snapshot key)
3. **System Info** — OS, Node version, disk usage, uptime
4. **Refresh Controls** — manual refresh button, current polling interval

All compact, single-column layout. Cinematic styling.

- [ ] **Step 2: Commit**

```bash
git add src/app/settings/
git commit -m "feat: rebuild Settings page with cinematic compact layout"
```

---

### Task 12: Engagement Page Tweaks

**Goal:** Three targeted improvements to existing cinematic page.

**Files:**
- Modify: `src/components/engagement/action-feed.tsx`
- Modify: `src/components/engagement/guardrail-blocks.tsx`
- Modify: `src/app/engagement/page.tsx`
- Create: `src/lib/guardrail-labels.ts`

- [ ] **Step 1: Create guardrail label map**

Create `src/lib/guardrail-labels.ts`:

```typescript
const GUARDRAIL_LABELS: Record<string, string> = {
  "crypto_wallet": "Message contains cryptocurrency wallet address pattern",
  "unknown_sender": "Sender is not in trusted accounts list",
  "instruction_override": "Message attempted to override agent instructions",
  "url_suspicious": "Message contains suspicious or shortened URL",
  "troll_disengage": "Conversation flagged as trolling — disengaged",
  "rate_limit": "Rate limit reached for this platform",
};

export function humanizeGuardrail(code: string): string {
  // Parse format like "error:400", "skip:troll_disengage", "pass:trusted"
  const parts = code.split(":");
  const key = parts[parts.length - 1];
  return GUARDRAIL_LABELS[key] || code;
}
```

- [ ] **Step 2: Make action feed items clickable**

Modify `src/components/engagement/action-feed.tsx`:
- If action has a `targetId` that looks like a URL or can be constructed (e.g., X post → `https://x.com/i/status/{targetId}`), wrap the item in an `<a>` tag with `target="_blank"`.
- Items without resolvable URLs remain plain text.

- [ ] **Step 3: Add plain-english guardrail reasons**

Modify `src/components/engagement/guardrail-blocks.tsx`:
- Import `humanizeGuardrail` from `guardrail-labels.ts`
- Display the human-readable label below/instead of the raw code
- Keep the raw code as a tooltip on hover for debugging

- [ ] **Step 4: Add last-updated timestamp to page**

Modify `src/app/engagement/page.tsx`:
- Use `CardFooter` with `lastUpdated` on each zone card
- Pass `lastUpdated` from the `useApi` hook

- [ ] **Step 5: Commit**

```bash
git add src/components/engagement/ src/app/engagement/ src/lib/guardrail-labels.ts
git commit -m "feat: engagement tweaks — clickable feed, plain-english guardrails, last-updated"
```

---

### Task 13: Cleanup — Remove Old Pages & Routes

**Goal:** Remove deprecated pages, routes, and components. Add redirects for old URLs.

**Files:**
- Delete: `src/app/cron/page.tsx`
- Delete: `src/app/calendar/page.tsx`
- Delete: `src/app/metrics-page/page.tsx`
- Delete: `src/app/command-center/page.tsx`
- Delete: `src/app/memory-browser/page.tsx`
- Delete: `src/app/activity/page.tsx`
- Delete: `src/components/dashboard/heartbeat-card.tsx`
- Delete: `src/components/dashboard/system-vitals.tsx`
- Delete: `src/components/dashboard/cron-grid.tsx`
- Delete: `src/components/dashboard/pending-badge.tsx`
- Delete: `src/components/dashboard/cognitive-widget.tsx`
- Delete: `src/components/dashboard/engagement-widget.tsx`
- Delete: `src/components/dashboard/degradation-banner.tsx`

- [ ] **Step 1: Add redirects from old URLs**

Create redirect pages so bookmarks and links to old routes still work:

For each old route (`/cron`, `/calendar`, `/metrics-page`, `/command-center`, `/memory-browser`, `/activity`), replace the `page.tsx` with a redirect:

```typescript
// src/app/cron/page.tsx (and similar for others)
import { redirect } from "next/navigation";
export default function CronRedirect() { redirect("/schedule"); }
```

Mapping:
- `/cron` → `/schedule`
- `/calendar` → `/schedule`
- `/metrics-page` → `/operations`
- `/command-center` → `/operations`
- `/memory-browser` → `/knowledge`
- `/activity` → `/` (dashboard, since activity feed is now a dashboard widget)

- [ ] **Step 2: Delete old dashboard widgets**

```bash
rm src/components/dashboard/heartbeat-card.tsx
rm src/components/dashboard/system-vitals.tsx
rm src/components/dashboard/cron-grid.tsx
rm src/components/dashboard/pending-badge.tsx
rm src/components/dashboard/cognitive-widget.tsx
rm src/components/dashboard/engagement-widget.tsx
rm src/components/dashboard/degradation-banner.tsx
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/quark/projects/quark-mission-control && npm run build
```

Fix any import errors from deleted files. Ensure no page references removed components.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated pages and widgets from pre-revamp structure"
```

---

### Task 14: Update Dev Guide & Memory

**Goal:** Update the Mission Control dev guide and Quark's memory to reflect new structure.

**Files:**
- Modify: `~/.openclaw/workspace/shared/mission-control/mission-control-dev-guide.md`

- [ ] **Step 1: Update dev guide**

Rewrite `shared/mission-control/mission-control-dev-guide.md` to reflect:
- New 10-page structure
- New component inventory
- New parser list (operations.ts added, redundant execSync removed)
- Snapshot payload trimming
- On-demand content API
- Theme constants consolidation
- Timezone rule

- [ ] **Step 2: Commit dev guide**

```bash
cd ~/.openclaw/workspace
git add shared/mission-control/mission-control-dev-guide.md
git commit -m "docs: update Mission Control dev guide for revamp"
```

---

## Summary

| Task | Phase | Description | Key Files |
|------|-------|-------------|-----------|
| 1 | 1 | Snapshot parallelization + exec caching | snapshot/route.ts, async-cache.ts, cron/agents/system parsers |
| 2 | 1 | Theme constants + timezone utility | theme-constants.ts, utils.ts |
| 3 | 1 | On-demand content API | api/knowledge/[...path]/route.ts |
| 4 | 1 | Sidebar navigation update | sidebar.tsx |
| 5 | 2 | Dashboard rebuild (6 widgets) | page.tsx, system-pulse.tsx, health-score.tsx |
| 6 | 2 | Schedule page (Cron+Calendar) | schedule/page.tsx, timeline-view.tsx |
| 7 | 2 | Operations page (Metrics+CC+Performance) | operations/page.tsx, operations.ts parser |
| 8 | 2 | Knowledge page (Memory+KB) | knowledge/page.tsx, reader-pane.tsx |
| 9 | 2 | Intel page rebuild | intel/page.tsx, trend-card.tsx |
| 10 | 2 | Agents page rebuild | agents/page.tsx, agent-card.tsx |
| 11 | 2 | Settings page rebuild | settings/page.tsx |
| 12 | 2 | Engagement tweaks | action-feed.tsx, guardrail-blocks.tsx |
| 13 | 2 | Cleanup old pages | Delete 6 pages, 7 widgets |
| 14 | 2 | Update dev guide + memory | mission-control-dev-guide.md |
