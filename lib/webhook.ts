import { env } from "./env";
import { prisma } from "./prisma";
import { telegram, TelegramApiError } from "./telegram";

export function webhookUrlFor(chatbotId: string): string {
  return `${env.appUrl}/api/telegram/webhook/${chatbotId}`;
}

/**
 * Telegram only delivers webhooks to public HTTPS URLs, so a localhost or plain
 * http APP_URL can never work. Returns a human-readable reason, or null if OK.
 */
export function appUrlProblem(): string | null {
  let url: URL;
  try {
    url = new URL(env.appUrl);
  } catch {
    return "APP_URL is not a valid URL.";
  }
  if (url.protocol !== "https:") {
    return `Telegram can only send replies to a public HTTPS address, but APP_URL is "${env.appUrl}". Locally, run a tunnel (e.g. \`ngrok http 3000\`), set APP_URL to its https URL, and restart the app.`;
  }
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname)) {
    return `APP_URL "${env.appUrl}" isn't reachable from Telegram's servers. Use a public HTTPS URL, e.g. from \`ngrok http 3000\`.`;
  }
  return null;
}

export async function registerWebhook(
  chatbot: { id: string; botToken: string; webhookSecret: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const problem = appUrlProblem();
  if (problem) return { ok: false, error: problem };
  try {
    await telegram.setWebhook(chatbot.botToken, webhookUrlFor(chatbot.id), chatbot.webhookSecret);
    return { ok: true };
  } catch (err) {
    const detail = err instanceof TelegramApiError ? err.description : "Unexpected error talking to Telegram";
    return { ok: false, error: `Telegram rejected the webhook: ${detail}` };
  }
}

/**
 * Points every chatbot's Telegram webhook at the current APP_URL. Run at boot
 * and whenever the dev tunnel hands out a new URL, so a changed public
 * address never leaves bots silently delivering replies to a dead host.
 * Telegram allows one webhook per bot token, so when several chatbots share a
 * token only the newest one is registered (the same one that would have won
 * when they were created).
 */
export async function syncAllWebhooks(): Promise<{ updated: number; unchanged: number; failed: number }> {
  const result = { updated: 0, unchanged: 0, failed: 0 };
  if (appUrlProblem()) return result;

  const bots = await prisma.chatbot.findMany({
    select: { id: true, botToken: true, webhookSecret: true },
    orderBy: { createdAt: "desc" },
  });
  const seenTokens = new Set<string>();
  for (const bot of bots) {
    if (seenTokens.has(bot.botToken)) continue;
    seenTokens.add(bot.botToken);
    try {
      const info = await telegram.getWebhookInfo(bot.botToken);
      if (info.url === webhookUrlFor(bot.id)) {
        result.unchanged++;
        continue;
      }
      const registered = await registerWebhook(bot);
      if (registered.ok) result.updated++;
      else result.failed++;
    } catch {
      // Revoked token, network blip — the per-bot connection health check in
      // the dashboard surfaces these; don't let one bad bot stop the rest.
      result.failed++;
    }
  }
  return result;
}
