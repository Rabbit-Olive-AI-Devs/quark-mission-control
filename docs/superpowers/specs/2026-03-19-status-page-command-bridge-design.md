# Status Page: Command Bridge Redesign

**Date:** 2026-03-19
**Status:** Approved
**Scope:** Complete rewrite of `/status` into a dense, data-rich command center
**Architecture:** MacBook-direct (SSR + SSE, no Vercel)

---

## Problem

The current Status page (`src/app/status/page.tsx`) shows 5 basic cards (Pipeline, Cron, Quota, Quark, System), each with a colored dot and a single sentence. It calls one endpoint (`/api/status`) and renders 62 lines of code. There is almost no data density — a glance tells you "green/amber/red" but not what is happening, how much, or what needs attention. The page wastes screen real estate that could surface engagement metrics, content performance, cognitive health, intel signals, and activity history that are all already available through existing API endpoints.

---

## Solution

Replace the Status page with a "Command Bridge" — a 4-section layout (Hero Banner, Alerts Strip, Instrument Grid, Footer) that aggregates data from 7+ existing API endpoints into a single dense view. Every panel links to its detail page. The page loads via SSR with a single aggregated API call, then stays live via SSE-triggered refetches.

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  HERO BANNER                                            │
│  [Health Ring]  MISSION CONTROL — Systems Operational   │
│  [Crons OK: 24/25] [Stuck: 0] [Quota: 91%] [Actions: 17] [Uptime: 10d] │
├─────────────────────────────────────────────────────────┤
│  ALERTS STRIP  ← scrollable →                          │
│  🔴 Cron "Evening" failed 2x  🟡 Quota at 28%  🟢 Published x/2026-03-19 │
├───────────────────┬───────────────────┬─────────────────┤
│  Pipeline         │  Cron Health      │  Engagement     │
│  (Priority 1)     │  (Priority 1)     │  Pulse          │
│                   │                   │  (Priority 1)   │
├───────────────────┼───────────────────┼─────────────────┤
│  API Quota        │  Quark Health     │  Content Today  │
│  (Priority 2)     │  (Priority 2)     │  (Priority 2)   │
├───────────────────┴───────────────────┼─────────────────┤
│  System Resources                     │  Cognitive      │
│  (Priority 3, spans 2 cols)           │  (Priority 3)   │
├───────────────────┬───────────────────┴─────────────────┤
│  Intel Signals    │  Activity Feed                      │
│  (Priority 3)     │  (Priority 3, spans 2 cols)         │
├───────────────────┴─────────────────────────────────────┤
│  FOOTER  ● SSE Connected  |  Updated 14:32:05 CT  |  Refresh: 60s │
└─────────────────────────────────────────────────────────┘
```

---

## Section 1: Hero Banner

Full-width banner at the top of the page.

### Health Score Ring

- Circular SVG gauge, 0-100 scale
- Computation: weighted average of subsystem health
  - Cron: 30% weight (ok_count / total_count * 100)
  - Pipeline: 20% weight (100 if no stuck jobs, 50 if stuck, 0 if quarantined)
  - Quota: 20% weight (min(dailyPct, weeklyPct))
  - System: 15% weight (100 - max(cpu, memory, disk))
  - Quark: 15% weight (100 if healthy, 50 if warning, 0 if critical)
- Color: cyan (#00D4AA) when >= 80, amber (#F59E0B) when >= 50, red (#EF4444) when < 50
- Glow: `drop-shadow(0 0 8px <color>40)` on the stroke
- Size: 120px diameter desktop, 80px mobile
- Center text: score as integer, monospace font

### Title

- Label: "MISSION CONTROL" in uppercase tracking-wider, muted text (#94A3B8)
- Status sentence: "Systems Operational" / "Degraded Performance" / "Critical Issues Detected"
  - Operational: health score >= 80 and no critical-level cards
  - Degraded: health score >= 50, or any warning-level cards
  - Critical: health score < 50, or any critical-level cards
- Status sentence color matches the health ring color

### KPI Pills

5 inline pills in a horizontal row, wrapping on narrow screens.

| Pill | Value | Source |
|------|-------|--------|
| Crons OK | `{ok}/{total}` | `/api/status` → cron.jobs (count where status != "error") |
| Stuck Jobs | count | `/api/status` → pipeline.details.stuck.length |
| Quota | `{min(daily,weekly)}%` | `/api/status` → quota.raw |
| Actions Today | count | `/api/engagement` → today.total |
| Uptime | `{n}d` or `{n}h` | `/api/status` → system.uptime (seconds → human) |

Each pill: rounded-full, bg-white/[0.06] border, monospace value in #F1F5F9, label in #64748B. Pill border turns amber/red if the value is in warning/critical range.

### Background

Subtle radial gradient from #0E0E14 center to #0A0A0F edges. A thin 1px border-bottom in #1E293B separates the hero from the alerts strip.

---

## Section 2: Alerts Strip

Horizontally scrollable bar of alert chips, directly below the hero.

### Alert Generation

Alerts are derived client-side from the aggregated API response. Sources:

1. **Status cards** — any card with `level != "healthy"` becomes an alert. Level maps to chip color.
2. **Cron failures** — each failed cron job gets its own chip (red).
3. **Pipeline stuck jobs** — each stuck job gets a chip (amber).
4. **Quota warning** — if quota < 40%, one chip (amber or red based on threshold).
5. **Recent publishes** — today's publishes get a chip (cyan, informational).
6. **Engagement gaps** — if unanswered count > 5, one chip (amber).
7. **Cognitive degradation** — each active degradation flag gets a chip (amber).

### Chip Design

- Rounded-full pill shape
- Left: 8px colored dot (red #EF4444, amber #F59E0B, cyan #00D4AA)
- Text: one-sentence description in #F1F5F9, text-xs
- Red chips: `animate-pulse` at 1.5s
- Amber chips: slow pulse via custom animation at 2s (opacity 0.7 → 1.0)
- Cyan chips: no animation
- Click: navigates to the relevant panel's detail page (see Navigation section)
- Max-width per chip: 320px, text truncates with ellipsis

### Empty State

When there are no alerts: a single cyan chip reading "All systems nominal" with a static cyan dot.

### Container

- `overflow-x-auto` with hidden scrollbar (webkit-scrollbar-display-none + scrollbar-width-none)
- Horizontal padding matches page padding (24px)
- Fade gradient on right edge (16px linear-gradient from transparent to page bg)
- Sticky below hero on scroll? No — scrolls with page.

---

## Section 3: Instrument Grid

3-column CSS grid with 16px gap. 10 panels total across 4 rows. Each panel is an instance of the `InstrumentPanel` wrapper component.

### InstrumentPanel Wrapper

Reusable component that provides the consistent panel chrome for all 10 instruments.

**Props:**
- `title: string` — panel header text
- `icon: LucideIcon` — header icon (16px)
- `level: StatusLevel` — drives the status dot color
- `href: string` — navigation target for click/chevron
- `dataPriority: 1 | 2 | 3` — used for mobile ordering via CSS `order`
- `span?: 2` — if set, panel spans 2 grid columns
- `children: ReactNode` — panel body content

**Rendered structure:**
```
┌──────────────────────────────────────┐
│ [icon]  TITLE          [dot]    [>]  │  ← header row
│──────────────────────────────────────│
│                                      │
│  [children — panel-specific content] │
│                                      │
└──────────────────────────────────────┘
```

**Styling:**
- Background: #0E0E14
- Border: 1px solid #1E293B
- Border-radius: 12px (rounded-xl)
- Padding: 20px
- Hover: border transitions to rgba(255,255,255,0.10), bg to rgba(255,255,255,0.02)
- Cursor: pointer (entire panel is clickable, navigates to `href`)
- Header: icon + title in uppercase tracking-wider text-xs #94A3B8, status dot (8px, colored per level with shadow), chevron-right icon in #475569

**Status dot colors** (reuse existing `StatusSentence` dot logic):
- healthy: bg-emerald-500, shadow-emerald-500/40
- warning: bg-amber-500, shadow-amber-500/40, slow-pulse
- critical: bg-red-500, shadow-red-500/40, animate-pulse

---

### Panel 1: Pipeline

**Position:** Row 1, Column 1
**Data priority:** 1
**Icon:** GitBranch (lucide)
**Navigation:** `/content`
**Level:** from `status.pipeline.level`

**Content:**
- Status sentence (from `status.pipeline.sentence`)
- Metrics row: 3 values inline
  - Published today: count from content-performance data
  - Killed this week: count from pipeline scorecard
  - Avg time: formatted from pipeline scorecard `avgTimeToPublish`
- 7-day sparkline: SVG sparkline showing daily publish counts over last 7 days
  - Data source: pipeline scorecard or content-performance history
  - Gradient fill below the line, cyan stroke
  - Height: 40px, full panel width

**Empty state:** "No pipeline activity" + flat sparkline at zero

---

### Panel 2: Cron Health

**Position:** Row 1, Column 2
**Data priority:** 1
**Icon:** Clock (lucide)
**Navigation:** `/schedule`
**Level:** from `status.cron.level`

**Content:**
- Status sentence (from `status.cron.sentence`)
- Heatmap: grid of cells, one per cron job
  - Cell count: one per job in `status.cron.jobs` (currently ~25)
  - Layout: auto-wrap grid, 5 columns x N rows
  - Cell size: 16x16px with 2px gap
  - Cell color: green (#10B981) for ok/enabled, red (#EF4444) for error, gray (#475569) for disabled
  - Hover tooltip: job name + status
- Recent jobs: 3 most recent by `lastRun` timestamp
  - Each row: job name (truncated, 160px max-width) + relative time ("2m ago") + status dot

**Empty state:** "No cron jobs configured" + empty heatmap placeholder

---

### Panel 3: Engagement Pulse

**Position:** Row 1, Column 3
**Data priority:** 1
**Icon:** MessageCircle (lucide)
**Navigation:** `/engagement`
**Level:** derived — critical if unanswered > 10, warning if unanswered > 5 or replyRate < 50%, else healthy

**Content:**
- 5-platform grid: one row per platform (X, Instagram, TikTok, YouTube, Substack)
  - Each row: platform icon/color dot + name + today's action count (from `engagement.today.byPlatform`)
  - Platform colors from `PLATFORM_COLORS` in theme-constants
- Summary metrics below the grid:
  - Reply rate: `{replyRate}%` from `engagement.inboundGap.replyRate`
  - Unanswered: count from `engagement.inboundGap.unansweredCount`
  - Guardrail blocks: count from `engagement.guardrailBlocks.length`

**Empty state:** "No engagement data" + grayed-out platform rows showing "—"

---

### Panel 4: API Quota

**Position:** Row 2, Column 1
**Data priority:** 2
**Icon:** Gauge (lucide)
**Navigation:** `/settings`
**Level:** from `status.quota.level`

**Content:**
- Status sentence (from `status.quota.sentence`)
- Daily progress bar:
  - Label: "Daily" left-aligned, percentage right-aligned
  - Bar: full-width, 8px height, rounded, bg #1E293B
  - Fill: color based on percentage (cyan > 40%, amber 20-40%, red < 20%)
  - Value from `status.quota.raw.dailyRemaining`
- Weekly progress bar: same layout
  - Value from `status.quota.raw.weeklyRemaining`
- Reset timer: "Daily resets in {hours}h {min}m" — computed from midnight CT
  - Text-xs, #64748B

**Empty state:** "Quota data unavailable" + empty bars at 0%

---

### Panel 5: Quark Health

**Position:** Row 2, Column 2
**Data priority:** 2
**Icon:** Bot (lucide)
**Navigation:** `/cognitive`
**Level:** from `status.quark.level`

**Content:**
- Status sentence (from `status.quark.sentence`)
- Key timestamps:
  - Last heartbeat: relative time from `status.quark.heartbeat.lastHeartbeat`
  - Last DM check: relative time from `status.quark.heartbeat.lastDmTimestamp`
- 24h activity sparkline:
  - Data: hourly run counts over last 24h (derived from cron job lastRun times, bucketed by hour)
  - SVG sparkline, 40px height, cyan stroke, gradient fill
  - X-axis implicit (24 data points for 24 hours)

**Empty state:** "No heartbeat data" + "—" for timestamps + flat sparkline

---

### Panel 6: Content Today

**Position:** Row 2, Column 3
**Data priority:** 2
**Icon:** FileText (lucide)
**Navigation:** `/content`
**Level:** derived — healthy if published > 0, warning if published == 0 and it's past noon CT, else healthy

**Content:**
- Published count: large monospace number + "published today"
- Platform badges: inline colored pills for each platform that received a publish today
  - Colors from `PLATFORM_COLORS`
  - Text: platform name abbreviation (X, IG, TT, YT, SS)
- Top post: hook text of the highest-performing post today (truncated to 60 chars)
  - Source: content-performance data
- Publish mode badge: "LIVE" (cyan) or "WARMUP" (amber)
  - Source: from content-performance or pipeline state

**Empty state:** "No publishes yet today" + empty platform row + no top post

---

### Panel 7: System Resources

**Position:** Row 3, Columns 1-2 (spans 2 columns)
**Data priority:** 3
**Icon:** Cpu (lucide)
**Navigation:** `/settings`
**Level:** from `status.system.level`

**Content:**
- 3 circular SVG gauges side by side:
  - CPU: value from `status.system.cpu`
  - Memory: value from `status.system.memory`
  - Disk: value from `status.system.disk`
  - Reuse existing `RadialGauge` component (`src/components/ui/radial-gauge.tsx`)
  - Size: 80px desktop, 64px mobile
  - Color thresholds: cyan < 80%, amber 80-95%, red > 95%
- Top processes table (4 rows):
  - Columns: Process name, CPU%, Memory MB
  - Source: new field in system API response (or omit in v1 and show uptime instead)
  - Text-xs, monospace values
- Uptime: "Up {days}d {hours}h" from `status.system.uptime`
- SSE status: small dot + "Connected" / "Disconnected" using `useDashboardStore.connected`

**Empty state:** Gauges at 0% + "System data unavailable"

---

### Panel 8: Cognitive

**Position:** Row 3, Column 3
**Data priority:** 3
**Icon:** Brain (lucide)
**Navigation:** `/cognitive`
**Level:** derived — warning if degradationFlags.length > 0, else healthy

**Content:**
- 4 horizontal progress bars:
  - **Memory:** `memoryHealth.kbFileCount` mapped to percentage (e.g., kbFileCount / 30 * 100, capped at 100)
  - **Proactivity:** `proactivity.ratio * 100` (already 0-1 ratio)
  - **Engagement:** `engagement.replyRate` (already 0-100)
  - **KB Files:** `memoryHealth.kbFileCount` shown as count, bar = kbUpdatedToday / kbFileCount * 100
- Each bar: label left, value right, 6px height, rounded, cyan fill
- Degradation flag count: if > 0, amber badge with count
- Journal status: "Reflective" (cyan) or "Factual" (muted) based on `memoryHealth.journalReflective`

**Data source:** `/api/cognitive` → `current` (CognitiveDay)

**Empty state:** "No cognitive data" + empty bars

---

### Panel 9: Intel Signals

**Position:** Row 4, Column 1
**Data priority:** 3
**Icon:** Radar (lucide)
**Navigation:** `/intel`
**Level:** healthy (intel is informational, never warning/critical)

**Content:**
- Top 3 trends from `intel.highSignal`, sorted by virality score descending
- Each trend row:
  - Virality score: monospace, colored by magnitude (>= 8 cyan, >= 5 amber, < 5 muted)
  - Title: truncated to 50 chars
  - Content-type tag: small colored pill (colors from `TYPE_COLORS`)
- Update timestamp: "Updated {relative_time}" in text-xs #64748B

**Data source:** `/api/intel` → `highSignal` (IntelTrend[])

**Empty state:** "No active signals" + 3 placeholder rows with "—"

---

### Panel 10: Activity Feed

**Position:** Row 4, Columns 2-3 (spans 2 columns)
**Data priority:** 3
**Icon:** Activity (lucide)
**Navigation:** `/operations`
**Level:** healthy (informational)

**Content:**
- Timeline of today's key events, max 8 entries, newest first
- Each entry:
  - Timestamp: HH:MM in monospace, #64748B
  - Left border: 2px colored bar (cyan for normal, amber for warning, red for error)
  - Description: one-line text in #F1F5F9

**Data source:** `/api/digest` → DigestEntry[] (flatten items from all time ranges)

**Empty state:** "No activity recorded today" + single muted placeholder entry

---

## Section 4: Footer

Fixed-position footer bar at the bottom of the viewport. Full width, 40px height.

**Content (left to right):**
- SSE indicator: 8px pulsing dot (cyan when connected, red when disconnected) + "Live" / "Disconnected" label
- Separator: `|` in #475569
- Last updated: "Updated {HH:MM:SS CT}" using `lastUpdated` from the primary `useApi` call
- Separator
- Refresh interval: "Refresh: 60s" (or "SSE active" when connected)

**Styling:**
- Background: #0A0A0F with top border 1px #1E293B
- Text: #64748B, text-xs, monospace
- Pulsing dot: custom CSS animation, 2s cycle, opacity 0.4 → 1.0

---

## Data Strategy

### New Aggregated API Endpoint

**Route:** `src/app/api/status-full/route.ts`
**Method:** GET
**Purpose:** Single endpoint that aggregates all data the Command Bridge needs, avoiding 7+ parallel client-side fetches.

**Implementation:**
- Call all existing parsers in parallel via `Promise.all()`:
  - Status parsers (pipeline, cron, metrics, heartbeat, system) — same as current `/api/status`
  - Engagement parser
  - Cognitive parser
  - Intel parser
  - Content-performance parser
  - Digest/session-log parser
- Return a single JSON response with all sections

**Response shape:**

```typescript
interface StatusFullResponse {
  // Existing status cards (unchanged)
  pipeline: StatusCard & { scorecard: PipelineScorecard };
  cron: StatusCard & { jobs: CronJob[] };
  quota: StatusCard & { raw: CodexQuota };
  quark: StatusCard & { heartbeat: HeartbeatState };
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
  contentToday: {
    publishedCount: number;
    platforms: string[];
    topPostHook: string | null;
    publishMode: "LIVE" | "WARMUP";
  };
  activity: Array<{
    timestamp: string;
    text: string;
    level: "info" | "warning" | "error";
  }>;

