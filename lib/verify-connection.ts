import { telegram, TelegramApiError } from "./telegram";

export interface ConnectionCheck {
  key: "token" | "group" | "topics" | "admin";
  label: string;
  ok: boolean;
  detail: string;
}

export interface ConnectionResult {
  ok: boolean;
  botUsername: string | null;
  groupTitle: string | null;
  checks: ConnectionCheck[];
}

const LABELS: Record<ConnectionCheck["key"], string> = {
  token: "Bot token is valid",
  group: "Bot can see the group",
  topics: "Group has Topics enabled",
  admin: "Bot is an admin that can manage topics",
};

function pending(key: ConnectionCheck["key"], detail: string): ConnectionCheck {
  return { key, label: LABELS[key], ok: false, detail };
}

function passed(key: ConnectionCheck["key"], detail: string): ConnectionCheck {
  return { key, label: LABELS[key], ok: true, detail };
}

function describe(err: unknown): string {
  return err instanceof TelegramApiError ? err.description : "Unexpected error talking to Telegram";
}

/**
 * Runs every prerequisite the relay needs, reporting each one separately so the
 * setup wizard can tell the user exactly which step to fix.
 */
export async function verifyConnection(botToken: string, groupChatId: string): Promise<ConnectionResult> {
  const checks: ConnectionCheck[] = [];

  let me;
  try {
    me = await telegram.getMe(botToken);
    checks.push(passed("token", `Connected to @${me.username}`));
  } catch (err) {
    checks.push(pending("token", describe(err)));
    checks.push(pending("group", "Waiting on a valid bot token"));
    checks.push(pending("topics", "Waiting on a valid bot token"));
    checks.push(pending("admin", "Waiting on a valid bot token"));
    return { ok: false, botUsername: null, groupTitle: null, checks };
  }

  let chat;
  try {
    chat = await telegram.getChat(botToken, groupChatId);
    checks.push(passed("group", chat.title ? `Found "${chat.title}"` : "Group found"));
  } catch (err) {
    checks.push(pending("group", `${describe(err)}. Add the bot to the group and check the chat ID.`));
    checks.push(pending("topics", "Waiting on group access"));
    checks.push(pending("admin", "Waiting on group access"));
    return { ok: false, botUsername: me.username, groupTitle: null, checks };
  }

  if (chat.type !== "supergroup" || !chat.is_forum) {
    checks.push(pending("topics", "Turn on Topics in the group settings, then check again."));
  } else {
    checks.push(passed("topics", "Topics are on"));
  }

  try {
    const member = await telegram.getChatMember(botToken, groupChatId, me.id);
    if (member.status !== "administrator") {
      checks.push(pending("admin", "Promote the bot to admin in the group."));
    } else if (!member.can_manage_topics) {
      checks.push(pending("admin", 'Give the bot the "Manage Topics" permission.'));
    } else {
      checks.push(passed("admin", "Admin with Manage Topics"));
    }
  } catch (err) {
    checks.push(pending("admin", describe(err)));
  }

  return {
    ok: checks.every((c) => c.ok),
    botUsername: me.username,
    groupTitle: chat.title ?? null,
    checks,
  };
}
