import { NextResponse } from "next/server";
import { parseCronList } from "@/lib/parsers/cron";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("cron");
    if (data) return NextResponse.json(data);
  }

  const jobs = parseCronList();
  return NextResponse.json({
    jobs,
    summary: {
      total: jobs.length,
      ok: jobs.filter((j) => j.status === "ok").length,
      failed: jobs.filter((j) => j.status !== "ok" && j.status !== "unknown").length,
    },
  });
}
