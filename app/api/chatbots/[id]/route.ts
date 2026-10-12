import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import { telegram } from "@/lib/telegram";
import { verifyConnection } from "@/lib/verify-connection";
import { registerWebhook } from "@/lib/webhook";
import { WIDGET_THEME_KEYS, WIDGET_FONT_KEYS } from "@/lib/widget-appearance";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireActiveUser(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const bot = await prisma.chatbot.findFirst({ where: { id, userId: auth.user.id } });
  if (!bot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

  const { botToken, webhookSecret, ...safeBot } = bot;
  return NextResponse.json({ chatbot: safeBot });
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  welcomeMessage: z.string().max(500).optional(),
  widgetTheme: z.enum(WIDGET_THEME_KEYS).optional(),
  widgetFont: z.enum(WIDGET_FONT_KEYS).optional(),
  allowedDomains: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
  sessionTimeoutMinutes: z.number().int().min(1).max(43200).optional(), // up to 30 days
  restartKeywords: z.string().max(500).optional(),
  keepVariablesAcrossSessions: z.boolean().optional(),
  dashboardChatEnabled: z.boolean().optional(),
  // Reconnecting to a different bot or group — both optional and independent,
  // since changing only the group shouldn't require re-pasting a token that
  // was never sent back to the browser to begin with.
  botToken: z.string().min(20).optional(),
  groupChatId: z.string().min(1).optional(),
});

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = await requireActiveUser(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const bot = await prisma.chatbot.findFirst({ where: { id, userId: auth.user.id } });
  if (!bot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  if (parsed.data.dashboardChatEnabled && !auth.user.plan.supportsDashboardChat) {
    return NextResponse.json({ error: "Dashboard chat isn't included in your current plan." }, { status: 403 });
  }

  const { botToken: newBotToken, groupChatId: newGroupChatId, ...rest } = parsed.data;
  const reconnecting = newBotToken !== undefined || newGroupChatId !== undefined;
  const data: Prisma.ChatbotUpdateInput = { ...rest };

  if (reconnecting) {
    const botToken = newBotToken?.trim() || bot.botToken;
    const groupChatId = newGroupChatId?.trim() || bot.groupChatId;

    if (botToken !== bot.botToken) {
      const tokenInUse = await prisma.chatbot.findFirst({
        where: { botToken, id: { not: bot.id } },
        select: { id: true },
      });
      if (tokenInUse) {
        return NextResponse.json(
          {
            error:
              "This Telegram bot is already connected to a chatbot. Each chatbot needs its own bot from @BotFather.",
          },
          { status: 409 }
        );
      }
    }

    const connection = await verifyConnection(botToken, groupChatId);
    if (!connection.ok) {
      const firstProblem = connection.checks.find((c) => !c.ok);
      return NextResponse.json(
        {
          error: firstProblem ? `${firstProblem.label}: ${firstProblem.detail}` : "Telegram connection failed",
          connection,
        },
        { status: 400 }
      );
    }

    // Telegram allows one webhook per bot token, so a token change must be
    // repointed before anything relies on it — same order creation uses.
    if (botToken !== bot.botToken) {
      const webhook = await registerWebhook({ id: bot.id, botToken, webhookSecret: bot.webhookSecret });
      if (!webhook.ok) return NextResponse.json({ error: webhook.error }, { status: 502 });
    }

    data.botToken = botToken;
    data.groupChatId = groupChatId;
    data.botUsername = connection.botUsername ?? undefined;
  }

  const updated = await prisma.chatbot.update({ where: { id: bot.id }, data });

  // Topic ids only mean something inside the group (and bot) that created
  // them. After switching either, drop them so each conversation opens a
  // fresh topic in the new group on its next message (see needsHandoff).
  if (updated.botToken !== bot.botToken || updated.groupChatId !== bot.groupChatId) {
    await prisma.conversation.updateMany({ where: { chatbotId: bot.id }, data: { topicId: null } });
  }
  const { botToken, webhookSecret, ...safeBot } = updated;
  return NextResponse.json({ chatbot: safeBot });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const auth = await requireActiveUser(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const bot = await prisma.chatbot.findFirst({ where: { id, userId: auth.user.id } });
  if (!bot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

  try {
    // Only clear the webhook if it's ours — another chatbot may now own this bot.
    const info = await telegram.getWebhookInfo(bot.botToken);
    if (info.url.endsWith(`/api/telegram/webhook/${bot.id}`)) await telegram.deleteWebhook(bot.botToken);
  } catch {
    // non-fatal, continue with deletion
  }
  await prisma.chatbot.delete({ where: { id: bot.id } });
  return new NextResponse(null, { status: 204 });
}
