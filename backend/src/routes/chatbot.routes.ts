import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { PLAN_LIMITS } from "../lib/plans";
import { telegram, TelegramApiError } from "../services/telegram";
import { env } from "../lib/env";

const router = Router();
router.use(requireAuth);

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

router.get("/", async (req: AuthedRequest, res) => {
  const chatbots = await prisma.chatbot.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" } });
  const withUsage = await Promise.all(
    chatbots.map(async (bot) => ({
      ...bot,
      botToken: undefined,
      webhookSecret: undefined,
      stats: await withStats(bot.id),
    }))
  );
  res.json({ chatbots: withUsage });
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const bot = await prisma.chatbot.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!bot) return res.status(404).json({ error: "Chatbot not found" });
  res.json({ chatbot: { ...bot, botToken: undefined, webhookSecret: undefined }, stats: await withStats(bot.id) });
});

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

router.post("/", async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  const limits = PLAN_LIMITS[user.plan];
  const existingCount = await prisma.chatbot.count({ where: { userId: user.id } });
  if (existingCount >= limits.maxChatbots) {
    return res.status(403).json({
      error: `Your ${limits.label} plan allows up to ${limits.maxChatbots} chatbot(s). Upgrade your plan to add more.`,
    });
  }

  const { name, botToken, groupChatId, welcomeMessage, widgetColor, allowedDomains } = parsed.data;

  let botInfo;
  try {
    botInfo = await telegram.getMe(botToken);
  } catch (err) {
    return res.status(400).json({ error: "Could not verify Telegram bot token. Double-check it and try again." });
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

  try {
    await telegram.setWebhook(botToken, `${env.publicBaseUrl}/api/telegram/webhook/${bot.id}`, webhookSecret);
  } catch (err) {
    const message = err instanceof TelegramApiError ? err.description : "Unknown error";
    return res.status(400).json({
      error: `Bot created, but failed to register Telegram webhook: ${message}. Make sure the bot is an admin in a supergroup with Topics enabled.`,
      chatbot: { ...bot, botToken: undefined, webhookSecret: undefined },
    });
  }

  res.status(201).json({ chatbot: { ...bot, botToken: undefined, webhookSecret: undefined } });
});

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

router.patch("/:id", async (req: AuthedRequest, res) => {
  const bot = await prisma.chatbot.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!bot) return res.status(404).json({ error: "Chatbot not found" });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const updated = await prisma.chatbot.update({ where: { id: bot.id }, data: parsed.data });
  res.json({ chatbot: { ...updated, botToken: undefined, webhookSecret: undefined } });
});

router.delete("/:id", async (req: AuthedRequest, res) => {
  const bot = await prisma.chatbot.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!bot) return res.status(404).json({ error: "Chatbot not found" });

  try {
    await telegram.deleteWebhook(bot.botToken);
  } catch {
    // non-fatal, continue with deletion
  }
  await prisma.chatbot.delete({ where: { id: bot.id } });
  res.status(204).send();
});

export default router;
