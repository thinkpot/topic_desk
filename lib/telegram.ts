const TELEGRAM_API = "https://api.telegram.org";

export class TelegramApiError extends Error {
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

export interface TelegramChat {
  id: number;
  title?: string;
  type: string;
  is_forum?: boolean;
}

export interface TelegramChatMember {
  status: string;
  can_manage_topics?: boolean;
}

export interface TelegramWebhookInfo {
  url: string;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
}

export const telegram = {
  getMe: (botToken: string) => call<TelegramMe>(botToken, "getMe"),

  getChat: (botToken: string, chatId: string) => call<TelegramChat>(botToken, "getChat", { chat_id: chatId }),

  getChatMember: (botToken: string, chatId: string, userId: number) =>
    call<TelegramChatMember>(botToken, "getChatMember", { chat_id: chatId, user_id: userId }),

  setWebhook: (botToken: string, url: string, secretToken: string) =>
    call<boolean>(botToken, "setWebhook", {
      url,
      secret_token: secretToken,
      allowed_updates: ["message"],
    }),

  deleteWebhook: (botToken: string) => call<boolean>(botToken, "deleteWebhook"),

  getWebhookInfo: (botToken: string) => call<TelegramWebhookInfo>(botToken, "getWebhookInfo"),

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
};
