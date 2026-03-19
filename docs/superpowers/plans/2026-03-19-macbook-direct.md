# MacBook-Direct Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Vercel + hash-polling from Mission Control and serve Next.js directly from the MacBook via Tailscale Funnel, eliminating blank screens.

**Architecture:** Browser hits MacBook directly via Tailscale Funnel. Next.js production server (npm start) reads local files via SSR. SSE pushes live updates. LaunchAgent auto-restarts on crash. No polling, no IndexedDB, no Vercel dependency.

**Tech Stack:** Next.js 16, TypeScript, Tailwind v4, Zustand, Vitest

**Spec:** `docs/superpowers/specs/2026-03-19-macbook-direct-design.md`

**Repo:** `/Users/quark/projects/quark-mission-control`

---

## File Structure

### Files Modified
| File | Change |
|------|--------|
| `src/app/api/status/route.ts` | Add `force-dynamic` export |
| `src/app/status/page.tsx` | Replace Zustand snapshot reads with `useApi("/api/status")` |
| `src/hooks/use-api.ts` | Remove IS_REMOTE, snapshotKey, snapshot store reads |
| `src/stores/dashboard.ts` | Remove snapshot fields + use-persisted-snapshot import |
| `src/components/layout/app-shell.tsx` | Remove remote mode code |
| `src/app/settings/page.tsx` | Rewrite for local-only |
| `src/app/cognitive/page.tsx` | Remove snapshotKey |
| `src/app/schedule/page.tsx` | Remove snapshotKey |
| `src/app/agents/page.tsx` | Remove snapshotKey |
| `src/app/content/page.tsx` | Remove snapshotKey |
| `src/app/operations/page.tsx` | Remove snapshotKey |
| `src/app/engagement/page.tsx` | Remove snapshotKey |
| `src/components/dashboard/system-pulse.tsx` | Remove snapshotKey |
| `src/components/dashboard/agent-bar.tsx` | Remove snapshotKey |
| `src/components/dashboard/codex-quota.tsx` | Remove snapshotKey |
| `src/components/dashboard/health-score.tsx` | Remove snapshotKey |
| `src/components/dashboard/activity-ticker.tsx` | Remove snapshotKey |
| `src/components/dashboard/pipeline-widget.tsx` | Remove snapshotKey |
| `src/app/api/cron/route.ts` | Remove isRemote guard + getSourceMeta |
| `src/app/api/schedule/route.ts` | Remove isRemote guard + getSourceMeta |
| 20 other API routes | Remove isRemote guard (see Task 7) |

### Files Deleted
| File | Reason |
|------|--------|
| `src/hooks/use-hash-polling.ts` | Vercel polling only |
| `src/hooks/use-persisted-snapshot.ts` | IndexedDB cache for Vercel only |
| `src/components/staleness-banner.tsx` | Vercel staleness indicator only |
| `src/lib/data-source.ts` | Server-side snapshot fetching for Vercel only |
| `src/app/api/source-status/route.ts` | Vercel diagnostics only |
| `src/app/api/snapshot/route.ts` | Vercel bundle endpoint only |
| `src/app/api/hash/route.ts` | Vercel hash-polling endpoint only |

---

## Task 1: Fix /api/status + rewrite Status page

**Files:**
- Modify: `src/app/api/status/route.ts`
- Modify: `src/app/status/page.tsx`

- [ ] **Step 1: Add force-dynamic to /api/status**

Open `src/app/api/status/route.ts`. At the top of the file, after any imports, add:

```typescript
export const dynamic = "force-dynamic";
```

This prevents Next.js production from statically caching the route at build time.

- [ ] **Step 2: Rewrite Status page**

Replace the entire contents of `src/app/status/page.tsx` with:

