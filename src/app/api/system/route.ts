import { NextResponse } from "next/server";
import { getSystemInfo } from "@/lib/parsers/system";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getSystemInfo());
}
