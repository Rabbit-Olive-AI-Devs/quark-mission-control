import { NextResponse } from "next/server";
import { parsePending } from "@/lib/parsers/pending";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(parsePending());
}
