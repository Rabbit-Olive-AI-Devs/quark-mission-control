import { NextResponse } from "next/server";
import { getCronHistory, getCronReliability } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId") || undefined;
  const days = parseInt(searchParams.get("days") || "30");

  return NextResponse.json({
    history: getCronHistory(jobId, days),
    reliability: getCronReliability(days),
  });
}
