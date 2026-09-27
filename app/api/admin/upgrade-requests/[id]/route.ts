import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { planPeriodEnd } from "@/lib/plans";

type RouteContext = { params: Promise<{ id: string }> };

const schema = z.object({ action: z.enum(["approve", "reject"]) });

// Approving is what actually moves the account onto the plan — the manual
// stand-in for a payment webhook until a gateway is wired up.
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const request = await prisma.upgradeRequest.findUnique({ where: { id }, include: { user: true } });
  if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (request.status !== "PENDING") {
    return NextResponse.json({ error: `This request was already ${request.status.toLowerCase()}` }, { status: 409 });
  }

  const resolved = { resolvedById: auth.user.id, resolvedAt: new Date() };

  if (parsed.data.action === "reject") {
    await prisma.upgradeRequest.update({ where: { id }, data: { status: "REJECTED", ...resolved } });
    return NextResponse.json({ ok: true });
  }

  // Renewing the same plan early extends from the current expiry, so the
  // customer doesn't lose the days they already had.
  const { user } = request;
  const extendFrom =
    user.planId === request.planId && user.planExpiresAt && user.planExpiresAt > new Date()
      ? user.planExpiresAt
      : new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { planId: request.planId, planExpiresAt: planPeriodEnd(request.billingCycle, extendFrom) },
    }),
    prisma.upgradeRequest.update({ where: { id }, data: { status: "APPROVED", ...resolved } }),
  ]);
  return NextResponse.json({ ok: true });
}
