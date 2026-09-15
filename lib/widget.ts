import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { accountBlockReason } from "./plans";

export type WidgetChatbot = Prisma.ChatbotGetPayload<{ include: { user: { include: { plan: true } } } }>;

/**
 * Looks up the chatbot behind a publishable API key and confirms its owner is
 * still entitled to serve traffic (active paid plan, not suspended).
 */
export async function resolveWidgetChatbot(
  apiKey: string
): Promise<{ bot: WidgetChatbot } | { error: string; status: number }> {
  const bot = await prisma.chatbot.findUnique({
    where: { apiKey },
    include: { user: { include: { plan: true } } },
  });

  if (!bot || !bot.isActive) return { error: "Chatbot not found or inactive", status: 404 };

  const blocked = accountBlockReason(bot.user);
  if (blocked) return { error: blocked, status: 403 };

  return { bot };
}

export function utcToday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