  // Metadata
  healthScore: number;
  timestamp: string;
}
```

**Caching:** `Cache-Control: public, max-age=5` + `CDN-Cache-Control: s-maxage=15, stale-while-revalidate=45`

**Health score computation:** Performed server-side (not client-side) so SSR gets it immediately. Uses the weighted formula described in Hero Banner section.

### SSE Refresh Strategy

The page uses `useApi("/api/status-full", { refreshOn: [...] })` with the existing `useApi` hook and SSE infrastructure.

| SSE Event Type | Triggers Refetch | Source (chokidar watch) |
|---|---|---|
| `heartbeat` | Yes | `memory/heartbeat-state.md` changes |
| `pipeline` | Yes | `content-engine/` changes |
| `cron` | Yes (new) | Needs new watch on cron state, or use `metrics` event |
| `metrics` | Yes | `metrics/dashboard.md` changes |
| `digest` | Yes | `memory/today-digest.md` changes |
| `intel` | Yes | `intel/DAILY-INTEL.md` changes |
| `comms` | Yes | `comms/` changes |

The `cron` event type does not currently exist in the SSE watcher. Two options:
1. Add a watch path for cron-related files (e.g., heartbeat already covers most cron activity)
2. Rely on `heartbeat` + `metrics` events which already fire when cron runs complete

Recommendation: option 2. No changes needed to the SSE watcher. The existing event types cover all data change paths.

### Fallback Polling

When SSE disconnects (`useDashboardStore.connected === false`), `useApi` already falls back to 60s polling. No changes needed.

---

## Navigation Map

Each instrument panel header is clickable. The chevron is a visual affordance.

| Panel | Navigates To | Route |
|-------|-------------|-------|
| Pipeline | Content page | `/content` |
| Cron Health | Schedule page | `/schedule` |
| Engagement Pulse | Engagement page | `/engagement` |
| API Quota | Settings page | `/settings` |
| Quark Health | Cognitive page | `/cognitive` |
| Content Today | Content page | `/content` |
| System Resources | Settings page | `/settings` |
| Cognitive | Cognitive page | `/cognitive` |
| Intel Signals | Intel page | `/intel` |
| Activity Feed | Operations page | `/operations` |

Alert chips deep-link to the relevant panel's target page. If an alert is about a cron failure, clicking it goes to `/schedule`.

Use Next.js `useRouter().push(href)` on the panel click handler. The entire panel surface is the click target.

---

## Visual Design Tokens

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Page background | `#0A0A0F` | Body, footer |
| Panel background | `#0E0E14` | Instrument panels, hero |
| Panel border | `#1E293B` | Panel borders, dividers |
| Subtle border | `rgba(255,255,255,0.08)` | Internal dividers, hover states |
| Primary text | `#F1F5F9` | Values, headings, sentences |
| Muted text | `#94A3B8` | Labels, panel headers |
| Dim text | `#64748B` | Timestamps, secondary info |
| Ghost text | `#475569` | Separators, disabled elements |
| Accent (healthy) | `#00D4AA` | Healthy dots, gauges, sparklines |
| Warning | `#F59E0B` | Warning dots, amber gauges |
| Error | `#EF4444` | Critical dots, red gauges (use sparingly) |
| Emerald (status ok) | `#10B981` | Cron heatmap ok cells, publish badges |

