# Change-Hash Polling for Mission Control

**Date:** 2026-03-11
**Status:** Draft
**Problem:** Vercel deployment has quadruple cache stacking (client 60s + CDN 60s + Next.js fetch 30s + in-memory 30s) causing up to 3 minutes of stale data, with infinite staleness if Tailscale Funnel goes down.
**Solution:** Two-phase fetch — poll a lightweight mtime hash every 5s, only fetch the full snapshot when data actually changes.

---

## 1. Hash Endpoint (MacBook)

New route: `GET /api/hash`

**Important:** This endpoint only functions on the local MacBook instance. On Vercel, the client polls `{SNAPSHOT_URL}/api/hash` directly via Tailscale Funnel — it never hits Vercel's own `/api/hash`. The Vercel-deployed version of this route should return early with `{ error: "local only" }` if `SNAPSHOT_URL` is set.

- Requires bearer token auth using `SNAPSHOT_API_KEY` (same as `/api/snapshot`)
- Stats the mtime of every watched file and directory:
  - `memory/heartbeat-state.md`
  - `memory/today-digest.md`
  - `memory/pending-actions.md`
  - `intel/DAILY-INTEL.md`
  - `metrics/dashboard.md`
  - `comms/` (directory)
  - `content-engine/renders/` (directory)
  - `content-engine/state/` (directory)
  - `content-engine/intake/pending/` (directory)
  - `content-engine/intake/approved/` (directory — currently missing from watchers)
- Concatenates all mtimes (sorted for determinism), hashes with Node's built-in `crypto.createHash('md5')` — fast enough for a handful of stat results, no external dependency
- Returns: `{ hash: "abc123", timestamp: "2026-03-11T20:30:00Z" }`
- Response header: `Cache-Control: no-store`
- Target latency: <5ms

For directories: stat all files at depth 1 AND all immediate subdirectories. For subdirectories, stat their mtime (which reflects file add/remove within them). This catches nested cases like `renders/heygen-jobs/`.

## 2. Strip Existing Caches

### `/api/snapshot` route (`src/app/api/snapshot/route.ts`)
- Remove `Cache-Control: public, max-age=60, stale-while-revalidate=300`
- Replace with `Cache-Control: no-store`
- Add `pipeline` data to snapshot response (import `parsePipelineData` from pipeline parser)
- Add `hash` field to snapshot response — compute the same mtime hash at response time, so the client can store a hash that's guaranteed consistent with the data it received (avoids race condition between separate hash and snapshot fetches)

### `data-source.ts` (`src/lib/data-source.ts`)
- Remove `next: { revalidate: 30 }` from the fetch call (line 74)
- Reduce `CACHE_TTL_MS` from 30,000 to 2,000 (2s deduplication only, not freshness)
- When returning cached data on fetch failure, tag response with `_stale: true` and `_cachedAt: <ISO timestamp>`
- **Note:** After this change, `data-source.ts` is only used by parameterized API routes (agent detail, session log) that still proxy through individual endpoints. The main snapshot flow bypasses it entirely — the hash-polling hook fetches `{SNAPSHOT_URL}/api/snapshot` directly. These changes are defensive cleanup for the remaining routes.

## 3. Centralized Snapshot Store

### Zustand store changes (`src/stores/dashboard.ts`)

Add shared snapshot state:

```typescript
interface DashboardState {
  // Existing fields...
  connected: boolean;
  lastEvent: { type: string; file: string; timestamp: number } | null;

  // New fields
  snapshot: Record<string, unknown> | null;
  snapshotHash: string | null;
  snapshotStale: boolean;
  snapshotFetchedAt: number | null;
  lastHashCheck: number | null;
  hashHealthy: boolean;

  // New actions
  setSnapshot: (data: Record<string, unknown>, hash: string) => void;
  setSnapshotStale: (stale: boolean) => void;
  setHashHealth: (healthy: boolean, lastCheck: number) => void;
}
```

