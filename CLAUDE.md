# Mission Control — Development Guide

## What This Is
Operations dashboard for Quark's autonomous agent ecosystem. Monitors cron jobs, agent comms, content pipeline, intel, memory, knowledge base, cognitive health, and engagement metrics.

**Repo:** `Rabbit-Olive-AI-Devs/quark-mission-control`
**Deployed:** Vercel (remote mode via Tailscale snapshot from MacBook)
**Local dev:** `npm run dev` (reads workspace files directly)

## Stack
- Next.js 16.1.6 (App Router, Turbopack)
- React 19, TypeScript
- TailwindCSS 4, Framer Motion (animations)
- Recharts (charts/graphs)
- Zustand (state management)
- better-sqlite3 (schema exists but unused)
- Lucide React (icons)

## Architecture

### Data Flow
```
[OpenClaw Workspace ~/.openclaw/workspace/] → [Parsers (18 files)] → [API Routes]
                                                                          ↓
                                                                   [React Pages (12+)]
                                                                          ↑
                                                             [Snapshot Proxy (Vercel mode)]
```

### Dual-Mode
- **Local mode:** Parsers read workspace files directly from `~/.openclaw/workspace/`
- **Remote mode (Vercel):** `/api/snapshot` endpoint on MacBook serves full data payload via Tailscale. 30s cache TTL. Hash-polling every 5s for freshness.
- Env: `NEXT_PUBLIC_IS_REMOTE=true` + `NEXT_PUBLIC_SNAPSHOT_URL` for Vercel deployment.

### Key Directories
```
src/
  app/           — Pages (App Router)
    activity/    agents/    calendar/    cognitive/
    command-center/  content/   cron/       engagement/
    intel/       knowledge/ login/      memory-browser/
    metrics-page/  settings/
  lib/
    parsers/     — 18 parser files (read workspace data)
    pipeline-constants.ts  — STATUS_COLORS, TYPE_COLORS, formatElapsed
    engagement-constants.ts — PLATFORM_COLORS, ACTION_COLORS, formatTimeAgo
    config.ts    — env config
  proxy.ts       — Middleware (Next.js 16 renamed middleware → proxy)
```

## Critical Rules

1. **NEVER create `src/middleware.ts`** — Next.js 16 renamed it to `src/proxy.ts`. Creating middleware.ts causes boot error.
2. **Visual direction:** "Cinematic Ops" — dark sci-fi command bridge aesthetic. Light lines, glow animations, monospace data displays. Glass-card design.
3. **Auth:** Cookie-based password auth via `/api/auth`. `DASHBOARD_PASSWORD` env required in production.
4. **CORS headers** in proxy.ts are required for cross-origin browser→MacBook fetch (Vercel remote mode).

## Pages

| Page | Route | Data Source |
|------|-------|-------------|
| Dashboard | `/` | Aggregated from multiple parsers |
| Content Pipeline | `/content` | `pipeline.ts` → content-engine state files |
| Cognitive | `/cognitive` | `cognitive.ts` → cognitive JSON + degradation alerts |
| Engagement | `/engagement` | `engagement.ts` → engagement-audit.jsonl |
| Agents | `/agents` | `agents.ts` → .agents/ configs + comms/ |
| Cron | `/cron` | `cron.ts` → openclaw CLI |
| Command Center | `/command-center` | `command-center.ts` → cron run JSONL logs |
| Intel | `/intel` | `intel.ts` → DAILY-INTEL.md |
| Memory Browser | `/memory-browser` | `memory.ts` → memory/ directory |
| Knowledge | `/knowledge` | `knowledge.ts` → shared/knowledge-base/ |
| Metrics | `/metrics-page` | `metrics.ts` → dashboard.md + CLI |
| Calendar | `/calendar` | Calendar data |
| Activity | `/activity` | Activity/session logs |
| Settings | `/settings` | System config display |

## Parsers (src/lib/parsers/)

Each parser reads specific workspace files and returns typed data:

| Parser | Reads From (in ~/.openclaw/workspace/) |
|--------|----------------------------------------|
| `heartbeat.ts` | `memory/heartbeat-state.md` |
| `digest.ts` | `memory/today-digest.md` |
| `pending.ts` | `memory/pending-actions.md` |
| `intel.ts` | `intel/DAILY-INTEL.md` |
| `metrics.ts` | `metrics/dashboard.md` + `openclaw models` CLI |
| `cron.ts` | `openclaw cron list --json` CLI |
| `content.ts` | content-engine state files |
| `pipeline.ts` | content-engine manifests + renders |
| `agents.ts` | `.agents/*/config.json` + `comms/*.md` |
| `session-log.ts` | `memory/{date}.md` |
| `system.ts` | `os.*` + `df` command |
| `command-center.ts` | `.openclaw/cron/runs/*.jsonl` |
| `memory.ts` | `memory/` directory |
| `knowledge.ts` | `shared/knowledge-base/` recursive |
| `search.ts` | Full-text search over memory/ |
| `cognitive.ts` | Cognitive health JSON |
| `engagement.ts` | `engagement-audit.jsonl` + cognitive JSON |
| `types.ts` | Shared type definitions |

## Content Pipeline Integration

The `/content` page tracks V3 pipeline jobs:
- **6 content types:** proof, news_relay, viral_ride, hot_take, war_story, reaction
- **3 production modes:** heygen-hybrid, heygen-full, screen-demo
- **States:** intake → approved → scripted → rendered → preview_sent → approved → published (+ quarantined, killed)
- **Shared constants** in `pipeline-constants.ts`

## Development

```bash
npm run dev      # Local dev (reads workspace files directly)
npm run build    # Production build
npm run lint     # ESLint
```

## Known Issues (from March 10 audit)
- Auth cookie not cryptographically signed (security risk)
- Some parsers use `execSync` (blocks request thread)
- `df -g` in system parser is macOS-specific
- SSE via chokidar is local-only; Vercel uses hash-polling instead
- SQLite schema exists but tables are never populated

## Workspace Data Contract

Mission Control parsers depend on the OpenClaw workspace file structure. Key files:
- `memory/heartbeat-state.md` — heartbeat status
- `memory/today-digest.md` — daily digest
- `memory/pending-actions.md` — pending actions
- `intel/DAILY-INTEL.md` — daily intelligence
- `metrics/dashboard.md` — metrics snapshot
- `content-engine/state/` — pipeline state files
- `content-engine/proof/` — proof manifests
- `content-engine/renders/` — render manifests/jobs
- `.agents/*/config.json` — agent configurations
- `comms/*.md` — agent communications
- `shared/knowledge-base/` — knowledge base files

Changes to these file formats can break Mission Control parsers.
