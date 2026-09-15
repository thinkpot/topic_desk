import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withCors, corsPreflight } from "@/lib/cors";
import { isDomainAllowed } from "@/lib/domain";
import { telegram } from "@/lib/telegram";
import { resolveWidgetChatbot } from "@/lib/widget";

type RouteContext = { params: Promise<{ apiKey: string }> };

export async function OPTIONS() {
  return corsPreflight();
}

function startOfMonth(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Polling endpoint: the widget calls this every few seconds while open.
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { apiKey } = await params;
  const visitorId = req.nextUrl.searchParams.get("visitorId");
  const after = req.nextUrl.searchParams.get("after");
  if (!visitorId) {
    return withCors(NextResponse.json({ error: "visitorId is required" }, { status: 400 }));
  }

  const resolved = await resolveWidgetChatbot(apiKey);
  if ("error" in resolved) {
    return withCors(NextResponse.json({ error: resolved.error }, { status: resolved.status }));
  }
  const { bot } = resolved;

  const conversation = await prisma.conversation.findUnique({
    where: { chatbotId_visitorId: { chatbotId: bot.id, visitorId } },
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
  pageUrl: z.string().max(500).optional(),
  text: z.string().min(1).max(2000),
});

// Sends a visitor message; creates the conversation (and its Telegram topic) on first contact.
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { apiKey } = await params;
  const parsed = sendSchema.safeParse(await req.json());
  if (!parsed.success) {
    return withCors(NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 }));
  }
  const { visitorId, visitorName, pageUrl, text } = parsed.data;

  const resolved = await resolveWidgetChatbot(apiKey);
  if ("error" in resolved) {
    return withCors(NextResponse.json({ error: resolved.error }, { status: resolved.status }));
  }
  const { bot } = resolved;

  if (!isDomainAllowed(bot.allowedDomains, req.headers.get("origin"))) {
    return withCors(
      NextResponse.json({ error: "This website is not authorized to use this chatbot" }, { status: 403 })
    );
  }

  let conversation = await prisma.conversation.findUnique({
    where: { chatbotId_visitorId: { chatbotId: bot.id, visitorId } },
  });

  if (!conversation) {
    const monthlyCount = await prisma.conversation.count({
      where: { chatbot: { userId: bot.userId }, createdAt: { gte: startOfMonth() } },
    });
    if (monthlyCount >= bot.user.plan.maxMonthlyUsers) {
      return withCors(
        NextResponse.json(
          { error: "This chat has reached its monthly limit. Please try again later." },
          { status: 403 }
        )
      );
    }

    const topicName = `${visitorName?.trim() || "Visitor"} · ${visitorId.slice(-6)}`;
    let topic;
    try {
      topic = await telegram.createForumTopic(bot.botToken, bot.groupChatId, topicName);
    } catch {
      return withCors(
        NextResponse.json({ error: "Chat is temporarily unavailable, please try again shortly." }, { status: 503 })
      );
    }

    conversation = await prisma.conversation.create({
      data: {
        chatbotId: bot.id,
        visitorId,
        visitorName: visitorName?.trim() || undefined,
        pageUrl: pageUrl || undefined,
        topicId: topic.message_thread_id,
      },
    });

    if (pageUrl) {
      try {
        await telegram.sendMessage(bot.botToken, bot.groupChatId, `New chat from ${pageUrl}`, topic.message_thread_id);
      } catch {
        // context line is a nicety; never block the actual message on it
      }
    }
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
