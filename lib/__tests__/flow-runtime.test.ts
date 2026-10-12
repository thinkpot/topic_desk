import { describe, expect, it } from "vitest";
import {
  needsHandoff,
  needsSessionRestart,
  isSessionStale,
  matchesRestartKeyword,
  routesToFlow,
} from "@/lib/flow-runtime";

describe("routesToFlow", () => {
  // Regression: the owner's own browser had a conversation left RUNNING from
  // when a flow was on. After the flow was switched off, every message still
  // went into it and never reached Telegram.
  it("does not route a leftover RUNNING conversation into a disabled flow", () => {
    expect(routesToFlow({ flowStatus: "RUNNING" }, false)).toBe(false);
  });

  it("routes a RUNNING conversation into an enabled flow", () => {
    expect(routesToFlow({ flowStatus: "RUNNING" }, true)).toBe(true);
  });

  it("never routes handed-off or ended conversations into the flow", () => {
    for (const flowStatus of ["HANDED_OFF", "ENDED", "NOT_STARTED"] as const) {
      expect(routesToFlow({ flowStatus }, true)).toBe(false);
    }
  });
});

const HOUR = 60 * 60 * 1000;

describe("needsHandoff", () => {
  // This is the regression test for the "own chatbox stuck forever" bug:
  // a conversation handed off while dashboardChatEnabled was on has
  // flowStatus HANDED_OFF but no topic. If dashboardChatEnabled is later
  // turned off, the relay must notice the missing topic and backfill one
  // instead of relaying to Telegram with topicId null forever.
  it("backfills a topic when HANDED_OFF but topicless and dashboard chat is now off", () => {
    const conversation = { flowStatus: "HANDED_OFF", topicId: null } as const;
    const bot = { dashboardChatEnabled: false };
    expect(needsHandoff(conversation, bot)).toBe(true);
  });

  it("leaves a topicless HANDED_OFF conversation alone while dashboard chat is still on", () => {
    // No topic is expected in this mode — nothing to backfill, nothing broken.
    const conversation = { flowStatus: "HANDED_OFF", topicId: null } as const;
    const bot = { dashboardChatEnabled: true };
    expect(needsHandoff(conversation, bot)).toBe(false);
  });

  it("does not re-handoff a conversation that already has a topic", () => {
    const conversation = { flowStatus: "HANDED_OFF", topicId: 42 } as const;
    const bot = { dashboardChatEnabled: false };
    expect(needsHandoff(conversation, bot)).toBe(false);
  });

  it("hands off a conversation that was never handed off at all", () => {
    for (const flowStatus of ["NOT_STARTED", "RUNNING", "ENDED"] as const) {
      expect(needsHandoff({ flowStatus, topicId: null }, { dashboardChatEnabled: false })).toBe(true);
    }
  });
});

describe("isSessionStale", () => {
  it("is false right after the last message", () => {
    expect(isSessionStale({ lastMessageAt: new Date() }, 60)).toBe(false);
  });

  it("is true once the timeout has elapsed", () => {
    const lastMessageAt = new Date(Date.now() - 2 * HOUR);
    expect(isSessionStale({ lastMessageAt }, 60)).toBe(true);
  });

  it("is false just under the timeout", () => {
    const lastMessageAt = new Date(Date.now() - 59 * 60 * 1000);
    expect(isSessionStale({ lastMessageAt }, 60)).toBe(false);
  });
});

describe("matchesRestartKeyword", () => {
  it("matches case- and whitespace-insensitively against the CSV list", () => {
    expect(matchesRestartKeyword("  Hi  ", "hi, menu, restart")).toBe(true);
    expect(matchesRestartKeyword("MENU", "hi, menu, restart")).toBe(true);
  });

  it("does not match a word that merely contains a keyword", () => {
    expect(matchesRestartKeyword("hippo", "hi, menu, restart")).toBe(false);
  });

  it("is false for empty input or an empty keyword list", () => {
    expect(matchesRestartKeyword("", "hi, menu")).toBe(false);
    expect(matchesRestartKeyword("hi", "")).toBe(false);
  });
});

describe("needsSessionRestart", () => {
  const chatbot = { sessionTimeoutMinutes: 60, restartKeywords: "hi, menu, restart" };

  it("never restarts a flowless chatbot, no matter how stale", () => {
    // This is exactly why a flowless bot (like the homepage's own support
    // chatbot) can never self-heal a stuck conversation on its own — the
    // fix has to live in needsHandoff instead.
    const conversation = { flowStatus: "HANDED_OFF", lastMessageAt: new Date(0) } as const;
    expect(needsSessionRestart({ chatbot, conversation, flowEnabled: false })).toBe(false);
  });

  it("never restarts a RUNNING conversation regardless of staleness or keywords", () => {
    const conversation = { flowStatus: "RUNNING", lastMessageAt: new Date(0) } as const;
    expect(
      needsSessionRestart({ chatbot, conversation, flowEnabled: true, incomingText: "restart" })
    ).toBe(false);
  });

  it("restarts a stale HANDED_OFF conversation when the flow is enabled", () => {
    const conversation = { flowStatus: "HANDED_OFF", lastMessageAt: new Date(0) } as const;
    expect(needsSessionRestart({ chatbot, conversation, flowEnabled: true })).toBe(true);
  });

  it("restarts a fresh HANDED_OFF conversation on an explicit restart keyword", () => {
    const conversation = { flowStatus: "HANDED_OFF", lastMessageAt: new Date() } as const;
    expect(
      needsSessionRestart({ chatbot, conversation, flowEnabled: true, incomingText: "menu" })
    ).toBe(true);
  });

  it("leaves a fresh HANDED_OFF conversation alone with ordinary text", () => {
    const conversation = { flowStatus: "HANDED_OFF", lastMessageAt: new Date() } as const;
    expect(
      needsSessionRestart({ chatbot, conversation, flowEnabled: true, incomingText: "thanks!" })
    ).toBe(false);
  });

  it("also applies to ENDED conversations", () => {
    const conversation = { flowStatus: "ENDED", lastMessageAt: new Date(0) } as const;
    expect(needsSessionRestart({ chatbot, conversation, flowEnabled: true })).toBe(true);
  });

  it("ignores NOT_STARTED conversations", () => {
    const conversation = { flowStatus: "NOT_STARTED", lastMessageAt: new Date(0) } as const;
    expect(needsSessionRestart({ chatbot, conversation, flowEnabled: true })).toBe(false);
  });
});
