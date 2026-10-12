import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Chatbot, Conversation } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      update: vi.fn(async ({ where, data }) => ({ id: where.id, ...data })),
    },
  },
}));

vi.mock("@/lib/telegram", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/telegram")>();
  return {
    ...actual,
    telegram: { sendMessage: vi.fn(), createForumTopic: vi.fn() },
  };
});

import { telegram, TelegramApiError } from "@/lib/telegram";
import { isMissingTopicError, relayVisitorMessage } from "@/lib/flow-runtime";

const sendMessage = vi.mocked(telegram.sendMessage);
const createForumTopic = vi.mocked(telegram.createForumTopic);

const bot = { id: "bot1", botToken: "token", groupChatId: "-100", dashboardChatEnabled: false } as Chatbot;
const conversation = { id: "conv1", topicId: 111, flowStatus: "HANDED_OFF" } as Conversation;

beforeEach(() => {
  sendMessage.mockReset();
  createForumTopic.mockReset();
});

describe("isMissingTopicError", () => {
  it("recognises Telegram's dead-topic errors", () => {
    expect(isMissingTopicError(new TelegramApiError("sendMessage", "Bad Request: message thread not found"))).toBe(true);
    expect(isMissingTopicError(new TelegramApiError("sendMessage", "Bad Request: TOPIC_DELETED"))).toBe(true);
  });

  it("does not treat other failures as a dead topic", () => {
    expect(isMissingTopicError(new TelegramApiError("sendMessage", "Unauthorized"))).toBe(false);
    expect(isMissingTopicError(new Error("message thread not found"))).toBe(false);
  });
});

describe("relayVisitorMessage", () => {
  it("sends into the existing topic when it still works", async () => {
    sendMessage.mockResolvedValueOnce({ message_id: 1 });
    const result = await relayVisitorMessage(bot, conversation, "visitor-abc123", null, "hello");
    expect(result.topicId).toBe(111);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(createForumTopic).not.toHaveBeenCalled();
  });

  // The "own website broken, every other site works" bug: a returning
  // visitor's saved conversation points at a topic that no longer exists.
  it("opens a fresh topic and resends when the old topic is gone", async () => {
    sendMessage
      .mockRejectedValueOnce(new TelegramApiError("sendMessage", "Bad Request: message thread not found"))
      .mockResolvedValueOnce({ message_id: 2 });
    createForumTopic.mockResolvedValueOnce({ message_thread_id: 222 });

    const result = await relayVisitorMessage(bot, conversation, "visitor-abc123", null, "hello");

    expect(createForumTopic).toHaveBeenCalledTimes(1);
    expect(result.topicId).toBe(222);
    expect(sendMessage).toHaveBeenLastCalledWith("token", "-100", "hello", 222);
  });

  it("surfaces unrelated failures instead of spawning topics", async () => {
    sendMessage.mockRejectedValueOnce(new TelegramApiError("sendMessage", "Unauthorized"));
    await expect(relayVisitorMessage(bot, conversation, "visitor-abc123", null, "hello")).rejects.toThrow(
      "Unauthorized"
    );
    expect(createForumTopic).not.toHaveBeenCalled();
  });
});