### Typography

| Element | Font | Weight | Size | Tracking |
|---------|------|--------|------|----------|
| Panel headers | Inter/SF Pro | 500 | 12px (text-xs) | wider |
| Status sentences | Inter/SF Pro | 400 | 14px (text-sm) | normal |
| Data values | SF Mono/Fira Code | 700 | 14-20px | normal |
| KPI pill values | SF Mono/Fira Code | 600 | 13px | normal |
| Timestamps | SF Mono/Fira Code | 400 | 12px | normal |
| Alert chips | Inter/SF Pro | 400 | 12px | normal |

### Animations

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Critical dot | `animate-pulse` (Tailwind built-in) | 1.5s | ease-in-out |
| Warning dot | Custom slow-pulse (opacity 0.7-1.0) | 2s | ease-in-out |
| SSE dot | Custom glow-pulse (opacity 0.4-1.0) | 2s | ease-in-out |
| Gauge stroke | CSS transition on `stroke-dashoffset` | 600ms | ease |
| Panel hover | Border + bg color transition | 150ms | ease |
| Sparkline path | No animation (static render) | — | — |

Custom keyframes needed in Tailwind config or inline:

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

### Gauge Design

Reuse the existing `RadialGauge` component at `src/components/ui/radial-gauge.tsx`. It already implements:
- Half-circle arc SVG
- `stroke-dasharray`/`stroke-dashoffset` for fill
- Color thresholds (cyan < 80%, amber 80-95%, red > 95%)
- Drop-shadow glow filter
- Animated transitions

