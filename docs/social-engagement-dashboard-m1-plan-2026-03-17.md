# Social Engagement Dashboard — Milestone 1 Plan

## Strategy
Unified approach: extend existing `/engagement` into a single performance surface combining outbound actions + inbound outcomes.

## KPI Model (M1)
- Reach/Visibility: impressions, reach, profile visits
- Engagement: likes, comments, shares, saves, engagement rate
- Responsiveness: replies sent, unanswered count, response latency
- Growth: follower delta, growth velocity
- Conversion Proxies: link clicks/CTR where available

## Data Sources (M1)
1. Chandler outputs (existing metrics artifacts)
2. Genviral analytics (TikTok/Instagram)
3. Existing engagement-audit.jsonl (outbound actions)

## Slices
1. Contract + mapping layer
   - Define normalized `EngagementMetricPoint`
   - Source adapters: chandler/genviral/audit
2. API aggregation
   - Extend `/api/engagement` to emit unified payload
3. UI integration
   - Update scorecards/charts/feed for unified KPI view
4. Validation
   - Build/test, sample data checks, regression pass

## Acceptance for M1
- `/engagement` displays unified inbound + outbound view
- At least 2 real source adapters active
- Backward compatibility preserved
