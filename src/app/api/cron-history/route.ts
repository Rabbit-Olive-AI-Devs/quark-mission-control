import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Cron history is now sourced from command-center JSONL parsing
  return NextResponse.json({
    history: [],
    reliability: 100,
    note: "Use /api/command-center for cron run history",
  });
}
