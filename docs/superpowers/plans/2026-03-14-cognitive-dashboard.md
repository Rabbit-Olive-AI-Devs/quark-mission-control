# Cognitive Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cognitive health monitoring to Mission Control — a dedicated `/cognitive` page with 30-day history, a dashboard widget, degradation banner extension, sidebar nav, and Chandler instruction updates for JSON sidecar + Telegram alerts.

**Architecture:** Chandler writes structured JSON sidecars daily (`metrics/cognitive/YYYY-MM-DD.json`). A new parser reads 30 days of files + live workspace state. Data flows through the snapshot system to power frontend components. Two-tier Telegram alerting escalates developing trends.

**Tech Stack:** Next.js 16, React 19, TailwindCSS 4, Recharts 3.7, Framer Motion 12, Zustand 5, lucide-react icons. No test framework — verify via dev server.

**Spec:** `docs/superpowers/specs/2026-03-14-cognitive-dashboard-design.md`

**Existing patterns to follow:**
- Parsers: `src/lib/parsers/metrics.ts` (sync, fs.readFileSync, defensive defaults)
- API routes: `src/app/api/metrics/route.ts` (isRemote check, force-dynamic)
- Pages: `src/app/metrics-page/page.tsx` (useApi, AppShell, GlassCard, loading skeleton)
- Widgets: `src/components/dashboard/codex-quota.tsx` (useApi, GlassCard, Gauge, CardFooter)
- Types: `src/lib/parsers/types.ts` (all shared types here)

---

## File Structure

### New Files — Workspace
| File | Responsibility |
|------|---------------|
| `metrics/cognitive/` (directory) | Chandler's daily JSON sidecars |

### Modified Files — Workspace
| File | Change |
|------|--------|
| `.agents/chandler/instructions.md` | JSON sidecar write + cognitive alert protocol |

### New Files — Mission Control
| File | Responsibility |
|------|---------------|
| `src/lib/parsers/cognitive.ts` | Read 30 days of JSON sidecars + live workspace state, compute weekly rollups |
| `src/app/api/cognitive/route.ts` | API endpoint for cognitive data |
| `src/components/dashboard/cognitive-widget.tsx` | Dashboard home widget (3 mini-indicators) |
| `src/components/cognitive/degradation-alert.tsx` | Zone 1 — full-width alert bar for active degradation |
| `src/components/cognitive/cognitive-scorecards.tsx` | Zone 2 — 3 metric cards (memory, proactivity, engagement) |
| `src/components/cognitive/trend-charts.tsx` | Zone 3 — 7-day Recharts (line + stacked bar) |
| `src/components/cognitive/history-table.tsx` | Zone 4 — 30-day weekly rollup table with expandable rows |
| `src/app/cognitive/page.tsx` | Dedicated cognitive page composing all 4 zones |

### Modified Files — Mission Control
| File | Change |
|------|--------|
| `src/lib/parsers/types.ts` | Add CognitiveDay, WeeklyRollup, CognitiveData types |
| `src/app/api/snapshot/route.ts` | Add `cognitive` key to snapshot bundle |
| `src/components/dashboard/degradation-banner.tsx` | Add second useApi call for cognitive flags |
| `src/components/ui/sidebar.tsx` | Add Cognitive nav item with Brain icon + warning dot |
| `src/stores/dashboard.ts` | Add cognitiveDegradation state |
| `src/app/page.tsx` | Add CognitiveWidget to dashboard grid |
| `src/lib/utils.ts` | Add getISOWeek() helper |

---

## Chunk 1: Data Layer (Chandler + Types + Parser + API)

### Task 1: Create metrics/cognitive directory and seed data

**Files:**
- Create: `~/.openclaw/workspace/metrics/cognitive/` (directory)
- Create: `~/.openclaw/workspace/metrics/cognitive/2026-03-14.json` (seed file for dev)

This seed file lets us develop and verify the parser before Chandler starts writing real data.

- [ ] **Step 1: Create directory and seed file**

```bash
mkdir -p ~/.openclaw/workspace/metrics/cognitive
```

Write seed file `~/.openclaw/workspace/metrics/cognitive/2026-03-14.json`:

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

Also create 6 more seed files for the past week (2026-03-08 through 2026-03-13) with slightly varying values to test trend charts and weekly rollups. Make the March 13 file include a degradation flag `["journal_operational_3d"]` and lower proactivity ratio (0.12) to test alert rendering. Make the March 13 file (Friday) include an `identity_evolution` block. Note: March 8 is a Sunday, March 13 is the Friday in this range.

- [ ] **Step 2: Verify seed files**

```bash
ls -la ~/.openclaw/workspace/metrics/cognitive/
# Expected: 7 JSON files (2026-03-08 through 2026-03-14)
cat ~/.openclaw/workspace/metrics/cognitive/2026-03-14.json | python3 -m json.tool
# Expected: valid JSON
```

- [ ] **Step 3: Commit**

```bash
cd ~/.openclaw/workspace
git add metrics/cognitive/
git commit -m "feat: add cognitive metrics seed data for dashboard development"
```

---

### Task 2: Add TypeScript types to types.ts

**Files:**
- Modify: `/Users/quark/projects/quark-mission-control/src/lib/parsers/types.ts`

Add cognitive types at the end of the file, after existing type definitions.

- [ ] **Step 1: Add types**

Append to `src/lib/parsers/types.ts`:

```typescript
// --- Cognitive Dashboard ---

export interface CognitiveMemoryHealth {
  kbFileCount: number;
  kbUpdatedToday: number;
  userMdLastModified: string | null;
  userMdStaleDays: number;
  identityMdLastModified: string | null;
  identityMdStaleDays: number;
  journalWordCount: number;
  journalReflectiveMarkers: number;
  journalReflective: boolean;
  memoryMdLineCount: number;
  captureQueuePromoted: number;
}

export interface CognitiveProactivity {
  surpriseMeSent: number;
  curiosityQuestions: number;
  socialEngagements: number;
  commentReplies: number;
  proactiveTotal: number;
  reactiveTotal: number;
  ratio: number;
}

export interface CognitiveEngagement {
  xReplies: number;
  tiktokReplies: number;
  youtubeReplies: number;
  instagramReplies: number;
  substackReplies: number;
  totalReceived: number;
  totalReplied: number;
  replyRate: number;
}

export interface CognitiveIdentityEvolution {
  kbDiffCreated: number;
  kbDiffUpdated: number;
  userMdChanged: boolean;
  journalReflectivePct: number;
  identityMdStaleDays: number;
}

export interface CognitiveDay {
  date: string;
  collectedAt: string;
  memoryHealth: CognitiveMemoryHealth;
  proactivity: CognitiveProactivity;
  engagement: CognitiveEngagement;
  degradationFlags: string[];
  tier1FileSizes: Record<string, number>;
  identityEvolution?: CognitiveIdentityEvolution;
}

export interface WeeklyRollup {
  weekLabel: string;
  avgJournalWords: number;
  avgProactivityRatio: number;
  totalSocialEngagements: number;
  avgReplyRate: number;
  kbFilesAdded: number;
  degradationDays: number;
  identityEvolution?: CognitiveIdentityEvolution;
}

// Note: `current` is nullable (diverges from spec's non-nullable CognitiveDay).
// This is intentional — handles the no-data/empty-directory case gracefully.
// All downstream consumers must handle data.current === null.
export interface CognitiveData {
  current: CognitiveDay | null;
  history: CognitiveDay[];
  weeklyRollups: WeeklyRollup[];
  activeDegradation: string[];
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/quark/projects/quark-mission-control
npx next build 2>&1 | head -20
# Expected: no type errors related to cognitive types
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/parsers/types.ts
git commit -m "feat: add cognitive dashboard type definitions"
```

