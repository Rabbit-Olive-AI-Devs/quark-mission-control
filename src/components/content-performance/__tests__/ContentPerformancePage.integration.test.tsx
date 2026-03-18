import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContentPerformancePage } from "@/components/content-performance/ContentPerformancePage";
import { rankPosts } from "@/lib/content-performance/ranking";

describe("ContentPerformancePage integration", () => {
  it("renders computed DTO-like values for ranking, series, and stale metadata", () => {
    const ranked = rankPosts([
      { id: "post-z", platform: "x", engagement: 20, views: 200, scoreVersion: "v1" },
      { id: "post-a", platform: "x", engagement: 40, views: 600, scoreVersion: "v1" },
      { id: "post-b", platform: "x", engagement: 30, views: 300, scoreVersion: "v1" },
    ]);

    const topRows = ranked.map((row) => ({
      id: row.id,
      platform: row.platform,
      normalizedScore: row.blendedScore,
      rawMetrics: {
        likes: row.rawEngagement,
        comments: 0,
        shares: 0,
        views: row.views,
      },
    }));

    const evolutionRows = [
      { dayKey: "2026-03-12", publishes: 2, totalEngagements: 24, engagementPerPost: 12, rolling7d: 12 },
      { dayKey: "2026-03-13", publishes: 1, totalEngagements: 18, engagementPerPost: 18, rolling7d: 13 },
      { dayKey: "2026-03-14", publishes: 3, totalEngagements: 42, engagementPerPost: 14, rolling7d: 15 },
    ];

    render(
      <ContentPerformancePage
        dataset={[{ id: 1 }]}
        lastRefresh="2026-03-18T10:00:00.000Z"
        stale
        lastSuccessAt="2026-03-18T08:20:00.000Z"
        evolutionRows={evolutionRows}
        topPosts={topRows}
        auditEvents={[
          {
            timestamp: "2026-03-18T10:00:00.000Z",
            eventType: "ingest_run",
            scoreVersion: "v1",
            parserVersion: "p1",
            details: "manual refresh",
            actor: "operator",
          },
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: /content performance/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /time window/i })).toBeInTheDocument();
    expect(screen.getByText(/data may be stale/i)).toBeInTheDocument();
    expect(screen.getByText(/last success: 2026-03-18T08:20:00.000Z/i)).toBeInTheDocument();
    expect(screen.getByText("post-a")).toBeInTheDocument();
    expect(screen.getByText("post-b")).toBeInTheDocument();
    expect(screen.getByText(topRows[0].normalizedScore.toFixed(2))).toBeInTheDocument();
    expect(screen.getByText(/likes: 40/i)).toBeInTheDocument();
    expect(screen.getByText(/last refresh: 2026-03-18T10:00:00.000Z/i)).toBeInTheDocument();
    expect(screen.getByText(/audit trail/i)).toBeInTheDocument();
  });
});
