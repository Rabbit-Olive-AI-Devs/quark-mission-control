# Social Engagement Dashboard — Design Spec

**Date:** 2026-03-14
**Author:** Oracle (Claude Code) + Thiago
**Status:** Approved
**App:** Quark Mission Control (Next.js 16, React 19, TailwindCSS 4, Recharts, Framer Motion, Zustand)

## Problem

Quark now has real, auditable social engagement tooling (x-engage.sh, yt-engage.py, check-guardrails.mjs) logging every action to `engagement-audit.jsonl`. But there's no way to visualize this data — no dashboard showing what Quark is doing socially, what's being missed, or what's getting blocked by guardrails. The engagement system was built because unanswered mentions were going unnoticed, yet there's still no UI to surface that gap.

## Solution

Add a `/engagement` page to Mission Control with an alert-first layout: unanswered mentions surface at the top, followed by today's scorecard, 7-day trends, guardrail block details, and a filterable action feed. A compact widget on the home dashboard and a sidebar indicator provide at-a-glance status.

## Data Architecture

### Primary Data Source

`~/.openclaw/workspace/content-engine/state/engagement-audit.jsonl` — every engagement action logged with:

```json
{
  "timestamp": "2026-03-14T23:55:12Z",
  "platform": "x",
  "action": "like",
  "target_id": "2032888849190297757",
  "target_author": "",
  "autonomous": true,
  "guardrail_result": "pass",
  "source": "manual"
}
```

**Field notes:**
- `target_author` — may be empty string for some actions (likes without context). Display `target_id` as fallback.
- `text` — only present on reply/comment actions. Absent on likes/follows/retweets. Parser treats missing field as empty string.
- `guardrail_result` — `"pass"` for allowed actions. For blocked actions, the value IS the reason: `"sensitive_topic"`, `"rate_limit"`, `"blocked_handle"`, `"length_limit"`. Parser extracts blocks by filtering `guardrail_result !== "pass"`.

