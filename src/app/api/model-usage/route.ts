import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Model usage data is now sourced from command-center JSONL parsing
  return NextResponse.json({ usage: [], note: "Use /api/command-center for model usage data" });
}
