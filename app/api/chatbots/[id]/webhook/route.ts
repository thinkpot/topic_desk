import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import { telegram, TelegramApiError } from "@/lib/telegram";
import { appUrlProblem, registerWebhook, webhookUrlFor } from "@/lib/webhook";

type RouteContext = { params: Promise<{ id: string }> };

async function loadOwnedBot(req: NextRequest, params: RouteContext["params"]) {
  const auth = await requireActiveUser(req);
  if ("response" in auth) return { response: auth.response };
  const { id } = await params;
  const bot = await prisma.chatbot.findFirst({ where: { id, userId: auth.user.id } });
  if (!bot) return { response: NextResponse.json({ error: "Chatbot not found" }, { status: 404 }) };
  return { bot };
}

async function webhookStatus(bot: { id: string; botToken: string }) {
  const expectedUrl = webhookUrlFor(bot.id);
  const serverProblem = appUrlProblem();
  try {
    const info = await telegram.getWebhookInfo(bot.botToken);
    return {
      // Telegram allows one webhook per bot, so another chatbot or an old
      // APP_URL can silently take over — compare against what we expect.
      connected: !serverProblem && info.url === expectedUrl,
      expectedUrl,
      currentUrl: info.url || null,
      lastError: info.last_error_message ?? null,
      lastErrorAt: info.last_error_date ? new Date(info.last_error_date * 1000).toISOString() : null,
      pendingUpdates: info.pending_update_count,
      serverProblem,
    };
  } catch (err) {
    return {
      connected: false,
      expectedUrl,
      currentUrl: null,
      lastError: err instanceof TelegramApiError ? err.description : "Couldn't reach Telegram",
      lastErrorAt: null,
      pendingUpdates: 0,
      serverProblem,
    };
  }
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const loaded = await loadOwnedBot(req, params);
  if ("response" in loaded) return loaded.response;
  return NextResponse.json({ status: await webhookStatus(loaded.bot) });
}

// Re-registers the webhook against the current APP_URL — needed whenever the
// public URL changes (a new tunnel, a new domain) or another chatbot claimed the bot.
export async function POST(req: NextRequest, { params }: RouteContext) {
  const loaded = await loadOwnedBot(req, params);
  if ("response" in loaded) return loaded.response;

  const result = await registerWebhook(loaded.bot);
  const status = await webhookStatus(loaded.bot);
  if (!result.ok) return NextResponse.json({ error: result.error, status }, { status: 502 });
  return NextResponse.json({ status });
}
