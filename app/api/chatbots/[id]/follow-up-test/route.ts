import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { buildFollowUpEmail } from "@/lib/leads";
import { emailConfigured, sendEmail } from "@/lib/mailer";

type RouteContext = { params: Promise<{ id: string }> };

// Sends the follow-up email, exactly as a lead would get it, to the owner's
// own address — so they can see it before switching follow-ups on.
export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireActiveUser(req);
  if ("response" in auth) return auth.response;
  const limited = rateLimit(req, "telegramVerify", auth.user.id);
  if (limited) return limited;

  const { id } = await params;
  const chatbot = await prisma.chatbot.findFirst({ where: { id, userId: auth.user.id } });
  if (!chatbot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
  if (!emailConfigured()) return NextResponse.json({ error: "Email sending isn't configured on this server." }, { status: 503 });

  const email = buildFollowUpEmail({ chatbot, user: auth.user, leadName: auth.user.name });
  const sent = await sendEmail({
    to: auth.user.email,
    subject: `[Test] ${email.subject}`,
    text: email.text,
    html: email.html,
    fromName: email.business,
    replyTo: auth.user.email,
  });
  if (!sent.sent) return NextResponse.json({ error: sent.reason ?? "Couldn't send the test email" }, { status: 502 });
  return NextResponse.json({ sentTo: auth.user.email });
}
