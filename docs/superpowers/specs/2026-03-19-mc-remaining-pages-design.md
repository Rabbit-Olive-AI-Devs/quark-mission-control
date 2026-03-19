# Mission Control — Remaining Pages Design Spec

**Date:** 2026-03-19
**Status:** APPROVED — ready for implementation
**Scope:** Schedule, Inbox, Content, Explore (4 pages)
**Research:** `~/.openclaw/workspace/docs/superpowers/specs/2026-03-18-mc-redesign-research.md`

---

## Shared Conventions (all 4 pages)

- Wrap in `<AppShell>`
- Data via `useApi<T>(url, { refreshOn: [...] })`
- "Last updated: X:XX PM CT" in page header (amber if stale > 2x refresh interval)
- Loading: per-section skeleton shimmer (no full-page spinner)
- Empty states: specific message + icon, never blank
- Mobile-first: 1-column on mobile, expand on `md:`
- All timestamps in `America/Chicago`
- Visual brand: Cinematic Ops (`#0A0A0F` bg, `#00D4AA` cyan, `#F59E0B` amber, `#EF4444` red-for-failure-only)
- Reuse: `GlassCard`, `StatusDot`, `Sparkline`, `HoverCard`, `ErrorBoundary`, `CardFooter`
- Import colors from `src/lib/theme-constants.ts` (STATUS_COLORS, PLATFORM_COLORS, ACCENT)

---

## Page 1: Schedule (`/schedule`)

### Purpose
Daily timeline showing all cron jobs at their scheduled times, with reliability history and failure surfacing.

### Data Sources
| Endpoint | Type | Refresh |
|----------|------|---------|
| `/api/schedule` | `{ jobs: CronJob[], summary: { total, ok, failed } }` | `refreshOn: ["heartbeat"]`, 60s poll fallback |
| `/api/cron-history` | Historical run data (if available) | On-demand |

### Layout

```
[Header: "Schedule" + summary sentence + last-updated + view toggle + sort toggle]
[Summary strip: 4 mini KPIs in a row]
[Timeline body: full-width day planner]
```

#### Header
- Icon: `Calendar` (lucide)
- Summary sentence: `"{ok}/{total} jobs running normally"` (existing)
- View toggle pills: Daily | Weekly (existing, keep)
- **NEW** Sort toggle: "Show failed first" checkbox/toggle — when on, failed/error jobs float to top regardless of time slot
- Last-updated timestamp (muted, right-aligned)

#### Summary Strip (existing, enhance)
4 `GlassCard` mini-KPIs in `grid-cols-2 md:grid-cols-4`:
- **Total Jobs** — count, cyan
- **Healthy** — count, green
- **Idle/Disabled** — count, gray
- **Failed** — count, red. **NEW:** If > 0, card gets red left-border glow

#### Timeline Body (refactor `TimelineView`)
Keep the existing daily 24-hour vertical timeline and weekly day-of-week view. Enhance each `JobCard`:

**Current JobCard shows:** name, status dot, agent badge, last-run relative time, schedule, model name
**New JobCard (compact) shows:**
1. Status dot (existing `StatusDot`)
2. Job name (truncated, existing)
3. Schedule in human-readable (existing `scheduleHuman`)
4. Last run outcome: `"completed in 45s"` (green) or `"failed: timeout 300s"` (red) — derive from `lastRunMs` + `status`
5. **Reliability sparkline** — 7-day pass/fail as a mini `Sparkline` (7 data points, 1 = pass, 0 = fail). Green line if all pass, degrades to red.
6. Next run time (relative, existing)
7. **REMOVE:** model name (jargon, per research)

**New JobCard (expanded, on click/hover):**
- Full card with last 3 run outcomes (timestamp + duration + status)
- Error message in plain English if last run failed
- Agent badge (keep)

#### New Data Needed
- `/api/cron-history` or extend `/api/schedule` to return `recentRuns: { timestamp: string, status: "ok" | "error", durationMs: number }[]` per job (last 7 runs). **This is the only new API work for this page.**

### Components

