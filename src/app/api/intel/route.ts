import { NextResponse } from "next/server";
import { parseIntel } from "@/lib/parsers/intel";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || undefined;
  return NextResponse.json(parseIntel(date));
}
