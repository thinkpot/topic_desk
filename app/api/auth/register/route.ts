import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";

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

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, password: hashed } });

  const token = signToken({ userId: user.id });
  return NextResponse.json(
    { token, user: { id: user.id, name: user.name, email: user.email, plan: user.plan } },
    { status: 201 }
  );
}
