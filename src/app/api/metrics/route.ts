import { NextResponse } from "next/server";
import { parseMetrics } from "@/lib/parsers/metrics";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(parseMetrics());
}
