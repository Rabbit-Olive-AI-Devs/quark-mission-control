# Mission Control Developer Guide

## Content Performance Module (`/content-performance`)

### Data sources
- `content-engine/state/publish-audit.jsonl`
- `content-engine/state/engagement-audit.jsonl`
- `metrics/daily/*.md`
- `metrics/cognitive/*.json`

### Core formulas
- **X**: `likes + replies + reposts + bookmarks`
- **TikTok / Instagram**: `likes + comments + shares + saves`
- **YouTube**: `likes + comments + shares`
- **Substack**: `likes + comments + restacks`

### Ranking
- Per-platform z-score normalization in active window.
- Blended score: `0.60 * normalizedEngagement + 0.40 * normalizedViews`.
- Missing views => `views = null`, `engagementOnly = true`.
- Tie-break: blended score desc, raw engagement desc, id asc.

### Governance
- Score version is bound at compute time (`v1` active baseline).
- Historical recompute cannot switch score version without explicit migration.
- Backfill default recompute strategy is `affected-windows-only`.

### Runtime behavior
- Hourly cache TTL.
- Stale flag when `now - lastSuccessAt > 90m`.
- Manual rebuild endpoint: `POST /api/content-performance/refresh`.
- Refresh endpoint appends audit event (`content-performance-audit.jsonl`).
