import { NextResponse } from "next/server";
import { parseEngagement, parseEngagementLive } from "@/lib/parsers/engagement";

export const dynamic = "force-dynamic";

export async function GET() {
  const legacy = parseEngagement();
  const live = parseEngagementLive();
  return NextResponse.json({ ...legacy, live });
}
