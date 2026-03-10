import { NextResponse } from "next/server";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("commandCenter");
    if (data) {
      const cc = data as { topModels7d?: unknown[] };
      return NextResponse.json({ usage: cc.topModels7d || [] });
    }
  }

  // Model usage data is now sourced from command-center JSONL parsing
  return NextResponse.json({ usage: [], note: "Use /api/command-center for model usage data" });
}
