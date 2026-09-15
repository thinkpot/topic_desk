import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { accountBlockReason, formatLimit } from "@/lib/plans";
import { generateApiKey, generateWebhookSecret } from "@/lib/keys";
import { telegram, TelegramApiError } from "@/lib/telegram";
import { verifyConnection } from "@/lib/verify-connection";
import { env } from "@/lib/env";

function startOfMonth(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const chatbots = await prisma.chatbot.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
  });

  const monthStart = startOfMonth();
  const withUsage = await Promise.all(
    chatbots.map(async (bot) => {
      const { botToken, webhookSecret, ...rest } = bot;
      const [conversations, monthlyConversations, messages] = await Promise.all([
        prisma.conversation.count({ where: { chatbotId: bot.id } }),
        prisma.conversation.count({ where: { chatbotId: bot.id, createdAt: { gte: monthStart } } }),
        prisma.message.count({ where: { conversation: { chatbotId: bot.id } } }),
      ]);
      return { ...rest, stats: { conversations, monthlyConversations, messages } };
    })
  );

  return NextResponse.json({ chatbots: withUsage });
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  botToken: z.string().min(20),
  groupChatId: z.string().min(1),
  welcomeMessage: z.string().max(500).optional(),
  widgetColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  allowedDomains: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const blocked = accountBlockReason(user);
  if (blocked) return NextResponse.json({ error: blocked }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existingCount = await prisma.chatbot.count({ where: { userId: user.id } });
  if (existingCount >= user.plan.maxChatbots) {
    return NextResponse.json(
      {
        error: `Your ${user.plan.name} plan includes ${formatLimit(user.plan.maxChatbots)} chatbot(s). Upgrade to add more.`,
      },
      { status: 403 }
    );
  }

  const { name, botToken, groupChatId, welcomeMessage, widgetColor, allowedDomains } = parsed.data;

  const connection = await verifyConnection(botToken, groupChatId);
  if (!connection.ok) {
    const firstProblem = connection.checks.find((c) => !c.ok);
    return NextResponse.json(
      { error: firstProblem ? `${firstProblem.label}: ${firstProblem.detail}` : "Telegram connection failed", connection },
      { status: 400 }
    );
  }

  const webhookSecret = generateWebhookSecret();
  const bot = await prisma.chatbot.create({
    data: {
      name,
      userId: user.id,
      apiKey: generateApiKey(),
      botToken,
      botUsername: connection.botUsername,
      groupChatId,
      welcomeMessage: welcomeMessage ?? undefined,
      widgetColor: widgetColor ?? undefined,
      allowedDomains: allowedDomains ?? undefined,
      webhookSecret,
    },
  });
  const { botToken: _token, webhookSecret: _secret, ...safeBot } = bot;

  try {
    await telegram.setWebhook(botToken, `${env.appUrl}/api/telegram/webhook/${bot.id}`, webhookSecret);
  } catch (err) {
    const message = err instanceof TelegramApiError ? err.description : "Unknown error";
    return NextResponse.json(
      {
        error: `Chatbot saved, but Telegram couldn't reach this server to deliver replies: ${message}`,
        chatbot: safeBot,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ chatbot: safeBot }, { status: 201 });
}
