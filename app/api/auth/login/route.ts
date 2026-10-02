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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "We couldn't read that request. Please try again." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { email, password } = parsed.data;

  // Per-account limit too, so a botnet spread over many IPs still can't
  // hammer one account's password.
  const accountLimited = rateLimit(req, "loginAccount", email);
  if (accountLimited) return accountLimited;

  try {
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
  } catch (error) {
    // A misconfigured JWT_SECRET throws here rather than at boot, because
    // serverless has no boot to fail at. Without this it escapes as Next's HTML
    // error page, leaving the client able to say only "something went wrong" —
    // which is exactly what makes a bad deployment variable slow to diagnose.
    console.error("> [login] unexpected failure (check JWT_SECRET and DATABASE_URL):", error);
    return NextResponse.json(
      { error: "We couldn't sign you in just now. Please try again in a moment." },
      { status: 500 }
    );
  }
}
