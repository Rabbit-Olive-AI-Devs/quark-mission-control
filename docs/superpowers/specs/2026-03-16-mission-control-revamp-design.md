# Mission Control Revamp — Design Spec

**Date:** 2026-03-16
**Scope:** Performance overhaul + visual/UX rebuild of all non-cinematic pages + page consolidation
**Approach:** Infrastructure first (Phase 1), then per-page rebuilds (Phase 2)

---

## Context

Mission Control is Quark's operations dashboard — a Next.js 16 app deployed on Vercel (remote mode via Tailscale Funnel from MacBook). It currently has 14 pages and 18 parsers. Three pages (`/content`, `/cognitive`, `/engagement`) are at cinematic quality (5/5). The remaining pages are 1-3/5.

### Problems

1. **Performance:** The snapshot endpoint calls 18 parsers sequentially, including 3 `execSync` calls (worst: `openclaw cron list --json` with 10s timeout). Full memory and knowledge file contents are shipped in every snapshot response (~100KB). Hash polling traverses directories with hundreds of files every 5s.
2. **Visual inconsistency:** 10 pages still use basic layouts while 3 are cinematic.
3. **Page sprawl:** 14 pages, some redundant (Cron + Calendar, Metrics + Command Center, Memory Browser + Knowledge).
4. **Mobile:** App shell is responsive but individual page grids/widgets may not reflow well on narrow viewports.

### Decisions Made

- **Approach:** Both performance and visual overhaul together (Approach B — infrastructure first, then pages)
- **Page consolidation:** Aggressive — 14 pages down to 10
- **Dashboard widgets:** Consolidate from 10 to 6
- **Performance fixes:** Per-page as each is rebuilt, with shared infrastructure in Phase 1
- **Mobile:** Must work well on phone (laptop primary, phone secondary)

---

## Phase 1 — Performance Foundation

### 1a. Snapshot Endpoint Overhaul

**File:** `src/app/api/snapshot/route.ts`

**Current:** 18 parsers called sequentially. Three spawn external processes via `execSync`.

**Changes:**

1. **Parallelize parsers** — wrap all parser calls in `Promise.all()`. No parser depends on another's output. Converts sequential 10-15s into ~2-3s (limited by slowest parser).

2. **Replace `execSync` with cached async results:**

   | Parser | Current | Fix |
   |--------|---------|-----|
   | `cron.ts` | `execSync("openclaw cron list --json")`, 10s timeout | Cache result for 60s. Cron config doesn't change per-request. |
   | `agents.ts` | `execSync("openclaw cron list --json")`, 5s timeout | Share the same cached cron result (currently a redundant second call). |
   | `system.ts` | `execSync("df -g /")` | Cache for 30s. Disk usage doesn't change per-second. |

3. **Trim snapshot payload:**
   - Memory files: send metadata only (name, date, size, frontmatter) — not full markdown content. New `/api/knowledge/:path` endpoint serves content on demand.
   - Knowledge files: same — metadata in snapshot, content on demand.
   - Estimated reduction: ~100KB → ~15-20KB per snapshot.

4. **Increase cache TTL** from 2s to 10s in `data-source.ts`.

5. **Optimize hash computation** in `hash.ts`:
   - Replace recursive `dirMtimes()` on `content-engine/renders/` (can have 100s of files) with a max-mtime approach — stat the directory itself, not every file inside.
   - Reduces hash computation from O(files) to O(watched_dirs).

### 1b. Shared Component Upgrades

1. **Consolidated theme constants** — merge `pipeline-constants.ts` + `engagement-constants.ts` into `theme-constants.ts`. Single source of truth for STATUS_COLORS, TYPE_COLORS, PLATFORM_COLORS, ACTION_COLORS.

2. **`CardFooter` enhancement** — add optional "last updated" relative timestamp. Reusable across all cards. Addresses engagement page feedback.

3. **Sidebar nav update** — update `navItems` array for new page structure:
   - Remove: Activity, Memory Browser, Calendar, Metrics
   - Add: Schedule, Operations, Knowledge (replaces Memory Browser + Knowledge Base)
   - Rename: Command Center → (removed, merged into Operations)

### 1c. On-Demand Content API

**New route:** `GET /api/knowledge/[...path]`

Returns full file content for a given path within `memory/` or `shared/knowledge-base/`. Used by the Knowledge page reader pane. Path-validated to prevent directory traversal.

This decouples file content from the snapshot, so the snapshot stays small and fast.

---

## Phase 2 — Page Rebuilds

### Final Page Structure (10 pages)

