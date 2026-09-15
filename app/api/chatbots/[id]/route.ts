import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId, unauthorized } from "@/lib/auth";
import { telegram } from "@/lib/telegram";

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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const userId = getUserId(req);
  if (!userId) return unauthorized();
  const { id } = await params;

  const bot = await prisma.chatbot.findFirst({ where: { id, userId } });
  if (!bot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

  const { botToken, webhookSecret, ...safeBot } = bot;
  return NextResponse.json({ chatbot: safeBot, stats: await withStats(bot.id) });
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  welcomeMessage: z.string().max(500).optional(),
  widgetColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  allowedDomains: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const userId = getUserId(req);
  if (!userId) return unauthorized();
  const { id } = await params;

  const bot = await prisma.chatbot.findFirst({ where: { id, userId } });
  if (!bot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const updated = await prisma.chatbot.update({ where: { id: bot.id }, data: parsed.data });
  const { botToken, webhookSecret, ...safeBot } = updated;
  return NextResponse.json({ chatbot: safeBot });
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const userId = getUserId(req);
  if (!userId) return unauthorized();
  const { id } = await params;

  const bot = await prisma.chatbot.findFirst({ where: { id, userId } });
  if (!bot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

  try {
    await telegram.deleteWebhook(bot.botToken);
  } catch {
    // non-fatal, continue with deletion
  }
  await prisma.chatbot.delete({ where: { id: bot.id } });
  return new NextResponse(null, { status: 204 });
}
