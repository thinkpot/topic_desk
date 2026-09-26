import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import { telegram } from "@/lib/telegram";
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

  const updated = await prisma.chatbot.update({ where: { id: bot.id }, data: parsed.data });
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
