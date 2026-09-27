import { NextResponse } from "next/server";

// Liveness probe — used by the dev tunnel watchdog, and by any uptime monitor.
export async function GET() {
  return NextResponse.json({ ok: true });
}
