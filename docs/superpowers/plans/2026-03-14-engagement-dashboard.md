# Social Engagement Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/engagement` page to Mission Control showing social engagement actions, inbound gap tracking, guardrail blocks, and 7-day trends.

**Architecture:** New parser reads `engagement-audit.jsonl` + `engagement-mode.json` + latest cognitive JSON for inbound gap data. API route serves parsed data. Page renders 5 zones (alert-first layout). Dashboard widget + sidebar amber dot for at-a-glance status.

**Tech Stack:** Next.js 16, React 19, TypeScript, TailwindCSS 4, Recharts, Framer Motion, Zustand, Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-14-engagement-dashboard-design.md`

**Codebase:** `/Users/quark/projects/quark-mission-control`

---

## File Structure

### Created
| File | Purpose |
|------|---------|
| `src/lib/parsers/engagement.ts` | Parse engagement-audit.jsonl, engagement-mode.json, cognitive data for inbound gap |
| `src/app/api/engagement/route.ts` | API endpoint returning EngagementData |
| `src/app/engagement/page.tsx` | Engagement page with 5 zones |
| `src/components/engagement/unanswered-alert.tsx` | Zone 1: amber alert banner |
| `src/components/engagement/engagement-scorecards.tsx` | Zone 2: 4-card stat row |
| `src/components/engagement/trend-charts.tsx` | Zone 3: 7-day charts |
| `src/components/engagement/guardrail-blocks.tsx` | Zone 4: block details + sparkline |
| `src/components/engagement/action-feed.tsx` | Zone 5: filterable action table |
| `src/components/dashboard/engagement-widget.tsx` | Dashboard compact widget |

### Modified
| File | Change |
|------|--------|
| `src/lib/parsers/types.ts` | Add engagement interfaces |
| `src/stores/dashboard.ts` | Add engagementUnanswered state |
| `src/components/ui/sidebar.tsx` | Add Engagement nav item + amber dot |
| `src/app/page.tsx` | Add engagement widget to bottom row |
| `src/app/api/snapshot/route.ts` | Add engagement key |

---

## Chunk 1: Data Layer

### Task 1: Add TypeScript Interfaces

**Files:**
- Modify: `src/lib/parsers/types.ts`

- [ ] **Step 1: Add engagement type interfaces to types.ts**

Append after the `CognitiveData` interface (after line 310):

```typescript
// --- Social Engagement Dashboard ---

