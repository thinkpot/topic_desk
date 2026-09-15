import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// Public, unauthenticated: the embed script calls this to bootstrap the widget UI.
router.get("/:chatbotId/config", async (req, res) => {
  const bot = await prisma.chatbot.findUnique({ where: { id: req.params.chatbotId } });
  if (!bot || !bot.isActive) return res.status(404).json({ error: "Chatbot not found or inactive" });

  res.json({
    id: bot.id,
    name: bot.name,
    welcomeMessage: bot.welcomeMessage,
    widgetColor: bot.widgetColor,
  });
});

export default router;
