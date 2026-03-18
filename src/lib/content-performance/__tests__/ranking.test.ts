import { describe, expect, it } from "vitest";
import { rankPosts, zScoreByPlatform } from "@/lib/content-performance/ranking";

describe("ranking engine", () => {
  it("produces deterministic z-score + blended scores", () => {
    const normalized = zScoreByPlatform([
      { id: "a", platform: "x", engagement: 10, views: 100, scoreVersion: "v1" },
      { id: "b", platform: "x", engagement: 20, views: 300, scoreVersion: "v1" },
      { id: "c", platform: "x", engagement: 30, views: 500, scoreVersion: "v1" },
    ]);

    expect(normalized).toHaveLength(3);
    expect(normalized[1].normalizedEngagement).toBeCloseTo(0, 6);
    expect(normalized[1].blendedScore).toBeCloseTo(0, 6);
  });

  it("applies tie-break by raw engagement then id", () => {
    const ranked = rankPosts([
      { id: "b", platform: "x", engagement: 100, views: null, scoreVersion: "v1" },
      { id: "a", platform: "x", engagement: 100, views: null, scoreVersion: "v1" },
    ]);

    expect(ranked[0].id).toBe("a");
    expect(ranked[1].id).toBe("b");
  });

  it("blocks cross-version recompute when immutability enforced", () => {
    expect(() =>
      rankPosts([
        { id: "a", platform: "x", engagement: 10, views: 50, scoreVersion: "v1", recomputeVersion: "v2" },
      ])
    ).toThrow(/historical recompute/i);
  });
});
