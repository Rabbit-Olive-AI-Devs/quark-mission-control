# Mission Control — Full Audit Report

**Date:** 2026-03-10
**Scope:** Complete codebase review — architecture, data pipeline, every page, every API route, every parser, every component
**Auditor:** Claude (Opus 4.6)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Data Pipeline Audit](#3-data-pipeline-audit)
4. [Page-by-Page Audit](#4-page-by-page-audit)
5. [Stale & False Data Findings](#5-stale--false-data-findings)
6. [Content Pipeline Assessment](#6-content-pipeline-assessment)
7. [Metrics & KPI Assessment](#7-metrics--kpi-assessment)
8. [Security Audit](#8-security-audit)
9. [UX/UI Issues](#9-uxui-issues)
10. [Code Quality Issues](#10-code-quality-issues)
11. [Proposals & Recommendations](#11-proposals--recommendations)
12. [Priority Action Items](#12-priority-action-items)

---

## 1. Executive Summary

Mission Control is a Next.js 16 dashboard built to monitor Quark's autonomous agent ecosystem (cron jobs, agent comms, content pipeline, intel, memory, knowledge base). The architecture is solid for a Phase 1/POC, but **several structural issues** undermine its core promise of being a reliable operations dashboard:

### Top-Level Findings

| Category | Score | Summary |
|---|---|---|
| **Data Freshness** | 3/10 | Multiple sources of stale/fabricated data; no auto-refresh intervals on most pages |
| **Data Accuracy** | 4/10 | Hardcoded model chains, hardcoded settings page, warmup tracker with magic date |
| **Real-Time Capability** | 5/10 | SSE infrastructure exists but only works locally (chokidar); no polling fallback for Vercel |
| **Feature Completeness** | 7/10 | 12 pages covering core areas; good breadth, shallow depth |
| **UI/UX Quality** | 8/10 | Beautiful glass-card design, good responsive support, nice charts |
| **Code Quality** | 7/10 | Clean TypeScript, zero type errors, good separation of concerns |
| **Actionability** | 3/10 | Dashboard is read-only everywhere; no actions can be taken from the UI |

---

## 2. Architecture Overview

### Stack
- **Framework:** Next.js 16.1.6 (App Router, Turbopack)
- **State:** Zustand store + custom `useApi` hook
- **Real-time:** SSE via `/api/events` (chokidar file watcher — **local only**)
- **Styling:** Tailwind CSS v4, framer-motion animations
- **Charts:** Recharts
- **DB:** better-sqlite3 (schema defined but **appears unused** — tables never populated)
- **Data Source:** Dual-mode — local file parsing OR remote snapshot via Tailscale

### Data Flow
```
[OpenClaw Workspace Files] → [Parsers (15 files)] → [API Routes (21 endpoints)]
                                                           ↓
                                                    [React Pages (12)]
                                                           ↑
                                              [Snapshot Proxy (Vercel mode)]
```

### Dual-Mode Architecture
- **Local mode:** Parsers read workspace files directly (`~/.openclaw/workspace/`)
- **Remote mode (Vercel):** Fetches entire data payload from `/api/snapshot` on MacBook via Tailscale, 30s cache TTL

**CRITICAL ISSUE:** The dual-mode architecture means Vercel deployments are entirely dependent on the MacBook being online and accessible via Tailscale. There is no offline/cached fallback beyond the 30s in-memory cache.

---

## 3. Data Pipeline Audit

### 3.1 Parsers — File-by-File Assessment

| Parser | Source File(s) | Data Freshness | Issues |
|---|---|---|---|
| `heartbeat.ts` | `memory/heartbeat-state.md` | Depends on cron job writing it | Regex may miss new fields; silent failures |
| `digest.ts` | `memory/today-digest.md` | Updated by heartbeat cron | Only reads "today" file; no archive access |
| `pending.ts` | `memory/pending-actions.md` | Updated by heartbeat cron | Works well; simple structure |
| `intel.ts` | `intel/DAILY-INTEL.md` | Updated daily by intel cron | Always reads same file regardless of date picker selection |
| `metrics.ts` | `metrics/dashboard.md` + `openclaw models` CLI | Live when `openclaw` available | Falls back to stale markdown file; `execSync` blocks request |
| `cron.ts` | `openclaw cron list --json` | Live CLI call | **Hardcoded path** `/opt/homebrew/bin/openclaw`; fails silently on non-Mac |
| `content.ts` | `skills/genviral/workspace/...` | Static JSON files | Files may not exist yet; graceful fallback to empty |
| `agents.ts` | `.agents/*/config.json` + `comms/*.md` | Static files | Works but `latestComms` logic is simplistic (just last bullet) |
| `session-log.ts` | `memory/{date}.md` | One file per day | Good design; timezone-aware (America/Chicago) |
| `system.ts` | `os.*` + `df` command | Live | `df -g` is macOS-specific; fails on Linux |
| `command-center.ts` | `.openclaw/cron/runs/*.jsonl` | Live from JSONL logs | Good implementation; reads real run data |
| `memory.ts` | `memory/` directory listing | Live | Reads all file contents into snapshot — **memory concern for large workspaces** |
| `knowledge.ts` | `shared/knowledge-base/` recursive | Live | Same concern — reads all file contents |
| `search.ts` | Full-text search over memory/ | Live | Good implementation; 50-result cap |

### 3.2 API Routes — Assessment

| Route | Mode | Issues |
|---|---|---|
| `/api/snapshot` | Local-only collector | Good — single endpoint for Vercel to call |
| `/api/agents` | Both | Works; includes MSE-6 normalization fix |
| `/api/session-log` | Both | Good; supports date param |
| `/api/auth` | Both | Cookie-based password auth; `DASHBOARD_PASSWORD` defaults to `quark-dev` |
| `/api/command-center` | Both | Good real-data implementation from JSONL logs |
| `/api/metrics` | Both | `execSync("openclaw models")` blocks the request thread |
| `/api/cron` | Both | **Hardcoded macOS path** for openclaw binary |
| `/api/search` | Both | Good; memory-only search (doesn't search knowledge base) |
| `/api/content` | Both | Works; returns hook library + calendar + performance |
| `/api/source-status` | Both | Diagnostic endpoint — good for debugging |
| `/api/digest` | Both | Works |
| `/api/intel` | Both | **Always returns same file** regardless of archive date selection |
| `/api/events` | Local-only | SSE with chokidar; **dead on Vercel** (no fallback polling) |
| `/api/pending` | Both | Works |
| `/api/model-usage` | Both | Uses SQLite DB — but **no code ever writes to it** |
| `/api/knowledge` | Both | Works; supports file content reading |
| `/api/system` | Both | Live; `df -g` macOS-specific |
| `/api/comms` | Both | Works |
| `/api/heartbeat` | Both | Works |
| `/api/memory` | Both | Works; supports file content reading |
| `/api/cron-history` | Both | Uses SQLite DB — but **no code ever writes to it** |

### 3.3 SQLite Database — UNUSED

The database (`db.ts`) defines three tables:
- `cron_runs` — never populated
- `model_usage` — never populated
- `system_snapshots` — never populated

Helper functions (`recordCronRun`, `recordModelUsage`, `recordSystemSnapshot`) exist but are **never called** from any API route or cron job. The API routes `/api/model-usage` and `/api/cron-history` that query these tables will always return empty results.

**Recommendation:** Either wire these up to actually record data, or remove the dead code.

---

## 4. Page-by-Page Audit

### 4.1 Dashboard (`/`)
**Components:** DegradationBanner, PendingBadge, HeartbeatCard, SystemVitals, CronGrid, ActivityTicker, AgentBar, CodexQuota, ModelFallbackChain

| What's Shown | Data Source | Verdict |
|---|---|---|
| Pending approvals count | `pending-actions.md` | REAL — if file is current |
| Heartbeat timestamps | `heartbeat-state.md` | REAL — but "Stale" badge has 3h threshold which may be too aggressive for cron intervals |
| System vitals (CPU/Mem/Disk) | `os.*` / `df` | REAL for deployment host; shows **Vercel container stats** when deployed, not MacBook stats |
| Cron job grid | `openclaw cron list --json` | REAL locally; **empty on Vercel** (no openclaw binary) |
| Activity ticker | `today-digest.md` | REAL — if heartbeat cron has written it today |
| Agent bar | `.agents/*/config.json` | REAL |
| Codex quota gauges | `openclaw models` CLI | REAL locally; **falls back to stale markdown** on Vercel |
| Model fallback chain | **HARDCODED** in component | FALSE — `model-fallback.tsx` has a static `FALLBACK_CHAIN` array that doesn't read from config |

**Issues:**
- **Model Fallback Chain is hardcoded** — the component at `src/components/dashboard/model-fallback.tsx` has a static array with 5 models. It does NOT read from `openclaw.json` config. The Command Center page does read the real config, creating an inconsistency.
- **No auto-refresh** — data loads once and only updates via SSE events (which only work locally)
- **System Vitals on Vercel show the Vercel container**, not the actual MacBook running Quark

### 4.2 Cron Monitor (`/cron`)
**Strengths:** Nice summary cards, execution timeline chart, detailed job table
**Issues:**
- Timeline chart uses relative time parsing ("in Xh", "Xh ago") which is imprecise and loses sub-hour granularity
- `idleJobs` filter catches everything that isn't "ok" (including "disabled", "error") — these should be separated
- No history view — can only see current status, not trends over time
- The `/api/cron-history` endpoint exists but returns empty data (DB never populated)

### 4.3 Activity Feed (`/activity`)
**Strengths:** Date navigation, search, icon categorization, clean timeline UI
**Issues:**
- Icons are keyword-based heuristics (e.g., "x " triggers Twitter icon) — fragile
- No pagination for days with many entries
- Date navigation uses `toLocaleDateString("en-CA")` which may not match server timezone

### 4.4 Agent Network (`/agents`)
**Strengths:** Beautiful agent cards with avatars, comms detail view, broadcast status
**Issues:**
- `agentFiction` mapping is hardcoded (Neo=Matrix, Fulcrum=Star Wars, etc.)
- "5 agents deployed" is hardcoded in the subtitle
- Status determination is binary: `hasInbound` = active, else idle. No real online/offline detection
- Comms are parsed from markdown files — content quality depends entirely on how well agents write their reports

### 4.5 Content Pipeline (`/content`)
**Strengths:** Kanban board, hook performance chart, warmup tracker, published posts list
**Issues:**
- **Warmup Tracker has hardcoded `WARMUP_START = "2026-03-03"`** — this will be meaningless in a few weeks when 14 days pass. No mechanism to update or disable it.
- Hook kanban maps status strings loosely (`"fresh"`, `"review"`, `"pending"`, `"approved"`, `"ready"`, `"used"`, `"published"`) — fragile
- Performance chart only shows hook categories, not temporal trends
- No way to see engagement over time or compare posts
- **Calendar view is fetched but never rendered** — `data.calendar` is loaded but not displayed

### 4.6 Intel Feed (`/intel`)
**Strengths:** Radar chart, virality distribution, trend cards with expiry info, suggestions section
**Issues:**
- **Date navigation is non-functional** — the `archiveDate` state changes but the API call is always `/api/intel` which always reads `DAILY-INTEL.md`. There's no date parameter passed to the API.
- Trend categorization in radar chart is keyword-based ("ai", "agent", "model" → "AI/Agents") — may miscategorize
- Suggestions are labeled "for Cassian" — hardcoded agent name

### 4.7 Memory Browser (`/memory-browser`)
**Strengths:** Full-text search, file type filtering, session timeline heatmap, content viewer
**Issues:**
- Search highlighting logic is broken — the `highlightContent` function uses `>>>` / `<<<` delimiters then splits on them, but the index-based detection of highlights is unreliable
- 3-column layout (sidebar:content = 3:9) doesn't work well on tablets
- No markdown rendering — content is shown as raw text in `<pre>` tags

### 4.8 Knowledge Base (`/knowledge`)
**Strengths:** Category filtering, file browser, content viewer
**Issues:**
- Same as Memory Browser — no markdown rendering
- `categoryColors` is hardcoded with only 4 entries; other categories get `#94A3B8` (gray)
- No search capability (unlike Memory Browser)

### 4.9 Command Center (`/command-center`)
**Strengths:** Best page in the app — real data from JSONL run logs, quota gauges, 24h/7d windows, anomaly detection, model mix visualization
**Issues:**
- Labeled "POC" in the title — should be promoted
- Cost visibility always shows "Unpriced" (`estimatedUsd7d` is hardcoded to `0`)
- `fmtMs()` has a rounding bug: `Math.round(ms / 6000) / 10` should be `Math.round(ms / 60000 * 10) / 10` for proper minute formatting (currently 120000ms → `2m` correct, but 90000ms → `1.5m` shows as `1.5m` ✓ — actually works due to integer division, but edge cases may be off)

### 4.10 Metrics & Analytics (`/metrics-page`)
**Strengths:** Codex quota gauges, ops health table with smart status evaluation, content performance table
**Issues:**
- `evaluateRow()` has good logic but is tightly coupled to specific metric names ("cron reliability", "codex oauth")
- Content Performance table will often be empty if `metrics/dashboard.md` doesn't have that section
- No charts or trend visualization — just tables
- Duplicates information shown on the Command Center page (Codex quota)

### 4.11 Calendar (`/calendar`)
**Strengths:** Clean 30-min interval timeline, cron schedule parsing, current-slot highlighting
**Issues:**
- Only shows cron schedule — not a real calendar. Name is misleading.
- Doesn't show actual execution history, just scheduled slots
- 48 rows on one page is very tall; could benefit from collapsing empty hours

### 4.12 Settings (`/settings`)
**Issues:**
- **Almost entirely hardcoded:**
  - Model chain: static array `MODEL_CHAIN` with 5 models — doesn't read from config
  - Workspace path: hardcoded string `~/.openclaw/workspace`
  - Host: hardcoded `MacBook Pro (Quark)`
  - Delivery: hardcoded `Telegram`
  - Version: hardcoded `1.0.0 — Phase 3`
- System info (CPU/Mem/Disk/Uptime) is the only live data
- No actual settings can be changed — it's a view-only page

---

## 5. Stale & False Data Findings

### Confirmed FALSE/Hardcoded Data

| Location | What | Why It's False |
|---|---|---|
| `model-fallback.tsx` | Fallback chain | Static array; doesn't read `openclaw.json` |
| `settings/page.tsx` | Model chain, workspace path, host, delivery, version | All hardcoded strings |
| `content/page.tsx` | Warmup start date | `WARMUP_START = "2026-03-03"` — magic constant |
| `intel/page.tsx` | "Content Suggestions for Cassian" | Hardcoded agent name |
| `agents/page.tsx` | "5 agents deployed" | Hardcoded count |
| `agents/page.tsx` | `agentFiction` mapping | Hardcoded fiction references |

### Confirmed STALE Data Risks

| Location | Risk | Condition |
|---|---|---|
| All dashboard cards | Show stale data forever | When Vercel can't reach MacBook via Tailscale |
| Codex quota | Falls back to markdown file values | When `openclaw models` CLI fails |
| Activity ticker | Shows yesterday's digest | When heartbeat cron hasn't run today |
| Intel feed | Always shows same day | Date picker is decorative; API ignores date param |
| System vitals on Vercel | Shows container metrics | Not MacBook metrics |
| All pages on Vercel | No real-time updates | SSE/chokidar is local-only |

### Data That Appears Real But May Not Be

| Location | Concern |
|---|---|
| Cron job status | Depends on `openclaw` binary being at `/opt/homebrew/bin/openclaw`; silently returns empty on failure |
| Metrics ops health table | Parsed from markdown table in `metrics/dashboard.md`; if format changes, parsing breaks silently |
| Content performance | Depends on `log.json`, `hook-tracker.json`, `library.json` existing and being updated |

---

## 6. Content Pipeline Assessment

### What's Tracked
- **Hook Library:** JSON-based library with hooks, types, themes, use counts, status
- **Hook Tracker:** Category-level aggregation (total posts, avg views, best post ID)
- **Content Log:** Individual published posts with platform, hook, and metrics (views, likes, comments, shares)
- **Content Calendar:** Weekly plan with day/platform/hook/status

### What's Missing
- **No temporal trends** — can't see how content performance evolves over time
- **No A/B comparison** — can't compare hook types or platforms
- **Calendar data is fetched but never displayed** on the Content page
- **No engagement rate calculation** — views are shown but engagement rate (likes+comments / views) would be more useful
- **No funnel visualization** — can't see draft → review → approved → published flow over time
- **No posting frequency tracker** — should show posts/day or posts/week
- **No top-performing content highlight** — the data exists (`bestPostId` in hook tracker) but isn't surfaced

---

## 7. Metrics & KPI Assessment

### Currently Tracked KPIs

| KPI | Source | Quality | Usefulness |
|---|---|---|---|
| Cron reliability % | `metrics/dashboard.md` table + live CLI | Good when available | High — core ops metric |
| Codex OAuth status | `openclaw models` CLI | Good when available | High — auth health |
| Codex quota (daily/weekly) | `openclaw models` CLI | Good when available | High — resource planning |
| Degradation status | `metrics/dashboard.md` | Stale if markdown not updated | Medium |
| Content views/likes/comments | `performance/log.json` | Depends on data entry | High |
| System CPU/Mem/Disk | `os.*` APIs | Real-time | Low (host metrics, not agent metrics) |
| Cron run success rate | JSONL logs (Command Center) | Real-time | High |
| Model usage share | JSONL logs (Command Center) | Real-time | High |
| Pending approvals count | `pending-actions.md` | Updated by cron | Medium |

### Missing KPIs That Should Exist

| KPI | Why | Difficulty |
|---|---|---|
| **Agent response time** | Know if agents are slow/stuck | Medium — parse run logs for per-agent timing |
| **Token spend per day/week** | Cost awareness | Low — data exists in JSONL, just needs aggregation |
| **Content posting cadence** | Are we hitting targets? | Low — count posts per day from log.json |
| **Engagement rate** | Quality of content, not just volume | Low — (likes+comments)/views from existing data |
| **Intel freshness** | Is the intel feed actually running daily? | Low — compare file date to today |
| **Memory growth rate** | Is the workspace bloating? | Low — track total file sizes over time |
| **Cron job duration trends** | Detect degradation before failure | Medium — already in JSONL, needs charting |
| **Error classification** | Distinguish auth errors from logic errors from timeouts | Medium — parse error messages |
| **Agent task completion rate** | Are agents actually doing their jobs? | High — needs structured output from agents |
| **Cross-agent coordination score** | Are agents working in sync? | High — needs correlation analysis |

---

## 8. Security Audit

### Findings

| Finding | Severity | Detail |
|---|---|---|
| Default password | Medium | `DASHBOARD_PASSWORD` defaults to `quark-dev` in code |
| Cookie-based auth | Low | Simple but adequate for personal dashboard |
| Snapshot API key optional | Medium | `SNAPSHOT_API_KEY` is optional; if unset, snapshot endpoint is unauthenticated |
| Path traversal mitigation | Good | Both memory and knowledge file readers sanitize `..` in paths |
| No CSRF protection | Low | Dashboard is read-only, so impact is minimal |
| No rate limiting | Low | Personal dashboard; not a concern unless exposed publicly |
| `execSync` in API routes | Medium | Blocks Node.js event loop; potential for command injection if inputs weren't controlled (they are currently hardcoded) |
| `df -g` command execution | Low | Hardcoded command, no user input |

---

## 9. UX/UI Issues

### Good
- Consistent glass-card design language
- Responsive mobile sidebar with overlay
- Loading skeletons everywhere
- Framer-motion animations for smooth page transitions
- Color-coded status indicators throughout
- Dark theme suits a monitoring dashboard

### Needs Improvement

| Issue | Location | Impact |
|---|---|---|
| No auto-refresh/polling | All pages | Data goes stale if SSE is down (always on Vercel) |
| No "last updated" timestamps on most cards | Dashboard | User can't tell if data is fresh |
| Memory Browser 3:9 grid breaks on tablet | Memory Browser | Content area too narrow |
| Raw markdown shown instead of rendered | Memory Browser, Knowledge Base | Poor readability |
| Search highlighting broken | Memory Browser | `>>>` / `<<<` approach is fragile |
| 48-row calendar is very tall | Calendar page | Poor scannability; most slots are empty |
| No global search | All pages | Can only search within Memory Browser |
| No breadcrumbs or back navigation | All pages | User can get lost in detail views |
| Settings page is read-only | Settings | Misleading name — it's a "System Info" page |
| Command Center labeled "POC" | Command Center | Under-sells the best page |

---

## 10. Code Quality Issues

### Good
- Zero TypeScript errors
- Clean component separation
- Good use of custom hooks (`useApi`, `useSSE`)
- Parsers are well-isolated and testable
- Type definitions are comprehensive

### Issues

| Issue | File(s) | Impact |
|---|---|---|
| `execSync` blocks event loop | `metrics.ts`, `cron.ts`, `system.ts` | Entire API request blocks during shell exec |
| No error boundaries | Any page | Unhandled errors crash entire page |
| No tests | Entire codebase | Zero test files found |
| Silent parser failures | All parsers | Catch blocks return empty defaults with no logging |
| Hardcoded macOS path | `cron.ts` line 34 | `/opt/homebrew/bin/openclaw` fails on Linux/non-Homebrew |
| `df -g` macOS-specific | `system.ts` line 24 | Fails on Linux (needs `df -BG` or `/proc/meminfo`) |
| Memory snapshot loads all file contents | `memory.ts`, `knowledge.ts` | Could be huge for large workspaces |
| Duplicate type definitions | `command-center.ts` vs `types.ts` | `CommandCenterModelRow`, `CommandCenterAnomaly`, `CommandCenterData` defined in both files |
| README is boilerplate | `README.md` | Still default Next.js create-app readme |

---

## 11. Proposals & Recommendations

### P0 — Fix Immediately (Data Accuracy)

1. **Replace hardcoded model fallback chain** in `model-fallback.tsx` with data from `/api/command-center` (which already reads `openclaw.json`).

2. **Fix Settings page** — read model chain and workspace config from actual config files instead of hardcoded arrays.

3. **Fix Intel date navigation** — pass date param to `/api/intel` and have the parser read date-specific intel files.

4. **Remove or update warmup tracker** — the hardcoded `WARMUP_START` will be obsolete. Either make it configurable or auto-detect.

5. **Fix "5 agents deployed"** — derive count from actual agent data, not hardcoded text.

### P1 — Fix Soon (Data Freshness)

6. **Add polling fallback** — when SSE is unavailable (Vercel), auto-poll every 60s. The `useApi` hook is the right place for this.

7. **Add "last updated" timestamps** to every dashboard card so users can see data freshness at a glance.

8. **Show system vitals for the MacBook** on Vercel — include system info in the snapshot payload (already done) and use it on the dashboard instead of local `os.*`.

9. **Wire up the SQLite database** or remove it — either have cron jobs record their runs and usage to the DB, or delete the dead code.

10. **Fix `cron.ts` hardcoded path** — use `which openclaw` or make the path configurable via env var.

### P2 — Improve (Features)

11. **Add auto-refresh interval** — configurable 30s/60s/120s polling for key data.

12. **Render markdown content** — use a markdown renderer (e.g., `react-markdown`) in Memory Browser and Knowledge Base instead of raw `<pre>` tags.

13. **Add global search** — extend search to cover knowledge base, intel, and content in addition to memory.

14. **Display the content calendar** — the data is already fetched on the Content page but never rendered.

15. **Add engagement rate KPI** — calculate `(likes + comments) / views` and display in content performance.

16. **Add token cost tracking** — even rough estimates from JSONL run data would be valuable.

17. **Promote Command Center** — remove "POC" label, make it more prominent in navigation.

18. **Rename Settings to "System Info"** or add actual configurable settings.

19. **Rename Calendar to "Cron Schedule"** — current name implies a real calendar.

### P3 — Nice to Have

20. **Add error boundaries** — wrap each page and dashboard card in error boundaries to prevent cascading failures.

21. **Add tests** — at minimum, parser tests since they're pure functions with known inputs/outputs.

22. **Convert `execSync` to `execAsync`** — use `child_process.exec` with promises to avoid blocking.

23. **Paginate large data** — memory and knowledge file listing should lazy-load content instead of including it all in the snapshot.

24. **Add project/task tracking** — surface active projects, tasks, and deliverables from agent work.

25. **Add notification system** — alert on anomalies, stale heartbeats, failed cron runs.

26. **Add a "What happened today?" summary** — AI-generated daily summary pulling from all data sources.

---

## 12. Priority Action Items

### Immediate (This Week)
- [ ] Fix hardcoded model fallback chain → read from config
- [ ] Fix Settings page hardcoded data
- [ ] Fix Intel date navigation
- [ ] Add polling fallback for Vercel deployment
- [ ] Add "last updated" timestamps to dashboard cards

### Short-term (This Month)
- [ ] Wire up SQLite or remove dead code
- [ ] Add markdown rendering to Memory/Knowledge browsers
- [ ] Display content calendar on Content page
- [ ] Add engagement rate and posting cadence KPIs
- [ ] Fix `cron.ts` hardcoded macOS path
- [ ] Fix `system.ts` macOS-specific `df -g`

### Medium-term (Next Month)
- [ ] Add error boundaries and basic tests
- [ ] Convert `execSync` to async
- [ ] Add global search
- [ ] Add notification/alerting system
- [ ] Add project/task tracking page
- [ ] Paginate large data loads

---

*End of audit. This report was generated by a comprehensive review of every file in the quark-mission-control codebase.*
