import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { UNLIMITED } from "@/lib/plans";

type RouteContext = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  description: z.string().max(300).nullable().optional(),
  priceINR: z.number().int().min(0).max(10_000_000).optional(),
  maxChatbots: z.number().int().min(0).max(UNLIMITED).optional(),
  maxMonthlyUsers: z.number().int().min(0).max(UNLIMITED).optional(),
  isPaid: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  maxLiveVisitors: z.number().int().min(0).max(10_000).optional(),
  supportsDashboardChat: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await prisma.plan.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const plan = await prisma.plan.update({
    where: { id },
    data: parsed.data,
    include: { _count: { select: { users: true } } },
  });
  return NextResponse.json({ plan });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const plan = await prisma.plan.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  if (plan._count.users > 0) {
    return NextResponse.json(
      { error: `${plan._count.users} account(s) are on this plan. Move them to another plan first.` },
      { status: 400 }
    );
  }
  if (plan.slug === "free") {
    return NextResponse.json({ error: "The free plan is used for new signups and can't be deleted" }, { status: 400 });
  }

  await prisma.plan.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