| Component | Status | Notes |
|-----------|--------|-------|
| `TimelineView` | MODIFY | Add sort-by-failure, pass reliability data |
| `JobCard` | MODIFY | Add reliability sparkline, error message, remove model name |
| `Sparkline` | REUSE | Existing, pass 7-point array |
| `StatusDot` | REUSE | Existing |
| `GlassCard` | REUSE | Existing |

### Responsive
- Mobile: Summary strip 2-up, timeline scrollable vertical list, job cards full-width
- Desktop: Summary strip 4-up, timeline with hour labels left-aligned

### Empty States
- No jobs: `"No cron jobs configured. Jobs will appear here when added via openclaw cron add."`
- All healthy: Summary strip shows all-green, no special treatment
- No history data: Sparkline shows flat gray line, tooltip "No history available"

---

## Page 2: Inbox (`/inbox`) — NEW PAGE

### Purpose
Consolidated "needs your attention" queue. Everything Thiago must act on, sorted by urgency.

### Data Sources
| Endpoint | Type | Refresh |
|----------|------|---------|
| `/api/engagement` | `EngagementData` — unanswered comments/DMs via `inboundGap` + `actions` | `refreshOn: ["engagement"]`, 30s poll |
| `/api/pipeline` | `PipelineData` — jobs with `status === "preview_sent"` | `refreshOn: ["pipeline"]` |
| `/api/agents` | `{ agents: AgentStatus[], comms }` — escalations | `refreshOn: ["comms"]` |
| `/api/pending` | `PendingActions` — draft DMs, X posts, emails, notes | `refreshOn: ["heartbeat"]` |
| `/api/status-full` | `StatusFullResponse` — for `engagement.inboundGap.unansweredCount` summary | `refreshOn: ["heartbeat"]` |

### Layout

```
[Header: "Inbox" + total count badge + last-updated]
[Summary sentence: "X items need your attention"]
[Section 1: Unanswered — comments/DMs across platforms]
[Section 2: Pending Approvals — pipeline preview_sent jobs]
[Section 3: Agent Escalations — flagged items from agents]
[Section 4: Stale Items — jobs/tasks with no progress >4h]
```

#### Header
- Icon: `Inbox` (lucide)
- Badge: total count across all sections, cyan if > 0, gray if 0
- Last-updated timestamp

#### Summary Sentence
`StatusSentence` component:
- 0 items: healthy / "Nothing needs your attention"
- 1-3 items: warning / "3 items need your attention"
- 4+ items: critical / "7 items need your attention"

#### Section 1: Unanswered (`InboxUnanswered`)
- Source: `EngagementData.inboundGap.byPlatform` for counts, `EngagementData.actions` filtered for unanswered inbound
- Each item: platform icon + badge, author name, text preview (60 chars), age badge ("18h", "2d"), link (if `targetId` available for X)
- Sorted: oldest first within section
- Empty: "All caught up — no unanswered comments or DMs"

#### Section 2: Pending Approvals (`InboxApprovals`)
- Source: `PipelineData.jobs.filter(j => j.status === "preview_sent")`
- Each item: content type badge (color from `TYPE_COLORS`), topic (truncated), virality score, age since preview sent, "Review" action link
- Sorted: oldest first
- Empty: "No pipeline jobs awaiting approval"

#### Section 3: Agent Escalations (`InboxEscalations`)
- Source: `AgentStatus[]` — filter agents where `latestComms` contains escalation keywords (e.g. "escalat", "needs attention", "blocked", "failed", "urgent")
- Each item: agent name, one-line summary of escalation, timestamp, recommended action
- Sorted: most recent first
- Empty: "No agent escalations"

#### Section 4: Stale Items (`InboxStale`)
- Source: `PipelineData.jobs` where status is non-terminal AND age > 4h AND not `preview_sent`
- Also: `PendingActions` — drafts older than 24h (if timestamp available)
- Each item: what it is, where it's stuck, how long, suggested action
- Empty: "Nothing stale — all items are progressing"

### Components

| Component | Status | Notes |
|-----------|--------|-------|
| `InboxSection` | NEW | Collapsible section with count badge, icon, title |
| `InboxItem` | NEW | Generic item row: icon, text, age badge, action button |
| `InboxUnanswered` | NEW | Section 1 content |
| `InboxApprovals` | NEW | Section 2 content |
| `InboxEscalations` | NEW | Section 3 content |
| `InboxStale` | NEW | Section 4 content |
| `StatusSentence` | REUSE | Summary line |
| `StatusDot` | REUSE | Per-item status |
| `GlassCard` | REUSE | Section wrapper |