For the Hero health ring, create a full-circle variant:
- Full 360-degree arc (not half-circle)
- Larger size (120px desktop, 80px mobile)
- Score text centered inside the ring
- Same color thresholds and glow treatment

### Sparkline Design

New `Sparkline` component:
- SVG with viewBox preserving aspect ratio
- Single `<path>` for the line, stroke = #00D4AA, strokeWidth = 1.5
- `<linearGradient>` fill below the path: #00D4AA at 20% opacity → transparent
- No axes, no labels (context provided by the panel)
- Data points normalized to 0-1 range within the sparkline's own min/max
- If all values are 0, render a flat line at the bottom

### Glass Effect

No frosted glass / backdrop-blur. Panels use solid `#0E0E14` background with `#1E293B` border. Hover state lightens slightly: `bg-white/[0.02]`, border `rgba(255,255,255,0.10)`.

---

## Responsive Behavior

### Desktop (>= 1024px)

- 3-column grid as described in layout
- Panels that span 2 columns use `grid-column: span 2`
- Hero: horizontal layout (ring left, title+KPIs right)
- Gauges at 80px

### Tablet (768px - 1023px)

- 2-column grid
- Spanning panels still span 2 columns where possible
- System Resources: still spans 2
- Activity Feed: still spans 2
- Intel Signals: full width (1 column but 100%)
- Hero: ring above title, KPIs in a single row