```typescript
"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PipelineCard } from "@/components/status/pipeline-card";
import { CronCard } from "@/components/status/cron-card";
import { QuotaCard } from "@/components/status/quota-card";
import { QuarkCard } from "@/components/status/quark-card";
import { SystemCard } from "@/components/status/system-card";
import { useApi } from "@/hooks/use-api";
import { formatTimeShort } from "@/lib/utils";
import type { StatusData } from "@/lib/parsers/types";

export default function StatusPage() {
  const { data, loading, error } = useApi<StatusData>("/api/status", {
    refreshOn: ["heartbeat", "pipeline", "cron"],
  });

  if (loading && !data) {
    return (
      <AppShell>
        <div className="p-6">
          <h1 className="mb-4 text-xl font-semibold text-[#F1F5F9]">Status</h1>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.03]" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (error && !data) {
    return (
      <AppShell>
        <div className="p-6">
          <h1 className="mb-4 text-xl font-semibold text-[#F1F5F9]">Status</h1>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
            Failed to load status: {error}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!data) return null;

  return (
    <AppShell>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#F1F5F9]">Status</h1>
          <span className="text-xs text-[#94A3B8]">
            Updated {formatTimeShort(data.timestamp)}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PipelineCard data={data.pipeline} />
          <CronCard data={{ ...data.cron, jobs: data.cron.details?.failed as Array<Record<string, unknown>> ?? [] }} />
          <QuotaCard data={{ ...data.quota, raw: data.quota.details as Record<string, unknown> }} />
          <QuarkCard data={{ ...data.quark, heartbeat: data.quark.details as Record<string, unknown> }} />
          <SystemCard data={{ ...data.system, processes: (data.system.details as Record<string, unknown>)?.processes as Array<Record<string, unknown>> }} />
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors in status/page.tsx or api/status/route.ts (other files may still have errors — fix those in later tasks)

- [ ] **Step 4: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/app/status/page.tsx src/app/api/status/route.ts
git commit -m "feat(status): rewrite status page to use useApi, add force-dynamic to route"
```

---

## Task 2: Simplify use-api.ts

**Files:**
- Modify: `src/hooks/use-api.ts`

Remove all remote-mode code: `IS_REMOTE` constant, `snapshotKey` from `UseApiOptions`, snapshot store subscriptions (lines 32–34), remote snapshot useEffect (lines 39–47), snapshotHash re-fetch useEffect (lines 81–86), and all `if (IS_REMOTE ...)` guards.

- [ ] **Step 1: Replace use-api.ts**

Replace the entire contents of `src/hooks/use-api.ts` with:

```typescript
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDashboardStore } from "@/stores/dashboard";

const POLL_INTERVAL_MS = 60_000;

interface UseApiOptions {
  /** SSE event types that trigger a refetch */
  refreshOn?: string[];
}

export function useApi<T>(url: string, optionsOrRefreshOn?: UseApiOptions | string[]) {
  const options: UseApiOptions =
    Array.isArray(optionsOrRefreshOn)
      ? { refreshOn: optionsOrRefreshOn }
      : optionsOrRefreshOn || {};

  const { refreshOn } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const lastEvent = useDashboardStore((s) => s.lastEvent);
  const connected = useDashboardStore((s) => s.connected);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [url]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-fetch on SSE events
  useEffect(() => {
    if (!lastEvent || !refreshOn) return;
    if (refreshOn.includes(lastEvent.type)) {
      fetchData();
    }
  }, [lastEvent, refreshOn, fetchData]);

  // Polling fallback when SSE is disconnected
  useEffect(() => {
    if (connected) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    pollRef.current = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [connected, fetchData]);

  return { data, loading, error, lastUpdated, refetch: fetchData };
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit 2>&1 | grep "use-api" | head -10`
Expected: No errors in use-api.ts itself (snapshotKey errors in callers will be fixed in Task 6)

- [ ] **Step 3: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/hooks/use-api.ts
git commit -m "refactor(use-api): remove remote mode — IS_REMOTE, snapshotKey, snapshot store reads"
```

---

## Task 3: Simplify stores/dashboard.ts

**Files:**
- Modify: `src/stores/dashboard.ts`

Remove the `use-persisted-snapshot` import (line 4) and all snapshot-related fields/actions. This MUST be done before the hook files are deleted.

- [ ] **Step 1: Replace dashboard.ts**

Replace the entire contents of `src/stores/dashboard.ts` with:

```typescript
"use client";

import { create } from "zustand";

interface DashboardState {
  // SSE connection
  connected: boolean;
  lastEvent: { type: string; file: string; timestamp: number } | null;
  refreshKey: number;

  // Cognitive
  cognitiveDegradation: string[];
  setCognitiveDegradation: (flags: string[]) => void;

  // Engagement
  engagementUnanswered: number;
  setEngagementUnanswered: (count: number) => void;

