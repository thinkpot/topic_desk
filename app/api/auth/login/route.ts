import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { publicUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email()),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "login");
  if (limited) return limited;

  const parsed = loginSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { email, password } = parsed.data;

  // Per-account limit too, so a botnet spread over many IPs still can't
  // hammer one account's password.
  const accountLimited = rateLimit(req, "loginAccount", email);
  if (accountLimited) return accountLimited;

  const user = await prisma.user.findUnique({ where: { email }, include: { plan: true } });
  // verifyPassword runs a bcrypt compare even when the user doesn't exist, so
  // response time doesn't reveal which emails have accounts.
  const valid = await verifyPassword(password, user?.password);
  if (!user || !valid) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  if (user.isSuspended) {
    return NextResponse.json({ error: "This account has been suspended. Contact support." }, { status: 403 });
  }

  const token = signToken({ userId: user.id, v: user.tokenVersion });
  return NextResponse.json({ token, user: publicUser(user) });
}
