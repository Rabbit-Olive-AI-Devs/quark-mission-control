import { NextResponse } from "next/server";
import { parseIntel } from "@/lib/parsers/intel";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(parseIntel());
}
