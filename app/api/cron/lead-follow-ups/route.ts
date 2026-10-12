import { NextRequest, NextResponse } from "next/server";
import { runFollowUpSweep } from "@/lib/leads";

/**
 * Sends lead follow-up emails that have come due.
 *
 * Protected by CRON_SECRET like the other cron routes. Safe to call as often
 * as you like — each lead is claimed atomically, so overlapping runs never
 * double-send. It's hit daily by Vercel Cron (vercel.json) as a backstop and
 * every 15 minutes by .github/workflows/lead-follow-ups.yml, since Vercel's
 * Hobby plan only allows daily cron jobs.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({ ok: true, ...(await runFollowUpSweep()) });
  } catch (error) {
    console.error("> [cron/lead-follow-ups] failed:", error);
    return NextResponse.json({ error: "Follow-up sweep failed" }, { status: 500 });
  }
}
