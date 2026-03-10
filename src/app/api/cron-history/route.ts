import { NextResponse } from "next/server";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("commandCenter");
    if (data) {
      const cc = data as { windows?: { last7d?: { successRate?: number } } };
      return NextResponse.json({
        history: [],
        reliability: cc.windows?.last7d?.successRate ?? 100,
      });
    }
  }

  // Cron history is now sourced from command-center JSONL parsing
  return NextResponse.json({
    history: [],
    reliability: 100,
    note: "Use /api/command-center for cron run history",
  });
}