### Responsive
- Mobile: full-width sections stacked, items as cards
- Desktop: same layout (Inbox is inherently single-column)
- Each `InboxItem`: left icon + middle text (flex-1) + right age badge + action button

### Empty States
- Full page empty (0 items total): Large `Inbox` icon + "Nothing needs your attention right now. Check back later."
- Per-section empty: Muted one-liner (see above per section)

---

## Page 3: Content (`/content`)

### Purpose
Publishing performance and strategy view. Answers: "How's content doing? What worked? What's next?"

### Data Sources
| Endpoint | Type | Refresh |
|----------|------|---------|
| `/api/pipeline` | `PipelineData` — scorecard, jobs, weights | `refreshOn: ["pipeline"]`, 60s poll |
| `/api/status-full` | `StatusFullResponse` — `contentToday`, `engagement.today`, publish audit data | `refreshOn: ["heartbeat"]` |
| `/api/engagement` | `EngagementData` — `unifiedKpis` for impressions, engagement rate, follower delta | `refreshOn: ["engagement"]` |
| `/api/content` | `{ posts, hookCategories, calendar, hookLibrary }` | On-demand |
| `/api/intel` | `IntelReport` — content suggestions | On-demand |

### Layout

```
[Header: "Content" + publish mode badge + last-updated]
[Hero KPIs: 4 cards in a row]
[Top Posts: table/list ranked by real engagement]
[Bottom split: Platform Breakdown (left) | What's Next (right)]
```

#### Header
- Icon: `Clapperboard` (lucide, existing)
- Publish mode badge: `LIVE` (green) or `WARMUP` (amber) from `StatusFullResponse.contentToday.publishMode`
- Last-updated timestamp

#### Hero KPIs (4 `GlassCard`s, `grid-cols-2 md:grid-cols-4`)

1. **Best Performer**
   - Source: Derive from `EngagementData.actions` or `ContentPost[]` — post with highest total engagement
   - Display: Post text preview (60 chars), platform badge (`PLATFORM_COLORS`), total engagement count
   - Subtext: "X% above avg" or "your top post this week"
   - Empty: "No posts this week"

2. **Published This Week**
   - Source: `PipelineScorecard.published` + `StatusFullResponse.contentToday.publishedCount`
   - Display: Big number + trend arrow (vs last week if data available)
   - Subtext: platforms published to (from `contentToday.platforms`)

3. **Engagement Rate**
   - Source: `EngagementData.unifiedKpis.engagement.engagementRate`
   - Display: Percentage + 7d `Sparkline` (from `EngagementData.trends` — derive daily engagement rate)
   - `HoverCard`: "Interactions / impressions. Above 3% is strong for your audience size."

4. **Followers**
   - Source: `EngagementData.unifiedKpis.growth.followerDelta`
   - Display: Net change this week ("+12" green or "-3" red)
   - Subtext: per-platform breakdown if available

#### Top Posts Table (`ContentTopPosts`)
- Source: `ContentPost[]` from `/api/content` — ranked by total real engagement (likes + comments + shares + views)
- Columns:
  - Post preview: 60 chars of `hook` text
  - Platform: icon + badge from `PLATFORM_COLORS`
  - Likes, Comments, Shares, Views: real numbers
  - Performance badge: green up-arrow "above avg" / red down-arrow "below avg" (vs 30-day platform average)
- Click row: expand inline to show full post text + link to original
- Time filter pills: 7d | 30d | All
- Platform filter pills: All | X | TikTok | IG | YouTube | Substack
- **No z-scores. No audit trail. Real numbers only.**
- Empty: "No published posts yet. Posts will appear here after publishing."

#### Bottom Split (`grid-cols-1 md:grid-cols-2`)

**Left: Platform Breakdown (`ContentPlatformBreakdown`)**
- Bar chart (Recharts `BarChart`) — one bar per platform, height = avg engagement per post
- Colors from `PLATFORM_COLORS`
- `HoverCard` on each bar: exact numbers
- Empty: "Publish to multiple platforms to see comparison"

