# Cognitive Dashboard — Design Spec

## Goal

Add a cognitive health monitoring layer to Mission Control that surfaces Quark's growth metrics, detects degradation trends, and alerts proactively via Telegram. Three visibility tiers: dashboard widget, degradation banner, and dedicated `/cognitive` page with 30-day history.

## Architecture

Chandler writes a structured JSON sidecar (`metrics/cognitive/YYYY-MM-DD.json`) alongside his existing daily markdown report. A new Mission Control parser reads up to 30 days of these files. The data flows through the existing snapshot system to power a dashboard widget, an extended degradation banner, and a full dedicated page with trend charts. Chandler also implements two-tier Telegram alerting for developing trends.

## Tech Stack

- **Data source:** Chandler daily cron → JSON files in workspace
- **Parser:** TypeScript, filesystem-based (existing pattern)
- **Frontend:** React 19, TailwindCSS 4, Recharts (already in stack), Framer Motion, GlassCard primitives
- **Alerts:** Chandler → Telegram via existing `message` tool

---

## 1. Data Layer — Chandler JSON Sidecar

Chandler writes `metrics/cognitive/YYYY-MM-DD.json` at the end of every daily run, after the existing `metrics/daily/YYYY-MM-DD.md`.

### Daily Schema

```json
{
  "date": "2026-03-14",
  "collected_at": "2026-03-14T20:15:00-05:00",
  "memory_health": {
    "kb_file_count": 42,
    "kb_files_updated_today": 3,
    "user_md_last_modified": "2026-03-14T10:00:00-05:00",
    "user_md_stale_days": 0,
    "identity_md_last_modified": "2026-03-12T08:00:00-05:00",
    "identity_md_stale_days": 2,
    "journal_word_count": 450,
    "journal_reflective_markers": 5,
    "journal_reflective": true,
    "memory_md_line_count": 200,
    "capture_queue_promoted": 2
  },
  "proactivity": {
    "surprise_me_sent": 1,
    "curiosity_questions": 1,
    "social_engagements": 8,
    "comment_replies": 5,
    "proactive_actions_total": 15,
    "reactive_actions_total": 22,
    "ratio": 0.41
  },
  "engagement": {
    "x_replies": 3,
    "tiktok_replies": 1,
    "youtube_replies": 0,
    "instagram_replies": 1,
    "substack_replies": 0,
    "total_received": 12,
    "total_replied": 5,
    "reply_rate": 0.42
  },
  "degradation_flags": [],
  "tier1_file_sizes": {
    "HEARTBEAT.md": 12400,
    "AGENTS.md": 8900,
    "SOUL.md": 5200,
    "USER.md": 3100,
    "MEMORY.md": 9800,
    "IDENTITY.md": 2400,
    "TOOLS.md": 4500
  }
}
```

### Weekly Extension (Fridays only)

On Fridays, the JSON includes an additional top-level key:

```json
{
  "identity_evolution": {
    "kb_diff_created": 4,
    "kb_diff_updated": 12,
    "user_md_changed": true,
    "journal_reflective_pct": 71,
    "identity_md_stale_days": 2
  }
}
```

### Degradation Flags

Chandler sets `degradation_flags` array entries when ANY of:
- `"journal_operational_3d"` — journal word count < 200 OR zero reflective markers for 3+ consecutive days
- `"kb_stale_5d"` — knowledge-base not updated in 5+ days
- `"user_md_stale_7d"` — USER.md unchanged for 7+ days
- `"zero_proactive_3d"` — zero proactive actions for 3+ consecutive days
- `"tier1_oversize"` — any Tier 1 file exceeds 18,000 chars (with file name in flag: `"tier1_oversize:HEARTBEAT.md"`)

For `tier1_file_sizes`: Chandler checks each file with `wc -c`. If a file doesn't exist, omit it from the object (don't write 0 or error — absence means the file doesn't exist). The expected files are: HEARTBEAT.md, AGENTS.md, SOUL.md, USER.md, MEMORY.md, IDENTITY.md, TOOLS.md.

Chandler determines consecutive-day counts by reading the previous day's JSON: `cat metrics/cognitive/$(date -v-1d +%Y-%m-%d).json`. If the previous day's file doesn't exist (first run, or gap), treat all flags as non-persistent (Tier 1 only).

---

## 2. Two-Tier Telegram Alerts

### Tier 1 — Daily Report Mention

Single degradation trigger fires once → Chandler includes it in the existing daily Telegram report under the `🧠 QUARK GROWTH` block. No separate message.

### Tier 2 — Immediate Standalone Alert