  // Actions
  triggerRefresh: () => void;
  setConnected: (connected: boolean) => void;
  setLastEvent: (event: DashboardState["lastEvent"]) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  connected: false,
  lastEvent: null,
  refreshKey: 0,
  cognitiveDegradation: [],
  setCognitiveDegradation: (flags) => set({ cognitiveDegradation: flags }),
  engagementUnanswered: 0,
  setEngagementUnanswered: (count) => set({ engagementUnanswered: count }),
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
  setConnected: (connected) => set({ connected }),
  setLastEvent: (lastEvent) => set({ lastEvent, refreshKey: Date.now() }),
}));
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit 2>&1 | grep "dashboard" | head -10`
Expected: No errors in dashboard.ts (errors in files that reference deleted store fields will be fixed in other tasks)

- [ ] **Step 3: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/stores/dashboard.ts
git commit -m "refactor(store): remove snapshot fields, use-persisted-snapshot import, remote-mode actions"
```

---

## Task 4: Simplify app-shell.tsx

**Files:**
- Modify: `src/components/layout/app-shell.tsx`

Remove `RemoteHashPolling`, `IS_REMOTE` branch, `hydrateFromCache` effect, and `StalenessBanner`.

- [ ] **Step 1: Replace app-shell.tsx**

Replace the entire contents of `src/components/layout/app-shell.tsx` with:

```typescript
"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { useSSE } from "@/hooks/use-sse";
import { useDashboardStore } from "@/stores/dashboard";

function LocalSSE() {
  useSSE();
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const lastEvent = useDashboardStore((s) => s.lastEvent);

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <LocalSSE />

      {/* Ambient orbs */}
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />

      <Sidebar />

      <main className="pt-16 px-4 pb-6 md:ml-60 md:pt-6 md:px-6 relative z-10">
        {lastEvent && (
          <div className="fixed top-4 right-4 z-50 glass-card px-3 py-2 text-xs text-[#00D4AA] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-ping" />
            Updated: {lastEvent.type}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit 2>&1 | grep "app-shell" | head -10`
Expected: No errors in app-shell.tsx

- [ ] **Step 3: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/components/layout/app-shell.tsx
git commit -m "refactor(app-shell): remove remote mode — hash polling, staleness banner, hydrate effect"
```

---

## Task 5: Rewrite settings page for local-only

**Files:**
- Modify: `src/app/settings/page.tsx`

Remove `IS_REMOTE`, `SNAPSHOT_URL`, `snapshotFetchedAt`, `hashHealthy`. Rewrite connection status to use `connected` only. Mode is always "Local".

- [ ] **Step 1: Remove remote-mode code from settings page**

In `src/app/settings/page.tsx`:

1. Delete lines 14–15 (`IS_REMOTE` and `SNAPSHOT_URL` constants)
2. Delete line 50 (`snapshotFetchedAt` store subscription)
3. Delete line 51 (`hashHealthy` store subscription)
4. Replace line 44–47 (the `useApi` call) — remove `snapshotKey`:
   ```typescript
   const { data: system, refetch } = useApi<SystemInfo>("/api/system", {
     refreshOn: ["heartbeat"],
   });
   ```
5. Replace line 63: `const isConnected = IS_REMOTE ? hashHealthy : connected;` → `const isConnected = connected;`
6. Replace line 64: `const modeLabel = IS_REMOTE ? "Remote" : "Local";` → `const modeLabel = "Local";`
7. Find any JSX row that displays `snapshotFetchedAt` — replace it with the `lastEvent` timestamp. Add `lastEvent` to the store subscriptions: `const lastEvent = useDashboardStore((s) => s.lastEvent);`, then use `lastEvent ? formatDateTime(new Date(lastEvent.timestamp).toISOString()) : "—"` as the value.

- [ ] **Step 2: Verify TypeScript**

Run: `cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit 2>&1 | grep "settings" | head -10`
Expected: No errors in settings/page.tsx

- [ ] **Step 3: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/app/settings/page.tsx
git commit -m "refactor(settings): remove remote mode — local-only connection status, drop snapshotKey"
```

---

## Task 6: Remove snapshotKey from all call sites

**Files (13 total):**
- `src/app/cognitive/page.tsx`
- `src/app/schedule/page.tsx`
- `src/app/agents/page.tsx`
- `src/app/content/page.tsx`
- `src/app/operations/page.tsx`
- `src/app/engagement/page.tsx`
- `src/components/dashboard/system-pulse.tsx`
- `src/components/dashboard/agent-bar.tsx`
- `src/components/dashboard/codex-quota.tsx`
- `src/components/dashboard/health-score.tsx`
- `src/components/dashboard/activity-ticker.tsx`
- `src/components/dashboard/pipeline-widget.tsx`

The pattern is the same in every file: remove `snapshotKey: "..."` from the `useApi()` options object. Keep `refreshOn` and any other options.

