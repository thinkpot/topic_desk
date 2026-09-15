import type { Server, Socket } from "socket.io";
import { prisma } from "../lib/prisma";
import { PLAN_LIMITS } from "../lib/plans";
import { telegram, TelegramApiError } from "../services/telegram";

interface JoinPayload {
  chatbotId: string;
  visitorId: string;
  visitorName?: string;
  pageUrl?: string;
}

interface MessagePayload {
  conversationId: string;
  text: string;
}

interface SocketData {
  chatbotId?: string;
  conversationId?: string;
}

function hostnameOf(urlOrOrigin?: string): string | null {
  if (!urlOrOrigin) return null;
  try {
    return new URL(urlOrOrigin).hostname;
  } catch {
    return null;
  }
}

function isDomainAllowed(allowedDomains: string | null, origin?: string): boolean {
  if (!allowedDomains) return true; // no restriction configured
  const host = hostnameOf(origin);
  if (!host) return false;
  const allowed = allowedDomains
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(host.toLowerCase());
}

function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function attachSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket<any, any, any, SocketData>) => {
    socket.on("join", async (payload: JoinPayload) => {
      try {
        const { chatbotId, visitorId, visitorName } = payload;
        if (!chatbotId || !visitorId) {
          socket.emit("fatal_error", { message: "chatbotId and visitorId are required" });
          return;
        }

        const bot = await prisma.chatbot.findUnique({ where: { id: chatbotId }, include: { user: true } });
        if (!bot || !bot.isActive) {
          socket.emit("fatal_error", { message: "This chatbot is not available" });
          return;
        }

        const origin = socket.handshake.headers.origin as string | undefined;
        if (!isDomainAllowed(bot.allowedDomains, origin)) {
          socket.emit("fatal_error", { message: "This website is not authorized to use this chatbot" });
          return;
        }

        let conversation = await prisma.conversation.findUnique({
          where: { chatbotId_visitorId: { chatbotId, visitorId } },
        });

        if (!conversation) {
          const limits = PLAN_LIMITS[bot.user.plan];
          const monthlyCount = await prisma.conversation.count({
            where: { chatbotId, createdAt: { gte: startOfMonth() } },
          });
          if (monthlyCount >= limits.maxMonthlyUsers) {
            socket.emit("fatal_error", {
              message: "This chatbot has reached its monthly user limit. Please try again later.",
            });
            return;
          }

          const topicName = `${visitorName?.trim() || "Visitor"} · ${visitorId.slice(0, 8)}`;
          let topic;
          try {
            topic = await telegram.createForumTopic(bot.botToken, bot.groupChatId, topicName);
          } catch (err) {
            const message = err instanceof TelegramApiError ? err.description : "Unknown error";
            socket.emit("fatal_error", { message: `Chat is temporarily unavailable (${message})` });
            return;
          }

          conversation = await prisma.conversation.create({
            data: {
              chatbotId,
              visitorId,
              visitorName: visitorName?.trim() || undefined,
              topicId: topic.message_thread_id,
            },
          });
        }

        socket.data.chatbotId = chatbotId;
        socket.data.conversationId = conversation.id;
        socket.join(`conv:${conversation.id}`);

        const history = await prisma.message.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: "asc" },
          take: 100,
        });

        socket.emit("joined", {
          conversationId: conversation.id,
          welcomeMessage: bot.welcomeMessage,
          history: history.map((m) => ({ sender: m.sender, text: m.text, createdAt: m.createdAt })),
        });
      } catch (err) {
        socket.emit("fatal_error", { message: "Something went wrong, please try again." });
      }
    });

    socket.on("message", async (payload: MessagePayload) => {
      try {
        const text = payload?.text?.trim().slice(0, 2000);
        const { conversationId } = socket.data;
        if (!text || !conversationId || conversationId !== payload.conversationId) return;

        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { chatbot: true },
        });
        if (!conversation || !conversation.chatbot.isActive) return;

        const message = await prisma.message.create({
          data: { conversationId, sender: "VISITOR", text },
        });
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        });

        io.to(`conv:${conversationId}`).emit("message", {
          sender: "VISITOR",
          text,
          createdAt: message.createdAt,
        });

        try {
          await telegram.sendMessage(
            conversation.chatbot.botToken,
            conversation.chatbot.groupChatId,
            text,
            conversation.topicId
          );
        } catch {
          // The message is saved and shown in the widget even if the Telegram relay fails momentarily.
        }
      } catch {
        // swallow: a malformed message payload should not crash the socket
      }
    });
  });
}
