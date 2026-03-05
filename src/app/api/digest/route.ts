import { NextResponse } from "next/server";
import { parseDigest } from "@/lib/parsers/digest";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ sections: parseDigest() });
}
