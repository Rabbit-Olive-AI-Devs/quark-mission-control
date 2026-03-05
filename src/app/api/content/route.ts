import { NextResponse } from "next/server";
import { parseContentLog, parseHookTracker, parseContentCalendar, parseHookLibrary } from "@/lib/parsers/content";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    posts: parseContentLog(),
    hookCategories: parseHookTracker(),
    calendar: parseContentCalendar(),
    hookLibrary: parseHookLibrary(),
  });
}
