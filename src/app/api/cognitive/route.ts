import { NextResponse } from "next/server";
import { parseCognitive } from "@/lib/parsers/cognitive";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(parseCognitive());
}