| # | Page | Route | Status | Notes |
|---|------|-------|--------|-------|
| 1 | Dashboard | `/` | Rebuild | 6 consolidated widgets |
| 2 | Content Pipeline | `/content` | Keep | Already cinematic (5/5) |
| 3 | Cognitive | `/cognitive` | Keep | Already cinematic (5/5) |
| 4 | Engagement | `/engagement` | Tweak | 3 targeted improvements |
| 5 | Schedule | `/schedule` | New (merge) | Cron + Calendar |
| 6 | Operations | `/operations` | New (merge) | Metrics + Command Center |
| 7 | Knowledge | `/knowledge` | New (merge) | Memory Browser + KB + Journals |
| 8 | Intel | `/intel` | Rebuild | Cinematic card layout |
| 9 | Agents | `/agents` | Rebuild | Better cards, no execSync |
| 10 | Settings | `/settings` | Rebuild | Compact system info |

**Removed pages:** `/activity` (merged into Dashboard feed), `/memory-browser` (merged into Knowledge), `/calendar` (merged into Schedule), `/metrics-page` (merged into Operations), `/command-center` (merged into Operations), `/cron` (merged into Schedule).

---

### 2a. Dashboard (`/`)

**Layout:** 3×2 grid on desktop, 1-column on mobile. All cinematic GlassCards.

**6 Widgets:**

#### System Pulse
- **Merges:** HeartbeatCard + SystemVitals + CronGrid
- **Shows:** Heartbeat age (time since last heartbeat), CPU/memory/disk mini-gauges (inline, not full Gauge components), cron status dots with tooltip showing last successful run timestamp
- **Data:** heartbeat + system + cron parsers (cron cached 60s)

#### Codex Quota
- **Stays standalone** — critical operational data
- **Data:** CodexBar widget snapshot (already implemented)
- **Shows:** Daily + weekly remaining gauges with reset countdown

#### Pipeline
- **Existing widget** — keep current design
- **Shows:** Active job name + segmented progress bar, or last completed job status

#### Health Score
- **Merges:** CognitiveWidget + EngagementWidget
- **Shows:** Worst-of gauge across memory/proactivity/engagement dimensions. Red/yellow = click through to detail page. Badge count for unanswered engagement items.
- **Data:** cognitive + engagement parsers

#### Activity Feed
- **Merges:** ActivityTicker + PendingBadge
- **Shows:** Scrolling feed (newest-first) with pending action count as a header badge
- **Data:** digest parser

#### Agent Network
- **Existing AgentBar** — enhanced
- **Shows:** Agent avatar row with "last active" relative timestamps under each avatar, subtle status indicator (idle/running/error)
- **Data:** agents parser (reads config files only, no execSync)

---

### 2b. Schedule (`/schedule`) — New

**Merges:** `/cron` + `/calendar`

**Layout:**
- **View toggle:** Daily | Weekly (top-right)
- **Timeline:** Vertical timeline, today centered
- **Cron jobs:** Shown as recurring markers with:
  - Status dot (green = last run succeeded, yellow = warning, red = failed)
  - Last successful run date/time displayed alongside each job
  - Job name, schedule expression, agent
- **Calendar events:** Shown inline with time, title, calendar source
- **Mobile:** Single-column timeline, same information density

**Parser:** Combined cron + calendar parser. Cron list cached 60s (shared with snapshot). Calendar data from existing `calendar.ts`.

---

### 2c. Operations (`/operations`) — New

**Merges:** `/metrics-page` + `/command-center`

**Layout:** 4-zone design

**Zone 1 — Hero:** Codex quota gauges (from CodexBar snapshot) + active model indicator (gpt-5.3-codex)

**Zone 2 — Fallback Chain:** Visual chain diagram showing codex → MiniMax M2.5 → Gemini 2.5 Flash with status dots (active/standby/error) for each

**Zone 3 — Usage:** Daily/weekly token usage and cost from CodexBar snapshot `tokenUsage` and `dailyUsage` fields. Bar chart for last 7 days.

**Zone 4 — Reliability:** Cron success rate gauge, recent failures list, model auth status

**Parser:** Reads CodexBar widget snapshot + existing command-center JSONL logs + cron stats. No `execSync` calls.

---

### 2d. Knowledge (`/knowledge`) — New

**Merges:** `/memory-browser` + `/knowledge` (old KB page)

**Layout:** Split view — file list (left) + reader pane (right). On mobile: list view, tap opens full-screen reader.

**Tabs:** Journals | Memory | Knowledge Base

**Journals tab:**
- Date-sorted list of `memory/YYYY-MM-DD.md` files (newest first)
- Each entry shows date + first line preview
- Click loads full content via `/api/knowledge/memory/YYYY-MM-DD.md`

