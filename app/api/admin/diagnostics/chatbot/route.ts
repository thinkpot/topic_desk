import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Read-only diagnostic for "messages aren't reaching Telegram" that runs
 * inside the app itself, so it always sees the real production DATABASE_URL
 * automatically — no connection string ever needs to leave Vercel.
 *
 * Protected the same way the cron routes are: `Authorization: Bearer
 * $CRON_SECRET`. Not a session check, because the caller here is "whoever
 * holds the secret", same trust level as a scheduler.
 *
 * Deliberately temporary — delete this route once it's done its job. It
 * never returns botToken or webhookSecret, but it does expose chatbot
 * metadata to anyone with CRON_SECRET, which is wider than this needs
 * long-term.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = req.nextUrl.searchParams.get("apiKey");
  if (!apiKey) return NextResponse.json({ error: "?apiKey= is required" }, { status: 400 });

  const bot = await prisma.chatbot.findFirst({
    where: { apiKey },
    select: {
      id: true,
      name: true,
      isActive: true,
      dashboardChatEnabled: true,
      allowedDomains: true,
      botUsername: true,
      groupChatId: true,
      createdAt: true,
    },
  });

  if (!bot) return NextResponse.json({ error: "No chatbot with that apiKey" }, { status: 404 });

  // The exact shape of the bug this chain has been chasing: a conversation
  // marked HANDED_OFF with no topic ever relays to Telegram with topicId
  // null. Counting these directly answers "is this still happening" without
  // guessing from HTTP response codes.
  const stuckConversations = await prisma.conversation.count({
    where: { chatbotId: bot.id, flowStatus: "HANDED_OFF", topicId: null },
  });
  const totalConversations = await prisma.conversation.count({ where: { chatbotId: bot.id } });
  const recentConversations = await prisma.conversation.findMany({
    where: { chatbotId: bot.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, visitorId: true, flowStatus: true, topicId: true, createdAt: true, lastMessageAt: true },
  });

  return NextResponse.json({ bot, totalConversations, stuckConversations, recentConversations });
}