Widgets read their section from `snapshot` (e.g., `snapshot.cron`, `snapshot.heartbeat`) instead of making independent API calls.

## 4. Hash Polling Hook (`src/hooks/use-hash-polling.ts`)

New hook, used once at the layout level:

```
HASH_POLL_INTERVAL = 5_000  (5 seconds)
HASH_FAIL_THRESHOLD = 3     (consecutive failures before "disconnected")
FALLBACK_POLL_INTERVAL = 60_000  (60s full-snapshot polling when hash endpoint is down, exponential backoff up to 120s)

every 5s:
  GET {SNAPSHOT_URL}/api/hash (with Bearer token, 2s timeout)
  if success:
    reset fail counter
    set hashHealthy = true
    if hash !== snapshotHash:
      GET {SNAPSHOT_URL}/api/snapshot (with Bearer token)
      if success:
        store.setSnapshot(data, data.hash)  // use hash FROM snapshot response, not from /api/hash
        store.setSnapshotStale(false)
      if failure:
        store.setSnapshotStale(true)
  if failure:
    increment fail counter
    if failCount >= 3:
      set hashHealthy = false
      fall back to 60s full-snapshot polling (with exponential backoff up to 120s)
```

The hash from `/api/hash` is used only to detect "something changed." The authoritative hash stored in Zustand comes from the snapshot response itself (computed at snapshot-build time), ensuring hash-to-data consistency. This avoids a race condition where files change between the hash poll and the snapshot fetch.

On local (non-Vercel): this hook is inactive. SSE + chokidar handles freshness. The hook checks `NEXT_PUBLIC_IS_REMOTE` env var and skips if local.

## 5. Modified `useApi` Hook (`src/hooks/use-api.ts`)

Two modes depending on environment:

### Remote mode (Vercel)
- Reads data from Zustand `snapshot` store by section key
- No independent fetching or polling
- Re-renders when snapshot updates
- Accepts a `snapshotKey` parameter (e.g., `"cron"`, `"heartbeat"`)
- Falls back to direct API fetch for parameterized queries (agent detail, session log by date)

### Local mode (MacBook)
- Behavior unchanged: SSE-triggered refetch + polling fallback

### Parameterized queries (both modes)
Pages with parameterized fetches (`/agents?agent=X`, `/activity?date=Y`) keep direct `useApi` calls but:
- On remote: use `snapshotHash` change as refresh trigger instead of SSE events
- On local: continue using SSE events as trigger

Affected pages:
- `/agents` — `GET /api/comms?agent={name}` (agent detail panel)
- `/activity` — `GET /api/session-log?date={date}` (date picker)

## 6. Chokidar Fix (Local SSE) + SSE Gating

While the main fix targets Vercel, also fix the local SSE watcher:

### `src/app/api/events/route.ts`
- Add `add` and `unlink` events alongside `change`:
  ```typescript
  watcher.on("all", (event, filePath) => {
    if (!["change", "add", "unlink"].includes(event)) return;
    // ... existing event mapping logic
  });
  ```
- Add `content-engine/intake/approved/` to watch paths

### Disable SSE on Vercel
- Expose `NEXT_PUBLIC_IS_REMOTE` env var (set to `"true"` on Vercel, unset locally)
- In `src/app/layout.tsx` or the SSE provider: conditionally mount `useSSE` only when `NEXT_PUBLIC_IS_REMOTE` is NOT set
- This prevents the infinite reconnect loop (SSE connect → fail → reconnect every 5s) that currently runs on Vercel, wasting resources and setting `connected: false` repeatedly

## 7. Staleness Indicator

### Connection health banner
- If hash endpoint unreachable for >30s (3 consecutive failures at 5s interval): show subtle amber banner "Connection to MacBook lost — showing cached data"
- If snapshot data `_stale` flag is true: show "Stale" badge on affected widgets
- If hash endpoint recovers: auto-dismiss banner