**Memory tab:**
- All memory files with frontmatter preview (name, type, description from YAML)
- Grouped by type (user, feedback, project, reference, session)

**Knowledge Base tab:**
- Tree view of `shared/knowledge-base/` directory structure
- Expandable folders, click file to read

**Reader pane:**
- Markdown rendered with syntax highlighting
- **Expand button:** toggles between split view (default) and expanded view (reader fills full content area, file list collapses). Back button to return to split view.
- On mobile: always full-screen when a file is selected, with back navigation

**Parser:** Snapshot includes metadata only (file paths, dates, sizes, frontmatter snippets). Full content fetched on demand via `/api/knowledge/[...path]`.

---

### 2e. Intel (`/intel`) — Rebuild

**Layout:** Card grid (2-col desktop, 1-col mobile)

**Each card:**
- Source tag (HN, Reddit, X, Tavily, Product Hunt) with source-specific color
- Headline / title
- Summary snippet (2-3 lines)
- Relevance indicator (if scored)
- Timestamp with time-decay visual (fade for older items)

**Sections:** Grouped by source or topic cluster (depending on data structure in `DAILY-INTEL.md`)

**Parser:** Existing `intel.ts` — parses `DAILY-INTEL.md`. No changes needed to parser, just cinematic components.

---

### 2f. Agents (`/agents`) — Rebuild

**Layout:** Card grid (2-col desktop, 1-col mobile)

**Each agent card (GlassCard):**
- Avatar image (from config)
- Agent name + role description
- Model (from config, not execSync)
- Status indicator: idle / running / error
- Last active: relative timestamp
- Inbound comms: preview of latest message from `comms/*-to-quark.md` (if exists)

**Parser:** Reads `.agents/*/config.json` + `comms/*.md`. Drops the redundant `execSync("openclaw cron list --json")` call. Gets model info from config `model` field directly.

---

### 2g. Settings (`/settings`) — Rebuild

**Layout:** Single-column, compact

**Sections:**
- **Connection:** Status dot + mode (Local/Remote), snapshot URL, last successful fetch
- **Publish Mode:** Current mode (LIVE/WARMUP) indicator
- **System Info:** OS version, uptime, disk usage, Node version
- **Refresh Controls:** Manual refresh button, polling interval display

**Parser:** Existing `system.ts` with cached `df` call (30s).

---

### 2h. Engagement Tweaks (`/engagement`)

Three targeted improvements to the existing cinematic page:

1. **Last updated timestamp:** Add `CardFooter` with relative "updated X ago" to each zone/card. Uses the shared `CardFooter` component from Phase 1.

2. **Clickable action feed:** Each action feed item links to its source:
   - X posts → `https://x.com/...` URL
   - Reddit comments → Reddit thread URL
   - Other platforms → appropriate source URL
   - Items without a URL remain plain text (no dead links)

3. **Plain-english guardrail reasons:** Replace terse codes with human-readable explanations:
   - `REGEX_BLOCK: crypto_wallet` → "Blocked: message contains cryptocurrency wallet address pattern"
   - `TRUST_TIER: unknown_sender` → "Blocked: sender is not in trusted accounts list"
   - `PROMPT_INJECTION: instruction_override` → "Blocked: message attempted to override agent instructions"
   - Map maintained in a constants file for easy updates

---

## Sidebar Navigation (updated)

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

---

## Implementation Order

Phase 1 and Phase 2 tasks in recommended execution order:

1. **Phase 1a** — Snapshot endpoint: parallelize parsers, async cached exec, trim payload
2. **Phase 1b** — Shared components: theme constants, CardFooter, sidebar nav
3. **Phase 1c** — On-demand content API (`/api/knowledge/[...path]`)
4. **Phase 2a** — Dashboard rebuild (6 consolidated widgets)
5. **Phase 2b** — Schedule page (Cron + Calendar merge)
6. **Phase 2c** — Operations page (Metrics + Command Center merge)
7. **Phase 2d** — Knowledge page (Memory Browser + KB merge)
8. **Phase 2e** — Intel page rebuild
9. **Phase 2f** — Agents page rebuild
10. **Phase 2g** — Settings page rebuild
11. **Phase 2h** — Engagement tweaks
12. **Cleanup** — Remove old pages/routes/parsers, update redirects

---

## Out of Scope

- Content Pipeline page (`/content`) — already cinematic, no changes
- Cognitive page (`/cognitive`) — already cinematic, no changes
- Login page — functional, no visual needs
- Backend data sources (workspace files, cron configs) — parsers adapt to existing data contracts
- New features or data sources not currently tracked