---

### Task 3: Add getISOWeek helper to utils.ts

**Files:**
- Modify: `/Users/quark/projects/quark-mission-control/src/lib/utils.ts`

- [ ] **Step 1: Add helper function**

Append to `src/lib/utils.ts`:

```typescript
/**
 * Returns the ISO 8601 week number for a given date string (YYYY-MM-DD).
 * Week 1 is the week containing the first Thursday of the year.
 */
export function getISOWeek(dateStr: string): number {
  const date = new Date(dateStr + "T12:00:00");
  const dayOfWeek = date.getDay() || 7; // Sunday = 7
  date.setDate(date.getDate() + 4 - dayOfWeek); // Set to nearest Thursday
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Returns ISO week label like "W11 (Mar 10–16)" for a date string.
 */
export function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const dayOfWeek = date.getDay() || 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekNum = getISOWeek(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startLabel = `${months[monday.getMonth()]} ${monday.getDate()}`;
  const endLabel = `${months[sunday.getMonth()]} ${sunday.getDate()}`;

  return `W${weekNum} (${startLabel}–${endLabel})`;
}
```

- [ ] **Step 2: Verify**

```bash
cd /Users/quark/projects/quark-mission-control
node -e "
  const { getISOWeek, getWeekLabel } = require('./src/lib/utils');
  console.log(getISOWeek('2026-03-14')); // Expected: 11
  console.log(getWeekLabel('2026-03-14')); // Expected: W11 (Mar 9–15) or similar
" 2>&1 || echo "Note: may need ts-node or build step — verify at runtime instead"
```

If the node check fails due to TypeScript, verify by running the dev server later.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: add ISO week helpers for cognitive dashboard"
```

---

### Task 4: Create cognitive parser

**Files:**
- Create: `/Users/quark/projects/quark-mission-control/src/lib/parsers/cognitive.ts`

**Reference:** Follow the pattern from `src/lib/parsers/metrics.ts` — synchronous, fs.readFileSync, defensive defaults, no async.

- [ ] **Step 1: Create parser file**

Create `src/lib/parsers/cognitive.ts`:

```typescript
import * as fs from "fs";
import * as path from "path";
import { WORKSPACE_PATH } from "../config";
import { getWeekLabel } from "../utils";
import type {
  CognitiveDay,
  CognitiveData,
  CognitiveMemoryHealth,
  CognitiveProactivity,
  CognitiveEngagement,
  CognitiveIdentityEvolution,
  WeeklyRollup,
} from "./types";

const COGNITIVE_DIR = path.join(WORKSPACE_PATH, "metrics/cognitive");
const MAX_DAYS = 30;

function parseCognitiveFile(filePath: string): CognitiveDay | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    const mh = data.memory_health || {};
    const memoryHealth: CognitiveMemoryHealth = {
      kbFileCount: mh.kb_file_count ?? 0,
      kbUpdatedToday: mh.kb_files_updated_today ?? 0,
      userMdLastModified: mh.user_md_last_modified ?? null,
      userMdStaleDays: mh.user_md_stale_days ?? 0,
      identityMdLastModified: mh.identity_md_last_modified ?? null,
      identityMdStaleDays: mh.identity_md_stale_days ?? 0,
      journalWordCount: mh.journal_word_count ?? 0,
      journalReflectiveMarkers: mh.journal_reflective_markers ?? 0,
      journalReflective: mh.journal_reflective ?? false,
      memoryMdLineCount: mh.memory_md_line_count ?? 0,
      captureQueuePromoted: mh.capture_queue_promoted ?? 0,
    };

    const p = data.proactivity || {};
    const proactivity: CognitiveProactivity = {
      surpriseMeSent: p.surprise_me_sent ?? 0,
      curiosityQuestions: p.curiosity_questions ?? 0,
      socialEngagements: p.social_engagements ?? 0,
      commentReplies: p.comment_replies ?? 0,
      proactiveTotal: p.proactive_actions_total ?? 0,
      reactiveTotal: p.reactive_actions_total ?? 0,
      ratio: p.ratio ?? 0,
    };

    const e = data.engagement || {};
    const engagement: CognitiveEngagement = {
      xReplies: e.x_replies ?? 0,
      tiktokReplies: e.tiktok_replies ?? 0,
      youtubeReplies: e.youtube_replies ?? 0,
      instagramReplies: e.instagram_replies ?? 0,
      substackReplies: e.substack_replies ?? 0,
      totalReceived: e.total_received ?? 0,
      totalReplied: e.total_replied ?? 0,
      replyRate: e.reply_rate ?? 0,
    };

    let identityEvolution: CognitiveIdentityEvolution | undefined;
    if (data.identity_evolution) {
      const ie = data.identity_evolution;
      identityEvolution = {
        kbDiffCreated: ie.kb_diff_created ?? 0,
        kbDiffUpdated: ie.kb_diff_updated ?? 0,
        userMdChanged: ie.user_md_changed ?? false,
        journalReflectivePct: ie.journal_reflective_pct ?? 0,
        identityMdStaleDays: ie.identity_md_stale_days ?? 0,
      };
    }

    return {
      date: data.date || "",
      collectedAt: data.collected_at || "",
      memoryHealth,
      proactivity,
      engagement,
      degradationFlags: Array.isArray(data.degradation_flags) ? data.degradation_flags : [],
      tier1FileSizes: data.tier1_file_sizes || {},
      identityEvolution,
    };
  } catch {
    return null;
  }
}

function getLiveStaleness(): { userMdStaleDays: number; identityMdStaleDays: number } {
  const now = Date.now();
  let userMdStaleDays = 0;
  let identityMdStaleDays = 0;

  try {
    const userStat = fs.statSync(path.join(WORKSPACE_PATH, "USER.md"));
    userMdStaleDays = Math.floor((now - userStat.mtimeMs) / 86400000);
  } catch {
    userMdStaleDays = 999;
  }

  try {
    const idStat = fs.statSync(path.join(WORKSPACE_PATH, "IDENTITY.md"));
    identityMdStaleDays = Math.floor((now - idStat.mtimeMs) / 86400000);
  } catch {
    identityMdStaleDays = 999;
  }

  return { userMdStaleDays, identityMdStaleDays };
}

function computeWeeklyRollups(history: CognitiveDay[]): WeeklyRollup[] {
  const weekMap = new Map<string, CognitiveDay[]>();

  for (const day of history) {
    const label = getWeekLabel(day.date);
    if (!weekMap.has(label)) weekMap.set(label, []);
    weekMap.get(label)!.push(day);
  }

  const rollups: WeeklyRollup[] = [];
  for (const [weekLabel, days] of weekMap) {
    const n = days.length;
    const avgJournalWords = Math.round(days.reduce((s, d) => s + d.memoryHealth.journalWordCount, 0) / n);
    const avgProactivityRatio = parseFloat((days.reduce((s, d) => s + d.proactivity.ratio, 0) / n).toFixed(2));
    const totalSocialEngagements = days.reduce((s, d) => s + d.proactivity.socialEngagements, 0);
    const avgReplyRate = parseFloat((days.reduce((s, d) => s + d.engagement.replyRate, 0) / n).toFixed(2));
    const kbFilesAdded = days.reduce((s, d) => s + d.memoryHealth.kbUpdatedToday, 0);
    const degradationDays = days.filter((d) => d.degradationFlags.length > 0).length;

    // Find identity evolution from Friday entry (if any)
    const fridayEntry = days.find((d) => {
      const dow = new Date(d.date + "T12:00:00").getDay();
      return dow === 5; // Friday
    });

    rollups.push({
      weekLabel,
      avgJournalWords,
      avgProactivityRatio,
      totalSocialEngagements,
      avgReplyRate,
      kbFilesAdded,
      degradationDays,
      identityEvolution: fridayEntry?.identityEvolution,
    });
  }

  return rollups;
}

