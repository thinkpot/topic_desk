import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withCors, corsPreflight } from "@/lib/cors";
import { isDomainAllowed } from "@/lib/domain";
import { PLAN_LIMITS } from "@/lib/plans";
import { telegram } from "@/lib/telegram";

type RouteContext = { params: Promise<{ chatbotId: string }> };

export async function OPTIONS() {
  return corsPreflight();
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

// Polling endpoint: the widget calls this every couple of seconds while open.
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { chatbotId } = await params;
  const visitorId = req.nextUrl.searchParams.get("visitorId");
  const after = req.nextUrl.searchParams.get("after");
  if (!visitorId) {
    return withCors(NextResponse.json({ error: "visitorId is required" }, { status: 400 }));
  }

  const bot = await prisma.chatbot.findUnique({ where: { id: chatbotId } });
  if (!bot || !bot.isActive) {
    return withCors(NextResponse.json({ error: "Chatbot not found or inactive" }, { status: 404 }));
  }

  const conversation = await prisma.conversation.findUnique({
    where: { chatbotId_visitorId: { chatbotId, visitorId } },
  });

  if (!conversation) {
    return withCors(NextResponse.json({ conversationId: null, welcomeMessage: bot.welcomeMessage, messages: [] }));
  }

  const afterDate = after ? new Date(after) : new Date(0);
  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id, createdAt: { gt: afterDate } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return withCors(
    NextResponse.json({
      conversationId: conversation.id,
      welcomeMessage: bot.welcomeMessage,
      messages: messages.map((m) => ({ sender: m.sender, text: m.text, createdAt: m.createdAt })),
    })
  );
}

const sendSchema = z.object({
  visitorId: z.string().min(1).max(200),
  visitorName: z.string().max(200).optional(),
  text: z.string().min(1).max(2000),
});

// Sends a visitor message; creates the conversation (and its Telegram topic) on first contact.
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { chatbotId } = await params;
  const parsed = sendSchema.safeParse(await req.json());
  if (!parsed.success) {
    return withCors(NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 }));
  }
  const { visitorId, visitorName, text } = parsed.data;

  const bot = await prisma.chatbot.findUnique({ where: { id: chatbotId }, include: { user: true } });
  if (!bot || !bot.isActive) {
    return withCors(NextResponse.json({ error: "This chatbot is not available" }, { status: 404 }));
  }

  const origin = req.headers.get("origin");
  if (!isDomainAllowed(bot.allowedDomains, origin)) {
    return withCors(NextResponse.json({ error: "This website is not authorized to use this chatbot" }, { status: 403 }));
  }

  let conversation = await prisma.conversation.findUnique({
    where: { chatbotId_visitorId: { chatbotId, visitorId } },
  });

  if (!conversation) {
    const limits = PLAN_LIMITS[bot.user.plan];
    const monthlyCount = await prisma.conversation.count({
      where: { chatbotId, createdAt: { gte: startOfMonth() } },
    });
    if (monthlyCount >= limits.maxMonthlyUsers) {
      return withCors(
        NextResponse.json(
          { error: "This chatbot has reached its monthly user limit. Please try again later." },
          { status: 403 }
        )
      );
    }

    const topicName = `${visitorName?.trim() || "Visitor"} · ${visitorId.slice(0, 8)}`;
    let topic;
    try {
      topic = await telegram.createForumTopic(bot.botToken, bot.groupChatId, topicName);
    } catch {
      return withCors(NextResponse.json({ error: "Chat is temporarily unavailable, please try again shortly." }, { status: 503 }));
    }

    conversation = await prisma.conversation.create({
      data: {
        chatbotId,
        visitorId,
        visitorName: visitorName?.trim() || undefined,
        topicId: topic.message_thread_id,
      },
    });
  }

  const message = await prisma.message.create({
    data: { conversationId: conversation.id, sender: "VISITOR", text },
  });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });

  try {
    await telegram.sendMessage(bot.botToken, bot.groupChatId, text, conversation.topicId);
  } catch {
    // The message is saved and shown in the widget even if the Telegram relay fails momentarily.
  }

  return withCors(
    NextResponse.json({
      conversationId: conversation.id,
      message: { sender: message.sender, text: message.text, createdAt: message.createdAt },
    })
  );
}
