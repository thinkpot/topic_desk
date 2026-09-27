import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import type { OnboardingProgress } from "@/lib/onboarding";

// Every step is derived from real data rather than stored flags, so the
// checklist can't drift from what's actually true about the account.
export async function GET(req: NextRequest) {
  const auth = await requireActiveUser(req);
  if ("response" in auth) return auth.response;
  const owned = { chatbot: { userId: auth.user.id } };

  const [firstBot, seen, chat, reply] = await Promise.all([
    prisma.chatbot.findFirst({ where: { userId: auth.user.id }, orderBy: { createdAt: "asc" }, select: { id: true } }),
    prisma.widgetStat.findFirst({ where: { ...owned, views: { gt: 0 } }, select: { chatbotId: true } }),
    prisma.conversation.findFirst({ where: owned, select: { id: true } }),
    prisma.message.findFirst({ where: { sender: "AGENT", conversation: owned }, select: { id: true } }),
  ]);

  const progress: OnboardingProgress = {
    connected: !!firstBot,
    installed: !!seen,
    firstChat: !!chat,
    firstReply: !!reply,
    chatbotId: firstBot?.id ?? null,
  };
  return NextResponse.json({ progress });
}