**Right: What's Next (`ContentWhatsNext`)**
- Pipeline queue: upcoming jobs from `PipelineData.jobs` where status is non-terminal, ordered by creation
- Content suggestions from `IntelReport.suggestions` (top 3)
- "Last published: Xh ago" — time since most recent publish from audit log
- Empty: "No queued content. Submit new ideas via the content pipeline."

### Components

| Component | Status | Notes |
|-----------|--------|-------|
| `ContentHeroKpis` | NEW | 4-card KPI row |
| `ContentTopPosts` | NEW | Sortable/filterable post table |
| `ContentPlatformBreakdown` | NEW | Recharts bar chart |
| `ContentWhatsNext` | NEW | Pipeline queue + suggestions |
| `PipelineTracker` | REMOVE from this page | Moved to Status page (Command Bridge) |
| `PipelineScorecard` | REMOVE from this page | Absorbed into Hero KPIs |
| `JobHistory` | REMOVE from this page | Table replaced by `ContentTopPosts` |
| `Sparkline` | REUSE | 7d engagement rate trend |
| `GlassCard` | REUSE | All cards |
| `HoverCard` | REUSE | KPI explanations |

### Responsive
- Mobile: Hero KPIs 2-up, Top Posts horizontal-scroll table, bottom sections stack vertically
- Desktop: Hero KPIs 4-up, Top Posts full table, bottom split 50/50
- Charts: reduce to 7d default on mobile, 30d on desktop

### Empty States
- No data at all: "No content data available yet. Publish your first post to see performance metrics here."
- No posts in time window: "No posts in the last 7 days. Try expanding the time range."

---

## Page 4: Explore (`/explore`)

### Purpose
Reference shelf — deep-dive into Knowledge, Intel, and Agent communications via a 3-tab layout.

### Data Sources
| Endpoint | Type | Refresh |
|----------|------|---------|
| `/api/memory` | `{ files: MemoryFile[] }` | On-demand (Knowledge tab) |
| `/api/knowledge` | `{ files: KnowledgeFile[] }` | On-demand (Knowledge tab) |
| `/api/knowledge/[...path]` | File content reader | On file click |
| `/api/intel?date=YYYY-MM-DD` | `IntelReport` | On-demand (Intel tab) |
| `/api/agents` | `{ agents, broadcast, comms }` | `refreshOn: ["comms"]` (Agents tab) |
| `/api/comms?agent=name` | `{ messages: CommsMessage[] }` | On agent select |

### Layout

```
[Header: "Explore" + tab bar]
[Tab content: full-width, swaps by active tab]
```

#### Header
- Icon: `Compass` (lucide)
- Tab bar: 3 pill buttons — Knowledge | Intel | Agents
- No summary sentence (tabs speak for themselves)
- Last-updated per tab (shown in tab content area)

#### Tab 1: Knowledge (refactor from `/knowledge`)

Migrate the existing `KnowledgePage` into a tab component. Enhancements:

**Keep:**
- Sub-tabs: Journals | Memory | Knowledge Base (existing `TabBar`)
- Split pane: file list (left) + reader (right)
- Mobile: file list first, tap opens reader full-screen with back button
- Expand/maximize on reader pane

**Enhance:**
- **Add search:** Text input above file list — filters files by name match (client-side, instant)
- **File size labels:** Replace raw byte count with human terms ("short note" < 1KB, "quick read" 1-5KB, "detailed doc" 5-20KB, "reference" > 20KB)
- **Last edited:** Relative time ("2h ago", "3d ago") next to each file, derived from `modified` field
- **Reader pane:** Limit initial view to 200 lines, "Show more" button for long files

**Components:**
| Component | Status | Notes |
|-----------|--------|-------|
| `ExploreKnowledge` | NEW (wraps existing) | Extracts knowledge page body into tab component |
| `TabBar` | REUSE | Existing sub-tab bar |
| `FileList` | REUSE + MODIFY | Add search filter, file size labels, relative time |
| `ReaderPane` | REUSE + MODIFY | Add line limit + expand |
| `GlassCard` | REUSE | Container |

#### Tab 2: Intel (refactor from `/intel`)

