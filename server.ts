import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { prisma } from "./lib/prisma";
import { verifyToken } from "./lib/jwt";
import { isDomainAllowed } from "./lib/domain";
import { upsertPresence } from "./lib/presence-store";
import { buildLiveVisitorView } from "./lib/live-visitor-view";
import { setIO, emitLiveUpdate, emitLiveLeft } from "./lib/socket-server";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT) || 3000;
const app = next({ dev });
const handle = app.getRequestHandler();

interface WidgetSocketData {
  chatbotId: string;
  visitorId: string;
  userId: string;
  liveVisitorId: string;
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url || "/", true));
  });

  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    // The widget embeds on arbitrary customer domains we can't know in
    // advance — same open-CORS posture as the widget's REST endpoints
    // (lib/cors.ts). Per-chatbot domain restriction is still enforced below.
    cors: { origin: true },
  });
  setIO(io);

  io.on("connection", (socket) => {
    const auth = socket.handshake.auth as { role?: string; token?: string; apiKey?: string; visitorId?: string };
    let widget: WidgetSocketData | null = null;
    let widgetJoin: Promise<void> | null = null;

    if (auth.role === "dashboard" && auth.token) {
      try {
        const { userId } = verifyToken(auth.token);
        socket.join(`user:${userId}`);
      } catch {
        // Bad/expired token: socket stays connected but joins nothing, so it
        // simply never receives events — no need to reject the connection.
      }
    }

    // Async (a DB lookup), so a heartbeat that arrives before this resolves
    // must await the same promise rather than see a not-yet-set `widget` and
    // silently drop — memoized so every caller shares one in-flight lookup.
    function ensureWidgetJoined(): Promise<void> {
      if (widget) return Promise.resolve();
      if (!widgetJoin) {
        widgetJoin = (async () => {
          if (auth.role !== "widget" || !auth.apiKey || !auth.visitorId) return;
          const bot = await prisma.chatbot.findUnique({ where: { apiKey: auth.apiKey } });
          if (!bot || !bot.isActive) return;
          const origin = socket.handshake.headers.origin ?? null;
          if (!isDomainAllowed(bot.allowedDomains, origin)) return;

          socket.join(`visitor:${bot.id}:${auth.visitorId}`);
          widget = { chatbotId: bot.id, visitorId: auth.visitorId, userId: bot.userId, liveVisitorId: "" };
        })();
      }
      return widgetJoin;
    }
    if (auth.role === "widget") ensureWidgetJoined();

    socket.on(
      "widget:heartbeat",
      async (payload: { url?: string; scrollPercent?: number; referrer?: string }) => {
        await ensureWidgetJoined();
        if (!widget || !payload?.url) return;
        const bot = await prisma.chatbot.findUnique({ where: { id: widget.chatbotId } });
        if (!bot) return;

        const visitor = await upsertPresence({
          chatbotId: widget.chatbotId,
          visitorId: widget.visitorId,
          url: payload.url,
          scrollPercent: payload.scrollPercent,
          referrer: payload.referrer,
          userAgent: socket.handshake.headers["user-agent"]?.slice(0, 300),
        });
        widget.liveVisitorId = visitor.id;

        const view = await buildLiveVisitorView(visitor, bot);
        emitLiveUpdate(widget.userId, view);
      }
    );

    socket.on("disconnect", () => {
      if (widget?.liveVisitorId) {
        emitLiveLeft(widget.userId, widget.liveVisitorId);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} (${dev ? "dev" : "production"})`);
  });
});
