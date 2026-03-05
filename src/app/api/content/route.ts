import { NextResponse } from "next/server";
import { parseContentLog, parseHookTracker, parseContentCalendar, parseHookLibrary } from "@/lib/parsers/content";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("content");
    if (data) return NextResponse.json(data);
  }
  return NextResponse.json({
    posts: parseContentLog(),
    hookCategories: parseHookTracker(),
    calendar: parseContentCalendar(),
    hookLibrary: parseHookLibrary(),
  });
}