Migrate the existing `IntelPage` into a tab component. Enhancements:

**Keep:**
- Date navigation (prev/next day, date picker)
- Trend sections: High-Signal, Rising, Niche Signals
- `TrendCard` component
- Content Suggestions section
- Signal Summary (total signals, high-signal count, avg virality, top source)

**Remove:**
- Radar chart (`TrendRadar`) — biased toward spiky data, not actionable (per research)

**Enhance:**
- **Uniform virality display:** Every `TrendCard` shows a virality bar (1-10 scale, filled segments). Fix inconsistency where some cards lack virality.
- **Virality `HoverCard`:** "Score based on: source reach, engagement velocity, topic freshness, community traction"
- **"Relevant to you" badge:** Highlight trends matching content pillars (check title against `relevance-keywords.json` keywords)
- **Confidence label:** Replace raw confidence string with badge ("High" green, "Medium" amber, "Low" gray)

**Components:**
| Component | Status | Notes |
|-----------|--------|-------|
| `ExploreIntel` | NEW (wraps existing) | Extracts intel page body into tab component |
| `TrendCard` | REUSE + MODIFY | Add uniform virality bar, relevance badge, confidence badge |
| `SignalSummary` | REUSE | Keep as-is |
| `HoverCard` | REUSE | Virality explanation |
| `GlassCard` | REUSE | Container |

#### Tab 3: Agents (refactor from `/agents`)

Migrate the existing `AgentsPage` into a tab component. Enhancements:

**Keep:**
- Agent cards in `grid-cols-1 md:grid-cols-2`
- Status dots per agent
- Broadcast mode banner
- Model name per agent (Thiago wants to know which model each runs)

**Remove:**
- Fiction/lore references in agent descriptions (per research — not useful)

**Enhance:**
- **Structured comms timeline (`AgentCommsTimeline`):**
  - Replace raw text dump with structured entries
  - Each entry: timestamp (Chicago time), agent name badge, one-line summary
  - Expandable to show full message content
  - Most recent first
  - Filter dropdown by agent
  - Source: `/api/comms?agent=<name>` returns `CommsMessage[]`
- **Agent card enhancements:**
  - "Last active: Xh ago" with relative time
  - Status dot: active (cyan, pulsing) if active within 1h, idle (gray) otherwise, error (red) if last comms mention failure
  - **Add:** "Tasks today" count — derive from comms message count for today
- **No new API needed** — `/api/agents` already returns `comms` keyed by agent name, and `/api/comms?agent=name` returns `CommsMessage[]`

**Components:**
| Component | Status | Notes |
|-----------|--------|-------|
| `ExploreAgents` | NEW (wraps existing) | Extracts agents page body into tab component |
| `AgentCard` | REUSE + MODIFY | Add tasks-today, improved status logic |
| `AgentCommsTimeline` | NEW | Structured timeline with filters |
| `CommsEntry` | NEW | Single timeline entry: timestamp + summary + expand |
| `GlassCard` | REUSE | Container |

### Top-Level Tab Component (`ExploreTabs`)

```tsx
// URL state: /explore?tab=knowledge | intel | agents
// Default: knowledge
// Tab changes update URL searchParam (no page reload)
const [tab, setTab] = useState<"knowledge" | "intel" | "agents">("knowledge");
```

Tabs rendered as pill buttons with count badges:
- Knowledge: file count
- Intel: signal count for today
- Agents: agent count

### Responsive
- Mobile: Tabs as horizontal scroll pills, content full-width
- Desktop: Tabs inline, content with max-width
- Knowledge split pane: hidden file list on mobile when reader open (existing behavior)
- Intel cards: 1-column on mobile, 2-column on desktop
- Agent cards: 1-column on mobile, 2-column on desktop

### Empty States
- Knowledge: "No files found. Memory and knowledge base files will appear as Quark creates them."
- Intel: "No intel data for this date. Try navigating to a different day."
- Agents: "No agents deployed. Agent cards will appear when agents are configured."

---

## New API Requirements Summary