Actions: like, unlike, reply, retweet, unretweet, follow, unfollow, delete, bookmark, comment, subscribe.
Platforms: x, youtube, instagram, tiktok, substack.
Unmapped actions (unlike, unretweet, unfollow, delete) use the fallback "other" color (#94A3B8).

### Secondary Data Sources

- **`engagement-mode.json`** — current mode (autonomous / approval_required)
- **`metrics/cognitive/*.json`** — Chandler's daily summaries with per-platform `totalReceived`, `totalReplied`, `replyRate` for inbound gap tracking

### Inbound Gap Data

Chandler's daily cognitive JSON tracks received vs replied per platform. The engagement dashboard reads the **most recent** cognitive file for inbound gap data.

**Computation:**
- `unansweredCount = totalReceived - totalReplied` (derived, not a stored field)
- `replyRate = totalReplied / totalReceived` (already in cognitive JSON)
- `byPlatform` — per-platform received/replied from cognitive JSON engagement breakdown

**Staleness handling:** If no cognitive file exists for today, use the most recent file. Show a staleness indicator in Zone 1: "Data from Mar 13" next to the gap count. The outbound action feed from `engagement-audit.jsonl` is always real-time.

**`oldestUnansweredAge`:** Dropped from the interface — this requires per-mention tracking that doesn't exist in the cognitive aggregates. The unanswered count is sufficient for the alert.

### API Route

`/api/engagement` returns:

```typescript
interface EngagementData {
  actions: EngagementAction[];       // last 200 entries from audit JSONL
  today: {
    total: number;
    byAction: Record<string, number>;  // like: 12, reply: 3, follow: 2...
    byPlatform: Record<string, number>; // x: 15, youtube: 2...
  };
  trends: DailyAggregate[];          // last 7 days, each with counts by platform and action
  guardrailBlocks: GuardrailBlock[]; // blocked actions with reasons
  inboundGap: {
    totalReceived: number;
    totalReplied: number;
    replyRate: number;
    byPlatform: Record<string, { received: number; replied: number }>;
    unansweredCount: number;          // totalReceived - totalReplied
    dataDate: string;                  // date of cognitive file used (staleness indicator)
  };
  mode: "autonomous" | "approval_required";
}

interface EngagementAction {
  timestamp: string;
  platform: string;
  action: string;
  targetId: string;
  targetAuthor: string;
  text: string;
  autonomous: boolean;
  guardrailResult: string;
  source: string;
}

interface DailyAggregate {
  date: string;
  total: number;
  byPlatform: Record<string, number>;
  byAction: Record<string, number>;
  blocks: number;
}

interface GuardrailBlock {
  timestamp: string;
  platform: string;
  action: string;
  reason: string;
  targetAuthor?: string;
}
```

**Snapshot integration:** `snapshotKey: "engagement"` for Vercel remote mode. Import `parseEngagement` in `/api/snapshot/route.ts` and add `engagement: parseEngagement()` to the snapshot object.

**Hook usage:** `useApi<EngagementData>("/api/engagement", { snapshotKey: "engagement", refreshOn: ["engagement"] })`

### Parser

`src/lib/parsers/engagement.ts` — reads `engagement-audit.jsonl` (last 200 lines for performance), aggregates by day/platform/action, extracts guardrail blocks (entries where `guardrail_result` is not "pass"), reads `engagement-mode.json`, reads latest `metrics/cognitive/*.json` for inbound gap.

## Page Layout — Alert-First

### Zone 1: Unanswered Alert Banner

Amber banner — only renders when `inboundGap.unansweredCount > 0`. Shows:
- Total unanswered count
- Per-platform breakdown (e.g., "X: 2 unanswered · TikTok: 1 unanswered")
- Staleness indicator if data is not from today (e.g., "Data from Mar 13")

Same visual pattern as `DegradationAlert` in the Cognitive page — amber background, warning icon, border. Not dismissable (persists until resolved).

### Zone 2: Engagement Scorecard (4 cards)

Horizontal row of glassmorphic stat cards:

| Card | Value | Color | Detail |
|------|-------|-------|--------|
| Actions Today | `today.total` | Cyan (#00D4AA) | Tooltip/subtitle: breakdown by action type |
| Reply Rate | `inboundGap.replyRate` | Green (>=0.5) / Amber (>=0.3) / Red (<0.3) | Circular gauge (SVG, same as Cognitive) |
| Platforms Active | Count of platforms with actions today | Platform color dots | Shows which platforms had engagement |
| Guardrail Blocks | Count of today's blocks | Red (#EF4444) if >0, muted if 0 | Links to Zone 4 on click |

### Zone 3: 7-Day Trend Charts (2 charts, side by side)

Both use Recharts `ResponsiveContainer` + `BarChart` with dark grid styling matching existing charts.

**Left — Engagement Volume by Platform:**
Stacked bar chart, one bar per day, stacked by platform:
- X: #1DA1F2
- TikTok: #FF0050
- YouTube: #FF0000
- Instagram: #C13584
- Substack: #FF6719

(Same platform colors used in Cognitive trend charts.)

**Right — Action Type Breakdown:**
Stacked bar chart, one bar per day, stacked by action type:
- like: #00D4AA (cyan)
- reply: #7C3AED (purple)
- retweet: #1DA1F2 (blue)
- follow: #10B981 (green)
- bookmark: #F59E0B (amber)
- other: #94A3B8 (muted)

### Zone 4: Guardrail Blocks (dedicated section)

GlassCard with:
- **Header:** "Guardrail Blocks" with shield icon
- **Block list:** Each blocked action shown as a row — timestamp, platform icon, action attempted, reason badge (sensitive_topic, rate_limit, blocked_handle, length_limit)
- **Reason summary:** Grouped count by reason (e.g., "sensitive_topic: 2, rate_limit: 1")
- **7-day sparkline:** Mini line chart showing blocks per day over last 7 days — helps spot trends (are we blocking more? guardrails need tuning?)
- **Empty state:** "No blocks recorded" with checkmark icon when no blocks exist

### Zone 5: Action Feed (full width)

GlassCard with:
- **Header:** "Action Feed" with activity icon
- **Filter pills:** All | X | TikTok | YouTube | Instagram | Substack (horizontal, scrollable on mobile). Plus action type filter: All | Likes | Replies | Retweets | Follows
- **Table columns:** Time (relative, e.g., "2m ago"), Platform (icon + color dot), Action (badge), Target (@handle if available, otherwise truncated target_id), Text (for replies/comments only — truncated with expand), Result (pass/blocked badge)
- **Sort:** Newest first
- **Pagination:** Client-side — API returns up to 200 entries, UI shows 50 at a time with "Load more" button (not infinite scroll — keeps DOM manageable)

## Dashboard Widget

Compact card on the home page (`/`), placed in the bottom row alongside Codex Quota, Cognitive Widget, and Pipeline Widget.

Contents:
- **Today's action count** (number)
- **Reply rate** (percentage with color)
- **Unanswered count** (with warning color if >0)
- **Engagement mode** badge (autonomous = green, approval_required = amber)
- **Link** to `/engagement`

## Sidebar Integration

- "Engagement" nav item with `MessageCircle` icon (Lucide)
- Pulsing amber dot when `inboundGap.unansweredCount > 0` (synced via Zustand store, same pattern as cognitive degradation dot)
- Store field: `engagementUnanswered: number` with setter `setEngagementUnanswered(count)`

## Mobile Responsiveness

All zones must work on mobile with no horizontal scrolling:

| Zone | Desktop | Mobile |
|------|---------|--------|
| Zone 1 (Alert) | Full-width banner | Full-width, text wraps |
| Zone 2 (Scorecard) | 4-column grid | 2x2 grid |
| Zone 3 (Charts) | Side-by-side | Stacked vertically |
| Zone 4 (Guardrails) | Table rows | Compact card per block |
| Zone 5 (Action Feed) | Table with columns | Card list, truncated fields, expand-on-tap |
| Filter pills | Inline | Horizontal scroll |
| Dashboard widget | Grid item | Full-width card |

## Platform Colors (constants)

```typescript
const PLATFORM_COLORS = {
  x: "#1DA1F2",
  tiktok: "#FF0050",
  youtube: "#FF0000",
  instagram: "#C13584",
  substack: "#FF6719",
};

const ACTION_COLORS = {
  like: "#00D4AA",
  reply: "#7C3AED",
  retweet: "#1DA1F2",
  follow: "#10B981",
  bookmark: "#F59E0B",
  comment: "#7C3AED",
  subscribe: "#10B981",
};
```

## Files Created

| File | Purpose |
|------|---------|
| `src/lib/parsers/engagement.ts` | Parse engagement-audit.jsonl, engagement-mode.json, cognitive data |
| `src/app/api/engagement/route.ts` | API endpoint returning EngagementData |
| `src/app/engagement/page.tsx` | Engagement dashboard page (5 zones) |
| `src/components/engagement/unanswered-alert.tsx` | Zone 1: amber banner for unanswered mentions |
| `src/components/engagement/engagement-scorecards.tsx` | Zone 2: 4-card stat row |
| `src/components/engagement/trend-charts.tsx` | Zone 3: 7-day platform + action charts |
| `src/components/engagement/guardrail-blocks.tsx` | Zone 4: block list + sparkline |
| `src/components/engagement/action-feed.tsx` | Zone 5: filterable action table |
| `src/components/dashboard/engagement-widget.tsx` | Home dashboard compact widget |

## Files Modified

| File | Change |
|------|--------|
| `src/lib/parsers/types.ts` | Add EngagementData, EngagementAction, DailyAggregate, GuardrailBlock interfaces |
| `src/stores/dashboard.ts` | Add engagementUnanswered field + setter |
| `src/components/layout/app-shell.tsx` | Add Engagement sidebar item with amber dot |
| `src/app/page.tsx` | Add engagement widget to bottom row |
| `src/app/api/snapshot/route.ts` | Add "engagement" key to snapshot response |

## NOT in Scope

- **Real-time inbound gap** — would require calling bird CLI / browser tools from the frontend. Use Chandler's daily cognitive data instead.
- **Engagement action buttons** — the dashboard is read-only. No "like this tweet" buttons.
- **Historical data beyond 200 entries** — audit JSONL is rotated monthly. Parser reads last 200 lines for performance.
- **Per-post engagement analytics** — which posts got the most engagement. Future project, depends on data accumulation.
