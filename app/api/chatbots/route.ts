import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId, unauthorized } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/plans";
import { telegram, TelegramApiError } from "@/lib/telegram";
import { env } from "@/lib/env";

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function withStats(chatbotId: string) {
  const [totalConversations, monthlyConversations, totalMessages] = await Promise.all([
    prisma.conversation.count({ where: { chatbotId } }),
    prisma.conversation.count({ where: { chatbotId, createdAt: { gte: startOfMonth() } } }),
    prisma.message.count({ where: { conversation: { chatbotId } } }),
  ]);
  return { totalConversations, monthlyConversations, totalMessages };
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return unauthorized();

  const chatbots = await prisma.chatbot.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  const withUsage = await Promise.all(
    chatbots.map(async (bot) => {
      const { botToken, webhookSecret, ...rest } = bot;
      return { ...rest, stats: await withStats(bot.id) };
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
  const userId = getUserId(req);
  if (!userId) return unauthorized();

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const limits = PLAN_LIMITS[user.plan];
  const existingCount = await prisma.chatbot.count({ where: { userId: user.id } });
  if (existingCount >= limits.maxChatbots) {
    return NextResponse.json(
      { error: `Your ${limits.label} plan allows up to ${limits.maxChatbots} chatbot(s). Upgrade your plan to add more.` },
      { status: 403 }
    );
  }

  const { name, botToken, groupChatId, welcomeMessage, widgetColor, allowedDomains } = parsed.data;

  let botInfo;
  try {
    botInfo = await telegram.getMe(botToken);
  } catch {
    return NextResponse.json(
      { error: "Could not verify Telegram bot token. Double-check it and try again." },
      { status: 400 }
    );
  }

  const webhookSecret = crypto.randomBytes(24).toString("hex");

  const bot = await prisma.chatbot.create({
    data: {
      name,
      userId: user.id,
      botToken,
      botUsername: botInfo.username,
      groupChatId,
      welcomeMessage: welcomeMessage ?? undefined,
      widgetColor: widgetColor ?? undefined,
      allowedDomains: allowedDomains ?? undefined,
      webhookSecret,
    },
  });
  const { botToken: _t, webhookSecret: _s, ...safeBot } = bot;

  try {
    await telegram.setWebhook(botToken, `${env.appUrl}/api/telegram/webhook/${bot.id}`, webhookSecret);
  } catch (err) {
    const message = err instanceof TelegramApiError ? err.description : "Unknown error";
    return NextResponse.json(
      {
        error: `Bot created, but failed to register Telegram webhook: ${message}. Make sure the bot is an admin in a supergroup with Topics enabled.`,
        chatbot: safeBot,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ chatbot: safeBot }, { status: 201 });
}
