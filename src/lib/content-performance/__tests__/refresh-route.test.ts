import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/content-performance/refresh/route";

describe("content-performance refresh route", () => {
  it("returns 200 and watermark on refresh", async () => {
    const req = new NextRequest("http://localhost/api/content-performance/refresh", {
      method: "POST",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(typeof body.lastSuccessAt).toBe("string");
    expect(typeof body.refreshedAt).toBe("string");
  });

  it("returns 405 for invalid method", async () => {
    const req = new NextRequest("http://localhost/api/content-performance/refresh", {
      method: "GET",
    });

    const res = await GET(req);
    expect(res.status).toBe(405);
  });
});
