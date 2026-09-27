import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { prisma } from "./lib/prisma";
import { userFromToken } from "./lib/session";
import { accountBlockReason } from "./lib/plans";
import { jwtSecretProblem } from "./lib/env";
import { isDomainAllowed } from "./lib/domain";
import { CLIENT_IP_HEADER, RATE_LIMITS, hit, resolveClientIp } from "./lib/rate-limit-core";
import { syncAllWebhooks } from "./lib/webhook";
import { startDevTunnel } from "./lib/dev-tunnel";
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

// A brand-new quick-tunnel hostname can take a minute or two to resolve from
// Telegram's servers ("Failed to resolve host"), so failures are retried with
// backoff. A newer sync (the tunnel changed again) supersedes older retries.
const WEBHOOK_RETRY_DELAYS_MS = [10_000, 20_000, 40_000, 60_000, 120_000, 240_000];
let webhookSyncGeneration = 0;

async function syncWebhooks(reason: string, onGiveUp?: () => void) {
  const generation = ++webhookSyncGeneration;
  for (let attempt = 0; ; attempt++) {
    if (generation !== webhookSyncGeneration) return;
    try {
      const { updated, unchanged, failed } = await syncAllWebhooks();
      if (updated || failed) {
        console.log(`> [webhooks] ${reason}: ${updated} re-registered, ${unchanged} already current, ${failed} failed`);
      }
      if (!failed) return;
    } catch (err) {
      console.error("> [webhooks] Sync failed:", err);
    }
    const delay = WEBHOOK_RETRY_DELAYS_MS[attempt];
    if (delay === undefined) {
      if (onGiveUp) onGiveUp();
      else console.warn("> [webhooks] Giving up; use Reconnect on the chatbot page once the URL is reachable");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    reason = "Retry";
  }
}

app.prepare().then(() => {
  // Checked after prepare() because that's when Next loads .env.
  const secretProblem = jwtSecretProblem(process.env.JWT_SECRET);
  if (secretProblem) {
    if (!dev) {
      console.error(`> ${secretProblem} Set a random JWT_SECRET of 32+ characters before starting in production.`);
      process.exit(1);
    }
    console.warn(`> Warning: ${secretProblem} (allowed in dev only)`);
  }

  const httpServer = createServer((req, res) => {
    // Overwrite whatever the client sent: route handlers rate-limit on this,
    // so it must only ever be the IP this server itself resolved.
    req.headers[CLIENT_IP_HEADER] = resolveClientIp(req.socket.remoteAddress, (name) => req.headers[name]);
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

    const ip = resolveClientIp(socket.handshake.address, (name) => socket.handshake.headers[name]);

    if (auth.role === "dashboard" && auth.token) {
      // Same checks as REST's requireActiveUser: a revoked token, suspended
      // account or expired trial gets nothing. A bad token just leaves the
      // socket in no rooms, so it never receives events.
      userFromToken(auth.token)
        .then((user) => {
          if (user && !accountBlockReason(user)) socket.join(`user:${user.id}`);
          else socket.disconnect(true);
        })
        .catch(() => socket.disconnect(true));
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
        if (hit(`socketHeartbeat:${ip}`, RATE_LIMITS.socketHeartbeat)) return;
        // Socket.io doesn't catch async handler errors — without this, a DB
        // hiccup here surfaces as an unhandled rejection.
        try {
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
        } catch (err) {
          console.error("> [socket] heartbeat failed:", err);
        }
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
    if (process.env.DEV_TUNNEL === "cloudflared") {
      // APP_URL is replaced by the tunnel's URL once it comes up. If Telegram
      // still can't reach a hostname after every retry, get a new one.
      const tunnel = startDevTunnel(port, () => syncWebhooks("Tunnel URL changed", () => tunnel.recycle()));
    } else {
      syncWebhooks("Startup");
    }
  });
});
