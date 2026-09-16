import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { accountBlockReason, formatLimit } from "@/lib/plans";
import { generateApiKey, generateWebhookSecret } from "@/lib/keys";
import { verifyConnection } from "@/lib/verify-connection";
import { appUrlProblem, registerWebhook } from "@/lib/webhook";

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

  const { name, botToken, groupChatId, welcomeMessage, allowedDomains } = parsed.data;

  // A chatbot without a webhook never receives replies, so refuse up front
  // rather than saving one that can't work.
  const serverProblem = appUrlProblem();
  if (serverProblem) return NextResponse.json({ error: serverProblem }, { status: 503 });

  const tokenInUse = await prisma.chatbot.findFirst({ where: { botToken }, select: { id: true } });
  if (tokenInUse) {
    return NextResponse.json(
      { error: "This Telegram bot is already connected to a chatbot. Each chatbot needs its own bot from @BotFather." },
      { status: 409 }
    );
  }

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
      allowedDomains: allowedDomains ?? undefined,
      webhookSecret,
    },
  });
  const { botToken: _token, webhookSecret: _secret, ...safeBot } = bot;

  // The webhook URL embeds the new id, so it can only be registered after the
  // insert; roll the row back if Telegram refuses so a retry starts clean.
  const webhook = await registerWebhook(bot);
  if (!webhook.ok) {
    await prisma.chatbot.delete({ where: { id: bot.id } });
    return NextResponse.json({ error: webhook.error }, { status: 502 });
  }

  return NextResponse.json({ chatbot: safeBot }, { status: 201 });
}
