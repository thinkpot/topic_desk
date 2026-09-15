const TELEGRAM_API = "https://api.telegram.org";

class TelegramApiError extends Error {
  constructor(method: string, public description: string) {
    super(`Telegram API error on ${method}: ${description}`);
  }
}

async function call<T>(botToken: string, method: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) {
    throw new TelegramApiError(method, json.description ?? "unknown error");
  }
  return json.result;
}

export interface TelegramMe {
  id: number;
  username: string;
  first_name: string;
}

export const telegram = {
  getMe: (botToken: string) => call<TelegramMe>(botToken, "getMe"),

  setWebhook: (botToken: string, url: string, secretToken: string) =>
    call<boolean>(botToken, "setWebhook", {
      url,
      secret_token: secretToken,
      allowed_updates: ["message"],
    }),

  deleteWebhook: (botToken: string) => call<boolean>(botToken, "deleteWebhook"),

  // Group must be a supergroup with "Topics" enabled, and the bot must be an admin
  // with the "Manage Topics" permission.
  createForumTopic: (botToken: string, chatId: string, name: string) =>
    call<{ message_thread_id: number }>(botToken, "createForumTopic", {
      chat_id: chatId,
      name: name.slice(0, 128),
    }),

  sendMessage: (botToken: string, chatId: string, text: string, messageThreadId: number) =>
    call<{ message_id: number }>(botToken, "sendMessage", {
      chat_id: chatId,
      message_thread_id: messageThreadId,
      text,
    }),

  closeForumTopic: (botToken: string, chatId: string, messageThreadId: number) =>
    call<boolean>(botToken, "closeForumTopic", { chat_id: chatId, message_thread_id: messageThreadId }),
};

export { TelegramApiError };