### Mobile (< 768px)

- Single column grid
- All panels full width, no spanning
- Ordering by `data-priority` CSS attribute via `order`:
  - Priority 1 panels (Pipeline, Cron, Engagement): `order: 1`
  - Priority 2 panels (Quota, Quark, Content): `order: 2`
  - Priority 3 panels (System, Cognitive, Intel, Activity): `order: 3`
- Hero: stacks vertically
  - Ring centered above title
  - KPIs wrap to 2 rows (3 + 2 or 2 + 3)
- Alerts strip: unchanged (horizontal scroll is already mobile-friendly)
- Gauges shrink to 64px
- Engagement platform grid: 3 columns (wraps)
- Sparklines: full width, height reduced to 32px
- Footer: text wraps to 2 lines if needed

### Narrow Mobile (< 480px)

- KPIs: wrap further, 2 per row
- Health ring: 64px
- System gauges: 48px
- Panel padding: 16px (reduced from 20px)
- Cron heatmap: 4 columns instead of 5

---

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `src/app/api/status-full/route.ts` | Aggregated API endpoint |
| `src/components/status/hero-banner.tsx` | Health ring + title + KPI pills |
| `src/components/status/alerts-strip.tsx` | Scrollable alert chip bar |
| `src/components/status/instrument-panel.tsx` | Reusable panel wrapper |
| `src/components/status/pipeline-panel.tsx` | Pipeline instrument |
| `src/components/status/cron-panel.tsx` | Cron health instrument |
| `src/components/status/engagement-panel.tsx` | Engagement pulse instrument |
| `src/components/status/quota-panel.tsx` | API quota instrument |
| `src/components/status/quark-panel.tsx` | Quark health instrument |
| `src/components/status/content-panel.tsx` | Content today instrument |
| `src/components/status/system-panel.tsx` | System resources instrument |
| `src/components/status/cognitive-panel.tsx` | Cognitive instrument |
| `src/components/status/intel-panel.tsx` | Intel signals instrument |
| `src/components/status/activity-panel.tsx` | Activity feed instrument |
| `src/components/ui/circular-gauge.tsx` | Full-circle SVG gauge (hero ring) |
| `src/components/ui/sparkline.tsx` | SVG sparkline with gradient fill |
| `src/components/status/cron-heatmap.tsx` | Cron job status heatmap grid |