Chandler sends a standalone Telegram message when ANY of:
- 2+ degradation triggers fire on the same day
- Same trigger fires 2+ consecutive days (detected by comparing with previous day's JSON)
- Any platform's comment reply rate drops below 50% for 2+ consecutive days
- Proactivity ratio drops below 0.2 for 2+ consecutive days

Alert format:
```
⚠️ COGNITIVE DRIFT DETECTED

Persistent: Journal operational 3 consecutive days
Persistent: Knowledge-base not updated in 5 days
New: USER.md stale (8 days)

Trend: Proactivity ratio 0.18 → 0.15 (declining 3 days)

Action: Review Deep Work output, check journal quality
```

No external state file needed — the JSON sidecars ARE the history. Chandler reads the previous day's file for comparison.

---

## 3. Mission Control — Parser & API

### Parser: `src/lib/parsers/cognitive.ts`

Reads up to 30 JSON files from `metrics/cognitive/` directory (newest first). Also reads live workspace file mtimes for real-time staleness when Chandler hasn't run yet today.

```typescript
interface CognitiveDay {
  date: string
  collectedAt: string
  memoryHealth: {
    kbFileCount: number
    kbUpdatedToday: number
    userMdStaleDays: number
    identityMdStaleDays: number
    journalWordCount: number
    journalReflectiveMarkers: number
    journalReflective: boolean
    memoryMdLineCount: number
    captureQueuePromoted: number
  }
  proactivity: {
    surpriseMeSent: number
    curiosityQuestions: number
    socialEngagements: number
    commentReplies: number
    proactiveTotal: number
    reactiveTotal: number
    ratio: number
  }
  engagement: {
    xReplies: number
    tiktokReplies: number
    youtubeReplies: number
    instagramReplies: number
    substackReplies: number
    totalReceived: number
    totalReplied: number
    replyRate: number
  }
  degradationFlags: string[]
  tier1FileSizes: Record<string, number>
  identityEvolution?: {
    kbDiffCreated: number
    kbDiffUpdated: number
    userMdChanged: boolean
    journalReflectivePct: number
    identityMdStaleDays: number
  }
}

interface WeeklyRollup {
  weekLabel: string          // "W11 (Mar 10–16)"
  avgJournalWords: number
  avgProactivityRatio: number
  totalSocialEngagements: number
  avgReplyRate: number
  kbFilesAdded: number
  degradationDays: number
  identityEvolution?: CognitiveDay["identityEvolution"]
}

interface CognitiveData {
  current: CognitiveDay        // today or most recent
  history: CognitiveDay[]      // up to 30 days, newest first
  weeklyRollups: WeeklyRollup[] // aggregated by ISO week
  activeDegradation: string[]  // flags active right now (from current)
}
```

Parser implementation follows existing patterns:
- `fs.readFileSync()` for each JSON file
- `JSON.parse()` with try/catch fallback per file
- Live staleness: `fs.statSync()` on USER.md, IDENTITY.md for real-time stale-days when today's JSON doesn't exist yet
- Weekly rollups: group `history` by ISO week, compute averages/totals. ISO week number requires a helper function (`getISOWeek(date)`) since `Date` doesn't provide it natively — add to `src/lib/utils.ts`
- Return type: `CognitiveData`

### API Route: `src/app/api/cognitive/route.ts`

Calls parser, returns JSON response. Follows existing route pattern (auth check, CORS headers, error handling).

### Snapshot Integration

Add `cognitive` key to the snapshot response in `src/app/api/snapshot/route.ts`:

```typescript
{
  // ... existing keys
  cognitive: parseCognitive()
}
```

This ensures Vercel remote mode gets cognitive data via hash-polling.

---

## 4. Dashboard Home — Cognitive Widget

### Component: `src/components/dashboard/cognitive-widget.tsx`

Compact GlassCard placed in the dashboard home's bottom grid row, alongside CodexQuota and PipelineWidget.

Three horizontal segments:

| Memory | Proactivity | Identity |
|--------|-------------|----------|

Each segment shows:
- **Label** — Memory / Proactivity / Identity
- **Status dot** — green (healthy), amber (warning), red (degrading)
- **One-line summary** — e.g., "42 files, 3 today" / "ratio 0.41" / "2d stale"

### Status Logic

**Memory:**
- Green: journal reflective + kb updated today + USER.md < 5 days stale
- Amber: any one condition fails
- Red: 2+ conditions fail

**Proactivity:**
- Green: ratio > 0.3 and social engagements > 0
- Amber: ratio 0.15–0.3
- Red: ratio < 0.15 or zero social for 2+ days

**Identity:**
- Green: IDENTITY.md < 5 days stale
- Amber: 5–7 days stale
- Red: 7+ days stale

### Behavior

- Click anywhere → navigates to `/cognitive`
- When `activeDegradation` is non-empty, card gets a subtle red border glow (matches DegradationBanner alert aesthetic)
- Uses `useApi<CognitiveData>("/api/cognitive", { snapshotKey: "cognitive", refreshOn: ["metrics"] })` — piggybacks on the existing `metrics` SSE event type (cognitive data refreshes at the same cadence as ops metrics)

---

## 5. DegradationBanner Extension

### Component: `src/components/dashboard/degradation-banner.tsx` (modify existing)

Currently shows ops degradation flags (cron failures, model fallbacks). Extended to also read `cognitive.activeDegradation` from the snapshot.

When cognitive flags are present, a second line appears below ops flags:

```
⚠️ DEGRADATION: Cron reliability 94% | Model fallback spike
🧠 COGNITIVE: Journal operational 3 days | USER.md stale 8 days
```

- Ops line uses existing amber styling
- Cognitive line uses 🧠 icon with same amber styling for consistency
- If only cognitive flags exist (no ops issues), the banner still shows — just the cognitive line
- Cognitive line links to `/cognitive` page

### Data Source

The banner currently fetches its own data via `useApi<MetricsData>("/api/metrics", { snapshotKey: "metrics", refreshOn: ["metrics"] })`. Add a second `useApi` call for cognitive data:

```typescript
const { data: cogData } = useApi<CognitiveData>("/api/cognitive", { snapshotKey: "cognitive", refreshOn: ["metrics"] });
```

Render the cognitive line when `cogData?.activeDegradation?.length > 0`. The banner shows if EITHER ops degradation OR cognitive degradation is active.

---

## 6. Dedicated `/cognitive` Page

### Route: `src/app/cognitive/page.tsx`

Four zones, top to bottom:

### Zone 1 — Degradation Alert Bar

Full-width alert bar at top. Only renders when `activeDegradation` is non-empty. Lists all current triggers with persistence count (e.g., "Journal operational — 3rd consecutive day"). Shows when each trigger started (derived from history scan). Amber background, high contrast text.

### Zone 2 — Today's Snapshot (3 Scorecards)

Three GlassCards in a responsive row (3-col on desktop, stacked on mobile):

**Memory Health Card:**
- Knowledge-base file count + updated today count
- Journal word count + reflective badge (✅/⚠️)
- USER.md staleness (days, color-coded)
- IDENTITY.md staleness (days, color-coded)
- MEMORY.md line count
- Capture queue items promoted
- Tier 1 file sizes as horizontal bars — red zone above 18K threshold

**Proactivity Card:**
- Surprise Me count
- Curiosity questions count
- Social engagements count
- Comment replies count
- Proactive/reactive ratio as a Gauge component (reuse existing `src/components/ui/gauge.tsx` — accepts `value`, `max`, `label`, `color`, `size` props; for ratio display, pass `value={ratio * 100}` and `max={100}`)

**Engagement Card:**
- Overall reply rate as a Gauge component
- Platform breakdown table: X / TikTok / YouTube / IG / Substack — replies sent per platform
- Total received vs total replied

### Zone 3 — 7-Day Trend Charts (Recharts)

Two charts side by side (2-col desktop, stacked mobile):

**Left — Journal & Proactivity Trends:**
- Line chart, 7 data points (one per day)
- Line 1: journal word count (left y-axis)
- Line 2: proactivity ratio (right y-axis, 0–1 scale)
- Dashed horizontal reference lines at degradation thresholds (200 words, 0.2 ratio)
- Tooltip with day's values on hover

**Right — Engagement by Platform:**
- Stacked bar chart, 7 bars (one per day)
- Segments: X (blue), TikTok (pink), YouTube (red), Instagram (purple), Substack (orange)
- Shows reply volume distribution across platforms per day

Chart colors follow the existing Cinematic Ops palette. Background transparent, gridlines subtle (`#1E293B`).

### Zone 4 — 30-Day History with Weekly Rollups

Table with one row per ISO week (4–5 rows). Columns:

| Week | Avg Journal | Avg Proactivity | Social Total | Reply Rate | KB Added | Degradation Days |
|------|-------------|-----------------|--------------|------------|----------|-----------------|

- Rows are expandable — click to show daily breakdown for that week
- Most recent Friday's row includes Identity Evolution sub-section: kb diff (created/updated), USER.md changes, journal quality %, IDENTITY.md staleness
- Color-coded cells: green for healthy ranges, amber for warning, red for degradation

### Components

- `src/components/cognitive/degradation-alert.tsx` — Zone 1
- `src/components/cognitive/cognitive-scorecards.tsx` — Zone 2 (3 cards)
- `src/components/cognitive/trend-charts.tsx` — Zone 3 (2 charts)
- `src/components/cognitive/history-table.tsx` — Zone 4

---

## 7. Chandler Instruction Updates

### 7a. JSON Sidecar Write

Add to Chandler's daily run sequence (after writing `metrics/daily/YYYY-MM-DD.md`):

1. Collect all cognitive metrics (already gathered for the markdown report)
2. Write `metrics/cognitive/YYYY-MM-DD.json` with the schema from Section 1
3. On Fridays, include `identity_evolution` block

Add to Tool Commands table:
```
| Cognitive JSON | Write to `metrics/cognitive/YYYY-MM-DD.json` | Structured cognitive metrics for Mission Control |
```

### 7b. Cognitive Alert Protocol

New section in Chandler's instructions:

After writing the JSON sidecar:
1. Read previous day's JSON: `cat metrics/cognitive/$(date -v-1d +%Y-%m-%d).json`
2. Compare degradation flags — detect persistence (same flag in both days)
3. Compare engagement reply rates and proactivity ratios — detect declining trends
4. Apply Tier 2 escalation rules:
   - 2+ flags today → immediate alert
   - Any flag persistent 2+ days → immediate alert
   - Reply rate < 50% for 2+ days on any platform → immediate alert
   - Proactivity ratio < 0.2 for 2+ days → immediate alert
5. Tier 1 (no escalation): include flags in daily `🧠 QUARK GROWTH` block only
6. Tier 2 (escalation): send standalone Telegram message with format from Section 2

---

## 8. Sidebar Navigation

### Component: `src/components/ui/sidebar.tsx` (modify existing)

The sidebar navigation is defined in `sidebar.tsx` (not `app-shell.tsx`). The `navItems` array defines all nav items with Lucide React icons.

Add to `navItems` array, after the Metrics entry (`BarChart3`):

```typescript
{ href: "/cognitive", label: "Cognitive", icon: Brain },
```

Import `Brain` from `lucide-react` (the codebase already imports `BrainCircuit` for Command Center — `Brain` is the simpler variant appropriate for cognitive health).

**Warning dot for active degradation:** The sidebar currently has no data-fetching capability — it only reads `connected` from `useDashboardStore`. To show a degradation dot:
- Add `cognitiveDegradation: string[]` to the dashboard store (populated by the dashboard home page or snapshot polling)
- In `Sidebar`, read `cognitiveDegradation` from the store
- Render a small amber `StatusDot` (already imported) next to the "Cognitive" label when the array is non-empty

---

## File Summary

### New Files (Mission Control)

| File | Purpose |
|------|---------|
| `src/lib/parsers/cognitive.ts` | Parse 30 days of cognitive JSON files |
| `src/app/api/cognitive/route.ts` | API endpoint |
| `src/app/cognitive/page.tsx` | Dedicated page |
| `src/components/cognitive/degradation-alert.tsx` | Zone 1 — alert bar |
| `src/components/cognitive/cognitive-scorecards.tsx` | Zone 2 — 3 metric cards |
| `src/components/cognitive/trend-charts.tsx` | Zone 3 — Recharts |
| `src/components/cognitive/history-table.tsx` | Zone 4 — 30-day table |
| `src/components/dashboard/cognitive-widget.tsx` | Dashboard home widget |

### Modified Files (Mission Control)

| File | Change |
|------|--------|
| `src/app/api/snapshot/route.ts` | Add `cognitive` to snapshot bundle |
| `src/components/dashboard/degradation-banner.tsx` | Add second `useApi` call for cognitive data, render cognitive flags line |
| `src/components/ui/sidebar.tsx` | Add Cognitive nav item with `Brain` icon + degradation warning dot |
| `src/app/page.tsx` | Add CognitiveWidget to dashboard grid |
| `src/lib/parsers/types.ts` | Add cognitive type definitions (canonical location — parser imports from here) |
| `src/stores/dashboard.ts` | Add `cognitiveDegradation` state for sidebar warning dot |

### New Files (Workspace)

| File | Purpose |
|------|---------|
| `metrics/cognitive/` (directory) | Chandler's daily JSON sidecars |

### Modified Files (Workspace)

| File | Change |
|------|--------|
| `.agents/chandler/instructions.md` | Add JSON sidecar write + alert protocol |
