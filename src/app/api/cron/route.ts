import { NextResponse } from "next/server";
import { parseCronList } from "@/lib/parsers/cron";

export const dynamic = "force-dynamic";

export async function GET() {
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
