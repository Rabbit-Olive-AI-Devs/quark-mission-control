# Content Performance Operational Runbook

## Purpose
Operational steps for refreshing, validating, and safely backfilling `/content-performance`.

## Manual refresh
### API
`POST /api/content-performance/refresh`

Expected response:
- `status: ok`
- `refreshedAt`
- `lastSuccessAt`
- `stale`

### UI
Use **Refresh now** button in `/content-performance`.

## Backfill operations
### Auto backfill triggers
- parser/schema contract change
- late-arrival detection

### Limits
- auto: 30 days
- manual: up to 365 days

### Safety rules
- recompute only affected windows
- preserve original score version unless migration is explicitly logged

## Stale banner behavior
- Stale flag when last successful refresh is older than 90 minutes.
- UI must show stale warning and last success timestamp.

## Audit trail requirements
Append-only JSONL file:
- `data/content-performance-audit.jsonl`

Events must include:
- `timestamp`
- `eventType`
- `scoreVersion`
- `parserVersion`
- `details`
- `actor`

## QA screenshot checklist
Capture and store screenshots for:
1. Page header + window selector + last refresh badge
2. Evolution charts block
3. Top posts table (with score + native metrics)
4. Platform tabs switching (X/TikTok/Instagram/YouTube/Substack)
5. Content-type comparison chart
6. Stale banner visible state
7. Audit trail table newest-first state

## Pre-rollout verification
Run:
- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`

Then perform manual QA on `/content-performance` using checklist above.
