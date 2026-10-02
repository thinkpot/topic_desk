import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyOperator } from "@/lib/mailer";
import { trialsExpiringEmail } from "@/lib/email-templates";
import { TRIAL_PLAN_SLUG } from "@/lib/plans";

/**
 * Daily digest of trials ending within 24 hours.
 *
 * Protected by CRON_SECRET rather than a session: the caller is a scheduler,
 * not a person. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
 * automatically when that variable is set on the project.
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
    const now = new Date();
    const cutoff = new Date(now.getTime() + 24 * 3_600_000);

    const expiring = await prisma.user.findMany({
      where: {
        plan: { slug: TRIAL_PLAN_SLUG },
        isSuspended: false,
        planExpiresAt: { gt: now, lte: cutoff },
      },
      select: {
        name: true,
        email: true,
        companyName: true,
        planExpiresAt: true,
        _count: { select: { chatbots: true } },
      },
      orderBy: { planExpiresAt: "asc" },
    });

    if (expiring.length === 0) return NextResponse.json({ ok: true, expiring: 0 });

    const result = await notifyOperator(
      trialsExpiringEmail(
        expiring.map((u) => ({
          name: u.name,
          email: u.email,
          companyName: u.companyName,
          hasChatbot: u._count.chatbots > 0,
          endsAt: u.planExpiresAt!,
        }))
      )
    );

    return NextResponse.json({ ok: true, expiring: expiring.length, emailed: result.sent });
  } catch (error) {
    console.error("> [cron/trial-expiring] failed:", error);
    return NextResponse.json({ error: "Failed to build the digest" }, { status: 500 });
  }
}
