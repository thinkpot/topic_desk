import type { Chatbot, Conversation } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { telegram } from "./telegram";
import { runFlow, FlowGraph, FlowInput } from "./flow-engine";

function topicNameFor(visitorId: string, visitorName?: string | null): string {
  return `${visitorName?.trim() || "Visitor"} · ${visitorId.slice(-6)}`;
}

/**
 * Opens (or reuses) the Telegram topic for a conversation and marks it
 * human-owned, best-effort relaying any context lines (e.g. what the bot
 * collected) into it. A conversation that's been handed off before keeps its
 * topic — re-handoffs after a session restart land in the same thread rather
 * than spawning a duplicate. Throws if a new topic can't be created — callers
 * decide how to surface that (e.g. a 503 to the widget).
 */
export async function handOffToHuman(
  bot: Chatbot,
  conversation: Conversation,
  visitorId: string,
  visitorName: string | null | undefined,
  contextLines: string[] = []
): Promise<Conversation> {
  const topicId =
    conversation.topicId ??
    (await telegram.createForumTopic(bot.botToken, bot.groupChatId, topicNameFor(visitorId, visitorName)))
      .message_thread_id;

  const updated = await prisma.conversation.update({
    where: { id: conversation.id },
    data: { topicId, flowStatus: "HANDED_OFF", lastMessageAt: new Date() },
  });

  for (const line of contextLines) {
    if (!line) continue;
    try {
      await telegram.sendMessage(bot.botToken, bot.groupChatId, line, topicId);
    } catch {
      // context is a nicety; never fail the handoff over it
    }
  }

  return updated;
}

/** True once a HANDED_OFF/ENDED conversation has gone quiet longer than the chatbot's timeout. */
export function isSessionStale(conversation: Conversation, timeoutMinutes: number): boolean {
  const ageMs = Date.now() - conversation.lastMessageAt.getTime();
  return ageMs > timeoutMinutes * 60 * 1000;
}

export function matchesRestartKeyword(text: string, restartKeywordsCsv: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  return restartKeywordsCsv
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}

/**
 * A HANDED_OFF/ENDED conversation isn't dead forever — a long silence (or an
 * explicit restart keyword) should re-engage the bot rather than leave the
 * visitor talking to nobody. A conversation still RUNNING (mid-question) is
 * left alone regardless of how long it's been idle, so a visitor who takes
 * their time answering doesn't get bumped back to the start.
 */
export function needsSessionRestart(params: {
  chatbot: Chatbot;
  conversation: Conversation;
  flowEnabled: boolean;
  /** The visitor's just-typed text, if this check is happening on a POST. Omit for a GET (chat re-open, nothing typed yet). */
  incomingText?: string;
}): boolean {
  const { chatbot, conversation, flowEnabled, incomingText } = params;
  if (!flowEnabled) return false;
  if (conversation.flowStatus !== "HANDED_OFF" && conversation.flowStatus !== "ENDED") return false;
  const stale = isSessionStale(conversation, chatbot.sessionTimeoutMinutes);
  const keywordHit = incomingText !== undefined && matchesRestartKeyword(incomingText, chatbot.restartKeywords);
  return stale || keywordHit;
}

/**
 * Resets a conversation to run the flow from Start again, in the same
 * conversation/topic — the human sees one continuous thread, not a new topic
 * per re-engagement. Variables are kept or cleared per the chatbot's setting.
 */
export async function restartSession(chatbot: Chatbot, conversation: Conversation): Promise<Conversation> {
  return prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      currentNodeId: null,
      variables: chatbot.keepVariablesAcrossSessions
        ? (conversation.variables as Prisma.InputJsonValue)
        : ({} as Prisma.InputJsonValue),
      flowStatus: "RUNNING",
    },
  });
}

export function formatVariablesSummary(variables: Record<string, unknown>): string | null {
  const entries = Object.entries(variables).filter(([, v]) => typeof v === "string" && v.trim().length > 0);
  if (entries.length === 0) return null;
  return "Collected by the bot:\n" + entries.map(([k, v]) => `• ${k}: ${v}`).join("\n");
}

interface TurnResult {
  botMessages: Awaited<ReturnType<typeof prisma.message.create>>[];
  conversation: Conversation;
}

/**
 * Runs one turn of the flow for a RUNNING conversation: executes the engine,
 * persists whatever it says as BOT messages, and either advances the
 * conversation's flow state or hands off to a human. `input` is null only
 * when auto-starting a brand-new conversation (chat just opened).
 */
export async function runConversationTurn(params: {
  bot: Chatbot;
  graph: FlowGraph;
  conversation: Conversation;
  visitorId: string;
  visitorName: string | null | undefined;
  input: FlowInput | null;
}): Promise<TurnResult> {
  const { bot, graph, visitorId, visitorName, input } = params;
  let conversation = params.conversation;

  const result = runFlow({
    graph,
    currentNodeId: conversation.currentNodeId,
    variables: (conversation.variables as Record<string, string>) ?? {},
    input,
  });

  // Sequential, not Promise.all: preserves message order and gives each a
  // distinct createdAt, which the widget's polling cursor relies on.
  const botMessages: Awaited<ReturnType<typeof prisma.message.create>>[] = [];
  for (const msg of result.outgoing) {
    botMessages.push(
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          sender: "BOT",
          text: msg.text,
          buttons: (msg.buttons as unknown as Prisma.InputJsonValue) ?? undefined,
        },
      })
    );
  }

  if (result.handoff) {
    const contextLines = [formatVariablesSummary(result.variables), input?.text ? `Visitor: ${input.text}` : null].filter(
      (l): l is string => !!l
    );
    conversation = await handOffToHuman(bot, conversation, visitorId, visitorName, contextLines);
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { variables: result.variables, currentNodeId: null },
    });
  } else {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        currentNodeId: result.nextNodeId,
        variables: result.variables,
        flowStatus: result.ended ? "ENDED" : "RUNNING",
        lastMessageAt: new Date(),
      },
    });
  }

  return { botMessages, conversation };
}
