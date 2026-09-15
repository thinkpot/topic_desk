import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = loginSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  const token = signToken({ userId: user.id });
  return NextResponse.json({ token, user: { id: user.id, name: user.name, email: user.email, plan: user.plan } });
}
