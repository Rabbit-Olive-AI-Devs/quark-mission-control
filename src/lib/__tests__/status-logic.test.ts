import { describe, it, expect } from "vitest";
import {
  derivePipelineStatus,
  deriveCronStatus,
  deriveQuotaStatus,
  deriveQuarkStatus,
  deriveSystemStatus,
} from "../status-logic";

describe("derivePipelineStatus", () => {
  it("returns healthy when no jobs stuck", () => {
    const result = derivePipelineStatus({
      jobs: [
        { status: "published", updated_at: new Date().toISOString() },
      ],
    });
    expect(result.level).toBe("healthy");
  });

  it("returns warning when a job is stuck >1h at non-approval stage", () => {
    const stuckTime = new Date(Date.now() - 2 * 3600_000).toISOString();
    const result = derivePipelineStatus({
      jobs: [
        { status: "render_pending", updated_at: stuckTime, stage: "L4b" },
      ],
    });
    expect(result.level).toBe("warning");
    expect(result.sentence).toContain("stuck");
  });

  it("ignores preview_sent jobs (awaiting approval is not stuck)", () => {
    const oldTime = new Date(Date.now() - 5 * 3600_000).toISOString();
    const result = derivePipelineStatus({
      jobs: [
        { status: "preview_sent", updated_at: oldTime },
      ],
    });
    expect(result.level).toBe("healthy");
  });
});

describe("deriveCronStatus", () => {
  it("returns healthy when all jobs OK", () => {
    const result = deriveCronStatus({
      jobs: [
        { name: "Morning", status: "ok" },
        { name: "Heartbeat", status: "ok" },
      ],
    });
    expect(result.level).toBe("healthy");
    expect(result.sentence).toContain("healthy");
  });

  it("returns critical when jobs have errors", () => {
    const result = deriveCronStatus({
      jobs: [
        { name: "Morning", status: "ok" },
        { name: "Cassian", status: "error", lastError: "timeout" },
      ],
    });
    expect(result.level).toBe("critical");
    expect(result.sentence).toContain("failed");
    expect(result.sentence).toContain("Cassian");
  });
});

describe("deriveQuotaStatus", () => {
  it("returns healthy above 40%", () => {
    const result = deriveQuotaStatus({ dailyPct: 68, weeklyPct: 55 });
    expect(result.level).toBe("healthy");
  });

  it("returns warning between 20-40%", () => {
    const result = deriveQuotaStatus({ dailyPct: 25, weeklyPct: 55 });
    expect(result.level).toBe("warning");
  });

  it("returns critical below 20%", () => {
    const result = deriveQuotaStatus({ dailyPct: 15, weeklyPct: 10 });
    expect(result.level).toBe("critical");
    expect(result.sentence).toContain("exhausts");
  });
});

describe("deriveQuarkStatus", () => {
  it("returns healthy when recent heartbeat and no failures", () => {
    const recent = new Date(Date.now() - 5 * 60_000).toISOString();
    const result = deriveQuarkStatus({
      lastHeartbeat: recent,
      recentRuns: 14,
      recentFailures: 0,
      windowHours: 6,
    });
    expect(result.level).toBe("healthy");
  });

  it("returns warning when silent >30min", () => {
    const old = new Date(Date.now() - 45 * 60_000).toISOString();
    const result = deriveQuarkStatus({
      lastHeartbeat: old,
      recentRuns: 10,
      recentFailures: 0,
      windowHours: 6,
    });
    expect(result.level).toBe("warning");
    expect(result.sentence).toContain("Silent");
  });
});

describe("deriveSystemStatus", () => {
  it("returns healthy when all metrics below 80%", () => {
    const result = deriveSystemStatus({ cpu: 45, memory: 62, disk: 55 });
    expect(result.level).toBe("healthy");
    expect(result.cpu).toBe(45);
  });

  it("returns warning when any metric above 80%", () => {
    const result = deriveSystemStatus({ cpu: 85, memory: 62, disk: 55 });
    expect(result.level).toBe("warning");
  });

  it("returns critical when any metric above 95%", () => {
    const result = deriveSystemStatus({ cpu: 45, memory: 97, disk: 55 });
    expect(result.level).toBe("critical");
  });
});