export function parseCognitive(): CognitiveData {
  const empty: CognitiveData = {
    current: null,
    history: [],
    weeklyRollups: [],
    activeDegradation: [],
  };

  // Read JSON files from cognitive directory
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(COGNITIVE_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, MAX_DAYS);
  } catch {
    return empty;
  }

  if (files.length === 0) return empty;

  const history: CognitiveDay[] = [];
  for (const file of files) {
    const day = parseCognitiveFile(path.join(COGNITIVE_DIR, file));
    if (day) history.push(day);
  }

  if (history.length === 0) return empty;

  // Current = most recent day (defensive copy to avoid mutating history[0])
  let current: CognitiveDay = { ...history[0], memoryHealth: { ...history[0].memoryHealth } };

  // If today's file doesn't exist yet, overlay live staleness on current
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  if (current.date !== todayStr) {
    const live = getLiveStaleness();
    current.memoryHealth.userMdStaleDays = live.userMdStaleDays;
    current.memoryHealth.identityMdStaleDays = live.identityMdStaleDays;
  }

  const weeklyRollups = computeWeeklyRollups(history);
  const activeDegradation = current.degradationFlags;

  return {
    current,
    history,
    weeklyRollups,
    activeDegradation,
  };
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/quark/projects/quark-mission-control
npx next build 2>&1 | tail -5
# Expected: no errors mentioning cognitive.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/parsers/cognitive.ts
git commit -m "feat: add cognitive metrics parser (30-day history + weekly rollups)"
```

---

### Task 5: Create API route and snapshot integration

**Files:**
- Create: `/Users/quark/projects/quark-mission-control/src/app/api/cognitive/route.ts`
- Modify: `/Users/quark/projects/quark-mission-control/src/app/api/snapshot/route.ts`

**Reference:** Follow `src/app/api/metrics/route.ts` pattern exactly.

- [ ] **Step 1: Create API route**

Create `src/app/api/cognitive/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { parseCognitive } from "@/lib/parsers/cognitive";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("cognitive");
    if (data) return NextResponse.json(data);
  }
  return NextResponse.json(parseCognitive());
}
```

- [ ] **Step 2: Add to snapshot**

Open `src/app/api/snapshot/route.ts`. Find the snapshot object construction (where all parsers are called). Add the cognitive parser import and call:

Add import at the top:
```typescript
import { parseCognitive } from "@/lib/parsers/cognitive";
```

Add to the snapshot object (alongside the other parser calls like `metrics: parseMetrics()`):
```typescript
cognitive: parseCognitive(),
```

- [ ] **Step 3: Verify API endpoint**

```bash
cd /Users/quark/projects/quark-mission-control
npx next dev --turbopack &
sleep 3
curl -s http://localhost:3000/api/cognitive | python3 -m json.tool | head -30
# Expected: JSON with current, history, weeklyRollups, activeDegradation
kill %1
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cognitive/route.ts src/app/api/snapshot/route.ts
git commit -m "feat: add /api/cognitive endpoint and snapshot integration"
```

---

### Task 6: Update Chandler instructions

**Files:**
- Modify: `~/.openclaw/workspace/.agents/chandler/instructions.md`

- [ ] **Step 1: Add JSON sidecar write to daily run sequence**

Find the "## Output Files" section in Chandler's instructions. Add a new row to the table:

```
| `metrics/cognitive/YYYY-MM-DD.json` | Structured cognitive metrics for Mission Control | Every daily run |
```

- [ ] **Step 2: Add cognitive data collection section**

After the "## Output Files" section, add:

```markdown
## Cognitive Data Collection

After writing `metrics/daily/YYYY-MM-DD.md`, also write `metrics/cognitive/YYYY-MM-DD.json` with structured cognitive metrics for Mission Control.

### Schema

```json
{
  "date": "YYYY-MM-DD",
  "collected_at": "ISO 8601 timestamp",
  "memory_health": {
    "kb_file_count": 0,
    "kb_files_updated_today": 0,
    "user_md_last_modified": "ISO 8601 or null",
    "user_md_stale_days": 0,
    "identity_md_last_modified": "ISO 8601 or null",
    "identity_md_stale_days": 0,
    "journal_word_count": 0,
    "journal_reflective_markers": 0,
    "journal_reflective": false,
    "memory_md_line_count": 0,
    "capture_queue_promoted": 0
  },
  "proactivity": {
    "surprise_me_sent": 0,
    "curiosity_questions": 0,
    "social_engagements": 0,
    "comment_replies": 0,
    "proactive_actions_total": 0,
    "reactive_actions_total": 0,
    "ratio": 0.0
  },
  "engagement": {
    "x_replies": 0,
    "tiktok_replies": 0,
    "youtube_replies": 0,
    "instagram_replies": 0,
    "substack_replies": 0,
    "total_received": 0,
    "total_replied": 0,
    "reply_rate": 0.0
  },
  "degradation_flags": [],
  "tier1_file_sizes": {}
}
```

On Fridays, include an additional `identity_evolution` key:

```json
{
  "identity_evolution": {
    "kb_diff_created": 0,
    "kb_diff_updated": 0,
    "user_md_changed": false,
    "journal_reflective_pct": 0,
    "identity_md_stale_days": 0
  }
}
```

For `tier1_file_sizes`: check each file with `wc -c`. If a file doesn't exist, omit it. Expected files: HEARTBEAT.md, AGENTS.md, SOUL.md, USER.md, MEMORY.md, IDENTITY.md, TOOLS.md.

### How to Collect

- `kb_file_count` / `kb_files_updated_today`: already collected for daily report (see Memory Health section)
- `user_md_last_modified` / `identity_md_last_modified`: `stat -f %Sm -t "%Y-%m-%dT%H:%M:%S%z" USER.md`
- `user_md_stale_days` / `identity_md_stale_days`: already calculated for daily report
- `journal_word_count` / `journal_reflective_markers`: already collected for daily report
- `proactivity` counts: already collected for Proactivity Score (see that section)
- `engagement` counts: already collected for Engagement & Reply Tracking (see that section)
- `degradation_flags`: already evaluated for Degradation Triggers (see that section)
- `tier1_file_sizes`: `wc -c HEARTBEAT.md AGENTS.md SOUL.md USER.md MEMORY.md IDENTITY.md TOOLS.md`
- `identity_evolution` (Fridays): already collected for Identity Evolution (see that section)
```

- [ ] **Step 3: Add cognitive alert protocol**

After the new Cognitive Data Collection section, add:

```markdown
## Cognitive Alert Protocol

After writing the cognitive JSON sidecar, evaluate whether to send a standalone Telegram alert.

### Steps

1. Read previous day's JSON: `cat metrics/cognitive/$(date -v-1d +%Y-%m-%d).json`
   - If previous day's file doesn't exist, treat all flags as non-persistent (Tier 1 only)
2. Compare degradation flags — detect persistence (same flag in both days)
3. Compare engagement reply rates and proactivity ratios — detect declining trends

### Tier 1 — Daily Report Only

Single degradation trigger fires for the first time → include in daily Telegram report under `🧠 QUARK GROWTH` block. No separate message.

### Tier 2 — Immediate Standalone Alert

Send a standalone Telegram message when ANY of:
- 2+ degradation triggers fire on the same day
- Same trigger fires 2+ consecutive days
- Any platform's comment reply rate < 50% for 2+ consecutive days
- Proactivity ratio < 0.2 for 2+ consecutive days