### Modified Files

| File | Change |
|------|--------|
| `src/app/status/page.tsx` | Complete rewrite — consume `/api/status-full`, render 4 sections |
| `src/lib/status-logic.ts` | Add `computeHealthScore()` function (keep all existing derive functions) |

### Deletable Files (after new panels are live)

| File | Reason |
|------|--------|
| `src/components/status/pipeline-card.tsx` | Replaced by `pipeline-panel.tsx` |
| `src/components/status/cron-card.tsx` | Replaced by `cron-panel.tsx` |
| `src/components/status/quota-card.tsx` | Replaced by `quota-panel.tsx` |
| `src/components/status/quark-card.tsx` | Replaced by `quark-panel.tsx` |
| `src/components/status/system-card.tsx` | Replaced by `system-panel.tsx` |
| `src/components/status/detail-panel.tsx` | No longer used (panels navigate to detail pages instead of opening drawers) |

### Unchanged Files

- All existing parsers (`src/lib/parsers/*`)
- SSE infrastructure (`src/app/api/events/route.ts`)
- `useApi` hook (`src/hooks/use-api.ts`)
- Dashboard store (`src/stores/dashboard.ts`)
- App shell and sidebar (`src/components/layout/*`)
- Theme constants (`src/lib/theme-constants.ts`)
- All other pages
- Existing API routes (consumed by the new aggregated endpoint, still available individually)

