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

`src/app/status/page.tsx` currently reads `snapshot` (line 21), `snapshotStale` (line 22), and `snapshotFetchedAt` (line 23) from the Zustand store. All three fields are being deleted from the store. The entire derivation block (lines 51–112) must also go.

**Fix:** Replace the whole page with `useApi("/api/status")`. The endpoint already exists — it runs all parsers in parallel and returns `{ pipeline, cron, quota, quark, system, timestamp }` where each card already matches the `derive*Status()` return types. Consume these directly — do not re-derive inside the page. Drop the `stale` display and replace `fetchedAt` with `data.timestamp` from the API response.

Also add `export const dynamic = "force-dynamic"` to `src/app/api/status/route.ts` to prevent Next.js from statically caching it at build time.

### 2. Delete remote-mode code

The following files and branches exist solely to support the Vercel polling architecture and serve no purpose in local mode:

**Delete entirely:**
- `src/hooks/use-hash-polling.ts`
- `src/hooks/use-persisted-snapshot.ts`
- `src/components/staleness-banner.tsx`

**Simplify (remove IS_REMOTE / snapshot branches):**
- `src/hooks/use-api.ts` — remove: `IS_REMOTE` constant, `snapshotKey` from `UseApiOptions`, store subscriptions on lines 32–34 (`snapshot`, `snapshotFetchedAt`, `snapshotHash`), the remote snapshot `useEffect` (lines 39–47), the `snapshotHash` re-fetch `useEffect` (lines 81–86), and all `if (IS_REMOTE ...)` guards. Keep: direct fetch, SSE refresh, polling fallback.
- `src/stores/dashboard.ts` — remove the import of `use-persisted-snapshot` (line 4), then remove fields/actions: `snapshot`, `snapshotHash`, `snapshotStale`, `snapshotFetchedAt`, `lastHashCheck`, `hashHealthy`, `setSnapshot`, `setSnapshotStale`, `setHashHealth`, `hydrateFromCache`. Keep: `connected`, `lastEvent`, `refreshKey`, `cognitiveDegradation`, `engagementUnanswered`. **The import must be removed before (or simultaneously with) deleting `use-persisted-snapshot.ts` to avoid a broken module reference.**
- `src/components/layout/app-shell.tsx` — remove `RemoteHashPolling`, `IS_REMOTE` branch, `hydrateFromCache` effect, `StalenessBanner`. Keep: `LocalSSE`, sidebar, ambient orbs.
- `src/lib/data-source.ts` — delete entirely (only used for server-side snapshot fetching in remote mode; local parsers are called directly).

**Remove env references + rewrite settings page local-only:**
- `src/app/settings/page.tsx` — remove `IS_REMOTE` and `NEXT_PUBLIC_SNAPSHOT_URL` constants, remove `snapshotFetchedAt` and `hashHealthy` store subscriptions (both deleted from store), rewrite `isConnected` to use `connected` only, set `modeLabel` to always "Local", replace `snapshotFetchedAt` row with SSE `lastEvent` timestamp, remove `snapshotKey` from its `useApi()` call.

**Remove `snapshotKey` from all `useApi()` call sites:**
`snapshotKey` is being deleted from `UseApiOptions`. Remove the property from every `useApi()` call — both pages and dashboard components:

Pages:
- `src/app/cognitive/page.tsx`
- `src/app/schedule/page.tsx`
- `src/app/agents/page.tsx`
- `src/app/content/page.tsx`
- `src/app/operations/page.tsx`
- `src/app/engagement/page.tsx`
- `src/app/settings/page.tsx`

Dashboard components (also use `snapshotKey`):
- `src/components/dashboard/system-pulse.tsx`
- `src/components/dashboard/agent-bar.tsx`
- `src/components/dashboard/codex-quota.tsx`
- `src/components/dashboard/health-score.tsx`
- `src/components/dashboard/activity-ticker.tsx`
- `src/components/dashboard/pipeline-widget.tsx`

**Clean up all API routes that import `data-source.ts`:**
Every route file that imports from `@/lib/data-source` has an `if (isRemote()) { return getSnapshotSection(...) }` guard at the top. Remove the import and delete that guard block from each. The local parser call that follows each guard is already correct and stays.

**Special cases** — two routes call `getSourceMeta()` *outside* the `isRemote()` guard (embedded in the local-mode response body):
- `api/cron/route.ts` — remove the `getSourceMeta()` call and the `source`/`warning` fields from the response object
- `api/schedule/route.ts` — same

Then delete entirely:
- `src/lib/data-source.ts`
- `src/app/api/source-status/route.ts` (Vercel diagnostics only)
- `src/app/api/snapshot/route.ts` (Vercel bundle endpoint — comment reads "Used by Vercel deployment")
- `src/app/api/hash/route.ts` (Vercel hash-polling endpoint only)

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