Alert format:
```
⚠️ COGNITIVE DRIFT DETECTED

Persistent: [flag name] [N] consecutive days
New: [flag name]

Trend: [metric] [previous] → [current] (declining [N] days)

Action: [specific recommendation]
```

Recommendations by flag:
- `journal_operational_3d` → "Review Deep Work output, check journal quality"
- `kb_stale_5d` → "Run knowledge-base enrichment in next Deep Work"
- `user_md_stale_7d` → "Schedule conversation to learn something new about Thiago"
- `zero_proactive_3d` → "Check Deep Work cron execution, verify social CDP access"
- `tier1_oversize` → "Archive or split the oversized file"
```

- [ ] **Step 4: Commit**

```bash
cd ~/.openclaw/workspace
git add .agents/chandler/instructions.md
git commit -m "feat: add cognitive JSON sidecar + alert protocol to Chandler"
```

---

## Chunk 2: Dashboard Integration (Widget + Banner + Sidebar + Store)

### Task 7: Add cognitiveDegradation to dashboard store

**Files:**
- Modify: `/Users/quark/projects/quark-mission-control/src/stores/dashboard.ts`

- [ ] **Step 1: Add state and setter**

In `src/stores/dashboard.ts`, add to the `DashboardState` interface:

```typescript
cognitiveDegradation: string[];
setCognitiveDegradation: (flags: string[]) => void;
```

Add to the `create()` initializer:

```typescript
cognitiveDegradation: [],
setCognitiveDegradation: (flags) => set({ cognitiveDegradation: flags }),
```

- [ ] **Step 2: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/stores/dashboard.ts
git commit -m "feat: add cognitiveDegradation state to dashboard store"
```

---

### Task 8: Create cognitive widget for dashboard home

**Files:**
- Create: `/Users/quark/projects/quark-mission-control/src/components/dashboard/cognitive-widget.tsx`
- Modify: `/Users/quark/projects/quark-mission-control/src/app/page.tsx`

**Design direction (Cinematic Ops):** The widget is a compact GlassCard with three horizontal segments — each a mini health indicator with a status dot and one-line summary. Subtle neural-network-inspired connecting lines between segments. When degradation is active, a faint pulsing red border glow creates urgency without screaming. Click navigates to `/cognitive`.

- [ ] **Step 1: Create widget component**

Create `src/components/dashboard/cognitive-widget.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Brain } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusDot } from "@/components/ui/status-dot";
import { CardFooter } from "@/components/ui/card-footer";
import { useApi } from "@/hooks/use-api";
import { useDashboardStore } from "@/stores/dashboard";
import type { CognitiveData } from "@/lib/parsers/types";

type HealthLevel = "good" | "warn" | "bad";

function getMemoryHealth(data: CognitiveData): { level: HealthLevel; summary: string } {
  const c = data.current;
  if (!c) return { level: "bad", summary: "No data" };
  const mh = c.memoryHealth;

  let fails = 0;
  if (!mh.journalReflective) fails++;
  if (mh.kbUpdatedToday === 0) fails++;
  if (mh.userMdStaleDays >= 5) fails++;

  const level: HealthLevel = fails >= 2 ? "bad" : fails === 1 ? "warn" : "good";
  const summary = `${mh.kbFileCount} files, ${mh.kbUpdatedToday} today`;
  return { level, summary };
}

function getProactivityHealth(data: CognitiveData): { level: HealthLevel; summary: string } {
  const c = data.current;
  if (!c) return { level: "bad", summary: "No data" };
  const p = c.proactivity;

  const level: HealthLevel =
    p.ratio < 0.15 || p.socialEngagements === 0
      ? "bad"
      : p.ratio < 0.3
        ? "warn"
        : "good";
  const summary = `ratio ${p.ratio.toFixed(2)}`;
  return { level, summary };
}

function getIdentityHealth(data: CognitiveData): { level: HealthLevel; summary: string } {
  const c = data.current;
  if (!c) return { level: "bad", summary: "No data" };
  const days = c.memoryHealth.identityMdStaleDays;

  const level: HealthLevel = days >= 7 ? "bad" : days >= 5 ? "warn" : "good";
  const summary = days === 0 ? "updated today" : `${days}d stale`;
  return { level, summary };
}

const STATUS_MAP: Record<HealthLevel, "active" | "warning" | "error"> = {
  good: "active",
  warn: "warning",
  bad: "error",
};

export function CognitiveWidget({ delay = 0 }: { delay?: number }) {
  const { data, error, lastUpdated, refetch } = useApi<CognitiveData>("/api/cognitive", {
    snapshotKey: "cognitive",
    refreshOn: ["metrics"],
  });

  const setCognitiveDegradation = useDashboardStore((s) => s.setCognitiveDegradation);

  // Sync degradation flags to store (for sidebar warning dot)
  useEffect(() => {
    if (data?.activeDegradation) {
      setCognitiveDegradation(data.activeDegradation);
    }
  }, [data?.activeDegradation, setCognitiveDegradation]);

  const memory = data ? getMemoryHealth(data) : null;
  const proactivity = data ? getProactivityHealth(data) : null;
  const identity = data ? getIdentityHealth(data) : null;
  const hasDegradation = (data?.activeDegradation?.length ?? 0) > 0;

  return (
    <GlassCard
      delay={delay}
      className={hasDegradation ? "ring-1 ring-[#EF4444]/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]" : ""}
    >
      <Link href="/cognitive" className="block">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} className="text-[#00D4AA]" />
          <h3 className="text-sm font-medium">Cognitive Health</h3>
        </div>

        {!data ? (
          <div className="animate-pulse h-12 bg-white/5 rounded" />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Memory", ...memory! },
              { label: "Proactivity", ...proactivity! },
              { label: "Identity", ...identity! },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center text-center gap-1">
                <StatusDot status={STATUS_MAP[item.level]} size="sm" pulse={item.level === "bad"} />
                <span className="text-[10px] font-medium text-[#F1F5F9]">{item.label}</span>
                <span className="text-[9px] text-[#94A3B8]">{item.summary}</span>
              </div>
            ))}
          </div>
        )}
      </Link>

      <CardFooter lastUpdated={lastUpdated} error={error} onRefresh={refetch} />
    </GlassCard>
  );
}
```

- [ ] **Step 2: Add widget to dashboard home**

In `src/app/page.tsx`, add import:

```typescript
import { CognitiveWidget } from "@/components/dashboard/cognitive-widget";
```

Find the bottom grid section (the one with CodexQuota and PipelineWidget — comment `{/* Codex Quota + Pipeline Widget */}`). **Replace the entire grid div block** (from the comment to its closing `</div>`) with:

```typescript
{/* Codex Quota + Cognitive + Pipeline Widget */}
<div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
  <ErrorBoundary><CodexQuota /></ErrorBoundary>
  <ErrorBoundary><CognitiveWidget delay={0.05} /></ErrorBoundary>
  <div className="lg:col-span-2">
    <ErrorBoundary><PipelineWidget delay={0} /></ErrorBoundary>
  </div>
</div>
```

- [ ] **Step 3: Verify in dev server**

```bash
cd /Users/quark/projects/quark-mission-control
npx next dev --turbopack
# Open http://localhost:3000 in browser
# Expected: Cognitive Health widget visible in bottom grid row
# Shows 3 indicators (Memory, Proactivity, Identity) with status dots
# Click navigates to /cognitive (404 for now — that's expected)
```

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/cognitive-widget.tsx src/app/page.tsx
git commit -m "feat: add cognitive health widget to dashboard home"
```

---

### Task 9: Extend degradation banner

**Files:**
- Modify: `/Users/quark/projects/quark-mission-control/src/components/dashboard/degradation-banner.tsx`

- [ ] **Step 1: Add cognitive data fetching and rendering**

Replace the full content of `src/components/dashboard/degradation-banner.tsx`:

```typescript
"use client";

