# Mission Control Redesign Phase 1 — Status Page + Performance Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current 11-page dashboard with the first page of a 6-page intent-based redesign: the Status page ("any fires?") plus performance foundations that eliminate blank screens and reduce server load.

**Architecture:** Status page shows 5 cards (Pipeline, Cron, Quota, Quark, System) — each green/amber/red at a glance with one-sentence summaries. Cards expand into a sidebar detail panel for investigation. Performance fixes add CDN caching (P1) and IndexedDB client persistence (P2) to eliminate blank screens and reduce Vercel function invocations.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Zustand, Framer Motion, Recharts (sparklines), Vitest

**Spec:** `~/.openclaw/workspace/docs/superpowers/specs/2026-03-18-mc-redesign-research.md`

**Repo:** `/Users/quark/projects/quark-mission-control`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/app/status/page.tsx` | Status page (5 cards + detail panel) |
| `src/app/api/status/route.ts` | Aggregated status endpoint (pipeline, cron, quota, quark, system) |
| `src/components/status/pipeline-card.tsx` | Pipeline status card |
| `src/components/status/cron-card.tsx` | Cron status card |
| `src/components/status/quota-card.tsx` | Quota status card |
| `src/components/status/quark-card.tsx` | Quark health card |
| `src/components/status/system-card.tsx` | System gauges card |
| `src/components/status/detail-panel.tsx` | Slide-out sidebar detail panel |
| `src/components/status/__tests__/status-cards.test.tsx` | Status card tests |
| `src/components/ui/hover-card.tsx` | Reusable metric explanation tooltip |
| `src/components/ui/radial-gauge.tsx` | Radial arc gauge (CPU/Mem/Disk) |
| `src/components/ui/status-sentence.tsx` | Green/amber/red sentence component |
| `src/hooks/use-persisted-snapshot.ts` | IndexedDB client persistence |
| `src/lib/status-logic.ts` | Pure functions: derive card states from raw data |
| `src/lib/__tests__/status-logic.test.ts` | Status logic unit tests |

### Modified Files
| File | Change |
|------|--------|
| `src/app/api/snapshot/route.ts` | Add `CDN-Cache-Control` header (P1) |
| `src/app/api/hash/route.ts` | Add `CDN-Cache-Control` header |
| `src/components/layout/app-shell.tsx` | Wire IndexedDB persistence hook |
| `src/components/ui/sidebar.tsx` | Update nav to 6 pages |
| `src/app/page.tsx` | Redirect `/` to `/status` |
| `src/lib/parsers/types.ts` | Add StatusData interface |

---

## Phase 1 Tasks

### Task 1: Performance P1 — Fix cache headers

**Files:**
- Modify: `src/app/api/snapshot/route.ts`
- Modify: `src/app/api/hash/route.ts`

- [ ] **Step 1: Update snapshot route cache headers**

In `src/app/api/snapshot/route.ts`, find the `return NextResponse.json(result)` at the end of the GET handler. The existing route already computes `const cors = corsHeaders(request)` — the new headers must spread those CORS headers to preserve cross-origin support. Replace with:

```typescript
const cors = corsHeaders(request);
// ... existing logic ...
return NextResponse.json(result, {
  headers: {
    ...cors,
    "CDN-Cache-Control": "s-maxage=15, stale-while-revalidate=45, stale-if-error=3600",
    "Cache-Control": "public, max-age=5",
  },
});
```

Remove `export const dynamic = "force-dynamic"` from the top of the file (it currently exists on line 22).

- [ ] **Step 2: Update hash route cache headers**

In `src/app/api/hash/route.ts`, the existing route also computes `const cors = corsHeaders(request)` — spread those CORS headers. Update the response to include:

```typescript
const cors = corsHeaders(request);
// ... existing logic ...
return NextResponse.json({ hash, timestamp }, {
  headers: {
    ...cors,
    "CDN-Cache-Control": "s-maxage=5, stale-while-revalidate=10",
    "Cache-Control": "public, max-age=2",
  },
});
```

Also remove `export const dynamic = "force-dynamic"` from the top of this file (it currently exists on line 5).

- [ ] **Step 3: Verify build**

Run: `cd /Users/quark/projects/quark-mission-control && npx next build 2>&1 | tail -20`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/snapshot/route.ts src/app/api/hash/route.ts
git commit -m "perf: add CDN cache headers to snapshot and hash endpoints

Replaces no-store with s-maxage=15 + stale-while-revalidate=45 on snapshot,
s-maxage=5 on hash. Reduces MacBook calls from 1/5s/client to 1/15s total.
CDN serves stale data for 1h when MacBook unreachable."
```

---

### Task 2: Performance P2 — IndexedDB client persistence

**Files:**
- Create: `src/hooks/use-persisted-snapshot.ts`
- Modify: `src/stores/dashboard.ts`

- [ ] **Step 1: Create IndexedDB persistence hook**

```typescript
// src/hooks/use-persisted-snapshot.ts
"use client";

const DB_NAME = "qmc-cache";
const STORE_NAME = "snapshots";
const SNAPSHOT_KEY = "latest";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function persistSnapshot(
  data: Record<string, unknown>
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(
      { data, savedAt: Date.now() },
      SNAPSHOT_KEY
    );
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB unavailable (SSR, private browsing) — silently skip
  }
}

export async function loadPersistedSnapshot(): Promise<{
  data: Record<string, unknown>;
  savedAt: number;
} | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(SNAPSHOT_KEY);
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Wire persistence into Zustand store**

In `src/stores/dashboard.ts`, add to the `setSnapshot` action — after the existing state update, call `persistSnapshot`.

**IMPORTANT:** The existing `setSnapshot` signature is `(data: Record<string, unknown>, hash: string)`. Preserve this signature. Also change the store creator from `(set) =>` to `(set, get) =>` so `hydrateFromCache` can access `get()`.

```typescript
// At top of file, add import:
import { persistSnapshot, loadPersistedSnapshot } from "@/hooks/use-persisted-snapshot";

