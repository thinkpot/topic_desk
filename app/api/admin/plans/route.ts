import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { UNLIMITED } from "@/lib/plans";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  const plans = await prisma.plan.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { users: true } } },
  });
  return NextResponse.json({ plans });
}

const planSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and dashes"),
  name: z.string().min(1).max(60),
  description: z.string().max(300).nullable().optional(),
  priceINR: z.number().int().min(0).max(10_000_000),
  maxChatbots: z.number().int().min(0).max(UNLIMITED),
  maxMonthlyUsers: z.number().int().min(0).max(UNLIMITED),
  isPaid: z.boolean(),
  isPublic: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  const parsed = planSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await prisma.plan.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return NextResponse.json({ error: "A plan with that slug already exists" }, { status: 409 });

  const plan = await prisma.plan.create({
    data: parsed.data,
    include: { _count: { select: { users: true } } },
  });
  return NextResponse.json({ plan }, { status: 201 });
}
