import { NextResponse } from "next/server";
import { parseContentLifecycle } from "@/lib/parsers/content-lifecycle";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = parseContentLifecycle();
  return NextResponse.json(data);
}