---

## Page Component Structure

The rewritten `src/app/status/page.tsx` should follow this structure:

```
StatusPage (client component)
├── useApi<StatusFullResponse>("/api/status-full", { refreshOn: [...] })
├── HeroBanner
│   ├── CircularGauge (health score)
│   ├── Title + status sentence
│   └── KPI pills (5x)
├── AlertsStrip
│   └── AlertChip[] (generated from response)
├── Instrument Grid (CSS grid)
│   ├── InstrumentPanel → PipelinePanel
│   ├── InstrumentPanel → CronPanel
│   │   └── CronHeatmap
│   ├── InstrumentPanel → EngagementPanel
│   ├── InstrumentPanel → QuotaPanel
│   ├── InstrumentPanel → QuarkPanel
│   │   └── Sparkline
│   ├── InstrumentPanel → ContentPanel
│   ├── InstrumentPanel → SystemPanel (span 2)
│   │   └── RadialGauge (3x)
│   ├── InstrumentPanel → CognitivePanel
│   ├── InstrumentPanel → IntelPanel
│   └── InstrumentPanel → ActivityPanel (span 2)
└── Footer
    └── SSE indicator + timestamp + refresh info
```

The page itself should be ~150-200 lines: it imports the section components, calls `useApi`, passes data down as props, and handles loading/error states.

