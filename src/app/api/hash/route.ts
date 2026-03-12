import { NextResponse } from "next/server";
import { computeWorkspaceHash } from "@/lib/hash";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: Request) {
  const cors = corsHeaders(request);

  // On Vercel (remote), this endpoint is not used — client polls MacBook directly
  if (process.env.SNAPSHOT_URL) {
    return NextResponse.json({ error: "local only" }, { status: 404, headers: cors });
  }

  // Auth check (same as /api/snapshot)
  const authHeader = request.headers.get("authorization");
  const snapshotKey = process.env.SNAPSHOT_API_KEY;
  if (snapshotKey && authHeader !== `Bearer ${snapshotKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }

  const hash = await computeWorkspaceHash();

  return NextResponse.json(
    { hash, timestamp: new Date().toISOString() },
    { headers: { ...cors, "Cache-Control": "no-store" } }
  );
}