import Link from "next/link";
import { useApi } from "@/hooks/use-api";
import { AlertTriangle, Shield, Brain } from "lucide-react";
import type { MetricsData, CognitiveData } from "@/lib/parsers/types";

export function DegradationBanner() {
  const { data: metricsData } = useApi<MetricsData>("/api/metrics", {
    snapshotKey: "metrics",
    refreshOn: ["metrics"],
  });
  const { data: cogData } = useApi<CognitiveData>("/api/cognitive", {
    snapshotKey: "cognitive",
    refreshOn: ["metrics"],
  });

  const opsNormal = !metricsData || metricsData.degradationStatus === "NORMAL";
  const cogFlags = cogData?.activeDegradation ?? [];
  const hasCognitive = cogFlags.length > 0;

  if (opsNormal && !hasCognitive) return null;

  return (
    <div className="mb-4 space-y-2">
      {!opsNormal && (
        <div className="px-4 py-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center gap-3">
          {metricsData!.degradationStatus === "DEGRADED" ? (
            <AlertTriangle size={18} className="text-[#F59E0B]" />
          ) : (
            <Shield size={18} className="text-[#EF4444]" />
          )}
          <span className="text-sm">
            System is in{" "}
            <strong className="text-[#F59E0B]">{metricsData!.degradationStatus}</strong> mode
          </span>
        </div>
      )}

      {hasCognitive && (
        <Link href="/cognitive">
          <div className="px-4 py-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center gap-3 hover:bg-[#F59E0B]/15 transition-colors cursor-pointer">
            <Brain size={18} className="text-[#F59E0B]" />
            <span className="text-sm">
              <strong className="text-[#F59E0B]">Cognitive:</strong>{" "}
              <span className="text-[#94A3B8]">
                {cogFlags
                  .map((f) =>
                    f
                      .replace(/_/g, " ")
                      .replace(/(\d+)d$/, "$1 days")
                      .replace(/^tier1 oversize:/, "Oversize: ")
                  )
                  .join(" | ")}
              </span>
            </span>
          </div>
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run dev server, check dashboard with seed data that has degradation flags. The cognitive banner line should appear below the ops banner (if any) with a brain icon and formatted flag text. Clicking it should navigate to `/cognitive`.

- [ ] **Step 3: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/components/dashboard/degradation-banner.tsx
git commit -m "feat: extend degradation banner with cognitive flags"
```

---

### Task 10: Add Cognitive to sidebar with warning dot

**Requires:** Task 7 must be committed first — `cognitiveDegradation` must exist in the dashboard store.

**Files:**
- Modify: `/Users/quark/projects/quark-mission-control/src/components/ui/status-dot.tsx`
- Modify: `/Users/quark/projects/quark-mission-control/src/components/ui/sidebar.tsx`

- [ ] **Step 0: Fix StatusDot pulse guard to support warning/error**

In `src/components/ui/status-dot.tsx`, the `pulse` animation only fires for `"ok"` and `"active"` statuses. We need it to also work for `"warning"` and `"error"`.

Replace the pulse condition:
```typescript
      {pulse && (status === "ok" || status === "active") && (
```

With:
```typescript
      {pulse && (
```

This allows pulse on any status. The visual effect is correct — `animate-ping` uses the status color.

- [ ] **Step 1: Add Brain import and nav item**

In `src/components/ui/sidebar.tsx`, add `Brain` to the lucide-react import (alongside existing `BrainCircuit`):

```typescript
import {
  // ... existing imports
  Brain,
  BrainCircuit,
} from "lucide-react";
```

Add to `navItems` array, after the Metrics entry (`{ href: "/metrics-page", ... }`):

```typescript
{ href: "/cognitive", label: "Cognitive", icon: Brain },
```

- [ ] **Step 2: Add warning dot for degradation**

In the `Sidebar` component function, add store read:

```typescript
const cognitiveDegradation = useDashboardStore((s) => s.cognitiveDegradation);
```

In the nav item render loop, after `<span>{item.label}</span>`, add a conditional warning dot:

```typescript
{item.href === "/cognitive" && cognitiveDegradation.length > 0 && (
  <span className="ml-auto">
    <StatusDot status="warning" size="sm" pulse />
  </span>
)}
```

The `"warning"` status renders as amber (#F59E0B). `pulse` adds the pulsing animation (enabled by Step 0's StatusDot fix).

- [ ] **Step 3: Verify**

Run dev server. Check sidebar — "Cognitive" should appear after "Metrics" with a Brain icon. When seed data has degradation flags, an amber pulsing dot should appear next to the label.

- [ ] **Step 4: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/components/ui/sidebar.tsx src/components/ui/status-dot.tsx
git commit -m "feat: add Cognitive nav item to sidebar with degradation dot"
```

---

## Chunk 3: Dedicated `/cognitive` Page (4 Zones)

### Task 11: Create degradation alert component (Zone 1)

**Files:**
- Create: `/Users/quark/projects/quark-mission-control/src/components/cognitive/degradation-alert.tsx`

**Design direction:** A full-width alert bar with a neural-circuit motif. Amber background gradient with subtle animated scan line. Each flag shows its persistence count. The bar feels like a system warning from a sci-fi command bridge — urgent but composed.

- [ ] **Step 1: Create component**

Create `src/components/cognitive/degradation-alert.tsx`:

```typescript
"use client";

import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import type { CognitiveDay } from "@/lib/parsers/types";

interface DegradationAlertProps {
  current: CognitiveDay;
  history: CognitiveDay[];
}

function getFlagLabel(flag: string): string {
  const labels: Record<string, string> = {
    journal_operational_3d: "Journal operational (not reflective)",
    kb_stale_5d: "Knowledge-base not updated",
    user_md_stale_7d: "USER.md stale",
    zero_proactive_3d: "Zero proactive actions",
  };
  if (flag.startsWith("tier1_oversize:")) {
    const file = flag.split(":")[1];
    return `Tier 1 oversize: ${file}`;
  }
  return labels[flag] || flag.replace(/_/g, " ");
}

function getPersistenceCount(flag: string, history: CognitiveDay[]): number {
  let count = 0;
  for (const day of history) {
    if (day.degradationFlags.includes(flag)) {
      count++;
    } else {
      break; // Stop at first day without the flag (history is newest-first)
    }
  }
  return count;
}

export function DegradationAlert({ current, history }: DegradationAlertProps) {
  if (current.degradationFlags.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#F59E0B]/15 via-[#F59E0B]/10 to-[#F59E0B]/15 border border-[#F59E0B]/25 px-5 py-4 mb-6"
    >
      {/* Animated scan line — uses Framer Motion instead of style jsx (not available in this project) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#F59E0B]/40 to-transparent"
          animate={{ y: [0, 60, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
        />
      </div>

      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
        <div className="space-y-1.5">
          <div className="text-sm font-medium text-[#FCD34D]">Cognitive Drift Detected</div>
          <div className="space-y-1">
            {current.degradationFlags.map((flag) => {
              const count = getPersistenceCount(flag, history);
              return (
                <div key={flag} className="flex items-center gap-2 text-xs">
                  <span className="text-[#F1F5F9]">{getFlagLabel(flag)}</span>
                  {count > 1 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#FCD34D]">
                      {count} days
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/components/cognitive/degradation-alert.tsx
git commit -m "feat: add cognitive degradation alert component (Zone 1)"
```

---

### Task 12: Create cognitive scorecards component (Zone 2)

**Files:**
- Create: `/Users/quark/projects/quark-mission-control/src/components/cognitive/cognitive-scorecards.tsx`

**Design direction:** Three GlassCards with a data-dense, mission-critical feel. Each card has a subtle top-border accent color (cyan for memory, purple for proactivity, emerald for engagement). Gauges for ratio/rate metrics. Tier 1 file sizes rendered as slim horizontal progress bars with a red danger zone.

- [ ] **Step 1: Create component**

Create `src/components/cognitive/cognitive-scorecards.tsx`:

```typescript
"use client";

import type { ReactNode } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Gauge } from "@/components/ui/gauge";
import { Database, Zap, MessageCircle } from "lucide-react";
import type { CognitiveDay } from "@/lib/parsers/types";

interface ScorecardsProps {
  current: CognitiveDay;
}

const TIER1_MAX = 18000;

function StaleBadge({ days, warnAt, badAt }: { days: number; warnAt: number; badAt: number }) {
  const color =
    days >= badAt ? "text-[#EF4444] bg-[#EF4444]/10" :
    days >= warnAt ? "text-[#F59E0B] bg-[#F59E0B]/10" :
    "text-[#10B981] bg-[#10B981]/10";
  const label = days === 0 ? "today" : `${days}d ago`;
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${color}`}>{label}</span>;
}

function MetricRow({ label, value, extra }: { label: string; value: ReactNode; extra?: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <span className="text-[11px] text-[#94A3B8]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#F1F5F9] font-medium">{value}</span>
        {extra}
      </div>
    </div>
  );
}

function FileSizeBar({ name, size }: { name: string; size: number }) {
  const pct = Math.min(100, (size / TIER1_MAX) * 100);
  const color = pct >= 100 ? "#EF4444" : pct >= 80 ? "#F59E0B" : "#00D4AA";
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[10px] text-[#94A3B8] w-24 truncate">{name}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[9px] text-[#94A3B8] w-10 text-right">{(size / 1000).toFixed(1)}K</span>
    </div>
  );
}

export function CognitiveScorecards({ current }: ScorecardsProps) {
  const mh = current.memoryHealth;
  const p = current.proactivity;
  const e = current.engagement;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {/* Memory Health */}
      <GlassCard delay={0.05} className="border-t-2 border-t-[#00D4AA]/50">
        <div className="flex items-center gap-2 mb-3">
          <Database size={16} className="text-[#00D4AA]" />
          <h3 className="text-sm font-medium">Memory Health</h3>
        </div>

        <MetricRow label="Knowledge Base" value={`${mh.kbFileCount} files`} extra={
          <span className="text-[10px] text-[#94A3B8]">{mh.kbUpdatedToday} today</span>
        } />
        <MetricRow label="Journal" value={`${mh.journalWordCount} words`} extra={
          <span className={`text-[10px] ${mh.journalReflective ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
            {mh.journalReflective ? "✓ reflective" : "⚠ operational"}
          </span>
        } />
        <MetricRow label="USER.md" value={<StaleBadge days={mh.userMdStaleDays} warnAt={5} badAt={7} />} />
        <MetricRow label="IDENTITY.md" value={<StaleBadge days={mh.identityMdStaleDays} warnAt={5} badAt={7} />} />
        <MetricRow label="MEMORY.md" value={`${mh.memoryMdLineCount} lines`} />
        <MetricRow label="Promoted" value={mh.captureQueuePromoted} />

        <div className="mt-3 pt-2 border-t border-white/5">
          <div className="text-[10px] text-[#94A3B8] mb-1">Tier 1 File Sizes</div>
          {Object.entries(current.tier1FileSizes).map(([name, size]) => (
            <FileSizeBar key={name} name={name} size={size} />
          ))}
        </div>
      </GlassCard>

      {/* Proactivity */}
      <GlassCard delay={0.1} className="border-t-2 border-t-[#7C3AED]/50">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-[#7C3AED]" />
          <h3 className="text-sm font-medium">Proactivity</h3>
        </div>

        <div className="flex justify-center mb-4">
          <Gauge
            value={Math.round(p.ratio * 100)}
            max={100}
            size={80}
            color={p.ratio >= 0.3 ? "#10B981" : p.ratio >= 0.15 ? "#F59E0B" : "#EF4444"}
            label="Pro/React"
          />
        </div>

        <MetricRow label="Surprise Me" value={p.surpriseMeSent} />
        <MetricRow label="Curiosity Questions" value={p.curiosityQuestions} />
        <MetricRow label="Social Engagements" value={p.socialEngagements} />
        <MetricRow label="Comment Replies" value={p.commentReplies} />
        <MetricRow label="Proactive / Reactive" value={`${p.proactiveTotal} / ${p.reactiveTotal}`} />
      </GlassCard>

      {/* Engagement */}
      <GlassCard delay={0.15} className="border-t-2 border-t-[#10B981]/50">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle size={16} className="text-[#10B981]" />
          <h3 className="text-sm font-medium">Engagement</h3>
        </div>

        <div className="flex justify-center mb-4">
          <Gauge
            value={Math.round(e.replyRate * 100)}
            max={100}
            size={80}
            color={e.replyRate >= 0.5 ? "#10B981" : e.replyRate >= 0.3 ? "#F59E0B" : "#EF4444"}
            label="Reply Rate"
          />
        </div>

        <div className="text-[10px] text-[#94A3B8] mb-2">
          {e.totalReplied} / {e.totalReceived} comments replied
        </div>

        <MetricRow label="X" value={e.xReplies} />
        <MetricRow label="TikTok" value={e.tiktokReplies} />
        <MetricRow label="YouTube" value={e.youtubeReplies} />
        <MetricRow label="Instagram" value={e.instagramReplies} />
        <MetricRow label="Substack" value={e.substackReplies} />
      </GlassCard>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/components/cognitive/cognitive-scorecards.tsx
git commit -m "feat: add cognitive scorecards component (Zone 2)"
```

---

### Task 13: Create trend charts component (Zone 3)

**Files:**
- Create: `/Users/quark/projects/quark-mission-control/src/components/cognitive/trend-charts.tsx`

**Design direction:** Two Recharts side by side. Clean, dark-themed with the Cinematic Ops palette. Dashed threshold reference lines add the "system monitoring" feel. Smooth animations on data load.

**Reference:** Recharts 3.7 is installed. Check existing usage patterns in the codebase — if none, follow Recharts docs for `LineChart`, `BarChart`, `ResponsiveContainer`.

- [ ] **Step 1: Create component**

Create `src/components/cognitive/trend-charts.tsx`:

```typescript
"use client";

import { GlassCard } from "@/components/ui/glass-card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { CognitiveDay } from "@/lib/parsers/types";

interface TrendChartsProps {
  history: CognitiveDay[];
}

const CHART_COLORS = {
  journalWords: "#00D4AA",
  proactivityRatio: "#7C3AED",
  x: "#1DA1F2",
  tiktok: "#FF0050",
  youtube: "#FF0000",
  instagram: "#C13584",
  substack: "#FF6719",
  grid: "#1E293B",
  threshold: "#F59E0B",
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0A0A0F]/95 border border-white/10 rounded-lg px-3 py-2 text-xs">
      <div className="text-[#94A3B8] mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[#F1F5F9]">{p.name}: {typeof p.value === "number" ? p.value.toFixed(p.name.includes("Ratio") ? 2 : 0) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendCharts({ history }: TrendChartsProps) {
  // Take last 7 days, reverse to chronological order
  const last7 = history.slice(0, 7).reverse();

  const lineData = last7.map((d) => ({
    date: d.date.slice(5), // "03-14"
    "Journal Words": d.memoryHealth.journalWordCount,
    "Proactivity Ratio": d.proactivity.ratio,
  }));

  const barData = last7.map((d) => ({
    date: d.date.slice(5),
    X: d.engagement.xReplies,
    TikTok: d.engagement.tiktokReplies,
    YouTube: d.engagement.youtubeReplies,
    Instagram: d.engagement.instagramReplies,
    Substack: d.engagement.substackReplies,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Journal & Proactivity Trends */}
      <GlassCard delay={0.2}>
        <h3 className="text-sm font-medium mb-4">Journal & Proactivity — 7 Day</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} />
            <YAxis yAxisId="words" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} width={35} />
            <YAxis yAxisId="ratio" orientation="right" domain={[0, 1]} tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} width={35} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine yAxisId="words" y={200} stroke={CHART_COLORS.threshold} strokeDasharray="4 4" strokeWidth={1} />
            <ReferenceLine yAxisId="ratio" y={0.2} stroke={CHART_COLORS.threshold} strokeDasharray="4 4" strokeWidth={1} />
            <Line
              yAxisId="words"
              type="monotone"
              dataKey="Journal Words"
              stroke={CHART_COLORS.journalWords}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.journalWords, r: 3 }}
              animationDuration={800}
            />
            <Line
              yAxisId="ratio"
              type="monotone"
              dataKey="Proactivity Ratio"
              stroke={CHART_COLORS.proactivityRatio}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.proactivityRatio, r: 3 }}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-4 mt-2 text-[9px] text-[#94A3B8]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-0.5 rounded" style={{ backgroundColor: CHART_COLORS.journalWords }} />
            Words
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-0.5 rounded" style={{ backgroundColor: CHART_COLORS.proactivityRatio }} />
            Ratio
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0 border-t border-dashed" style={{ borderColor: CHART_COLORS.threshold }} />
            Threshold
          </div>
        </div>
      </GlassCard>

      {/* Engagement by Platform */}
      <GlassCard delay={0.25}>
        <h3 className="text-sm font-medium mb-4">Engagement by Platform — 7 Day</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} />
            <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={false} width={25} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="X" stackId="a" fill={CHART_COLORS.x} animationDuration={800} />
            <Bar dataKey="TikTok" stackId="a" fill={CHART_COLORS.tiktok} animationDuration={800} />
            <Bar dataKey="YouTube" stackId="a" fill={CHART_COLORS.youtube} animationDuration={800} />
            <Bar dataKey="Instagram" stackId="a" fill={CHART_COLORS.instagram} animationDuration={800} />
            <Bar dataKey="Substack" stackId="a" fill={CHART_COLORS.substack} radius={[2, 2, 0, 0]} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-3 mt-2 text-[9px] text-[#94A3B8]">
          {[
            { label: "X", color: CHART_COLORS.x },
            { label: "TikTok", color: CHART_COLORS.tiktok },
            { label: "YT", color: CHART_COLORS.youtube },
            { label: "IG", color: CHART_COLORS.instagram },
            { label: "Sub", color: CHART_COLORS.substack },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/components/cognitive/trend-charts.tsx
git commit -m "feat: add cognitive trend charts component (Zone 3)"
```

---

### Task 14: Create history table component (Zone 4)

**Files:**
- Create: `/Users/quark/projects/quark-mission-control/src/components/cognitive/history-table.tsx`

**Design direction:** Dark table with expandable rows. Weekly rollups as primary rows with a chevron toggle. Expanded state reveals daily breakdown in a nested sub-table. Color-coded cells for health status. The most recent Friday row shows Identity Evolution details.

- [ ] **Step 1: Create component**

Create `src/components/cognitive/history-table.tsx`:

```typescript
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { getISOWeek } from "@/lib/utils";
import type { CognitiveDay, WeeklyRollup } from "@/lib/parsers/types";

interface HistoryTableProps {
  weeklyRollups: WeeklyRollup[];
  history: CognitiveDay[];
}

function cellColor(value: number, warn: number, bad: number, inverse = false): string {
  if (inverse) {
    return value <= bad ? "text-[#EF4444]" : value <= warn ? "text-[#F59E0B]" : "text-[#10B981]";
  }
  return value >= bad ? "text-[#EF4444]" : value >= warn ? "text-[#F59E0B]" : "text-[#10B981]";
}

function getWeekDays(weekLabel: string, history: CognitiveDay[]): CognitiveDay[] {
  // Extract week start/end from label like "W11 (Mar 10–16)"
  // Match days in history that fall within this week
  // Simple approach: use the getWeekLabel utility to match
  return history.filter((d) => {
    // Import would create circular dep — compute inline
    const date = new Date(d.date + "T12:00:00");
    const dayOfWeek = date.getDay() || 7;
    const monday = new Date(date);
    monday.setDate(date.getDate() - dayOfWeek + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const startLabel = `${months[monday.getMonth()]} ${monday.getDate()}`;
    const endLabel = `${months[sunday.getMonth()]} ${sunday.getDate()}`;
    const wn = getISOWeek(d.date);
    const label = `W${wn} (${startLabel}\u2013${endLabel})`;
    return label === weekLabel;
  });
}

function WeekRow({ rollup, history }: { rollup: WeeklyRollup; history: CognitiveDay[] }) {
  const [expanded, setExpanded] = useState(false);
  const days = expanded ? getWeekDays(rollup.weekLabel, history) : [];

  return (
    <>
      <tr
        className="hover:bg-white/[0.02] cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-3 px-2">
          <div className="flex items-center gap-1.5">
            {expanded ? (
              <ChevronDown size={14} className="text-[#94A3B8]" />
            ) : (
              <ChevronRight size={14} className="text-[#94A3B8]" />
            )}
            <span className="text-[#F1F5F9] text-xs">{rollup.weekLabel}</span>
          </div>
        </td>
        <td className={`py-3 px-2 text-xs ${cellColor(rollup.avgJournalWords, 300, 200, true)}`}>
          {rollup.avgJournalWords}
        </td>
        <td className={`py-3 px-2 text-xs ${cellColor(rollup.avgProactivityRatio, 0.2, 0.15, true)}`}>
          {rollup.avgProactivityRatio.toFixed(2)}
        </td>
        <td className="py-3 px-2 text-xs text-[#F1F5F9]">{rollup.totalSocialEngagements}</td>
        <td className={`py-3 px-2 text-xs ${cellColor(rollup.avgReplyRate, 0.4, 0.3, true)}`}>
          {(rollup.avgReplyRate * 100).toFixed(0)}%
        </td>
        <td className="py-3 px-2 text-xs text-[#F1F5F9]">{rollup.kbFilesAdded}</td>
        <td className={`py-3 px-2 text-xs ${cellColor(rollup.degradationDays, 2, 3)}`}>
          {rollup.degradationDays}
        </td>
      </tr>

      {/* Identity Evolution (if available) */}
      {rollup.identityEvolution && (
        <tr className="border-b border-white/5">
          <td colSpan={7} className="py-2 px-8">
            <div className="flex items-center gap-4 text-[10px] text-[#94A3B8]">
              <span>Identity:</span>
              <span>KB +{rollup.identityEvolution.kbDiffCreated} / ∆{rollup.identityEvolution.kbDiffUpdated}</span>
              <span>USER.md {rollup.identityEvolution.userMdChanged ? "✓ changed" : "unchanged"}</span>
              <span>Journal quality {rollup.identityEvolution.journalReflectivePct}%</span>
              <span>ID stale {rollup.identityEvolution.identityMdStaleDays}d</span>
            </div>
          </td>
        </tr>
      )}

      {/* Expanded daily rows */}
      {expanded && days.map((day) => (
        <tr key={day.date} className="bg-white/[0.01] border-b border-white/[0.03]">
          <td className="py-2 px-2 pl-8 text-[10px] text-[#94A3B8]">{day.date}</td>
          <td className="py-2 px-2 text-[10px] text-[#94A3B8]">{day.memoryHealth.journalWordCount}</td>
          <td className="py-2 px-2 text-[10px] text-[#94A3B8]">{day.proactivity.ratio.toFixed(2)}</td>
          <td className="py-2 px-2 text-[10px] text-[#94A3B8]">{day.proactivity.socialEngagements}</td>
          <td className="py-2 px-2 text-[10px] text-[#94A3B8]">{(day.engagement.replyRate * 100).toFixed(0)}%</td>
          <td className="py-2 px-2 text-[10px] text-[#94A3B8]">{day.memoryHealth.kbUpdatedToday}</td>
          <td className="py-2 px-2 text-[10px] text-[#94A3B8]">
            {day.degradationFlags.length > 0 ? (
              <span className="text-[#F59E0B]">{day.degradationFlags.length} flags</span>
            ) : "—"}
          </td>
        </tr>
      ))}
    </>
  );
}

export function HistoryTable({ weeklyRollups, history }: HistoryTableProps) {
  return (
    <GlassCard delay={0.3}>
      <h3 className="text-sm font-medium mb-4">30-Day History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#94A3B8] text-[10px] border-b border-white/10">
              <th className="pb-2 px-2 font-medium">Week</th>
              <th className="pb-2 px-2 font-medium">Avg Journal</th>
              <th className="pb-2 px-2 font-medium">Avg Pro/React</th>
              <th className="pb-2 px-2 font-medium">Social</th>
              <th className="pb-2 px-2 font-medium">Reply Rate</th>
              <th className="pb-2 px-2 font-medium">KB Added</th>
              <th className="pb-2 px-2 font-medium">Deg. Days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {weeklyRollups.map((rollup) => (
              <WeekRow key={rollup.weekLabel} rollup={rollup} history={history} />
            ))}
          </tbody>
        </table>
      </div>
      {weeklyRollups.length === 0 && (
        <div className="text-center text-xs text-[#94A3B8] py-8">
          No historical data yet. Chandler will populate this over time.
        </div>
      )}
    </GlassCard>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/components/cognitive/history-table.tsx
git commit -m "feat: add cognitive history table with expandable weeks (Zone 4)"
```

---

### Task 15: Create the dedicated `/cognitive` page

**Files:**
- Create: `/Users/quark/projects/quark-mission-control/src/app/cognitive/page.tsx`

**Design direction:** The page ties all four zones together. A subtle animated background gradient (very dark, almost imperceptible) gives it a living-system feel distinct from other pages. The page header uses the Brain icon with a status summary line.

- [ ] **Step 1: Create page**

Create `src/app/cognitive/page.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { Brain } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { GlassCard } from "@/components/ui/glass-card";
import { useApi } from "@/hooks/use-api";
import { useDashboardStore } from "@/stores/dashboard";
import { DegradationAlert } from "@/components/cognitive/degradation-alert";
import { CognitiveScorecards } from "@/components/cognitive/cognitive-scorecards";
import { TrendCharts } from "@/components/cognitive/trend-charts";
import { HistoryTable } from "@/components/cognitive/history-table";
import type { CognitiveData } from "@/lib/parsers/types";

export default function CognitivePage() {
  const { data, loading } = useApi<CognitiveData>("/api/cognitive", {
    snapshotKey: "cognitive",
    refreshOn: ["metrics"],
  });

  // Sync degradation flags to store (sidebar dot works even without visiting dashboard home)
  const setCognitiveDegradation = useDashboardStore((s) => s.setCognitiveDegradation);
  useEffect(() => {
    if (data?.activeDegradation) setCognitiveDegradation(data.activeDegradation);
  }, [data?.activeDegradation, setCognitiveDegradation]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <Brain size={24} className="text-[#00D4AA]" />
            Cognitive Health
          </h1>
          <p className="text-sm text-[#94A3B8] mt-1">
            {data?.current
              ? `Last collected: ${new Date(data.current.collectedAt).toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" })}`
              : "Loading..."}
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <GlassCard key={i}>
                <div className="animate-pulse h-24 bg-white/5 rounded" />
              </GlassCard>
            ))}
          </div>
        ) : !data?.current ? (
          <GlassCard>
            <div className="text-center py-12">
              <Brain size={40} className="text-[#94A3B8]/30 mx-auto mb-4" />
              <p className="text-sm text-[#94A3B8]">No cognitive data yet.</p>
              <p className="text-xs text-[#94A3B8]/60 mt-1">
                Chandler will start writing metrics/cognitive/ JSON files during daily runs.
              </p>
            </div>
          </GlassCard>
        ) : (
          <>
            {/* Zone 1: Degradation Alert */}
            <ErrorBoundary>
              <DegradationAlert current={data.current} history={data.history} />
            </ErrorBoundary>

            {/* Zone 2: Today's Snapshot */}
            <ErrorBoundary>
              <CognitiveScorecards current={data.current} />
            </ErrorBoundary>

            {/* Zone 3: 7-Day Trends */}
            {data.history.length >= 2 && (
              <ErrorBoundary>
                <TrendCharts history={data.history} />
              </ErrorBoundary>
            )}

            {/* Zone 4: 30-Day History */}
            {data.weeklyRollups.length > 0 && (
              <ErrorBoundary>
                <HistoryTable weeklyRollups={data.weeklyRollups} history={data.history} />
              </ErrorBoundary>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify full page**

```bash
cd /Users/quark/projects/quark-mission-control
npx next dev --turbopack
# Open http://localhost:3000/cognitive
# Expected:
# - Page header with Brain icon and "Cognitive Health"
# - If seed data exists: 4 zones rendered (alert bar if flags present, 3 scorecards, trend charts, history table)
# - If no data: empty state with "No cognitive data yet"
# - Sidebar shows "Cognitive" with Brain icon
# - Dashboard home shows cognitive widget in bottom grid
# - Degradation banner shows cognitive flags if present
```

- [ ] **Step 3: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/app/cognitive/page.tsx
git commit -m "feat: add dedicated /cognitive page with all 4 zones"
```

---

### Task 16: Final verification and polish

- [ ] **Step 1: Build check**

```bash
cd /Users/quark/projects/quark-mission-control
npx next build 2>&1 | tail -20
# Expected: Build succeeds with no errors
```

- [ ] **Step 2: End-to-end verification**

Run dev server and verify all integration points:

1. **Dashboard home** (`/`) — CognitiveWidget shows 3 indicators with status dots
2. **DegradationBanner** — cognitive flags appear when seed data has them
3. **Sidebar** — "Cognitive" nav item with Brain icon, amber dot when degradation active
4. **`/cognitive` page** — all 4 zones render with seed data
5. **API** — `curl http://localhost:3000/api/cognitive` returns valid JSON
6. **Snapshot** — `curl http://localhost:3000/api/snapshot` includes `cognitive` key
7. **Click-through** — widget and banner link to `/cognitive`

- [ ] **Step 3: Commit any polish fixes**

```bash
git add -A
git commit -m "fix: cognitive dashboard polish and integration fixes"
```

- [ ] **Step 4: Final commit — update workspace memory**

```bash
cd ~/.openclaw/workspace
git add .agents/chandler/instructions.md metrics/cognitive/
git commit -m "feat: Chandler cognitive JSON sidecar + seed data for Mission Control"
```