- [ ] **Step 1: Remove snapshotKey from all files**

For each file, find `snapshotKey: "..."` and delete that line. If `snapshotKey` was the only option, the options object becomes `{ refreshOn: [...] }` or can be simplified to just the `refreshOn` array.

Run this to find every occurrence:
```bash
cd /Users/quark/projects/quark-mission-control
grep -rn "snapshotKey" src --include="*.tsx" --include="*.ts" | grep -v "use-api.ts" | grep -v "dashboard.ts" | grep -v "api/snapshot\|api/hash\|proxy.ts"
```

Edit each file to remove the `snapshotKey` line. The `refreshOn` values stay unchanged — they still work for SSE event-based re-fetching.

- [ ] **Step 2: Verify TypeScript**

Run: `cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit 2>&1 | grep -E "snapshotKey|Object literal" | head -20`
Expected: No snapshotKey type errors

- [ ] **Step 3: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/app/cognitive/page.tsx src/app/schedule/page.tsx src/app/agents/page.tsx \
  src/app/content/page.tsx src/app/operations/page.tsx src/app/engagement/page.tsx \
  src/components/dashboard/system-pulse.tsx src/components/dashboard/agent-bar.tsx \
  src/components/dashboard/codex-quota.tsx src/components/dashboard/health-score.tsx \
  src/components/dashboard/activity-ticker.tsx src/components/dashboard/pipeline-widget.tsx
git commit -m "refactor: remove snapshotKey from all useApi call sites"
```

---

## Task 7: Clean up all API routes

**Files:** 22 routes that import `@/lib/data-source`

The pattern is identical across 20 of them. Two routes (`cron` and `schedule`) have an extra `getSourceMeta()` call outside the guard.

- [ ] **Step 1: Apply standard cleanup to 20 routes**

For each of these files, make two changes: (1) delete the `import { isRemote, getSnapshotSection } from "@/lib/data-source"` line, (2) delete the `if (isRemote()) { ... }` block (the entire block including the closing `}`).

The local implementation that follows the block stays unchanged.

**Example — before (`src/app/api/intel/route.ts`):**
```typescript
import { NextResponse } from "next/server";
import { parseIntel } from "@/lib/parsers/intel";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || undefined;

  if (isRemote()) {
    const data = await getSnapshotSection("intel");
    if (data) return NextResponse.json(data);
    return NextResponse.json({ date: "", compiled: "", highSignal: [], rising: [], nicheSignals: [], suggestions: [] });
  }
  return NextResponse.json(parseIntel(date));
}
```

**After:**
```typescript
import { NextResponse } from "next/server";
import { parseIntel } from "@/lib/parsers/intel";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || undefined;

  return NextResponse.json(parseIntel(date));
}
```

Apply this same pattern to: `api/intel`, `api/command-center`, `api/metrics`, `api/pipeline`, `api/cognitive`, `api/model-usage`, `api/memory`, `api/digest`, `api/comms`, `api/agents`, `api/content`, `api/session-log`, `api/operations`, `api/engagement`, `api/heartbeat`, `api/system`, `api/knowledge`, `api/cron-history`, `api/pending`

Also delete `src/app/api/source-status/route.ts` entirely (only exists for Vercel diagnostics).

- [ ] **Step 2: Apply special cleanup to cron/route.ts and schedule/route.ts**

These two routes also call `getSourceMeta()` in the local-mode response body (outside the `isRemote()` guard). Remove that too.

In `src/app/api/cron/route.ts`:
- Delete the `import { isRemote, getSnapshotSection, getSourceMeta } from "@/lib/data-source"` line
- Delete the `if (isRemote()) { ... }` block
- Find `const source = getSourceMeta();` — delete that line
- In the `return NextResponse.json({...})` call, remove the `source` field and any `warning` field that references it

In `src/app/api/schedule/route.ts`:
- Same changes

- [ ] **Step 3: Verify TypeScript**

Run: `cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit 2>&1 | grep "data-source\|isRemote\|getSnapshotSection\|getSourceMeta" | head -20`
Expected: No references to data-source remain

- [ ] **Step 4: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/app/api/
git commit -m "refactor(api): remove isRemote guards and data-source imports from all routes"
```

---

## Task 8: Delete all remote-mode files

**Files to delete:**
- `src/hooks/use-hash-polling.ts`
- `src/hooks/use-persisted-snapshot.ts`
- `src/components/staleness-banner.tsx`
- `src/lib/data-source.ts`
- `src/app/api/source-status/route.ts` (already deleted in Task 7)
- `src/app/api/snapshot/route.ts`
- `src/app/api/hash/route.ts`