export interface EngagementAction {
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

export interface DailyAggregate {
  date: string;
  total: number;
  byPlatform: Record<string, number>;
  byAction: Record<string, number>;
  blocks: number;
}

export interface GuardrailBlock {
  timestamp: string;
  platform: string;
  action: string;
  reason: string;
  targetAuthor?: string;
}

export interface InboundGap {
  totalReceived: number;
  totalReplied: number;
  replyRate: number;
  byPlatform: Record<string, { received: number; replied: number }>;
  unansweredCount: number;
  dataDate: string;
}

export interface EngagementData {
  actions: EngagementAction[];
  today: {
    total: number;
    byAction: Record<string, number>;
    byPlatform: Record<string, number>;
  };
  trends: DailyAggregate[];
  guardrailBlocks: GuardrailBlock[];
  inboundGap: InboundGap;
  mode: "autonomous" | "approval_required";
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to engagement types

- [ ] **Step 3: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/lib/parsers/types.ts
git commit -m "feat(engagement): add TypeScript interfaces for engagement dashboard"
```

---

### Task 2: Engagement Parser

**Files:**
- Create: `src/lib/parsers/engagement.ts`

**Reference files:**
- `src/lib/parsers/cognitive.ts` — pattern for reading JSON files from workspace, aggregation
- `src/lib/config.ts` — WORKSPACE_PATH
- `src/lib/parsers/types.ts` — interfaces just added

- [ ] **Step 1: Create the parser**

```typescript
import * as fs from "fs";
import * as path from "path";
import { WORKSPACE_PATH } from "../config";
import type {
  EngagementAction,
  EngagementData,
  DailyAggregate,
  GuardrailBlock,
  InboundGap,
} from "./types";

const AUDIT_PATH = path.join(WORKSPACE_PATH, "content-engine/state/engagement-audit.jsonl");
const MODE_PATH = path.join(WORKSPACE_PATH, "content-engine/state/engagement-mode.json");
const COGNITIVE_DIR = path.join(WORKSPACE_PATH, "metrics/cognitive");
const MAX_LINES = 200;

function readLastLines(filePath: string, max: number): string[] {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    return lines.slice(-max);
  } catch {
    return [];
  }
}

function parseAuditLine(line: string): EngagementAction | null {
  try {
    const d = JSON.parse(line);
    return {
      timestamp: d.timestamp ?? "",
      platform: d.platform ?? "",
      action: d.action ?? "",
      targetId: d.target_id ?? "",
      targetAuthor: d.target_author ?? "",
      text: d.text ?? "",
      autonomous: d.autonomous ?? true,
      guardrailResult: d.guardrail_result ?? "pass",
      source: d.source ?? "",
    };
  } catch {
    return null;
  }
}

function getTodayStr(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

function computeToday(actions: EngagementAction[]): EngagementData["today"] {
  const todayStr = getTodayStr();
  const todayActions = actions.filter((a) => a.timestamp.startsWith(todayStr));

  const byAction: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};

  for (const a of todayActions) {
    byAction[a.action] = (byAction[a.action] ?? 0) + 1;
    byPlatform[a.platform] = (byPlatform[a.platform] ?? 0) + 1;
  }

  return { total: todayActions.length, byAction, byPlatform };
}

function computeTrends(actions: EngagementAction[]): DailyAggregate[] {
  const dayMap = new Map<string, EngagementAction[]>();

  for (const a of actions) {
    const date = a.timestamp.slice(0, 10);
    if (!dayMap.has(date)) dayMap.set(date, []);
    dayMap.get(date)!.push(a);
  }

  const sorted = [...dayMap.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);

  return sorted.map(([date, dayActions]) => {
    const byPlatform: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    let blocks = 0;

    for (const a of dayActions) {
      byPlatform[a.platform] = (byPlatform[a.platform] ?? 0) + 1;
      byAction[a.action] = (byAction[a.action] ?? 0) + 1;
      if (a.guardrailResult !== "pass") blocks++;
    }

    return { date, total: dayActions.length, byPlatform, byAction, blocks };
  }).reverse();
}

function extractBlocks(actions: EngagementAction[]): GuardrailBlock[] {
  return actions
    .filter((a) => a.guardrailResult !== "pass")
    .map((a) => ({
      timestamp: a.timestamp,
      platform: a.platform,
      action: a.action,
      reason: a.guardrailResult,
      targetAuthor: a.targetAuthor || undefined,
    }));
}

function readEngagementMode(): "autonomous" | "approval_required" {
  try {
    const raw = fs.readFileSync(MODE_PATH, "utf-8");
    const data = JSON.parse(raw);
    return data.mode === "approval_required" ? "approval_required" : "autonomous";
  } catch {
    return "autonomous";
  }
}

function readInboundGap(): InboundGap {
  const empty: InboundGap = {
    totalReceived: 0,
    totalReplied: 0,
    replyRate: 0,
    byPlatform: {},
    unansweredCount: 0,
    dataDate: "",
  };

  try {
    const files = fs
      .readdirSync(COGNITIVE_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) return empty;

    const latest = fs.readFileSync(path.join(COGNITIVE_DIR, files[0]), "utf-8");
    const data = JSON.parse(latest);
    const e = data.engagement || {};
    const date = data.date || files[0].replace(".json", "");

    const totalReceived = e.total_received ?? 0;
    const totalReplied = e.total_replied ?? 0;

    const byPlatform: Record<string, { received: number; replied: number }> = {};
    const platforms = ["x", "tiktok", "youtube", "instagram", "substack"];
    for (const p of platforms) {
      const replied = e[`${p}_replies`] ?? 0;
      // Cognitive JSON tracks replies per platform, not received per platform.
      // We only have aggregate received. Distribute proportionally or show replies only.
      byPlatform[p] = { received: 0, replied };
    }

    return {
      totalReceived,
      totalReplied,
      replyRate: e.reply_rate ?? (totalReceived > 0 ? totalReplied / totalReceived : 0),
      byPlatform,
      unansweredCount: Math.max(0, totalReceived - totalReplied),
      dataDate: date,
    };
  } catch {
    return empty;
  }
}

export function parseEngagement(): EngagementData {
  const lines = readLastLines(AUDIT_PATH, MAX_LINES);
  const actions: EngagementAction[] = [];
  for (const line of lines) {
    const a = parseAuditLine(line);
    if (a) actions.push(a);
  }

  // Sort newest first for display
  actions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return {
    actions,
    today: computeToday(actions),
    trends: computeTrends(actions),
    guardrailBlocks: extractBlocks(actions),
    inboundGap: readInboundGap(),
    mode: readEngagementMode(),
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/lib/parsers/engagement.ts
git commit -m "feat(engagement): add engagement audit parser"
```

---

### Task 3: API Route + Snapshot Integration

**Files:**
- Create: `src/app/api/engagement/route.ts`
- Modify: `src/app/api/snapshot/route.ts`

**Reference:** `src/app/api/cognitive/route.ts` (3-line pattern with isRemote + getSnapshotSection)

- [ ] **Step 1: Create the API route**

```typescript
import { NextResponse } from "next/server";
import { parseEngagement } from "@/lib/parsers/engagement";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("engagement");
    if (data) return NextResponse.json(data);
  }
  return NextResponse.json(parseEngagement());
}
```

- [ ] **Step 2: Add engagement to snapshot route**

In `src/app/api/snapshot/route.ts`:

Add import at top (after line 16):
```typescript
import { parseEngagement } from "@/lib/parsers/engagement";
```

Add to snapshot object (after line 76, the `cognitive: parseCognitive(),` line):
```typescript
    engagement: parseEngagement(),
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Test the API endpoint**

Run: `cd /Users/quark/projects/quark-mission-control && npx next build 2>&1 | tail -5`

Then start dev server and test:
Run: `curl -s http://localhost:3000/api/engagement | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log('actions:', d.actions.length, 'mode:', d.mode, 'today:', d.today.total)"`
Expected: `actions: 2 mode: autonomous today: 2` (or similar based on current audit log)

- [ ] **Step 5: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/app/api/engagement/route.ts src/app/api/snapshot/route.ts
git commit -m "feat(engagement): add API route and snapshot integration"
```

---

## Chunk 2: Page Components (Zones 1-3)

### Task 4: Engagement Constants

**Files:**
- Create: `src/lib/engagement-constants.ts`

These constants are shared across multiple engagement components (charts, feed, widgets). Same pattern as `src/lib/pipeline-constants.ts`.

- [ ] **Step 1: Create constants file**

```typescript
export const PLATFORM_COLORS: Record<string, string> = {
  x: "#1DA1F2",
  tiktok: "#FF0050",
  youtube: "#FF0000",
  instagram: "#C13584",
  substack: "#FF6719",
};

export const ACTION_COLORS: Record<string, string> = {
  like: "#00D4AA",
  reply: "#7C3AED",
  retweet: "#1DA1F2",
  follow: "#10B981",
  bookmark: "#F59E0B",
  comment: "#7C3AED",
  subscribe: "#10B981",
};

export const PLATFORM_LABELS: Record<string, string> = {
  x: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
  instagram: "Instagram",
  substack: "Substack",
};

export function getPlatformColor(platform: string): string {
  return PLATFORM_COLORS[platform] ?? "#94A3B8";
}

export function getActionColor(action: string): string {
  return ACTION_COLORS[action] ?? "#94A3B8";
}

export function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/lib/engagement-constants.ts
git commit -m "feat(engagement): add shared platform/action color constants"
```

---

### Task 5: Zone 1 — Unanswered Alert Banner

**Files:**
- Create: `src/components/engagement/unanswered-alert.tsx`

**Reference:** `src/components/cognitive/degradation-alert.tsx` (amber banner pattern with motion animation)

- [ ] **Step 1: Create the alert component**

```tsx
"use client";

import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { InboundGap } from "@/lib/parsers/types";
import { PLATFORM_LABELS } from "@/lib/engagement-constants";

interface Props {
  inboundGap: InboundGap;
}

export function UnansweredAlert({ inboundGap }: Props) {
  if (inboundGap.unansweredCount <= 0) return null;

  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  const isStale = inboundGap.dataDate !== todayStr;

  // Build per-platform breakdown from byPlatform replied counts
  const platformGaps = Object.entries(inboundGap.byPlatform)
    .filter(([, v]) => v.received > v.replied)
    .map(([p, v]) => `${PLATFORM_LABELS[p] ?? p}: ${v.received - v.replied}`)
    .join(" · ");

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 relative overflow-hidden rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-4"
    >
      {/* Scan line */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-[#F59E0B]/20 to-transparent animate-[shimmer_3s_ease-in-out_infinite] top-0" />
      </div>

      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-[#F59E0B] mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-[#F59E0B]">
            {inboundGap.unansweredCount} unanswered mention{inboundGap.unansweredCount !== 1 ? "s" : ""}
          </p>
          {platformGaps && (
            <p className="text-xs text-[#F1F5F9]/70 mt-1">{platformGaps}</p>
          )}
          {isStale && (
            <p className="text-xs text-[#94A3B8] mt-1">
              Data from {new Date(inboundGap.dataDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/components/engagement/unanswered-alert.tsx
git commit -m "feat(engagement): add unanswered alert banner (Zone 1)"
```

---

### Task 6: Zone 2 — Engagement Scorecards

**Files:**
- Create: `src/components/engagement/engagement-scorecards.tsx`

**Reference:** `src/components/cognitive/cognitive-scorecards.tsx` (GlassCard grid, gauge pattern)

- [ ] **Step 1: Create the scorecards component**

```tsx
"use client";

import { motion } from "framer-motion";
import { Heart, MessageCircle, Globe, ShieldAlert } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import type { EngagementData } from "@/lib/parsers/types";
import { getPlatformColor, PLATFORM_LABELS } from "@/lib/engagement-constants";

interface Props {
  data: EngagementData;
}

function Gauge({ value, max = 1, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(value / max, 1);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <svg width="68" height="68" viewBox="0 0 68 68" className="mx-auto">
      <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" />
      <circle
        cx="34"
        cy="34"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 34 34)"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x="34" y="38" textAnchor="middle" fill="#F1F5F9" fontSize="14" fontWeight="600">
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}

export function EngagementScorecards({ data }: Props) {
  const { today, inboundGap, guardrailBlocks } = data;

  const replyColor =
    inboundGap.replyRate >= 0.5 ? "#10B981" : inboundGap.replyRate >= 0.3 ? "#F59E0B" : "#EF4444";

  const activePlatforms = Object.keys(today.byPlatform);
  const todayBlocks = guardrailBlocks.filter((b) => {
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
    return b.timestamp.startsWith(todayStr);
  }).length;

  const actionBreakdown = Object.entries(today.byAction)
    .map(([k, v]) => `${v} ${k}${v !== 1 ? "s" : ""}`)
    .join(", ");

  const cards = [
    {
      icon: Heart,
      label: "Actions Today",
      value: String(today.total),
      color: "#00D4AA",
      detail: actionBreakdown || "No actions yet",
    },
    {
      icon: MessageCircle,
      label: "Reply Rate",
      value: null, // uses gauge
      color: replyColor,
      detail: `${inboundGap.totalReplied}/${inboundGap.totalReceived} replied`,
    },
    {
      icon: Globe,
      label: "Platforms Active",
      value: String(activePlatforms.length),
      color: "#00D4AA",
      detail: null, // uses dots
    },
    {
      icon: ShieldAlert,
      label: "Blocked",
      value: String(todayBlocks),
      color: todayBlocks > 0 ? "#EF4444" : "#94A3B8",
      detail: todayBlocks > 0 ? "guardrail blocks today" : "no blocks",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <card.icon size={14} style={{ color: card.color }} />
              <span className="text-xs text-[#94A3B8]">{card.label}</span>
            </div>

            {card.label === "Reply Rate" ? (
              <Gauge value={inboundGap.replyRate} color={replyColor} />
            ) : card.label === "Platforms Active" ? (
              <div className="text-center">
                <div className="text-2xl font-bold text-[#F1F5F9] mb-2">{card.value}</div>
                <div className="flex justify-center gap-1.5">
                  {["x", "tiktok", "youtube", "instagram", "substack"].map((p) => (
                    <span
                      key={p}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: activePlatforms.includes(p) ? getPlatformColor(p) : "rgba(255,255,255,0.1)",
                      }}
                      title={PLATFORM_LABELS[p]}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-2xl font-bold text-[#F1F5F9]" style={{ color: card.color }}>
                  {card.value}
                </div>
              </div>
            )}

            {card.detail && (
              <p className="text-[10px] text-[#94A3B8] text-center mt-2 truncate">{card.detail}</p>
            )}
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/components/engagement/engagement-scorecards.tsx
git commit -m "feat(engagement): add engagement scorecards (Zone 2)"
```

---

### Task 7: Zone 3 — 7-Day Trend Charts

**Files:**
- Create: `src/components/engagement/trend-charts.tsx`

**Reference:** `src/components/cognitive/trend-charts.tsx` (Recharts BarChart with dark grid, platform colors, custom tooltip)

- [ ] **Step 1: Create the trend charts component**

```tsx
"use client";

import { GlassCard } from "@/components/ui/glass-card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { DailyAggregate } from "@/lib/parsers/types";
import { PLATFORM_COLORS, ACTION_COLORS, PLATFORM_LABELS } from "@/lib/engagement-constants";

interface Props {
  trends: DailyAggregate[];
}

const GRID_COLOR = "rgba(255,255,255,0.05)";
const AXIS_COLOR = "#94A3B8";

function formatDate(date: string): string {
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="glass-card p-3 text-xs border border-white/10">
      <p className="text-[#F1F5F9] font-medium mb-1">{label}</p>
      {payload.filter((p) => p.value > 0).map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-[#94A3B8]">{p.name}:</span>
          <span className="text-[#F1F5F9]">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendCharts({ trends }: Props) {
  if (trends.length < 2) return null;

  // Build platform chart data
  const allPlatforms = new Set<string>();
  const allActions = new Set<string>();
  for (const t of trends) {
    Object.keys(t.byPlatform).forEach((p) => allPlatforms.add(p));
    Object.keys(t.byAction).forEach((a) => allActions.add(a));
  }

  const platformData = trends.map((t) => ({
    date: formatDate(t.date),
    ...Object.fromEntries([...allPlatforms].map((p) => [p, t.byPlatform[p] ?? 0])),
  }));

  const actionData = trends.map((t) => ({
    date: formatDate(t.date),
    ...Object.fromEntries([...allActions].map((a) => [a, t.byAction[a] ?? 0])),
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <GlassCard>
        <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
          Volume by Platform
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={platformData}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis dataKey="date" tick={{ fill: AXIS_COLOR, fontSize: 10 }} />
            <YAxis tick={{ fill: AXIS_COLOR, fontSize: 10 }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            {[...allPlatforms].map((p) => (
              <Bar
                key={p}
                dataKey={p}
                name={PLATFORM_LABELS[p] ?? p}
                stackId="platform"
                fill={PLATFORM_COLORS[p] ?? "#94A3B8"}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
          Action Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={actionData}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
            <XAxis dataKey="date" tick={{ fill: AXIS_COLOR, fontSize: 10 }} />
            <YAxis tick={{ fill: AXIS_COLOR, fontSize: 10 }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            {[...allActions].map((a) => (
              <Bar
                key={a}
                dataKey={a}
                name={a}
                stackId="action"
                fill={ACTION_COLORS[a] ?? "#94A3B8"}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/components/engagement/trend-charts.tsx
git commit -m "feat(engagement): add 7-day trend charts (Zone 3)"
```

---

## Chunk 3: Page Components (Zones 4-5) + Store + Page

### Task 8: Zustand Store Update

**Files:**
- Modify: `src/stores/dashboard.ts`

This must be done before the engagement page (Task 11) because the page and widget both reference `setEngagementUnanswered` from the store.

- [ ] **Step 1: Add engagement state to store**

Add to the `DashboardState` interface (after the `setCognitiveDegradation` line):

```typescript
  // Engagement
  engagementUnanswered: number;
  setEngagementUnanswered: (count: number) => void;
```

Add to the `create` initializer (after the `setCognitiveDegradation` line):

```typescript
  engagementUnanswered: 0,
  setEngagementUnanswered: (count) => set({ engagementUnanswered: count }),
```

- [ ] **Step 2: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/stores/dashboard.ts
git commit -m "feat(engagement): add engagementUnanswered to Zustand store"
```

---

### Task 9: Zone 4 — Guardrail Blocks

**Files:**
- Create: `src/components/engagement/guardrail-blocks.tsx`

- [ ] **Step 1: Create the guardrail blocks component**

```tsx
"use client";

import { Shield, CheckCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import type { GuardrailBlock, DailyAggregate } from "@/lib/parsers/types";
import { getPlatformColor, PLATFORM_LABELS, formatTimeAgo } from "@/lib/engagement-constants";

interface Props {
  blocks: GuardrailBlock[];
  trends: DailyAggregate[];
}

const REASON_LABELS: Record<string, string> = {
  sensitive_topic: "Sensitive Topic",
  rate_limit: "Rate Limit",
  blocked_handle: "Blocked Handle",
  length_limit: "Length Limit",
};

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 120;
  const h = 24;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`)
    .join(" ");

  return (
    <svg width={w} height={h} className="inline-block ml-2">
      <polyline
        points={points}
        fill="none"
        stroke="#EF4444"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GuardrailBlocks({ blocks, trends }: Props) {
  // Group by reason
  const reasonCounts: Record<string, number> = {};
  for (const b of blocks) {
    reasonCounts[b.reason] = (reasonCounts[b.reason] ?? 0) + 1;
  }

  // Sparkline data from trends
  const sparkData = trends.map((t) => t.blocks);

  return (
    <GlassCard className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-[#EF4444]" />
          <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider">
            Guardrail Blocks
          </h3>
        </div>
        {sparkData.length >= 2 && <Sparkline data={sparkData} />}
      </div>

      {blocks.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-[#94A3B8] py-4 justify-center">
          <CheckCircle size={16} className="text-[#10B981]" />
          No blocks recorded
        </div>
      ) : (
        <>
          {/* Reason summary */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(reasonCounts).map(([reason, count]) => (
              <span
                key={reason}
                className="px-2 py-1 rounded-full text-[10px] font-medium bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20"
              >
                {REASON_LABELS[reason] ?? reason}: {count}
              </span>
            ))}
          </div>

          {/* Block list */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {blocks.map((b, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-xs p-2 rounded-lg bg-white/[0.02] border border-white/5 md:flex-row flex-col md:text-left text-center"
              >
                <span className="text-[#94A3B8] shrink-0">{formatTimeAgo(b.timestamp)}</span>
                <span
                  className="w-2 h-2 rounded-full shrink-0 hidden md:block"
                  style={{ backgroundColor: getPlatformColor(b.platform) }}
                />
                <span className="text-[#F1F5F9] shrink-0">{PLATFORM_LABELS[b.platform] ?? b.platform}</span>
                <span className="text-[#94A3B8]">{b.action}</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#EF4444]/10 text-[#EF4444]">
                  {REASON_LABELS[b.reason] ?? b.reason}
                </span>
                {b.targetAuthor && (
                  <span className="text-[#94A3B8] ml-auto hidden md:inline">{b.targetAuthor}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </GlassCard>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/components/engagement/guardrail-blocks.tsx
git commit -m "feat(engagement): add guardrail blocks section (Zone 4)"
```

---

### Task 10: Zone 5 — Action Feed

**Files:**
- Create: `src/components/engagement/action-feed.tsx`

- [ ] **Step 1: Create the action feed component**

```tsx
"use client";

import { useState } from "react";
import { Activity } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import type { EngagementAction } from "@/lib/parsers/types";
import {
  getPlatformColor,
  getActionColor,
  PLATFORM_LABELS,
  formatTimeAgo,
} from "@/lib/engagement-constants";

interface Props {
  actions: EngagementAction[];
}

const PAGE_SIZE = 50;

const ALL_PLATFORMS = ["x", "tiktok", "youtube", "instagram", "substack"];

export function ActionFeed({ actions }: Props) {
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = actions.filter((a) => {
    if (platformFilter && a.platform !== platformFilter) return false;
    if (actionFilter && a.action !== actionFilter) return false;
    return true;
  });

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Collect unique action types from data
  const actionTypes = [...new Set(actions.map((a) => a.action))];

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <Activity size={16} className="text-[#00D4AA]" />
        <h3 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider">
          Action Feed
        </h3>
        <span className="text-xs text-[#94A3B8] ml-auto">{filtered.length} actions</span>
      </div>

      {/* Platform filters */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        <FilterPill
          label="All"
          active={platformFilter === null}
          onClick={() => setPlatformFilter(null)}
        />
        {ALL_PLATFORMS.map((p) => (
          <FilterPill
            key={p}
            label={PLATFORM_LABELS[p] ?? p}
            active={platformFilter === p}
            color={getPlatformColor(p)}
            onClick={() => setPlatformFilter(platformFilter === p ? null : p)}
          />
        ))}
      </div>

      {/* Action type filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <FilterPill
          label="All Types"
          active={actionFilter === null}
          onClick={() => setActionFilter(null)}
        />
        {actionTypes.map((a) => (
          <FilterPill
            key={a}
            label={a}
            active={actionFilter === a}
            color={getActionColor(a)}
            onClick={() => setActionFilter(actionFilter === a ? null : a)}
          />
        ))}
      </div>

      {/* Action list */}
      {visible.length === 0 ? (
        <p className="text-sm text-[#94A3B8] text-center py-6">No actions match filters</p>
      ) : (
        <div className="space-y-1.5">
          {visible.map((a, i) => (
            <ActionRow key={`${a.timestamp}-${i}`} action={a} />
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full mt-4 py-2 text-xs text-[#00D4AA] hover:bg-white/5 rounded-lg transition-colors"
        >
          Load more ({filtered.length - visibleCount} remaining)
        </button>
      )}
    </GlassCard>
  );
}

function FilterPill({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors shrink-0"
      style={{
        backgroundColor: active ? (color ? `${color}20` : "rgba(0,212,170,0.15)") : "rgba(255,255,255,0.05)",
        color: active ? (color ?? "#00D4AA") : "#94A3B8",
        borderWidth: 1,
        borderColor: active ? (color ? `${color}40` : "rgba(0,212,170,0.3)") : "rgba(255,255,255,0.08)",
      }}
    >
      {label}
    </button>
  );
}

function ActionRow({ action: a }: { action: EngagementAction }) {
  const [expanded, setExpanded] = useState(false);
  const target = a.targetAuthor || (a.targetId ? a.targetId.slice(0, 12) + "..." : "");

  return (
    <div
      className="flex items-center gap-3 text-xs p-2 rounded-lg bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.04] transition-colors md:flex-row flex-col md:text-left text-center"
      onClick={() => a.text && setExpanded(!expanded)}
    >
      <span className="text-[#94A3B8] w-14 shrink-0 text-right hidden md:block">{formatTimeAgo(a.timestamp)}</span>
      <span className="text-[#94A3B8] md:hidden">{formatTimeAgo(a.timestamp)}</span>
      <span
        className="w-2 h-2 rounded-full shrink-0 hidden md:block"
        style={{ backgroundColor: getPlatformColor(a.platform) }}
      />
      <span className="text-[#F1F5F9] w-16 shrink-0">{PLATFORM_LABELS[a.platform] ?? a.platform}</span>
      <span
        className="px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0"
        style={{ backgroundColor: `${getActionColor(a.action)}15`, color: getActionColor(a.action) }}
      >
        {a.action}
      </span>
      <span className="text-[#94A3B8] truncate flex-1">{target}</span>
      {a.text && !expanded && (
        <span className="text-[#94A3B8]/50 truncate max-w-[200px] hidden md:block">
          {a.text.slice(0, 60)}...
        </span>
      )}
      {a.guardrailResult !== "pass" && (
        <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#EF4444]/10 text-[#EF4444] shrink-0">
          blocked
        </span>
      )}
      {expanded && a.text && (
        <div className="w-full mt-2 p-2 rounded bg-white/[0.03] text-[#F1F5F9] text-xs md:col-span-full">
          {a.text}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/components/engagement/action-feed.tsx
git commit -m "feat(engagement): add filterable action feed (Zone 5)"
```

---

### Task 11: Engagement Page

**Files:**
- Create: `src/app/engagement/page.tsx`

**Reference:** `src/app/cognitive/page.tsx` (zone-based page with useApi, ErrorBoundary, loading/empty states)

- [ ] **Step 1: Create the page**

```tsx
"use client";

import { useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { GlassCard } from "@/components/ui/glass-card";
import { useApi } from "@/hooks/use-api";
import { useDashboardStore } from "@/stores/dashboard";
import { UnansweredAlert } from "@/components/engagement/unanswered-alert";
import { EngagementScorecards } from "@/components/engagement/engagement-scorecards";
import { TrendCharts } from "@/components/engagement/trend-charts";
import { GuardrailBlocks } from "@/components/engagement/guardrail-blocks";
import { ActionFeed } from "@/components/engagement/action-feed";
import type { EngagementData } from "@/lib/parsers/types";

export default function EngagementPage() {
  const { data, loading } = useApi<EngagementData>("/api/engagement", {
    snapshotKey: "engagement",
    refreshOn: ["engagement"],
  });

  const setEngagementUnanswered = useDashboardStore((s) => s.setEngagementUnanswered);
  useEffect(() => {
    if (data?.inboundGap) setEngagementUnanswered(data.inboundGap.unansweredCount);
  }, [data?.inboundGap, setEngagementUnanswered]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <MessageCircle size={24} className="text-[#00D4AA]" />
            <h1 className="text-2xl font-semibold">Social Engagement</h1>
            {data?.mode === "approval_required" && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
                Approval Mode
              </span>
            )}
          </div>
          <p className="text-sm text-[#94A3B8] mt-1">
            {data ? `${data.actions.length} actions tracked · ${data.mode} mode` : "Loading..."}
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
        ) : !data || data.actions.length === 0 ? (
          <GlassCard>
            <div className="text-center py-12">
              <MessageCircle size={40} className="text-[#94A3B8]/30 mx-auto mb-4" />
              <p className="text-sm text-[#94A3B8]">No engagement data yet.</p>
              <p className="text-xs text-[#94A3B8]/60 mt-1">
                Actions will appear here as Quark engages on social platforms.
              </p>
            </div>
          </GlassCard>
        ) : (
          <>
            {/* Zone 1: Unanswered Alert */}
            <ErrorBoundary>
              <UnansweredAlert inboundGap={data.inboundGap} />
            </ErrorBoundary>

            {/* Zone 2: Scorecards */}
            <ErrorBoundary>
              <EngagementScorecards data={data} />
            </ErrorBoundary>

            {/* Zone 3: 7-Day Trends */}
            <ErrorBoundary>
              <TrendCharts trends={data.trends} />
            </ErrorBoundary>

            {/* Zone 4: Guardrail Blocks */}
            <ErrorBoundary>
              <GuardrailBlocks blocks={data.guardrailBlocks} trends={data.trends} />
            </ErrorBoundary>

            {/* Zone 5: Action Feed */}
            <ErrorBoundary>
              <ActionFeed actions={data.actions} />
            </ErrorBoundary>
          </>
        )}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/app/engagement/page.tsx
git commit -m "feat(engagement): add engagement dashboard page with 5 zones"
```

---

## Chunk 4: Integration (Sidebar, Widget, Dashboard)

### Task 12: Sidebar Integration

**Files:**
- Modify: `src/components/ui/sidebar.tsx`

- [ ] **Step 1: Add MessageCircle to icon imports**

In the import from `lucide-react` (line 7-23), add `MessageCircle` to the list.

- [ ] **Step 2: Add Engagement nav item**

In the `navItems` array, add after the Cognitive entry (after line 38):

```typescript
  { href: "/engagement", label: "Engagement", icon: MessageCircle },
```

- [ ] **Step 3: Add engagementUnanswered store subscription**

After `const cognitiveDegradation = useDashboardStore(...)` (line 46), add:

```typescript
  const engagementUnanswered = useDashboardStore((s) => s.engagementUnanswered);
```

- [ ] **Step 4: Add amber dot for engagement**

Inside the nav item render (after the cognitive degradation dot block, around line 133-137), add:

```tsx
                {item.href === "/engagement" && engagementUnanswered > 0 && (
                  <span className="ml-auto">
                    <StatusDot status="warning" size="sm" pulse />
                  </span>
                )}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/components/ui/sidebar.tsx
git commit -m "feat(engagement): add Engagement to sidebar with amber warning dot"
```

---

### Task 13: Dashboard Widget

**Files:**
- Create: `src/components/dashboard/engagement-widget.tsx`

**Reference:** `src/components/dashboard/cognitive-widget.tsx` (compact widget with useApi, StatusDot, CardFooter, Link)

- [ ] **Step 1: Create the widget**

```tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { StatusDot } from "@/components/ui/status-dot";
import { CardFooter } from "@/components/ui/card-footer";
import { useApi } from "@/hooks/use-api";
import { useDashboardStore } from "@/stores/dashboard";
import type { EngagementData } from "@/lib/parsers/types";

export function EngagementWidget({ delay = 0 }: { delay?: number }) {
  const { data, error, lastUpdated, refetch } = useApi<EngagementData>("/api/engagement", {
    snapshotKey: "engagement",
    refreshOn: ["engagement"],
  });

  const setEngagementUnanswered = useDashboardStore((s) => s.setEngagementUnanswered);

  useEffect(() => {
    if (data?.inboundGap) {
      setEngagementUnanswered(data.inboundGap.unansweredCount);
    }
  }, [data?.inboundGap, setEngagementUnanswered]);

  const hasUnanswered = (data?.inboundGap.unansweredCount ?? 0) > 0;

  const replyRate = data?.inboundGap.replyRate ?? 0;
  const replyStatus: "active" | "warning" | "error" =
    replyRate >= 0.5 ? "active" : replyRate >= 0.3 ? "warning" : "error";

  const modeStatus: "active" | "warning" =
    data?.mode === "autonomous" ? "active" : "warning";

  return (
    <GlassCard
      delay={delay}
      className={hasUnanswered ? "ring-1 ring-[#F59E0B]/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : ""}
    >
      <Link href="/engagement" className="block">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle size={16} className="text-[#00D4AA]" />
          <h3 className="text-sm font-medium">Engagement</h3>
        </div>

        {!data ? (
          <div className="animate-pulse h-12 bg-white/5 rounded" />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center text-center gap-1">
              <span className="text-lg font-bold text-[#00D4AA]">{data.today.total}</span>
              <span className="text-[9px] text-[#94A3B8]">Today</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1">
              <StatusDot status={replyStatus} size="sm" pulse={replyStatus === "error"} />
              <span className="text-[10px] text-[#F1F5F9]">{Math.round(replyRate * 100)}%</span>
              <span className="text-[9px] text-[#94A3B8]">Reply Rate</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1">
              {hasUnanswered ? (
                <span className="text-lg font-bold text-[#F59E0B]">{data.inboundGap.unansweredCount}</span>
              ) : (
                <StatusDot status={modeStatus} size="sm" />
              )}
              <span className="text-[9px] text-[#94A3B8]">
                {hasUnanswered ? "Unanswered" : data.mode === "autonomous" ? "Auto" : "Approval"}
              </span>
            </div>
          </div>
        )}
      </Link>

      <CardFooter lastUpdated={lastUpdated} error={error} onRefresh={refetch} />
    </GlassCard>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/components/dashboard/engagement-widget.tsx
git commit -m "feat(engagement): add compact engagement widget for dashboard"
```

---

### Task 14: Add Widget to Dashboard Home

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add import**

After the `CognitiveWidget` import (line 14), add:

```typescript
import { EngagementWidget } from "@/components/dashboard/engagement-widget";
```

- [ ] **Step 2: Add widget to the bottom row**

Change the bottom grid from `lg:grid-cols-4` to `lg:grid-cols-5` and add the engagement widget. Replace the bottom grid section (lines 47-53):

```tsx
        {/* Codex Quota + Cognitive + Engagement + Pipeline Widget */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <ErrorBoundary><CodexQuota /></ErrorBoundary>
          <ErrorBoundary><CognitiveWidget delay={0.05} /></ErrorBoundary>
          <ErrorBoundary><EngagementWidget delay={0.1} /></ErrorBoundary>
          <div className="lg:col-span-2">
            <ErrorBoundary><PipelineWidget delay={0} /></ErrorBoundary>
          </div>
        </div>
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd /Users/quark/projects/quark-mission-control
git add src/app/page.tsx
git commit -m "feat(engagement): add engagement widget to dashboard home"
```

---

### Task 15: Final Verification

- [ ] **Step 1: Full build**

Run: `cd /Users/quark/projects/quark-mission-control && npx next build 2>&1 | tail -20`
Expected: Build succeeds with no errors. The `/engagement` page should appear in the build output.

- [ ] **Step 2: Visual check**

Start dev server: `cd /Users/quark/projects/quark-mission-control && npx next dev`

Verify in browser:
1. `http://localhost:3000` — dashboard home shows engagement widget in bottom row
2. `http://localhost:3000/engagement` — full engagement page with 5 zones
3. Sidebar shows "Engagement" nav item with MessageCircle icon
4. Mobile: resize browser to verify 2x2 scorecard grid, stacked charts, card-based feed

- [ ] **Step 3: API check**

Run: `curl -s http://localhost:3000/api/engagement | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf-8')); console.log(JSON.stringify({actions: d.actions.length, today: d.today.total, mode: d.mode, unanswered: d.inboundGap.unansweredCount, trends: d.trends.length}, null, 2))"`

Expected output showing real data from the engagement audit log.
