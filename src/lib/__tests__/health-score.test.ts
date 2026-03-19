import { describe, it, expect } from "vitest";
import { computeHealthScore, type HealthScoreInput } from "../status-logic";

function makeInput(overrides: Partial<HealthScoreInput> = {}): HealthScoreInput {
  return {
    cronOk: 20,
    cronTotal: 20,
    pipelineStuckCount: 0,
    pipelineQuarantinedCount: 0,
    quotaDailyPct: 100,
    quotaWeeklyPct: 100,
    systemCpu: 10,
    systemMemory: 20,
    systemDisk: 30,
    quarkLevel: "healthy",
    ...overrides,
  };
}

describe("computeHealthScore", () => {
  it("returns ~100 with all-healthy inputs", () => {
    const score = computeHealthScore(makeInput());
    // Cron: 100*0.30=30, Pipeline: 100*0.20=20, Quota: 100*0.20=20,
    // System: (100-30)*0.15=10.5, Quark: 100*0.15=15 => 95.5 => 96
    expect(score).toBeGreaterThanOrEqual(90);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns lower score with cron failures", () => {
    const allHealthy = computeHealthScore(makeInput());
    const withFailures = computeHealthScore(
      makeInput({ cronOk: 15, cronTotal: 20 })
    );
    expect(withFailures).toBeLessThan(allHealthy);
  });

  it("returns ~50 on pipeline component when stuck", () => {
    const score = computeHealthScore(makeInput({ pipelineStuckCount: 2 }));
    // Pipeline component drops from 100 to 50 (20% weight: loses 10 points)
    const fullScore = computeHealthScore(makeInput());
    expect(score).toBeLessThan(fullScore);
    expect(score).toBeGreaterThanOrEqual(80); // Only 10 point drop from pipeline
  });

  it("returns 0 pipeline component when quarantined", () => {
    const score = computeHealthScore(
      makeInput({ pipelineQuarantinedCount: 1 })
    );
    const fullScore = computeHealthScore(makeInput());
    // Pipeline goes from 100 to 0 at 20% weight => ~20 point drop
    expect(score).toBeLessThan(fullScore - 15);
  });

  it("returns proportional reduction with low quota", () => {
    const full = computeHealthScore(makeInput());
    const low = computeHealthScore(
      makeInput({ quotaDailyPct: 30, quotaWeeklyPct: 30 })
    );
    expect(low).toBeLessThan(full);
    // Quota drop: (100-30)*0.20 = 14 point reduction
    expect(full - low).toBeGreaterThanOrEqual(10);
    expect(full - low).toBeLessThanOrEqual(20);
  });

  it("returns lower score with critical quark", () => {
    const healthy = computeHealthScore(makeInput());
    const critical = computeHealthScore(makeInput({ quarkLevel: "critical" }));
    expect(critical).toBeLessThan(healthy);
    // Quark drops from 100 to 0 at 15% weight => 15 point reduction
    expect(healthy - critical).toBeGreaterThanOrEqual(12);
  });

  it("returns warning quark as intermediate score", () => {
    const healthy = computeHealthScore(makeInput());
    const warning = computeHealthScore(makeInput({ quarkLevel: "warning" }));
    const critical = computeHealthScore(makeInput({ quarkLevel: "critical" }));
    expect(warning).toBeLessThan(healthy);
    expect(warning).toBeGreaterThan(critical);
  });

  it("handles all zeros/empty gracefully", () => {
    const score = computeHealthScore({
      cronOk: 0,
      cronTotal: 0,
      pipelineStuckCount: 0,
      pipelineQuarantinedCount: 0,
      quotaDailyPct: 0,
      quotaWeeklyPct: 0,
      systemCpu: 0,
      systemMemory: 0,
      systemDisk: 0,
      quarkLevel: "healthy",
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("never returns below 0", () => {
    const score = computeHealthScore({
      cronOk: 0,
      cronTotal: 20,
      pipelineStuckCount: 5,
      pipelineQuarantinedCount: 3,
      quotaDailyPct: 0,
      quotaWeeklyPct: 0,
      systemCpu: 100,
      systemMemory: 100,
      systemDisk: 100,
      quarkLevel: "critical",
    });
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("never returns above 100", () => {
    const score = computeHealthScore({
      cronOk: 100,
      cronTotal: 100,
      pipelineStuckCount: 0,
      pipelineQuarantinedCount: 0,
      quotaDailyPct: 100,
      quotaWeeklyPct: 100,
      systemCpu: 0,
      systemMemory: 0,
      systemDisk: 0,
      quarkLevel: "healthy",
    });
    expect(score).toBeLessThanOrEqual(100);
  });

  it("clamps correctly when system usage exceeds 100%", () => {
    // Edge case: negative systemScore
    const score = computeHealthScore(
      makeInput({ systemCpu: 120, systemMemory: 0, systemDisk: 0 })
    );
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
