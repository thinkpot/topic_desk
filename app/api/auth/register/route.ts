import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { publicUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { TRIAL_PLAN_SLUG, trialEndsAt } from "@/lib/plans";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.string().email()),
  password: z.string().min(8).max(100),
  companyName: z.string().trim().max(120).optional().transform((v) => v || undefined),
  websiteUrl: z.string().trim().max(300).optional().transform((v) => v || undefined),
});

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "register");
  if (limited) return limited;

  const parsed = registerSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { name, email, password, companyName, websiteUrl } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });

  const trialPlan = await prisma.plan.findUnique({ where: { slug: TRIAL_PLAN_SLUG } });
  if (!trialPlan) {
    return NextResponse.json({ error: "Signup is unavailable: no default plan configured." }, { status: 503 });
  }

  const now = new Date();
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: await hashPassword(password),
      companyName,
      websiteUrl,
      planId: trialPlan.id,
      // The trial is the free plan with an expiry — no card, no payment
      // details. accountBlockReason() locks the account once it passes, until
      // an approved upgrade request moves it onto a paid plan.
      trialStartedAt: now,
      planExpiresAt: trialEndsAt(now),
    },
    include: { plan: true },
  });

  const token = signToken({ userId: user.id, v: user.tokenVersion });
  return NextResponse.json({ token, user: publicUser(user) }, { status: 201 });
}
