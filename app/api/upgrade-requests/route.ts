import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

// Deliberately requireUser, not requireActiveUser: an account whose trial has
// ended is exactly the one that needs to ask for a plan.

const include = { plan: { select: { id: true, name: true, priceINR: true, priceYearlyINR: true } } } as const;

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const requests = await prisma.upgradeRequest.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include,
  });
  return NextResponse.json({ requests });
}

const createSchema = z.object({
  planId: z.string().min(1),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
  note: z.string().trim().max(500).optional().transform((v) => v || undefined),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const limited = rateLimit(req, "upgradeRequest", auth.user.id);
  if (limited) return limited;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { planId, billingCycle, note } = parsed.data;

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isPublic || !plan.isPaid || plan.priceINR <= 0) {
    return NextResponse.json({ error: "That plan isn't available to request." }, { status: 400 });
  }
  if (billingCycle === "YEARLY" && plan.priceYearlyINR <= 0) {
    return NextResponse.json({ error: "That plan doesn't offer yearly billing." }, { status: 400 });
  }

  // One open request per account: asking again just changes what's asked for.
  const pending = await prisma.upgradeRequest.findFirst({ where: { userId: auth.user.id, status: "PENDING" } });
  const request = pending
    ? await prisma.upgradeRequest.update({
        where: { id: pending.id },
        data: { planId, billingCycle, note, createdAt: new Date() },
        include,
      })
    : await prisma.upgradeRequest.create({
        data: { userId: auth.user.id, planId, billingCycle, note },
        include,
      });

  return NextResponse.json({ request }, { status: pending ? 200 : 201 });
}
