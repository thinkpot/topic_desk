import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      plan: { select: { id: true, name: true, slug: true, priceINR: true } },
      _count: { select: { chatbots: true } },
    },
  });

  return NextResponse.json({
    users: users.map(({ password, ...user }) => user),
  });
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  planId: z.string().min(1),
  role: z.enum(["USER", "ADMIN"]).optional(),
  planExpiresAt: z.string().datetime().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { name, email, password, planId, role, planExpiresAt } = parsed.data;

  const [existing, plan] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.plan.findUnique({ where: { id: planId } }),
  ]);
  if (existing) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  if (!plan) return NextResponse.json({ error: "That plan no longer exists" }, { status: 400 });

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: await bcrypt.hash(password, 10),
      planId,
      role: role ?? "USER",
      planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : null,
    },
    include: { plan: { select: { id: true, name: true, slug: true, priceINR: true } }, _count: { select: { chatbots: true } } },
  });

  const { password: _pw, ...safeUser } = user;
  return NextResponse.json({ user: safeUser }, { status: 201 });
}