| API Change | Page | Description |
|------------|------|-------------|
| Extend `/api/schedule` | Schedule | Add `recentRuns` array (last 7 runs per job: timestamp, status, durationMs) for reliability sparklines |
| No new API | Inbox | Composes from existing `/api/engagement`, `/api/pipeline`, `/api/agents`, `/api/pending` |
| No new API | Content | Composes from existing `/api/pipeline`, `/api/status-full`, `/api/engagement`, `/api/content`, `/api/intel` |
| No new API | Explore | Composes from existing `/api/memory`, `/api/knowledge`, `/api/intel`, `/api/agents`, `/api/comms` |

---

## New Component Summary

| Component | Page | Type |
|-----------|------|------|
| `InboxSection` | Inbox | Collapsible section wrapper |
| `InboxItem` | Inbox | Generic action item row |
| `InboxUnanswered` | Inbox | Unanswered comments section |
| `InboxApprovals` | Inbox | Pending pipeline approvals |
| `InboxEscalations` | Inbox | Agent escalation items |
| `InboxStale` | Inbox | Stale items section |
| `ContentHeroKpis` | Content | 4-card KPI hero row |
| `ContentTopPosts` | Content | Sortable post performance table |
| `ContentPlatformBreakdown` | Content | Bar chart by platform |
| `ContentWhatsNext` | Content | Pipeline queue + suggestions |
| `ExploreTabs` | Explore | Top-level 3-tab controller |
| `ExploreKnowledge` | Explore | Knowledge tab body |
| `ExploreIntel` | Explore | Intel tab body |
| `ExploreAgents` | Explore | Agents tab body |
| `AgentCommsTimeline` | Explore | Structured comms feed |
| `CommsEntry` | Explore | Single comms message row |

**Total: 16 new components, 1 API extension, 5 component modifications**

---

## File Structure

```
src/
  app/
    schedule/page.tsx          # MODIFY — pass reliability data
    inbox/page.tsx             # REWRITE — currently placeholder
    content/page.tsx           # REWRITE — currently pipeline-only
    explore/page.tsx           # REWRITE — currently placeholder
  components/
    schedule/
      timeline-view.tsx        # MODIFY — sort toggle, reliability sparklines
      job-card.tsx             # MODIFY — error message, remove model, add sparkline
    inbox/
      inbox-section.tsx        # NEW
      inbox-item.tsx           # NEW
      inbox-unanswered.tsx     # NEW
      inbox-approvals.tsx      # NEW
      inbox-escalations.tsx    # NEW
      inbox-stale.tsx          # NEW
    content/
      content-hero-kpis.tsx    # NEW
      content-top-posts.tsx    # NEW
      content-platform-breakdown.tsx  # NEW
      content-whats-next.tsx   # NEW
      pipeline-tracker.tsx     # KEEP (used by Status/Command Bridge)
      pipeline-scorecard.tsx   # KEEP (used by Status/Command Bridge)
      job-history.tsx          # KEEP (used by Status/Command Bridge)
    explore/
      explore-tabs.tsx         # NEW
      explore-knowledge.tsx    # NEW (extract from knowledge/page.tsx)
      explore-intel.tsx        # NEW (extract from intel/page.tsx)
      explore-agents.tsx       # NEW (extract from agents/page.tsx)
      agent-comms-timeline.tsx # NEW
      comms-entry.tsx          # NEW
    intel/
      trend-card.tsx           # MODIFY — uniform virality bar, relevance badge
      source-badge.tsx         # KEEP
    knowledge/
      tab-bar.tsx              # KEEP
      file-list.tsx            # MODIFY — search, file size labels, relative time
      reader-pane.tsx          # MODIFY — line limit
    agents/
      agent-card.tsx           # MODIFY — tasks today, improved status logic
```

---

## Implementation Order

1. **Schedule** (smallest scope — 1 API extension + 2 component mods)
2. **Inbox** (new page, 6 new components, no API work)
3. **Content** (rewrite, 4 new components, composes existing APIs)
4. **Explore** (largest — 6 new components + 3 refactors from existing pages)

Estimated total: 2-3 sessions.

---

## Redirects

Old pages that get absorbed into Explore:
- `/knowledge` -> redirect to `/explore?tab=knowledge`
- `/intel` -> redirect to `/explore?tab=intel`
- `/agents` -> redirect to `/explore?tab=agents`

Keep old routes alive with `redirect()` for bookmarks/muscle memory.
