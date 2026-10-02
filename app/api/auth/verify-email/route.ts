import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { consumeVerificationToken, issueVerification } from "@/lib/verification";

const schema = z.object({ token: z.string().min(1) });

/** Confirms an address. Public: the person clicking the link may not be signed in. */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "verifyEmail");
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "We couldn't read that request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ outcome: "invalid" as const }, { status: 400 });

  try {
    const outcome = await consumeVerificationToken(parsed.data.token);
    return NextResponse.json({ outcome }, { status: outcome === "verified" || outcome === "already-verified" ? 200 : 400 });
  } catch (error) {
    console.error("> [verify-email] unexpected failure:", error);
    return NextResponse.json({ error: "We couldn't confirm that link just now." }, { status: 500 });
  }
}

/** Sends a fresh link to the signed-in user. */
export async function PUT(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const limited = rateLimit(req, "verifyEmail", auth.user.id);
  if (limited) return limited;

  try {
    const result = await issueVerification(auth.user);
    if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("> [verify-email] resend failed:", error);
    return NextResponse.json({ error: "We couldn't send that email just now." }, { status: 500 });
  }
}
