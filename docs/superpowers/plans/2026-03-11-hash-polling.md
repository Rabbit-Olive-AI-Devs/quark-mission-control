# Change-Hash Polling Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace blind 60s polling with 5s mtime-hash polling so the Vercel-deployed Mission Control dashboard shows data within ~5 seconds of a file change on the MacBook.

**Architecture:** A new `/api/hash` endpoint on the MacBook stats watched files and returns an md5 hash. The Vercel client polls this hash every 5s; only when the hash changes does it fetch the full `/api/snapshot`. All widgets read from a shared Zustand snapshot store instead of making independent API calls. SSE is disabled on Vercel; chokidar is fixed for local.

**Tech Stack:** Next.js 16, React 19, Zustand 5, Node crypto (md5), chokidar 5

**Spec:** `docs/superpowers/specs/2026-03-11-hash-polling-design.md`

---

## Chunk 1: Server-Side Foundation (hash endpoint, snapshot fixes, cache stripping)

### Task 1: Create the mtime hash utility

**Files:**
- Create: `src/lib/hash.ts`

This utility is shared between `/api/hash` (returns the hash) and `/api/snapshot` (embeds hash in response).

- [ ] **Step 1: Create `src/lib/hash.ts`**

```typescript
import { createHash } from "crypto";
import { stat, readdir } from "fs/promises";
import path from "path";
import { WORKSPACE_PATH } from "./config";

const WATCHED_FILES = [
  "memory/heartbeat-state.md",
  "memory/today-digest.md",
  "memory/pending-actions.md",
  "intel/DAILY-INTEL.md",
  "metrics/dashboard.md",
];

const WATCHED_DIRS = [
  "comms",
  "content-engine/renders",
  "content-engine/state",
  "content-engine/intake/pending",
  "content-engine/intake/approved",
];

async function safeStat(filePath: string): Promise<number> {
  try {
    const s = await stat(filePath);
    return s.mtimeMs;
  } catch {
    return 0;
  }
}

async function dirMtimes(dirPath: string): Promise<number[]> {
  const mtimes: number[] = [];
  try {
    const dirStat = await stat(dirPath);
    mtimes.push(dirStat.mtimeMs);
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      const s = await stat(entryPath);
      mtimes.push(s.mtimeMs);
    }
  } catch {
    mtimes.push(0);
  }
  return mtimes;
}

export async function computeWorkspaceHash(): Promise<string> {
  const allMtimes: number[] = [];

  // Stat individual files
  for (const file of WATCHED_FILES) {
    allMtimes.push(await safeStat(path.join(WORKSPACE_PATH, file)));
  }

  // Stat directories + their depth-1 contents
  for (const dir of WATCHED_DIRS) {
    const mtimes = await dirMtimes(path.join(WORKSPACE_PATH, dir));
    allMtimes.push(...mtimes);
  }

  const input = allMtimes.sort((a, b) => a - b).join(",");
  return createHash("md5").update(input).digest("hex").slice(0, 12);
}
```

- [ ] **Step 2: Verify it works locally**

Run: `cd /Users/quark/projects/quark-mission-control && npx tsx -e "import { computeWorkspaceHash } from './src/lib/hash'; computeWorkspaceHash().then(h => console.log('hash:', h))"`
Expected: prints a 12-char hex hash

- [ ] **Step 3: Commit**

```bash
git add src/lib/hash.ts
git commit -m "feat: add mtime hash utility for workspace change detection"
```

---

### Task 2: Create `/api/hash` endpoint

