import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

interface TelegramUpdate {
  message?: {
    message_thread_id?: number;
    chat: { id: number };
    from?: { is_bot: boolean };
    text?: string;
  };
}

// Telegram calls this when someone replies inside a topic in the group.
router.post("/webhook/:chatbotId", async (req, res) => {
  // Respond fast; Telegram retries on non-2xx or timeout.
  res.status(200).send("ok");

  const chatbotId = req.params.chatbotId;
  const secretHeader = req.header("X-Telegram-Bot-Api-Secret-Token");

  const bot = await prisma.chatbot.findUnique({ where: { id: chatbotId } });
  if (!bot || bot.webhookSecret !== secretHeader) return;

  const update = req.body as TelegramUpdate;
  const message = update.message;
  if (!message || !message.text || message.message_thread_id === undefined) return;
  if (String(message.chat.id) !== bot.groupChatId) return;
  if (message.from?.is_bot) return; // ignore the bot's own relayed messages

  const conversation = await prisma.conversation.findUnique({
    where: { chatbotId_topicId: { chatbotId, topicId: message.message_thread_id } },
  });
  if (!conversation) return;

  const saved = await prisma.message.create({
    data: { conversationId: conversation.id, sender: "AGENT", text: message.text },
  });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });

  const io = req.app.locals.io as import("socket.io").Server | undefined;
  io?.to(`conv:${conversation.id}`).emit("message", {
    sender: "AGENT",
    text: message.text,
    createdAt: saved.createdAt,
  });
});

export default router;
