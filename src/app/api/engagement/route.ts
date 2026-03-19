import { NextResponse } from "next/server";
import { parseEngagement } from "@/lib/parsers/engagement";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(parseEngagement());
}
