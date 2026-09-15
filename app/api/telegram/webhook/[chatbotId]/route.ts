import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ chatbotId: string }> };

interface TelegramUpdate {
  message?: {
    message_thread_id?: number;
    chat: { id: number };
    from?: { is_bot: boolean };
    text?: string;
  };
}

// Telegram calls this when someone replies inside a visitor's topic in the group.
// The widget picks the reply up on its next poll (no persistent connection needed).
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { chatbotId } = await params;
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");

  const bot = await prisma.chatbot.findUnique({ where: { id: chatbotId } });
  if (!bot || bot.webhookSecret !== secretHeader) {
    // Respond 200 regardless so Telegram doesn't retry; just don't act on it.
    return NextResponse.json({ ok: true });
  }

  const update = (await req.json()) as TelegramUpdate;
  const message = update.message;
  if (
    !message ||
    !message.text ||
    message.message_thread_id === undefined ||
    String(message.chat.id) !== bot.groupChatId ||
    message.from?.is_bot
  ) {
    return NextResponse.json({ ok: true });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { chatbotId_topicId: { chatbotId, topicId: message.message_thread_id } },
  });
  if (!conversation) return NextResponse.json({ ok: true });

  await prisma.message.create({ data: { conversationId: conversation.id, sender: "AGENT", text: message.text } });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });

  return NextResponse.json({ ok: true });
}
