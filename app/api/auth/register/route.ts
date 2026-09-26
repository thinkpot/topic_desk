import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { publicUser } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function POST(req: NextRequest) {
  const parsed = registerSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });

  const freePlan = await prisma.plan.findUnique({ where: { slug: "free" } });
  if (!freePlan) {
    return NextResponse.json({ error: "Signup is unavailable: no default plan configured." }, { status: 503 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      planId: freePlan.id,
      // Free is a 3-day trial, not a permanent tier — accountBlockReason()
      // locks the account out once this passes, until an admin upgrades them.
      planExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    include: { plan: true },
  });

  const token = signToken({ userId: user.id });
  return NextResponse.json({ token, user: publicUser(user) }, { status: 201 });
}
