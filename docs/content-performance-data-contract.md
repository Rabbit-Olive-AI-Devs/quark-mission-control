# Content Performance Data Contract

## 1) Source contracts

### Publish audit (`publish-audit.jsonl`)
Required:
- `id`
- `platform`
- `contentType`
- `publishedAt`

Optional:
- `campaignId`
- `authorId`
- `url`
- `recordedAt`

Derived:
- `publishedDayKey` (America/Chicago)
- `lateArrival` (true when `recordedAt` resolves to a later Chicago day than `publishedAt`)

### Engagement audit (`engagement-audit.jsonl`)
Required:
- `publishId`
- `platform`
- `capturedAt`

Optional metrics (default `0`):
- `likes`, `comments`, `shares`, `saves`

Views behavior:
- missing/invalid `views` => `views = null`, `engagementOnly = true`

Derived:
- `dayKey` (America/Chicago)
- `lateArrival`

### Daily metrics (`metrics/daily/*.md`)
Frontmatter required:
- `date`
- `platform`

Frontmatter optional (default `0`):
- `publishedCount`
- `impressions`
- `engagements`

Derived:
- `dayKey` from `date` (America/Chicago)

### Cognitive metrics (`metrics/cognitive/*.json`)
Required per record:
- `signalDate`

Optional (default behavior):
- `cognitiveScore` => default `0`
- `degradationDetected` => default `false`
- `trigger` => optional string

Derived:
- `dayKey` (America/Chicago)

---

## 2) Aggregation contract

Four evolution series are rendered:
1. daily publishes
2. daily total engagements
3. engagement-per-post
4. 7-day rolling engagement trend

Window selector supports: `7`, `14`, `30` days.

---

## 3) Ranking contract

### Canonical engagement formulas
- X: `likes + replies + reposts + bookmarks`
- TikTok/Instagram: `likes + comments + shares + saves`
- YouTube: `likes + comments + shares`
- Substack: `likes + comments + restacks`

### Normalization and blend
- z-score per platform within active window
- blended score = `0.60 * normalizedEngagement + 0.40 * normalizedViews`

### Tie-break
1. blended score desc
2. raw engagement desc
3. id asc

---

## 4) Score-version governance

Registry fields:
- `scoreVersion`
- `effectiveFrom`
- `effectiveTo?`
- `status`
- `successorVersion?`
- versioned weights

Rules:
- v1 baseline weights: engagement `0.60`, views `0.40`
- deprecated versions must declare `successorVersion`
- historical recompute cannot switch versions unless migration is explicitly allowed/logged

---

## 5) Backfill + stale behavior

Backfill policy:
- auto: max 30 days
- manual: max 365 days
- recompute strategy: impacted windows only
- preserve historical score version unless migration logged

Freshness policy:
- hourly cache refresh
- stale when `now - lastSuccessAt > 90 minutes`