### Per-widget "Updated X ago" timestamps
- Already exist in most widgets
- Source timestamp from `snapshotFetchedAt` in Zustand store (single source of truth)

## 8. Pages & Data Mapping

### Pages reading from shared snapshot (10 pages):

| Page | Snapshot Key(s) |
|------|----------------|
| `/` (dashboard) | `cron`, `heartbeat`, `digest`, `pending`, `metrics`, `system`, `agents`, `pipeline` |
| `/activity` | `sessionLog` (list), parameterized fetch for date |
| `/agents` | `agents` (list), parameterized fetch for agent detail |
| `/calendar` | `cron` |
| `/command-center` | `commandCenter` |
| `/content` | `pipeline` |
| `/cron` | `cron` |
| `/intel` | `intel` |
| `/metrics-page` | `metrics` |
| `/settings` | `system`, `commandCenter` |

### Pages with manual/on-demand fetching (unchanged, 3 pages):

| Page | Behavior |
|------|----------|
| `/knowledge` | Load on click, no auto-refresh |
| `/memory-browser` | Load on click, no auto-refresh |
| `/login` | Form submission |

## 9. Data Flow (After)

### Remote (Vercel):
```
Client (every 5s)
  → GET /api/hash (via Funnel) → MacBook stats files → { hash: "abc" }
  → hash unchanged? → skip, do nothing
  → hash changed? → GET /api/snapshot (via Funnel) → full data
  → Zustand store updated → all widgets re-render from shared snapshot
```

### Local (MacBook):
```
Chokidar detects file change/add/unlink
  → SSE push to client → { type: "heartbeat", file: "..." }
  → useApi re-fetches relevant endpoint
  → Widget re-renders
```

## 10. What Changes (Summary)

| Before | After |
|--------|-------|
| 60s blind polling, full payload every time | 5s hash poll (~50 bytes), full payload only on change |
| 4 cache layers stacking to ~3min | No caching layers, ~5s effective freshness |
| Silent stale fallback | Visible staleness indicator + amber banner |
| Per-widget independent fetches (N requests) | Single shared snapshot (1 request) |
| No connection health visibility | "Connection lost" banner after 30s |
| Chokidar misses file add/delete | Watches all events (change/add/unlink) |
| `intake/approved/` not watched | Added to watch paths |

## 11. Files to Create/Modify

| File | Action |
|------|--------|
| `src/app/api/hash/route.ts` | **New** — mtime hash endpoint (local only, auth required) |
| `src/hooks/use-hash-polling.ts` | **New** — 5s hash poll + snapshot fetch (remote only) |
| `src/hooks/use-api.ts` | **Modify** — remote mode reads from shared snapshot; parameterized queries use hash change as trigger |
| `src/lib/data-source.ts` | **Modify** — strip caches, add stale flag (defensive cleanup for remaining parameterized routes) |
| `src/app/api/snapshot/route.ts` | **Modify** — strip Cache-Control, add `pipeline` data, add `hash` field to response |
| `src/stores/dashboard.ts` | **Modify** — add shared snapshot state |
| `src/app/api/events/route.ts` | **Modify** — add/unlink events + approved/ watch path |
| `src/components/staleness-banner.tsx` | **New** — connection health banner |
| `src/app/layout.tsx` | **Modify** — mount hash polling hook + staleness banner; conditionally disable SSE on remote |
| Dashboard widget components | **Modify** — read from snapshot store instead of useApi (remote mode) |

## 12. Risk & Rollback

- **Risk:** If hash endpoint is slow (>500ms), it becomes the bottleneck. Mitigation: hash computation is pure stat calls, should be <5ms. Add a 2s timeout on hash fetch.
- **Risk:** Directory mtime doesn't update on nested file changes on all filesystems. Mitigation: stat first-level files inside each directory, not just the directory.
- **Rollback:** Feature-flagged via `SNAPSHOT_URL` env var. If unset, everything falls back to current local behavior. To revert on Vercel, remove `SNAPSHOT_URL` env var.