// Change the store creator to include `get`:
export const useDashboardStore = create<DashboardState>((set, get) => ({
  // ... existing state ...

  // Add a new action to the DashboardState interface:
  hydrateFromCache: async () => {
    const cached = await loadPersistedSnapshot();
    if (cached && !get().snapshot) {
      set({
        snapshot: cached.data,
        snapshotFetchedAt: cached.savedAt,
        snapshotStale: true, // Mark as stale until fresh data arrives
      });
    }
  },
```

And in the existing `setSnapshot` action, add `persistSnapshot(data)` AFTER the existing `set()` call — **do NOT change the function signature** (`data, hash`):

```typescript
setSnapshot: (data, hash) => {
  set({ snapshot: data, snapshotHash: hash, snapshotFetchedAt: Date.now(), snapshotStale: false });
  persistSnapshot(data); // Persist to IndexedDB
},
```

- [ ] **Step 3: Call hydrate on app mount**

In `src/components/layout/app-shell.tsx`, add after the existing `useEffect` hooks:

```typescript
const hydrateFromCache = useDashboardStore((s) => s.hydrateFromCache);

useEffect(() => {
  hydrateFromCache();
}, [hydrateFromCache]);
```

- [ ] **Step 4: Verify dev server**

Run: `cd /Users/quark/projects/quark-mission-control && npm run dev`
Open browser, verify dashboard loads. Open DevTools → Application → IndexedDB → `qmc-cache` → `snapshots` → should contain `latest` entry.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-persisted-snapshot.ts src/stores/dashboard.ts src/components/layout/app-shell.tsx
git commit -m "perf: add IndexedDB client persistence for snapshot data

On mount, hydrates from cached snapshot (marked stale) so pages never
show blank screens. Every fresh snapshot is persisted to IndexedDB.
Gracefully degrades in SSR and private browsing."
```

---

### Task 3: Status logic — pure functions

**Files:**
- Create: `src/lib/status-logic.ts`
- Create: `src/lib/__tests__/status-logic.test.ts`
- Modify: `src/lib/parsers/types.ts`

This task creates all the pure business logic for deriving card states from raw data. No UI — just functions and tests.

- [ ] **Step 1: Add StatusData types**

Append to `src/lib/parsers/types.ts`:

```typescript
// === Status Page Types ===

export type StatusLevel = "healthy" | "warning" | "critical";

export interface StatusCard {
  level: StatusLevel;
  sentence: string;
  details: Record<string, unknown>;
}

export interface StatusData {
  pipeline: StatusCard;
  cron: StatusCard;
  quota: StatusCard;
  quark: StatusCard;
  system: StatusCard & {
    cpu: number;
    memory: number;
    disk: number;
  };
  timestamp: string;
}
```

- [ ] **Step 2: Write tests for status derivation**

```typescript
// src/lib/__tests__/status-logic.test.ts
import { describe, it, expect } from "vitest";
import {
  derivePipelineStatus,
  deriveCronStatus,
  deriveQuotaStatus,
  deriveQuarkStatus,
  deriveSystemStatus,
} from "../status-logic";

describe("derivePipelineStatus", () => {
  it("returns healthy when no jobs stuck", () => {
    const result = derivePipelineStatus({
      jobs: [
        { status: "published", updated_at: new Date().toISOString() },
      ],
    });
    expect(result.level).toBe("healthy");
    expect(result.sentence).toContain("on track");
  });

  it("returns warning when a job is stuck >1h at non-approval stage", () => {
    const stuckTime = new Date(Date.now() - 2 * 3600_000).toISOString();
    const result = derivePipelineStatus({
      jobs: [
        { status: "render_pending", updated_at: stuckTime, stage: "L4b" },
      ],
    });
    expect(result.level).toBe("warning");
    expect(result.sentence).toContain("stuck");
  });

  it("ignores preview_sent jobs (awaiting approval is not stuck)", () => {
    const oldTime = new Date(Date.now() - 5 * 3600_000).toISOString();
    const result = derivePipelineStatus({
      jobs: [
        { status: "preview_sent", updated_at: oldTime },
      ],
    });
    expect(result.level).toBe("healthy");
  });
});

describe("deriveCronStatus", () => {
  it("returns healthy when all jobs OK", () => {
    const result = deriveCronStatus({
      jobs: [
        { name: "Morning", status: "ok" },
        { name: "Heartbeat", status: "ok" },
      ],
    });
    expect(result.level).toBe("healthy");
    expect(result.sentence).toContain("healthy");
  });

  it("returns critical when jobs have errors", () => {
    const result = deriveCronStatus({
      jobs: [
        { name: "Morning", status: "ok" },
        { name: "Cassian", status: "error", lastError: "timeout" },
      ],
    });
    expect(result.level).toBe("critical");
    expect(result.sentence).toContain("failed");
    expect(result.sentence).toContain("Cassian");
  });
});

describe("deriveQuotaStatus", () => {
  it("returns healthy above 40%", () => {
    const result = deriveQuotaStatus({ dailyPct: 68, weeklyPct: 55 });
    expect(result.level).toBe("healthy");
  });

  it("returns warning between 20-40%", () => {
    const result = deriveQuotaStatus({ dailyPct: 25, weeklyPct: 55 });
    expect(result.level).toBe("warning");
  });

  it("returns critical below 20%", () => {
    const result = deriveQuotaStatus({ dailyPct: 15, weeklyPct: 10 });
    expect(result.level).toBe("critical");
    expect(result.sentence).toContain("exhausts");
  });
});

describe("deriveQuarkStatus", () => {
  it("returns healthy when recent heartbeat and no failures", () => {
    const recent = new Date(Date.now() - 5 * 60_000).toISOString();
    const result = deriveQuarkStatus({
      lastHeartbeat: recent,
      recentRuns: 14,
      recentFailures: 0,
      windowHours: 6,
    });
    expect(result.level).toBe("healthy");
  });

  it("returns warning when silent >30min", () => {
    const old = new Date(Date.now() - 45 * 60_000).toISOString();
    const result = deriveQuarkStatus({
      lastHeartbeat: old,
      recentRuns: 10,
      recentFailures: 0,
      windowHours: 6,
    });
    expect(result.level).toBe("warning");
    expect(result.sentence).toContain("Silent");
  });
});

describe("deriveSystemStatus", () => {
  it("returns healthy when all metrics below 80%", () => {
    const result = deriveSystemStatus({ cpu: 45, memory: 62, disk: 55 });
    expect(result.level).toBe("healthy");
    expect(result.cpu).toBe(45);
  });

  it("returns warning when any metric above 80%", () => {
    const result = deriveSystemStatus({ cpu: 85, memory: 62, disk: 55 });
    expect(result.level).toBe("warning");
  });

  it("returns critical when any metric above 95%", () => {
    const result = deriveSystemStatus({ cpu: 45, memory: 97, disk: 55 });
    expect(result.level).toBe("critical");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /Users/quark/projects/quark-mission-control && npx vitest run src/lib/__tests__/status-logic.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 4: Implement status logic**

```typescript
// src/lib/status-logic.ts
import type { StatusCard } from "./parsers/types";

// --- Pipeline ---

interface PipelineInput {
  jobs: Array<{
    status: string;
    updated_at: string;
    stage?: string;
  }>;
}

const TERMINAL = new Set(["published", "completed", "killed", "quarantined"]);
const APPROVAL_WAIT = new Set(["preview_sent"]);
const STUCK_THRESHOLD_MS = 3600_000; // 1 hour

export function derivePipelineStatus(input: PipelineInput): StatusCard {
  const active = input.jobs.filter((j) => !TERMINAL.has(j.status));
  const stuck = active.filter((j) => {
    if (APPROVAL_WAIT.has(j.status)) return false;
    const age = Date.now() - new Date(j.updated_at).getTime();
    return age > STUCK_THRESHOLD_MS;
  });

  if (stuck.length > 0) {
    const worst = stuck[0];
    const hours = Math.round(
      (Date.now() - new Date(worst.updated_at).getTime()) / 3600_000
    );
    return {
      level: "warning",
      sentence: `${stuck.length} job${stuck.length > 1 ? "s" : ""} stuck${worst.stage ? ` at ${worst.stage}` : ""} (${hours}h)`,
      details: { stuck, active },
    };
  }

  if (active.length > 0) {
    return {
      level: "healthy",
      sentence: `${active.length} job${active.length > 1 ? "s" : ""} active, on track`,
      details: { active },
    };
  }

  return {
    level: "healthy",
    sentence: "No active jobs",
    details: { active: [] },
  };
}

// --- Cron ---

interface CronInput {
  jobs: Array<{
    name: string;
    status: string;
    lastError?: string;
  }>;
}

export function deriveCronStatus(input: CronInput): StatusCard {
  const failed = input.jobs.filter((j) => j.status === "error");
  const total = input.jobs.length;

  if (failed.length === 0) {
    return {
      level: "healthy",
      sentence: `All ${total} jobs healthy`,
      details: { total, failed: [] },
    };
  }

  const names = failed
    .slice(0, 2)
    .map((j) => j.name)
    .join(", ");
  const extra = failed.length > 2 ? ` +${failed.length - 2} more` : "";

  return {
    level: "critical",
    sentence: `${failed.length}/${total} failed: ${names}${extra}`,
    details: { total, failed },
  };
}

// --- Quota ---

interface QuotaInput {
  dailyPct: number;
  weeklyPct: number;
}

export function deriveQuotaStatus(input: QuotaInput): StatusCard {
  const pct = Math.min(input.dailyPct, input.weeklyPct);

  if (pct > 40) {
    return {
      level: "healthy",
      sentence: `${Math.round(pct)}% remaining, pace normal`,
      details: input,
    };
  }

  if (pct > 20) {
    return {
      level: "warning",
      sentence: `${Math.round(pct)}% remaining — watch usage`,
      details: input,
    };
  }

  // Estimate exhaustion time (rough: if 80% used in ~18h, remaining at same rate)
  const hoursLeft = Math.round((pct / (100 - pct)) * 18);
  return {
    level: "critical",
    sentence: `${Math.round(pct)}% remaining, exhausts in ~${hoursLeft}h`,
    details: { ...input, hoursLeft },
  };
}

// --- Quark ---

interface QuarkInput {
  lastHeartbeat: string;
  recentRuns: number;
  recentFailures: number;
  windowHours: number;
}

export function deriveQuarkStatus(input: QuarkInput): StatusCard {
  const silentMs = Date.now() - new Date(input.lastHeartbeat).getTime();
  const silentMin = Math.round(silentMs / 60_000);
  const okRuns = input.recentRuns - input.recentFailures;

  if (silentMin > 60) {
    return {
      level: "critical",
      sentence: `Silent ${silentMin}min, ${input.recentFailures} failures in last ${input.windowHours}h`,
      details: input,
    };
  }

  if (silentMin > 30 || input.recentFailures >= 3) {
    return {
      level: "warning",
      sentence: `Silent ${silentMin}min, ${okRuns}/${input.recentRuns} runs OK (${input.windowHours}h)`,
      details: input,
    };
  }

  return {
    level: "healthy",
    sentence: `Active, ${okRuns}/${input.recentRuns} runs OK (${input.windowHours}h)`,
    details: input,
  };
}

// --- System ---

interface SystemInput {
  cpu: number;
  memory: number;
  disk: number;
}

export function deriveSystemStatus(
  input: SystemInput
): StatusCard & { cpu: number; memory: number; disk: number } {
  const max = Math.max(input.cpu, input.memory, input.disk);

  let level: "healthy" | "warning" | "critical" = "healthy";
  if (max > 95) level = "critical";
  else if (max > 80) level = "warning";

  return {
    level,
    sentence: `CPU ${input.cpu}% · Mem ${input.memory}% · Disk ${input.disk}%`,
    details: input,
    cpu: input.cpu,
    memory: input.memory,
    disk: input.disk,
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/quark/projects/quark-mission-control && npx vitest run src/lib/__tests__/status-logic.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/status-logic.ts src/lib/__tests__/status-logic.test.ts src/lib/parsers/types.ts
git commit -m "feat(status): add pure status derivation logic with tests

Five derive functions (pipeline, cron, quota, quark, system) that
convert raw parser data into StatusCard (level + sentence + details).
Full test coverage for healthy/warning/critical thresholds."
```

---

### Task 4: Shared UI — RadialGauge + HoverCard + StatusSentence

**Files:**
- Create: `src/components/ui/radial-gauge.tsx`
- Create: `src/components/ui/hover-card.tsx`
- Create: `src/components/ui/status-sentence.tsx`

- [ ] **Step 1: Create RadialGauge component**

```typescript
// src/components/ui/radial-gauge.tsx
"use client";

interface RadialGaugeProps {
  value: number; // 0-100
  size?: number; // px, default 80
  label?: string; // e.g. "CPU"
}

export function RadialGauge({ value, size = 80, label }: RadialGaugeProps) {
  const radius = (size - 12) / 2;
  const circumference = Math.PI * radius; // half-circle
  const offset = circumference - (value / 100) * circumference;

  // Color gradient: cyan → amber → red
  const color =
    value > 95
      ? "#EF4444"
      : value > 80
        ? "#F59E0B"
        : "#00D4AA";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size / 2 + 12}
        viewBox={`0 0 ${size} ${size / 2 + 12}`}
      >
        {/* Background arc */}
        <path
          d={`M 6 ${size / 2 + 6} A ${radius} ${radius} 0 0 1 ${size - 6} ${size / 2 + 6}`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M 6 ${size / 2 + 6} A ${radius} ${radius} 0 0 1 ${size - 6} ${size / 2 + 6}`}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease",
            filter: `drop-shadow(0 0 4px ${color}40)`,
          }}
        />
        {/* Value text */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          className="fill-[#F1F5F9] font-mono text-sm font-bold"
          style={{ fontSize: size / 5 }}
        >
          {Math.round(value)}%
        </text>
      </svg>
      {label && (
        <span className="text-[10px] uppercase tracking-wider text-[#94A3B8]">
          {label}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create HoverCard component**

```typescript
// src/components/ui/hover-card.tsx
"use client";

import { useState, useRef, type ReactNode } from "react";

interface HoverCardProps {
  children: ReactNode;
  content: ReactNode;
}

export function HoverCard({ children, content }: HoverCardProps) {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(null);

  const show = () => {
    if (timeout.current) clearTimeout(timeout.current);
    setOpen(true);
  };
  const hide = () => {
    timeout.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {open && (
        <div
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-white/10 bg-[#12121A] p-3 text-xs text-[#94A3B8] shadow-xl"
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {content}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#12121A]" />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create StatusSentence component**

```typescript
// src/components/ui/status-sentence.tsx
import type { StatusLevel } from "@/lib/parsers/types";

interface StatusSentenceProps {
  level: StatusLevel;
  sentence: string;
}

const DOT_COLORS: Record<StatusLevel, string> = {
  healthy: "bg-emerald-500 shadow-emerald-500/40",
  warning: "bg-amber-500 shadow-amber-500/40",
  critical: "bg-red-500 shadow-red-500/40 animate-pulse",
};

export function StatusSentence({ level, sentence }: StatusSentenceProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full shadow-sm ${DOT_COLORS[level]}`}
      />
      <span className="text-sm text-[#F1F5F9]">{sentence}</span>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `cd /Users/quark/projects/quark-mission-control && npx next build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/radial-gauge.tsx src/components/ui/hover-card.tsx src/components/ui/status-sentence.tsx
git commit -m "feat(ui): add RadialGauge, HoverCard, and StatusSentence components

RadialGauge: half-circle arc with cyan→amber→red gradient.
HoverCard: hover tooltip for metric explanations.
StatusSentence: colored dot + one-line status text."
```

---

### Task 5: Status API endpoint

**Files:**
- Create: `src/app/api/status/route.ts`

- [ ] **Step 1: Create aggregated status endpoint**

```typescript
// src/app/api/status/route.ts
import { NextResponse } from "next/server";
import { parsePipelineData } from "@/lib/parsers/pipeline";
import { parseCronList } from "@/lib/parsers/cron";
import { parseMetrics } from "@/lib/parsers/metrics";
import { parseHeartbeat } from "@/lib/parsers/heartbeat";
import { getSystemInfo } from "@/lib/parsers/system";
import { parseSessionLog } from "@/lib/parsers/session-log";
import {
  derivePipelineStatus,
  deriveCronStatus,
  deriveQuotaStatus,
  deriveQuarkStatus,
  deriveSystemStatus,
} from "@/lib/status-logic";

export async function GET() {
  try {
    const [pipeline, cron, metrics, heartbeat, system, sessionLog] =
      await Promise.all([
        parsePipelineData(),
        parseCronList(),
        parseMetrics(),
        parseHeartbeat(),
        getSystemInfo(),
        parseSessionLog(),
      ]);

    // Derive status cards
    //
    // IMPORTANT: Parser field names differ from naive guesses. The actual
    // parser return types are:
    //   - PipelineJob: `createdAt` (camelCase), `stages` array (no `stage` string)
    //   - SystemInfo: `cpuPercent`, `memoryUsedMb/memoryTotalMb`, `diskUsedGb/diskTotalGb`
    //   - CodexQuota: `dailyRemaining`, `weeklyRemaining` (not dailyPct/weeklyPct)
    //   - Heartbeat: `lastHeartbeat` (camelCase, not last_heartbeat)
    //
    const pipelineStatus = derivePipelineStatus({
      jobs: (pipeline?.jobs ?? []).map((j) => ({
        status: String(j.status ?? ""),
        updated_at: String(j.createdAt ?? ""),
        stage: j.stages?.length
          ? String(j.stages[j.stages.length - 1].name)
          : "",
      })),
    });

    const cronStatus = deriveCronStatus({
      jobs: (cron?.jobs ?? []).map((j: Record<string, unknown>) => ({
        name: String(j.name ?? ""),
        status: String(j.status ?? ""),
        lastError: j.lastError ? String(j.lastError) : undefined,
      })),
    });

    const quotaStatus = deriveQuotaStatus({
      dailyPct: Number(metrics?.codexQuota?.dailyRemaining ?? 100),
      weeklyPct: Number(metrics?.codexQuota?.weeklyRemaining ?? 100),
    });

    // Count recent runs and failures from cron summary
    const recentRuns = cron?.jobs?.length ?? 0;
    const recentFailures =
      cron?.jobs?.filter(
        (j: Record<string, unknown>) => j.status === "error"
      ).length ?? 0;

    const quarkStatus = deriveQuarkStatus({
      lastHeartbeat: String(heartbeat?.lastHeartbeat ?? new Date().toISOString()),
      recentRuns,
      recentFailures,
      windowHours: 6,
    });

    const systemStatus = deriveSystemStatus({
      cpu: Number(system?.cpuPercent ?? 0),
      memory: system
        ? Math.round((system.memoryUsedMb / system.memoryTotalMb) * 100)
        : 0,
      disk: system
        ? Math.round((system.diskUsedGb / system.diskTotalGb) * 100)
        : 0,
    });

    return NextResponse.json(
      {
        pipeline: pipelineStatus,
        cron: { ...cronStatus, jobs: cron?.jobs },
        quota: { ...quotaStatus, raw: metrics?.codexQuota },
        quark: { ...quarkStatus, heartbeat },
        system: { ...systemStatus, processes: system?.topProcesses },
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "CDN-Cache-Control": "s-maxage=15, stale-while-revalidate=45, stale-if-error=3600",
          "Cache-Control": "public, max-age=5",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to compute status", details: String(error) },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify endpoint works**

Run: `cd /Users/quark/projects/quark-mission-control && npm run dev &`
Then: `curl -s http://localhost:3000/api/status | jq '.pipeline.level, .cron.level, .system.level'`
Expected: Three status level strings (healthy/warning/critical)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/status/route.ts
git commit -m "feat(api): add /api/status aggregated endpoint

Runs pipeline, cron, metrics, heartbeat, system parsers in parallel.
Derives StatusCard (level + sentence + details) for each.
CDN-cached at 15s with stale-while-revalidate."
```

---

### Task 6: Update sidebar navigation

**Files:**
- Modify: `src/components/ui/sidebar.tsx`

- [ ] **Step 1: Update nav items to 6-page structure**

In `src/components/ui/sidebar.tsx`, replace the `navItems` array with:

```typescript
const navItems = [
  { href: "/status", label: "Status", icon: Activity },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/settings", label: "Settings", icon: Settings },
];
```

Add the new icon imports at the top:
```typescript
import { Activity, FileText, Inbox, Calendar, Compass, Settings, X } from "lucide-react";
```

**Keep the `X` icon import** — it is used by the mobile close button in the sidebar. Remove only the old imports that are no longer used (LayoutDashboard, Brain, MessageCircle, BarChart3, Megaphone, BookOpen, Radio, Users).

Also remove any unused Zustand store subscriptions for `cognitiveDegradation` and `engagementUnanswered` from the sidebar component if they exist — those states are no longer surfaced in the new 6-page nav.

- [ ] **Step 2: Redirect old routes**

In `src/app/page.tsx`, replace the dashboard home with a redirect to `/status`:

```typescript
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/status");
}
```

- [ ] **Step 3: Verify navigation renders**

Run dev server, check sidebar shows 6 items. Click Status — should show 404 for now (page not created yet).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/sidebar.tsx src/app/page.tsx
git commit -m "feat(nav): restructure sidebar to 6 intent-based pages

Status, Content, Inbox, Schedule, Explore, Settings.
Home (/) redirects to /status. Old routes preserved (pages still exist)."
```

---

### Task 7: Detail panel component

**Files:**
- Create: `src/components/status/detail-panel.tsx`

- [ ] **Step 1: Create slide-out detail panel**

```typescript
// src/components/status/detail-panel.tsx
"use client";

import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface DetailPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function DetailPanel({
  open,
  onClose,
  title,
  children,
}: DetailPanelProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0E0E14] p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#F1F5F9]">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-[#94A3B8] hover:bg-white/5 hover:text-[#F1F5F9]"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/status/detail-panel.tsx
git commit -m "feat(status): add slide-out DetailPanel component

Spring-animated sidebar panel with backdrop, ESC close, scroll.
Used by status cards for investigation drill-down."
```

---

### Task 8: Status page — all 5 cards + layout

**Files:**
- Create: `src/components/status/pipeline-card.tsx`
- Create: `src/components/status/cron-card.tsx`
- Create: `src/components/status/quota-card.tsx`
- Create: `src/components/status/quark-card.tsx`
- Create: `src/components/status/system-card.tsx`
- Create: `src/app/status/page.tsx`

- [ ] **Step 1: Create the 5 card components**

Each card follows the same pattern: glass card → StatusSentence → click to open detail panel. I'll create all 5 in one step since they share the pattern.

```typescript
// src/components/status/pipeline-card.tsx
"use client";

import { useState } from "react";
import type { StatusCard } from "@/lib/parsers/types";
import { StatusSentence } from "@/components/ui/status-sentence";
import { HoverCard } from "@/components/ui/hover-card";
import { DetailPanel } from "./detail-panel";
import { GitBranch } from "lucide-react";

interface Props {
  data: StatusCard & { jobs?: unknown[] };
}

export function PipelineCard({ data }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 text-left backdrop-blur-sm transition hover:border-white/10 hover:bg-white/[0.05]"
      >
        <div className="mb-3 flex items-center gap-2 text-[#94A3B8]">
          <GitBranch size={16} />
          <HoverCard
            content={
              <p>
                Active pipeline jobs. "Stuck" = non-approval stage with no
                progress for 1+ hours.
              </p>
            }
          >
            <span className="text-xs font-medium uppercase tracking-wider">
              Pipeline
            </span>
          </HoverCard>
        </div>
        <StatusSentence level={data.level} sentence={data.sentence} />
      </button>

      <DetailPanel
        open={open}
        onClose={() => setOpen(false)}
        title="Pipeline Details"
      >
        <div className="space-y-3 text-sm text-[#94A3B8]">
          <p>{data.sentence}</p>
          {data.details?.stuck && (
            <div>
              <h3 className="mb-1 font-medium text-amber-400">Stuck Jobs</h3>
              <pre className="rounded bg-white/5 p-2 text-xs">
                {JSON.stringify(data.details.stuck, null, 2)}
              </pre>
            </div>
          )}
          {data.details?.active && (
            <div>
              <h3 className="mb-1 font-medium text-[#F1F5F9]">Active Jobs</h3>
              <pre className="rounded bg-white/5 p-2 text-xs">
                {JSON.stringify(data.details.active, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DetailPanel>
    </>
  );
}
```

```typescript
// src/components/status/cron-card.tsx
"use client";

import { useState } from "react";
import type { StatusCard } from "@/lib/parsers/types";
import { StatusSentence } from "@/components/ui/status-sentence";
import { HoverCard } from "@/components/ui/hover-card";
import { DetailPanel } from "./detail-panel";
import { Clock } from "lucide-react";

interface Props {
  data: StatusCard & { jobs?: Array<Record<string, unknown>> };
}

export function CronCard({ data }: Props) {
  const [open, setOpen] = useState(false);
  const failed =
    data.jobs?.filter((j) => j.status === "error") ?? [];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 text-left backdrop-blur-sm transition hover:border-white/10 hover:bg-white/[0.05]"
      >
        <div className="mb-3 flex items-center gap-2 text-[#94A3B8]">
          <Clock size={16} />
          <HoverCard
            content={
              <p>
                Scheduled jobs. Failures = jobs that normally succeed but just
                broke (not known-flaky).
              </p>
            }
          >
            <span className="text-xs font-medium uppercase tracking-wider">
              Cron
            </span>
          </HoverCard>
        </div>
        <StatusSentence level={data.level} sentence={data.sentence} />
      </button>

      <DetailPanel
        open={open}
        onClose={() => setOpen(false)}
        title="Cron Details"
      >
        <div className="space-y-3 text-sm text-[#94A3B8]">
          {failed.length > 0 && (
            <div>
              <h3 className="mb-2 font-medium text-red-400">Failed Jobs</h3>
              {failed.map((j, i) => (
                <div
                  key={i}
                  className="mb-2 rounded bg-white/5 p-2 text-xs"
                >
                  <span className="font-medium text-[#F1F5F9]">
                    {String(j.name)}
                  </span>
                  {j.lastError && (
                    <p className="mt-1 text-red-400">
                      {String(j.lastError)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs">
            Total: {data.jobs?.length ?? 0} jobs · Failed:{" "}
            {failed.length}
          </p>
        </div>
      </DetailPanel>
    </>
  );
}
```

```typescript
// src/components/status/quota-card.tsx
"use client";

import { useState } from "react";
import type { StatusCard } from "@/lib/parsers/types";
import { StatusSentence } from "@/components/ui/status-sentence";
import { HoverCard } from "@/components/ui/hover-card";
import { DetailPanel } from "./detail-panel";
import { Gauge } from "lucide-react";

interface Props {
  data: StatusCard & { raw?: Record<string, unknown> };
}

export function QuotaCard({ data }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 text-left backdrop-blur-sm transition hover:border-white/10 hover:bg-white/[0.05]"
      >
        <div className="mb-3 flex items-center gap-2 text-[#94A3B8]">
          <Gauge size={16} />
          <HoverCard
            content={
              <p>
                Daily API quota. Resets at midnight CT. Below 20% = warning.
              </p>
            }
          >
            <span className="text-xs font-medium uppercase tracking-wider">
              Quota
            </span>
          </HoverCard>
        </div>
        <StatusSentence level={data.level} sentence={data.sentence} />
      </button>

      <DetailPanel
        open={open}
        onClose={() => setOpen(false)}
        title="Quota Details"
      >
        <div className="space-y-3 text-sm text-[#94A3B8]">
          <p>{data.sentence}</p>
          {data.raw && (
            <pre className="rounded bg-white/5 p-2 text-xs">
              {JSON.stringify(data.raw, null, 2)}
            </pre>
          )}
        </div>
      </DetailPanel>
    </>
  );
}
```

```typescript
// src/components/status/quark-card.tsx
"use client";

import { useState } from "react";
import type { StatusCard } from "@/lib/parsers/types";
import { StatusSentence } from "@/components/ui/status-sentence";
import { HoverCard } from "@/components/ui/hover-card";
import { DetailPanel } from "./detail-panel";
import { Bot } from "lucide-react";

interface Props {
  data: StatusCard & { heartbeat?: Record<string, unknown> };
}

export function QuarkCard({ data }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 text-left backdrop-blur-sm transition hover:border-white/10 hover:bg-white/[0.05]"
      >
        <div className="mb-3 flex items-center gap-2 text-[#94A3B8]">
          <Bot size={16} />
          <HoverCard
            content={
              <p>
                Quark&apos;s last meaningful action + success rate over
                the past 6 hours.
              </p>
            }
          >
            <span className="text-xs font-medium uppercase tracking-wider">
              Quark
            </span>
          </HoverCard>
        </div>
        <StatusSentence level={data.level} sentence={data.sentence} />
      </button>

      <DetailPanel
        open={open}
        onClose={() => setOpen(false)}
        title="Quark Health"
      >
        <div className="space-y-3 text-sm text-[#94A3B8]">
          <p>{data.sentence}</p>
          {data.heartbeat && (
            <pre className="rounded bg-white/5 p-2 text-xs">
              {JSON.stringify(data.heartbeat, null, 2)}
            </pre>
          )}
        </div>
      </DetailPanel>
    </>
  );
}
```

```typescript
// src/components/status/system-card.tsx
"use client";

import { useState } from "react";
import type { StatusCard } from "@/lib/parsers/types";
import { RadialGauge } from "@/components/ui/radial-gauge";
import { HoverCard } from "@/components/ui/hover-card";
import { DetailPanel } from "./detail-panel";
import { Cpu } from "lucide-react";
import { useDashboardStore } from "@/stores/dashboard";

interface Props {
  data: StatusCard & {
    cpu: number;
    memory: number;
    disk: number;
    processes?: Array<Record<string, unknown>>;
  };
}

export function SystemCard({ data }: Props) {
  const [open, setOpen] = useState(false);
  const connected = useDashboardStore((s) => s.connected);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 text-left backdrop-blur-sm transition hover:border-white/10 hover:bg-white/[0.05]"
      >
        <div className="mb-3 flex items-center gap-2 text-[#94A3B8]">
          <Cpu size={16} />
          <HoverCard
            content={
              <p>
                MacBook system metrics. Above 80% = amber. Above 95% = red.
                Hover gauges for process breakdown.
              </p>
            }
          >
            <span className="text-xs font-medium uppercase tracking-wider">
              System
            </span>
          </HoverCard>
          {/* Connectivity dot — green when connected, red when disconnected */}
          <span
            className={`ml-auto inline-block h-2 w-2 rounded-full ${
              connected
                ? "bg-emerald-500 shadow-emerald-500/40"
                : "bg-red-500 shadow-red-500/40"
            } shadow-sm`}
            title={connected ? "Connected" : "Disconnected"}
          />
        </div>
        <div className="flex items-center justify-around pt-1">
          <RadialGauge value={data.cpu} size={72} label="CPU" />
          <RadialGauge value={data.memory} size={72} label="MEM" />
          <RadialGauge value={data.disk} size={72} label="DISK" />
        </div>
      </button>

      <DetailPanel
        open={open}
        onClose={() => setOpen(false)}
        title="System Details"
      >
        <div className="space-y-4 text-sm text-[#94A3B8]">
          <div className="flex justify-around">
            <RadialGauge value={data.cpu} size={100} label="CPU" />
            <RadialGauge value={data.memory} size={100} label="Memory" />
            <RadialGauge value={data.disk} size={100} label="Disk" />
          </div>
          {data.processes && (
            <div>
              <h3 className="mb-2 font-medium text-[#F1F5F9]">
                Top Processes
              </h3>
              {(data.processes as Array<Record<string, unknown>>).map(
                (p, i) => (
                  <div
                    key={i}
                    className="flex justify-between border-b border-white/5 py-1 text-xs"
                  >
                    <span>{String(p.name ?? p.command ?? "unknown")}</span>
                    <span className="font-mono">{String(p.cpu ?? "")}%</span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </DetailPanel>
    </>
  );
}
```

- [ ] **Step 2: Create the Status page**

```typescript
// src/app/status/page.tsx
"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PipelineCard } from "@/components/status/pipeline-card";
import { CronCard } from "@/components/status/cron-card";
import { QuotaCard } from "@/components/status/quota-card";
import { QuarkCard } from "@/components/status/quark-card";
import { SystemCard } from "@/components/status/system-card";
import type { StatusCard } from "@/lib/parsers/types";
import { formatTimeShort } from "@/lib/utils";

// Typed response from /api/status — avoids `as never` casts on card props
interface StatusResponse {
  pipeline: StatusCard & { jobs?: unknown[] };
  cron: StatusCard & { jobs?: Array<Record<string, unknown>> };
  quota: StatusCard & { raw?: Record<string, unknown> };
  quark: StatusCard & { heartbeat?: Record<string, unknown> };
  system: StatusCard & {
    cpu: number;
    memory: number;
    disk: number;
    processes?: Array<Record<string, unknown>>;
  };
  timestamp: string;
}

export default function StatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchStatus() {
      try {
        const res = await fetch("/api/status");
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        if (active) setData(json);
      } catch (e) {
        if (active) setError(String(e));
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 15_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (error && !data) {
    return (
      <AppShell>
        <div className="p-6 text-red-400">
          Failed to load status: {error}
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.03]"
              />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#F1F5F9]">Status</h1>
          {data.timestamp && (
            <span className="text-xs text-[#94A3B8]">
              Updated {formatTimeShort(data.timestamp)}
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PipelineCard data={data.pipeline} />
          <CronCard data={data.cron} />
          <QuotaCard data={data.quota} />
          <QuarkCard data={data.quark} />
          <SystemCard data={data.system} />
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 3: Verify Status page renders**

Run dev server, navigate to `/status`. Should see 5 cards with live data.

- [ ] **Step 4: Commit**

```bash
git add src/components/status/ src/app/status/
git commit -m "feat(status): implement Status page with 5 cards

Pipeline, Cron, Quota, Quark, System cards — each with green/amber/red
status dot, one-sentence summary, and slide-out detail panel on click.
System card uses RadialGauge for CPU/Mem/Disk arcs.
Auto-refreshes every 15s from /api/status."
```

---

### Task 9: Status card tests

**Files:**
- Create: `src/components/status/__tests__/status-cards.test.tsx`

- [ ] **Step 1: Write integration tests**

```typescript
// src/components/status/__tests__/status-cards.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PipelineCard } from "../pipeline-card";
import { CronCard } from "../cron-card";
import { SystemCard } from "../system-card";

describe("PipelineCard", () => {
  it("renders healthy status", () => {
    render(
      <PipelineCard
        data={{
          level: "healthy",
          sentence: "2 jobs active, on track",
          details: { active: [] },
        }}
      />
    );
    expect(screen.getByText("2 jobs active, on track")).toBeInTheDocument();
  });

  it("opens detail panel on click", () => {
    render(
      <PipelineCard
        data={{
          level: "warning",
          sentence: "1 job stuck at L4b (2h)",
          details: { stuck: [{ stage: "L4b" }], active: [] },
        }}
      />
    );
    fireEvent.click(screen.getByText("1 job stuck at L4b (2h)"));
    expect(screen.getByText("Pipeline Details")).toBeInTheDocument();
  });
});

describe("CronCard", () => {
  it("renders failed jobs count", () => {
    render(
      <CronCard
        data={{
          level: "critical",
          sentence: "2/20 failed: Cassian, Deep Work",
          details: { total: 20, failed: [] },
          jobs: [
            { name: "Cassian", status: "error" },
            { name: "Deep Work", status: "error" },
          ],
        }}
      />
    );
    expect(
      screen.getByText("2/20 failed: Cassian, Deep Work")
    ).toBeInTheDocument();
  });
});

describe("SystemCard", () => {
  it("renders three gauges", () => {
    render(
      <SystemCard
        data={{
          level: "healthy",
          sentence: "CPU 45% · Mem 62% · Disk 55%",
          details: {},
          cpu: 45,
          memory: 62,
          disk: 55,
        }}
      />
    );
    expect(screen.getByText("CPU")).toBeInTheDocument();
    expect(screen.getByText("MEM")).toBeInTheDocument();
    expect(screen.getByText("DISK")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd /Users/quark/projects/quark-mission-control && npx vitest run src/components/status/__tests__/status-cards.test.tsx`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/status/__tests__/
git commit -m "test(status): add status card integration tests

Tests PipelineCard, CronCard, SystemCard rendering and detail panel
interaction."
```

---

### Task 10: Add /status to proxy public paths + final wiring

**Files:**
- Modify: `src/proxy.ts`

- [ ] **Step 1: Add /api/status to public paths**

In `src/proxy.ts`, find the `PUBLIC_PATHS` constant (note: uppercase, not `publicPaths`) and add `/api/status`:

```typescript
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/snapshot", "/api/hash", "/api/memory", "/api/knowledge", "/api/status"];
```

- [ ] **Step 2: Full build + typecheck**

Run: `cd /Users/quark/projects/quark-mission-control && npx tsc --noEmit && npx next build 2>&1 | tail -10`
Expected: No type errors, build succeeds.

- [ ] **Step 3: Run all tests**

Run: `cd /Users/quark/projects/quark-mission-control && npx vitest run`
Expected: All tests pass (including existing Content Performance tests).

- [ ] **Step 4: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(status): add /api/status to public paths, final wiring

Phase 1 complete: Status page live at /status with 5 cards,
performance P1+P2 deployed, sidebar restructured to 6 pages."
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Cache headers (P1) | 2 modified |
| 2 | IndexedDB persistence (P2) | 1 new, 2 modified |
| 3 | Status logic + tests | 3 new |
| 4 | RadialGauge + HoverCard + StatusSentence | 3 new |
| 5 | /api/status endpoint | 1 new |
| 6 | Sidebar navigation (6 pages) | 2 modified |
| 7 | Detail panel component | 1 new |
| 8 | Status page + 5 cards | 6 new |
| 9 | Status card tests | 1 new |
| 10 | Proxy + final build verification | 1 modified |

**Total: 15 new files, 7 modified files, 10 tasks**
