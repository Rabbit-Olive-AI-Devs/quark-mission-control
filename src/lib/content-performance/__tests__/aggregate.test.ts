import { describe, expect, it } from "vitest";
import { computePlatformEngagement, computeEvolutionSeries } from "@/lib/content-performance/aggregate";

describe("aggregation formulas", () => {
  it("computes canonical engagement per platform", () => {
    expect(computePlatformEngagement("x", { likes: 10, replies: 3, reposts: 2, bookmarks: 1 })).toBe(16);
    expect(computePlatformEngagement("tiktok", { likes: 10, comments: 3, shares: 2, saves: 1 })).toBe(16);
    expect(computePlatformEngagement("instagram", { likes: 10, comments: 3, shares: 2, saves: 1 })).toBe(16);
    expect(computePlatformEngagement("youtube", { likes: 10, comments: 3, shares: 2 })).toBe(15);
    expect(computePlatformEngagement("substack", { likes: 10, comments: 3, restacks: 2 })).toBe(15);
  });

  it("computes deterministic evolution series including rolling trend", () => {
    const points = computeEvolutionSeries([
      { dayKey: "2026-03-01", posts: 2, engagements: 20 },
      { dayKey: "2026-03-02", posts: 1, engagements: 30 },
      { dayKey: "2026-03-03", posts: 3, engagements: 12 },
      { dayKey: "2026-03-04", posts: 2, engagements: 10 },
      { dayKey: "2026-03-05", posts: 2, engagements: 8 },
      { dayKey: "2026-03-06", posts: 1, engagements: 5 },
      { dayKey: "2026-03-07", posts: 1, engagements: 7 },
    ]);

    expect(points[0].engagementPerPost).toBe(10);
    expect(points[1].engagementPerPost).toBe(30);
    expect(points[6].rolling7dEngagement).toBeCloseTo((20 + 30 + 12 + 10 + 8 + 5 + 7) / 7, 6);
  });
});