**Files:**
- Create: `src/app/api/hash/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextResponse } from "next/server";
import { computeWorkspaceHash } from "@/lib/hash";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // On Vercel (remote), this endpoint is not used — client polls MacBook directly
  if (process.env.SNAPSHOT_URL) {
    return NextResponse.json({ error: "local only" }, { status: 404 });
  }

  // Auth check (same as /api/snapshot)
  const authHeader = request.headers.get("authorization");
  const snapshotKey = process.env.SNAPSHOT_API_KEY;
  if (snapshotKey && authHeader !== `Bearer ${snapshotKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hash = await computeWorkspaceHash();

  return NextResponse.json(
    { hash, timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
```

- [ ] **Step 2: Test locally**

Run: `curl -s http://localhost:3000/api/hash | jq .`
Expected: `{ "hash": "<12-char hex>", "timestamp": "..." }`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/hash/route.ts
git commit -m "feat: add /api/hash endpoint for mtime change detection"
```

---

### Task 3: Update `/api/snapshot` — strip cache, add pipeline + hash

**Files:**
- Modify: `src/app/api/snapshot/route.ts`

- [ ] **Step 1: Import pipeline parser and hash utility**

At the top of the file, add:
```typescript
import { parsePipelineData } from "@/lib/parsers/pipeline";
import { computeWorkspaceHash } from "@/lib/hash";
```

- [ ] **Step 2: Add `pipeline` and `hash` to the snapshot object**

Inside the `snapshot` object (after `system: getSystemInfo()`), add:
```typescript
    pipeline: parsePipelineData(),
```

Before the `return NextResponse.json(snapshot, ...)` line, compute the hash:
```typescript
  const hash = await computeWorkspaceHash();
  const snapshotWithHash = { ...snapshot, hash };
```

Change the return to use `snapshotWithHash`.

- [ ] **Step 3: Replace Cache-Control header**

Change:
```typescript
"Cache-Control": "public, max-age=60, stale-while-revalidate=300",
```
To:
```typescript
"Cache-Control": "no-store",
```

- [ ] **Step 4: Make the GET handler async (if not already)**

The handler needs `await computeWorkspaceHash()`. Verify the function signature is `export async function GET(request: Request)`.

- [ ] **Step 5: Test locally**

Run: `curl -s http://localhost:3000/api/snapshot | jq '{hash, timestamp, pipeline: (.pipeline | keys)}'`
Expected: shows hash field, timestamp, and pipeline keys (activeJob, jobs, scorecard, weights)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/snapshot/route.ts
git commit -m "feat: add pipeline data + hash to snapshot, strip cache headers"
```

---

### Task 4: Strip caches from `data-source.ts`

**Files:**
- Modify: `src/lib/data-source.ts`

- [ ] **Step 1: Reduce cache TTL**

Change line 9:
```typescript
const CACHE_TTL_MS = 30_000; // 30 seconds
```
To:
```typescript
const CACHE_TTL_MS = 2_000; // 2s deduplication only
```

- [ ] **Step 2: Remove Next.js fetch cache**

In the `getSnapshot()` function, change:
```typescript
const res = await fetch(SNAPSHOT_URL, {
  headers,
  next: { revalidate: 30 },
});
```
To:
```typescript
const res = await fetch(SNAPSHOT_URL, {
  headers,
  cache: "no-store",
});
```

- [ ] **Step 3: Add stale flag to all three fallback returns**

There are three places where `cachedSnapshot?.data` is returned on failure (lines 81, 89, and 99). Change all three to:
```typescript
return cachedSnapshot?.data
  ? { ...cachedSnapshot.data, _stale: true, _cachedAt: new Date(cachedSnapshot.fetchedAt).toISOString() }
  : null;
```

The three locations are:
1. Line 81: HTTP error response (`!res.ok`)
2. Line 89: Invalid payload shape (`!isLikelySnapshotPayload`)
3. Line 99: Catch block (network/fetch error)

- [ ] **Step 4: Commit**

```bash
git add src/lib/data-source.ts
git commit -m "fix: strip stale caches from data-source, add stale flag on fallback"
```

---

### Task 5: Fix chokidar SSE — add/unlink events + approved/ path

**Files:**
- Modify: `src/app/api/events/route.ts`

- [ ] **Step 1: Add `intake/approved/` to watch paths**

In the `watchPaths` array, add:
```typescript
`${WORKSPACE_PATH}/content-engine/intake/approved`,
```

- [ ] **Step 2: Change `watcher.on("change", ...)` to `watcher.on("all", ...)`**

Replace:
```typescript
watcher.on("change", (filePath: string) => {
```
With:
```typescript
watcher.on("all", (eventName: string, filePath: string) => {
  if (!["change", "add", "unlink"].includes(eventName)) return;
```

- [ ] **Step 3: Test locally**

Create a test file: `touch ~/.openclaw/workspace/content-engine/intake/approved/test.json`
Check browser SSE stream shows a `pipeline` event.
Clean up: `rm ~/.openclaw/workspace/content-engine/intake/approved/test.json`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/events/route.ts
git commit -m "fix: chokidar watches add/unlink events + intake/approved path"
```

---

## Chunk 2: Client-Side Plumbing (store, hooks, SSE gating)

### Task 6: Expand Zustand store with snapshot state

**Files:**
- Modify: `src/stores/dashboard.ts`

- [ ] **Step 1: Add snapshot fields and actions**

Replace the entire file with:

```typescript
"use client";

import { create } from "zustand";

interface DashboardState {
  // SSE connection (local mode)
  connected: boolean;
  lastEvent: { type: string; file: string; timestamp: number } | null;
  refreshKey: number;

  // Shared snapshot (remote mode)
  snapshot: Record<string, unknown> | null;
  snapshotHash: string | null;
  snapshotStale: boolean;
  snapshotFetchedAt: number | null;
  lastHashCheck: number | null;
  hashHealthy: boolean;

  // Actions
  triggerRefresh: () => void;
  setConnected: (connected: boolean) => void;
  setLastEvent: (event: DashboardState["lastEvent"]) => void;
  setSnapshot: (data: Record<string, unknown>, hash: string) => void;
  setSnapshotStale: (stale: boolean) => void;
  setHashHealth: (healthy: boolean, lastCheck: number) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  connected: false,
  lastEvent: null,
  refreshKey: 0,
  snapshot: null,
  snapshotHash: null,
  snapshotStale: false,
  snapshotFetchedAt: null,
  lastHashCheck: null,
  hashHealthy: true,

  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
  setConnected: (connected) => set({ connected }),
  setLastEvent: (lastEvent) => set({ lastEvent, refreshKey: Date.now() }),
  setSnapshot: (data, hash) =>
    set({ snapshot: data, snapshotHash: hash, snapshotFetchedAt: Date.now(), snapshotStale: false }),
  setSnapshotStale: (snapshotStale) => set({ snapshotStale }),
  setHashHealth: (hashHealthy, lastHashCheck) => set({ hashHealthy, lastHashCheck }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/dashboard.ts
git commit -m "feat: add snapshot state to Zustand store"
```

---

### Task 7: Create `useHashPolling` hook

**Files:**
- Create: `src/hooks/use-hash-polling.ts`

- [ ] **Step 1: Create the hook**

The polling logic lives inside a single `useEffect` to avoid dependency cycles. Refs are used for mutable state that shouldn't trigger re-renders.

```typescript
"use client";

import { useEffect, useRef } from "react";
import { useDashboardStore } from "@/stores/dashboard";

const HASH_POLL_INTERVAL = 5_000;
const HASH_FAIL_THRESHOLD = 3;
const FALLBACK_POLL_INTERVAL = 60_000;
const HASH_FETCH_TIMEOUT = 2_000;
const MAX_BACKOFF = 120_000;

const IS_REMOTE = process.env.NEXT_PUBLIC_IS_REMOTE === "true";
const SNAPSHOT_URL = process.env.NEXT_PUBLIC_SNAPSHOT_URL;
const API_KEY = process.env.NEXT_PUBLIC_SNAPSHOT_API_KEY;

export function useHashPolling() {
  const storeRef = useRef(useDashboardStore.getState());
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Subscribe to store changes for hashRef only
  useEffect(() => {
    return useDashboardStore.subscribe((state) => {
      storeRef.current = state;
    });
  }, []);

  useEffect(() => {
    if (!IS_REMOTE || !SNAPSHOT_URL) return;

    let cancelled = false;
    let failCount = 0;
    let backoff = FALLBACK_POLL_INTERVAL;

    const authHeaders: Record<string, string> = {};
    if (API_KEY) authHeaders["Authorization"] = `Bearer ${API_KEY}`;

    async function fetchSnapshot() {
      try {
        const res = await fetch(`${SNAPSHOT_URL}/api/snapshot`, {
          headers: authHeaders,
          cache: "no-store",
        });
        if (!res.ok) {
          storeRef.current.setSnapshotStale(true);
          return;
        }
        const data = await res.json();
        storeRef.current.setSnapshot(data, data.hash || "");
      } catch {
        storeRef.current.setSnapshotStale(true);
      }
    }

    async function poll() {
      if (cancelled) return;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), HASH_FETCH_TIMEOUT);

        const res = await fetch(`${SNAPSHOT_URL}/api/hash`, {
          headers: authHeaders,
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeout);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const { hash } = await res.json();

        // Reset fail state
        failCount = 0;
        backoff = FALLBACK_POLL_INTERVAL;
        storeRef.current.setHashHealth(true, Date.now());

        // Hash changed — fetch full snapshot
        if (hash !== storeRef.current.snapshotHash) {
          await fetchSnapshot();
        }

        // Schedule next poll
        if (!cancelled) {
          timerRef.current = setTimeout(poll, HASH_POLL_INTERVAL);
        }
      } catch {
        failCount++;
        storeRef.current.setHashHealth(false, Date.now());

        if (failCount >= HASH_FAIL_THRESHOLD) {
          // Hash endpoint down — fallback to full snapshot polling with backoff
          await fetchSnapshot();
          if (!cancelled) {
            timerRef.current = setTimeout(poll, backoff);
            backoff = Math.min(backoff * 1.5, MAX_BACKOFF);
          }
        } else {
          // Retry hash at normal interval
          if (!cancelled) {
            timerRef.current = setTimeout(poll, HASH_POLL_INTERVAL);
          }
        }
      }
    }

    // Initial snapshot fetch, then start polling
    fetchSnapshot().then(() => {
      if (!cancelled) {
        timerRef.current = setTimeout(poll, HASH_POLL_INTERVAL);
      }
    });

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []); // Empty deps — all config is module-level constants
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-hash-polling.ts
git commit -m "feat: add useHashPolling hook for 5s change detection"
```

---

### Task 8: Update `useApi` hook — dual mode (snapshot vs direct fetch)

**Files:**
- Modify: `src/hooks/use-api.ts`

- [ ] **Step 1: Add snapshot-reading mode**

Replace the entire file with:

```typescript
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDashboardStore } from "@/stores/dashboard";

const IS_REMOTE = process.env.NEXT_PUBLIC_IS_REMOTE === "true";
const POLL_INTERVAL_MS = 60_000;

interface UseApiOptions {
  /** Snapshot key to read from shared store (remote mode). If set, skips direct fetch. */
  snapshotKey?: string;
  /** SSE event types that trigger a refetch (local mode) or act as change signal. */
  refreshOn?: string[];
}

export function useApi<T>(url: string, optionsOrRefreshOn?: UseApiOptions | string[]) {
  // Normalize legacy signature: useApi(url, ["heartbeat"]) → useApi(url, { refreshOn: [...] })
  const options: UseApiOptions =
    Array.isArray(optionsOrRefreshOn)
      ? { refreshOn: optionsOrRefreshOn }
      : optionsOrRefreshOn || {};

  const { snapshotKey, refreshOn } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const lastEvent = useDashboardStore((s) => s.lastEvent);
  const connected = useDashboardStore((s) => s.connected);
  const snapshot = useDashboardStore((s) => s.snapshot);
  const snapshotFetchedAt = useDashboardStore((s) => s.snapshotFetchedAt);
  const snapshotHash = useDashboardStore((s) => s.snapshotHash);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Remote mode with snapshotKey: read from shared store ---
  useEffect(() => {
    if (!IS_REMOTE || !snapshotKey) return;
    if (snapshot === null) return; // Wait for first snapshot fetch
    const section = snapshot[snapshotKey] as T | undefined;
    setData(section ?? null);
    setError(null);
    setLastUpdated(snapshotFetchedAt);
    setLoading(false);
  }, [snapshotKey, snapshot, snapshotFetchedAt]);

  // --- Direct fetch (local mode, or remote parameterized queries without snapshotKey) ---
  const fetchData = useCallback(async () => {
    if (IS_REMOTE && snapshotKey) return; // Handled by snapshot store
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
  }, [url, snapshotKey]);

  // Initial fetch (direct mode only)
  useEffect(() => {
    if (IS_REMOTE && snapshotKey) return;
    fetchData();
  }, [fetchData, snapshotKey]);

  // Re-fetch on SSE events (local mode)
  useEffect(() => {
    if (IS_REMOTE && snapshotKey) return;
    if (!lastEvent || !refreshOn) return;
    if (refreshOn.includes(lastEvent.type)) {
      fetchData();
    }
  }, [lastEvent, refreshOn, fetchData, snapshotKey]);

  // Re-fetch parameterized queries on hash change (remote mode, no snapshotKey)
  useEffect(() => {
    if (!IS_REMOTE || snapshotKey) return;
    if (!snapshotHash) return;
    fetchData();
  }, [snapshotHash, fetchData, snapshotKey]);

  // Polling fallback when SSE is disconnected (local mode only)
  useEffect(() => {
    if (IS_REMOTE) return;
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

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-api.ts
git commit -m "feat: useApi dual mode — snapshot store (remote) vs direct fetch (local)"
```

---

### Task 9: Gate SSE + mount hash polling in AppShell

**Files:**
- Modify: `src/components/layout/app-shell.tsx`

- [ ] **Step 1: Conditionally mount SSE and hash polling**

Replace the file with:

```typescript
"use client";

import { Sidebar } from "@/components/ui/sidebar";
import { useSSE } from "@/hooks/use-sse";
import { useHashPolling } from "@/hooks/use-hash-polling";
import { useDashboardStore } from "@/stores/dashboard";
import { StalenessBanner } from "@/components/staleness-banner";

const IS_REMOTE = process.env.NEXT_PUBLIC_IS_REMOTE === "true";

function LocalSSE() {
  useSSE();
  return null;
}

function RemoteHashPolling() {
  useHashPolling();
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const lastEvent = useDashboardStore((s) => s.lastEvent);

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      {/* Data freshness layer */}
      {IS_REMOTE ? <RemoteHashPolling /> : <LocalSSE />}

      {/* Ambient orbs */}
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />

      <Sidebar />

      <main className="pt-16 px-4 pb-6 md:ml-60 md:pt-6 md:px-6 relative z-10">
        {/* Staleness banner (remote mode) */}
        {IS_REMOTE && <StalenessBanner />}

        {/* SSE event indicator (local mode) */}
        {!IS_REMOTE && lastEvent && Date.now() - lastEvent.timestamp < 3000 && (
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

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/app-shell.tsx
git commit -m "feat: gate SSE (local) vs hash polling (remote) in AppShell"
```

---

### Task 10: Create staleness banner component

**Files:**
- Create: `src/components/staleness-banner.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { useDashboardStore } from "@/stores/dashboard";

export function StalenessBanner() {
  const hashHealthy = useDashboardStore((s) => s.hashHealthy);
  const snapshotStale = useDashboardStore((s) => s.snapshotStale);
  const snapshotFetchedAt = useDashboardStore((s) => s.snapshotFetchedAt);

  // Connection lost
  if (!hashHealthy) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-amber-900/80 border border-amber-600/50 text-amber-200 text-xs font-mono flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Connection to MacBook lost — showing cached data
      </div>
    );
  }

  // Stale snapshot (fetch failed but hash endpoint is up)
  if (snapshotStale && snapshotFetchedAt) {
    const agoMs = Date.now() - snapshotFetchedAt;
    const agoMin = Math.floor(agoMs / 60_000);
    const label = agoMin < 1 ? "< 1m ago" : `${agoMin}m ago`;
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-amber-900/40 border border-amber-600/30 text-amber-300/80 text-xs font-mono flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
        Showing cached data from {label}
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/staleness-banner.tsx
git commit -m "feat: add staleness banner for connection health visibility"
```

---

## Chunk 3: Widget Migration (switch all useApi calls to snapshot mode)

### Task 11: Add `snapshotKey` to all dashboard widget `useApi` calls

**Files:**
- Modify: `src/components/dashboard/system-vitals.tsx`
- Modify: `src/components/dashboard/cron-grid.tsx`
- Modify: `src/components/dashboard/agent-bar.tsx`
- Modify: `src/components/dashboard/pending-badge.tsx`
- Modify: `src/components/dashboard/degradation-banner.tsx`
- Modify: `src/components/dashboard/codex-quota.tsx`
- Modify: `src/components/dashboard/heartbeat-card.tsx`
- Modify: `src/components/dashboard/activity-ticker.tsx`
- Modify: `src/components/dashboard/pipeline-widget.tsx`

The `useApi` hook now accepts `{ snapshotKey, refreshOn }` as the second argument. The old array signature still works for backward compat, but to enable snapshot mode, pass the object form with `snapshotKey`.

- [ ] **Step 1: Update each dashboard widget**

For each widget, change the `useApi` call from array form to object form. The mapping:

| Widget | Before | After |
|--------|--------|-------|
| `system-vitals.tsx` | `useApi<SystemInfo>("/api/system", ["heartbeat"])` | `useApi<SystemInfo>("/api/system", { snapshotKey: "system", refreshOn: ["heartbeat"] })` |
| `cron-grid.tsx` | `useApi<...>("/api/cron", [...])` | `useApi<...>("/api/cron", { snapshotKey: "cron", refreshOn: ["heartbeat"] })` |
| `agent-bar.tsx` | `useApi<...>("/api/agents", [...])` | `useApi<...>("/api/agents", { snapshotKey: "agents", refreshOn: ["comms"] })` |
| `pending-badge.tsx` | `useApi<...>("/api/pending", ["pending"])` | `useApi<...>("/api/pending", { snapshotKey: "pending", refreshOn: ["pending"] })` |
| `degradation-banner.tsx` | `useApi<...>("/api/metrics", ["metrics"])` | `useApi<...>("/api/metrics", { snapshotKey: "metrics", refreshOn: ["metrics"] })` |
| `codex-quota.tsx` | `useApi<...>("/api/metrics", ["metrics"])` | `useApi<...>("/api/metrics", { snapshotKey: "metrics", refreshOn: ["metrics"] })` |
| `heartbeat-card.tsx` | `useApi<...>("/api/heartbeat", ["heartbeat"])` | `useApi<...>("/api/heartbeat", { snapshotKey: "heartbeat", refreshOn: ["heartbeat"] })` |
| `activity-ticker.tsx` | `useApi<...>("/api/digest", ["digest"])` | `useApi<...>("/api/digest", { snapshotKey: "digest", refreshOn: ["digest"] })` |
| `pipeline-widget.tsx` | `useApi<...>("/api/pipeline", ["pipeline"])` | `useApi<...>("/api/pipeline", { snapshotKey: "pipeline", refreshOn: ["pipeline"] })` |

In each file, find the `useApi(` call and change the second argument from `["eventType"]` to `{ snapshotKey: "key", refreshOn: ["eventType"] }`.

- [ ] **Step 2: Verify the app still compiles**

Run: `cd /Users/quark/projects/quark-mission-control && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/
git commit -m "feat: dashboard widgets use snapshot store in remote mode"
```

---

### Task 12: Add `snapshotKey` to all page-level `useApi` calls

**Files:**
- Modify: `src/app/content/page.tsx`
- Modify: `src/app/cron/page.tsx`
- Modify: `src/app/calendar/page.tsx`
- Modify: `src/app/metrics-page/page.tsx`
- Modify: `src/app/intel/page.tsx`
- Modify: `src/app/command-center/page.tsx`
- Modify: `src/app/settings/page.tsx`
- Modify: `src/app/agents/page.tsx` (list only, not detail)
- Modify: `src/app/activity/page.tsx` (list only, not date fetch)

- [ ] **Step 1: Update each page**

| Page | useApi Call | snapshotKey | refreshOn |
|------|-----------|-------------|-----------|
| `content/page.tsx` | `"/api/pipeline"` | `"pipeline"` | `["pipeline"]` |
| `cron/page.tsx` | `"/api/cron"` | `"cron"` | `["heartbeat"]` |
| `calendar/page.tsx` | `"/api/cron"` | `"cron"` | `["heartbeat"]` |
| `metrics-page/page.tsx` | `"/api/metrics"` | `"metrics"` | `["metrics"]` |
| `intel/page.tsx` | `"/api/intel?date=..."` | No snapshotKey (parameterized) | `["intel"]` |
| `command-center/page.tsx` | `"/api/command-center"` | `"commandCenter"` | `["metrics", "cron"]` |
| `settings/page.tsx` (system) | `"/api/system"` | `"system"` | `["heartbeat"]` |
| `settings/page.tsx` (cc) | `"/api/command-center"` | `"commandCenter"` | `["metrics"]` |
| `agents/page.tsx` (list) | `"/api/agents"` | `"agents"` | `["comms"]` |
| `agents/page.tsx` (detail) | `"/api/comms?agent=..."` | No snapshotKey (parameterized) | `["comms"]` |
| `activity/page.tsx` | `"/api/session-log?date=..."` | No snapshotKey (parameterized) | `["digest"]` |

For parameterized calls (intel, agent detail, activity), keep the array form or use `{ refreshOn: [...] }` without `snapshotKey`. These will use hash-change as refresh trigger in remote mode (handled by `useApi` internally).

- [ ] **Step 2: Verify build**

Run: `cd /Users/quark/projects/quark-mission-control && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/content/ src/app/cron/ src/app/calendar/ src/app/metrics-page/ src/app/intel/ src/app/command-center/ src/app/settings/ src/app/agents/ src/app/activity/
git commit -m "feat: page-level useApi calls use snapshot store in remote mode"
```

---

## Chunk 4: Environment Config + Deploy

### Task 13: Configure environment variables

**Files:**
- Modify: `.env.local` (or `.env`)
- Modify: Vercel environment settings

- [ ] **Step 1: Add env vars to `.env.local` for local dev**

Ensure `.env.local` has (values may already exist, don't duplicate):
```
# Leave NEXT_PUBLIC_IS_REMOTE unset for local mode
# NEXT_PUBLIC_IS_REMOTE=true

# These are only needed when running as remote (Vercel)
# NEXT_PUBLIC_SNAPSHOT_URL=https://<macbook-tailscale-funnel-url>
# NEXT_PUBLIC_SNAPSHOT_API_KEY=<same-as-SNAPSHOT_API_KEY>
```

- [ ] **Step 2: Set Vercel env vars**

In Vercel dashboard (or via `vercel env add`):
```
NEXT_PUBLIC_IS_REMOTE=true
NEXT_PUBLIC_SNAPSHOT_URL=<same value as current SNAPSHOT_URL>
NEXT_PUBLIC_SNAPSHOT_API_KEY=<same value as current SNAPSHOT_API_KEY>
```

Note: the existing `SNAPSHOT_URL` and `SNAPSHOT_API_KEY` (server-side) are still needed for parameterized API routes that proxy through `data-source.ts`.

- [ ] **Step 3: Commit env template**

```bash
git add .env.local
git commit -m "chore: add NEXT_PUBLIC_IS_REMOTE env var template"
```

---

### Task 14: End-to-end verification

- [ ] **Step 1: Test local mode**

Run: `cd /Users/quark/projects/quark-mission-control && npm run dev`

1. Open http://localhost:3000
2. Verify SSE event indicator appears when touching a watched file: `touch ~/.openclaw/workspace/metrics/dashboard.md`
3. Verify no hash polling in browser Network tab (no `/api/hash` requests)
4. Verify widgets update within ~2s of file change

- [ ] **Step 2: Test remote mode locally (simulate Vercel)**

Run: `NEXT_PUBLIC_IS_REMOTE=true NEXT_PUBLIC_SNAPSHOT_URL=http://localhost:3000 npm run dev -- --port 3001`

1. Open http://localhost:3001
2. Verify hash polling in Network tab (GET `/api/hash` every 5s)
3. Touch a file: `touch ~/.openclaw/workspace/metrics/dashboard.md`
4. Verify data updates within ~10s
5. Verify no SSE connection attempts in Network tab

- [ ] **Step 3: Test staleness banner**

1. With remote mode running, stop the local dev server (port 3000)
2. Wait 15-20s (3 failed hash polls)
3. Verify amber "Connection to MacBook lost" banner appears
4. Restart local dev server
5. Verify banner auto-dismisses within 5s

- [ ] **Step 4: Deploy to Vercel**

Run: `cd /Users/quark/projects/quark-mission-control && vercel --prod`
Or push to main and let Vercel auto-deploy.

Verify on phone:
1. Dashboard loads and shows current data
2. Network tab shows hash polls every 5s
3. Data updates within ~5-10s of file changes on MacBook

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: e2e verification fixes for hash polling"
```
