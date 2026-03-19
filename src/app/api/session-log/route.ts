import { NextResponse } from "next/server";
import { parseSessionLog } from "@/lib/parsers/session-log";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || undefined;
  return NextResponse.json({ entries: parseSessionLog(date) });
}
