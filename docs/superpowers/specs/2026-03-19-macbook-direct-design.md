# Mission Control: MacBook-Direct Architecture

**Date:** 2026-03-19
**Status:** Approved
**Replaces:** Vercel + hash-polling hybrid

---

## Problem

The current architecture routes browser → Vercel → MacBook via Tailscale Funnel polling. All data lives on the MacBook (local files). Vercel can't access it server-side, so every page does a round-trip poll. When `next dev` hangs or Tailscale Funnel drops, Vercel shows blank screens. IndexedDB only helps on return visits after a successful connection — useless on first load or after a hang.

---

## Solution

Serve Next.js directly from the MacBook via Tailscale Funnel. Browser hits MacBook directly. SSR reads local files. No polling, no blank screens, no Vercel dependency.

```
Browser → Tailscale Funnel → MacBook :3000 (Next.js production)
                                        ↓
                               Parsers read local files directly
                               API routes return SSR data
                               SSE pushes live file-change events
```

---

## Code Changes

### 1. Status page — fix for local mode

`src/app/status/page.tsx` currently reads from Zustand `snapshot`, which is only populated in remote mode (hash-polling). Local mode never sets it → permanent blank.

**Fix:** Replace Zustand snapshot reads with `useApi("/api/status")`, matching the pattern used by every other page (engagement, schedule, cognitive, etc.).

The `/api/status` endpoint already exists and works — it runs all parsers in parallel and returns derived status cards. No new endpoint needed.

### 2. Delete remote-mode code

The following files and branches exist solely to support the Vercel polling architecture and serve no purpose in local mode:

**Delete entirely:**
- `src/hooks/use-hash-polling.ts`
- `src/hooks/use-persisted-snapshot.ts`
- `src/components/staleness-banner.tsx`

**Simplify (remove IS_REMOTE / snapshot branches):**
- `src/hooks/use-api.ts` — remove `IS_REMOTE` guard, `snapshotKey` option, snapshot store reads, hash-change re-fetch. Keep: direct fetch, SSE refresh, polling fallback.
- `src/stores/dashboard.ts` — remove `snapshot`, `snapshotHash`, `snapshotStale`, `snapshotFetchedAt`, `lastHashCheck`, `hashHealthy`, `setSnapshot`, `setSnapshotStale`, `setHashHealth`, `hydrateFromCache`. Keep: `connected`, `lastEvent`, `refreshKey`, `cognitiveDegradation`, `engagementUnanswered`.
- `src/components/layout/app-shell.tsx` — remove `RemoteHashPolling`, `IS_REMOTE` branch, `hydrateFromCache` effect, `StalenessBanner`. Keep: `LocalSSE`, sidebar, ambient orbs.
- `src/lib/data-source.ts` — delete entirely (only used for server-side snapshot fetching in remote mode; local parsers are called directly).

**Remove env references + rewrite settings page local-only:**
- `src/app/settings/page.tsx` — remove `IS_REMOTE` and `NEXT_PUBLIC_SNAPSHOT_URL` constants, remove `snapshotFetchedAt` and `hashHealthy` store subscriptions (both deleted from store), rewrite `isConnected` to use `connected` only, set `modeLabel` to always "Local", replace `snapshotFetchedAt` row with SSE `lastEvent` timestamp, remove `snapshotKey` from its `useApi()` call.

**Remove `snapshotKey` from all `useApi()` call sites:**
Seven pages pass `snapshotKey` to `useApi()` — this option is being deleted from `UseApiOptions`. Remove the `snapshotKey` property from each call:
- `src/app/cognitive/page.tsx`
- `src/app/schedule/page.tsx`
- `src/app/agents/page.tsx`
- `src/app/content/page.tsx`
- `src/app/operations/page.tsx`
- `src/app/engagement/page.tsx`
- `src/app/settings/page.tsx`

**Clean up all API routes that import `data-source.ts`:**
Every route file that imports from `@/lib/data-source` has an `if (isRemote()) { return getSnapshotSection(...) }` guard at the top. Remove the import and delete that guard block from each. The local parser call that follows each guard is already correct and stays. Then delete `data-source.ts` and `/api/source-status/route.ts` entirely. Affected routes:
`api/intel`, `api/command-center`, `api/metrics`, `api/pipeline`, `api/cognitive`, `api/model-usage`, `api/schedule`, `api/memory`, `api/digest`, `api/comms`, `api/agents`, `api/content`, `api/session-log`, `api/operations`, `api/engagement`, `api/heartbeat`, `api/system`, `api/knowledge`, `api/cron-history`, `api/cron`, `api/pending`, `api/source-status`

### 3. No .env.local changes needed

`NEXT_PUBLIC_IS_REMOTE` was never set in `.env.local`. No action required.

---

## Infrastructure Changes

### 4. Production build

Run `npm run build` in `/Users/quark/projects/quark-mission-control`. Required before `npm start` works. Must be re-run after any code deploy.

### 5. LaunchAgent — reload

`~/Library/LaunchAgents/com.quark.mission-control.plist` already exists and is correctly configured:
- Runs `npm start` (production server)
- `KeepAlive: true` — auto-restarts on crash
- `RunAtLoad: true` — starts on boot

Steps: unload the plist, kill the current `next dev` process, run build, reload the plist.

### 6. Vercel

Leave the Vercel project as-is. No deployments will be triggered (no `NEXT_PUBLIC_IS_REMOTE` pushing). Costs nothing. Can be reused later if needed.

---

## What Doesn't Change

- All pages other than Status already work correctly in local mode
- Tailscale Funnel config unchanged
- Auth (cookie-based, `src/proxy.ts`) unchanged
- All parsers unchanged
- All API routes unchanged (except `/api/status` which is already correct)
- Dashboard URL: `https://macbook-pro-14-tbo.tail2380be.ts.net/`

---

## Testing

1. Build succeeds (`npm run build` exits 0)
2. `npm start` serves on port 3000
3. `curl http://localhost:3000/api/status` returns 5 status cards with real data
4. `/status` page shows 5 cards immediately (no "Waiting for connection")
5. All other pages load without errors
6. Kill and restart `npm start` — LaunchAgent restarts it within 5 seconds

---

## Success Criteria

- No blank screens under any condition while MacBook is running
- Status page loads in < 500ms
- No remote-mode code remaining in codebase
- LaunchAgent running `npm start` (not `next dev`)
