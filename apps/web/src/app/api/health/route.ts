import { NextResponse } from "next/server";

import { getHealth } from "@/lib/health";

export function GET() {
  return NextResponse.json(getHealth());
}
