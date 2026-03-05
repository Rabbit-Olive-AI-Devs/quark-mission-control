import { NextResponse } from "next/server";
import { getModelUsageSummary } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "7");

  return NextResponse.json({
    usage: getModelUsageSummary(days),
  });
}