- [ ] **Step 1: Delete the files**

```bash
cd /Users/quark/projects/quark-mission-control
rm src/hooks/use-hash-polling.ts
rm src/hooks/use-persisted-snapshot.ts
rm src/components/staleness-banner.tsx
rm src/lib/data-source.ts
rm src/app/api/snapshot/route.ts
rm src/app/api/hash/route.ts
```

- [ ] **Step 2: Full TypeScript check**

Run: `cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit 2>&1`
Expected: **Zero errors.** If any errors appear, they will point to files that still reference the deleted modules. Fix each one before proceeding.

- [ ] **Step 3: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add -A
git commit -m "chore: delete all remote-mode files — hash polling, IndexedDB, data-source, snapshot/hash routes"
```

---

## Task 9: Production build + LaunchAgent switch

- [ ] **Step 1: Run production build**

```bash
cd /Users/quark/projects/quark-mission-control && npm run build 2>&1 | tail -20
```
Expected: Build completes with `✓ Compiled successfully` (or similar Next.js success output). Zero errors.

If the build fails, read the full error output and fix before continuing. Do NOT proceed to LaunchAgent steps if the build fails.

- [ ] **Step 2: Test production server locally**

```bash
cd /Users/quark/projects/quark-mission-control && npm start &
sleep 5
curl -s http://localhost:3000/api/status | python3 -m json.tool | head -20
```
Expected: JSON response with `pipeline`, `cron`, `quota`, `quark`, `system` keys. Real data, not nulls.

Kill the test server: `pkill -f "next start"`

- [ ] **Step 3: Unload LaunchAgent + kill next dev**

```bash
launchctl unload ~/Library/LaunchAgents/com.quark.mission-control.plist
pkill -f "next dev\|next start" 2>/dev/null || true
sleep 2
```

- [ ] **Step 4: Reload LaunchAgent**

```bash
launchctl load ~/Library/LaunchAgents/com.quark.mission-control.plist
sleep 8
curl -s http://localhost:3000/api/status | python3 -m json.tool | head -5
```
Expected: JSON response with status data. If timeout, check `/tmp/mission-control.err` for errors.

- [ ] **Step 5: Verify auto-restart works**

```bash
pkill -f "next start"
sleep 8
curl -s http://localhost:3000/api/status | head -50
```
Expected: LaunchAgent restarted the server (response returns within 8 seconds).

- [ ] **Step 6: Verify via Tailscale Funnel**

```bash
curl -s https://macbook-pro-14-tbo.tail2380be.ts.net/api/status | python3 -m json.tool | head -5
```
Expected: Same JSON as localhost. This is the URL Vercel was polling — now it serves directly.

- [ ] **Step 7: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add package.json package-lock.json 2>/dev/null || true
git commit -m "infra: switch to production build + LaunchAgent serving on port 3000

Removes next dev. LaunchAgent (KeepAlive: true) auto-restarts on crash.
Dashboard now at https://macbook-pro-14-tbo.tail2380be.ts.net/" --allow-empty
```

---

## Task 10: Run existing tests

- [ ] **Step 1: Run test suite**

```bash
cd /Users/quark/projects/quark-mission-control && npx vitest run 2>&1 | tail -20
```
Expected: All tests pass. If any fail, investigate — do not skip.

- [ ] **Step 2: Smoke test key pages**

Open in browser or curl:
- `http://localhost:3000/status` — 5 cards visible, no "Waiting for connection"
- `http://localhost:3000/content` — loads without errors
- `http://localhost:3000/schedule` — cron jobs listed
- `http://localhost:3000/settings` — shows "Local" mode, connected status

---

## Summary

| Task | What | Risk |
|------|------|------|
| 1 | Fix Status page + force-dynamic | Low — replacing broken page |
| 2 | Simplify use-api.ts | Medium — shared hook |
| 3 | Simplify dashboard store | Medium — shared store, delete import first |
| 4 | Simplify app-shell | Low — straightforward removal |
| 5 | Rewrite settings page | Low — one page |
| 6 | Remove snapshotKey (13 files) | Low — mechanical removal |
| 7 | Clean up 22 API routes | Low — consistent pattern |
| 8 | Delete remote files | Low — after all imports removed |
| 9 | Build + LaunchAgent switch | High — infra change, verify each step |
| 10 | Tests + smoke test | Verification only |
