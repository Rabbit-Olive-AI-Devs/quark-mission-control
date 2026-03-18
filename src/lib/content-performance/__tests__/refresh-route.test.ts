import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  delete process.env.SNAPSHOT_API_KEY;
});

describe("content-performance refresh route", () => {
  it("returns 200, watermark, and appends audit event", async () => {
    const appendAuditEvent = vi.fn();
    const refreshNow = vi.fn(() => ({
      meta: {
        refreshedAt: "2026-03-18T15:00:00.000Z",
        lastSuccessAt: "2026-03-18T15:00:00.000Z",
        stale: false,
      },
    }));

    vi.doMock("@/lib/content-performance/audit-log", () => ({ appendAuditEvent }));
    vi.doMock("@/lib/content-performance/service", () => ({
      contentPerformanceService: { refreshNow },
      loadServiceSources: () => ({}) as unknown,
    }));

    const { POST } = await import("@/app/api/content-performance/refresh/route");

    const req = new NextRequest("http://localhost/api/content-performance/refresh", { method: "POST" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.lastSuccessAt).toBe("2026-03-18T15:00:00.000Z");
    expect(appendAuditEvent).toHaveBeenCalledTimes(1);
  });

  it("returns 401 when auth is required and missing", async () => {
    process.env.SNAPSHOT_API_KEY = "secret-key";

    vi.doMock("@/lib/content-performance/audit-log", () => ({ appendAuditEvent: vi.fn() }));
    vi.doMock("@/lib/content-performance/service", () => ({
      contentPerformanceService: { refreshNow: vi.fn() },
      loadServiceSources: () => ({}) as unknown,
    }));

    const { POST } = await import("@/app/api/content-performance/refresh/route");
    const req = new NextRequest("http://localhost/api/content-performance/refresh", { method: "POST" });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 405 for invalid method", async () => {
    const { GET } = await import("@/app/api/content-performance/refresh/route");
    const req = new NextRequest("http://localhost/api/content-performance/refresh", { method: "GET" });

    const res = await GET(req);
    expect(res.status).toBe(405);
  });

  it("returns 500 when refresh service throws", async () => {
    vi.doMock("@/lib/content-performance/audit-log", () => ({ appendAuditEvent: vi.fn() }));
    vi.doMock("@/lib/content-performance/service", () => ({
      contentPerformanceService: {
        refreshNow: vi.fn(() => {
          throw new Error("boom");
        }),
      },
      loadServiceSources: () => ({}) as unknown,
    }));

    const { POST } = await import("@/app/api/content-performance/refresh/route");
    const req = new NextRequest("http://localhost/api/content-performance/refresh", { method: "POST" });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
