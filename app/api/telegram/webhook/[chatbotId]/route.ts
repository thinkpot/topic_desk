import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitChatMessageToWidget, emitChatMessageToDashboard } from "@/lib/socket-server";

type RouteContext = { params: Promise<{ chatbotId: string }> };

interface TelegramUpdate {
  message?: {
    message_thread_id?: number;
    chat: { id: number };
    from?: { is_bot: boolean };
    text?: string;
  };
}

// Telegram calls this when someone replies inside a visitor's topic in the
// group. Pushed to the widget and the dashboard's Live tab over the socket
// (see server.ts) so it lands in real time, same as a dashboard-chat reply;
// the widget's own HTTP polling is still there as a fallback if the socket
// isn't connected.
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

  const created = await prisma.message.create({
    data: { conversationId: conversation.id, sender: "AGENT", text: message.text },
  });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });

  const payload = { id: created.id, sender: created.sender, text: created.text, createdAt: created.createdAt };
  emitChatMessageToWidget(chatbotId, conversation.visitorId, payload);
  emitChatMessageToDashboard(bot.userId, chatbotId, conversation.visitorId, payload);

  return NextResponse.json({ ok: true });
}