Loading state: show the hero skeleton (ring placeholder + 5 pill skeletons) + 10 panel skeletons (matching the grid layout, `animate-pulse` on `bg-white/[0.03]`).

Error state: hero with red ring at 0, title "Connection Error", and a retry button. No instrument grid.

---

## Success Criteria

1. **Performance:** Status page loads in < 500ms (SSR initial paint + single API call). Measured from navigation start to largest contentful paint.
2. **Data completeness:** All 10 panels show real data immediately after first paint. No loading spinners visible after the initial skeleton.
3. **Mobile usability:** Functional and readable at 375px width (iPhone SE). All panels reachable via scroll. No horizontal overflow on the page body (alerts strip scrolls independently).
4. **Empty states:** Every panel has a meaningful empty state. Zero blank/broken panels when a data source returns null or empty.
5. **Navigation:** Click-to-navigate works on all 10 panels + alert chips. Each navigation target is correct per the navigation map.
6. **Live updates:** SSE events trigger re-renders on affected panels within 1 second of file change. Verify with: change a heartbeat file, observe the Quark Health panel update.
7. **Visual fidelity:** Matches the approved Command Bridge mockup in density, color, and cinematic feel. Dark backgrounds, cyan accents, monospace data values, glow effects on gauges.
8. **No regressions:** All other pages continue to work. Existing API endpoints remain available. SSE infrastructure unchanged.

---

## Out of Scope

- Top processes table in System panel (requires new parser — use uptime display in v1)
- Engagement SSE event type (existing events cover the data change paths)
- Cron history sparkline (would need `/api/cron-history` data aggregation)
- Panel drag-and-drop reordering
- Panel collapse/expand
- Dark/light theme toggle
- WebSocket replacement for SSE
