import type { Chatbot, Conversation } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { telegram, TelegramApiError } from "./telegram";
import { runFlows, FlowFrame, FlowGraph, FlowInput } from "./flow-engine";

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
 *
 * When the chatbot has dashboard chat enabled, there's no Telegram topic at
 * all — the owner replies from the Live tab instead, reusing the same
 * Message/Conversation rows (see app/api/live/[liveVisitorId]/messages).
 */
export async function handOffToHuman(
  bot: Chatbot,
  conversation: Conversation,
  visitorId: string,
  visitorName: string | null | undefined,
  contextLines: string[] = []
): Promise<Conversation> {
  if (bot.dashboardChatEnabled) {
    return prisma.conversation.update({
      where: { id: conversation.id },
      data: { flowStatus: "HANDED_OFF", lastMessageAt: new Date() },
    });
  }

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
    } catch (error) {
      // context is a nicety; never fail the handoff over it — but still worth a trace.
      console.error(`> [telegram] context line failed for chatbot ${bot.id}:`, error);
    }
  }

  return updated;
}

/**
 * Whether a visitor message goes to the chatbot flow rather than straight to a
 * human. Requires the flow to be ENABLED, not merely to exist: a conversation
 * left RUNNING from when the flow was on would otherwise keep feeding every
 * message into a switched-off flow that never hands off — the returning
 * visitor is silently stuck while brand-new visitors relay fine.
 */
export function routesToFlow(conversation: Pick<Conversation, "flowStatus">, flowEnabled: boolean): boolean {
  return flowEnabled && conversation.flowStatus === "RUNNING";
}

/** Telegram's answer when a topic id doesn't exist in the group — deleted, or left over from another group/bot. */
export function isMissingTopicError(err: unknown): boolean {
  return err instanceof TelegramApiError && /thread not found|topic_deleted/i.test(err.description);
}

/**
 * Relays a visitor message into the conversation's topic. If the topic is
 * gone — deleted in Telegram, or left over from before the chatbot was pointed
 * at a different bot or group — opens a fresh one and retries once. Without
 * this, a returning visitor (same visitorId in their browser) relays into a
 * dead topic on every message forever, while brand-new visitors work fine.
 */
export async function relayVisitorMessage(
  bot: Chatbot,
  conversation: Conversation,
  visitorId: string,
  visitorName: string | null | undefined,
  text: string
): Promise<Conversation> {
  try {
    await telegram.sendMessage(bot.botToken, bot.groupChatId, text, conversation.topicId!);
    return conversation;
  } catch (err) {
    if (!isMissingTopicError(err)) throw err;
  }
  const fresh = await handOffToHuman(bot, { ...conversation, topicId: null }, visitorId, visitorName);
  await telegram.sendMessage(bot.botToken, bot.groupChatId, text, fresh.topicId!);
  return fresh;
}

/**
 * Whether a conversation needs (re-)handing off before a visitor message can
 * relay to Telegram. True for anything not yet handed off, and — this is the
 * case that used to be missed — also true for a HANDED_OFF conversation that
 * has no topic yet, which happens whenever handOffToHuman ran while
 * dashboardChatEnabled was on (it marks the conversation HANDED_OFF without
 * creating one). If that setting is later turned back off, relying on
 * flowStatus alone would relay to Telegram with a null topicId forever;
 * checking topicId directly makes this self-healing instead.
 */
export function needsHandoff(
  conversation: Pick<Conversation, "flowStatus" | "topicId">,
  bot: Pick<Chatbot, "dashboardChatEnabled">
): boolean {
  if (conversation.flowStatus !== "HANDED_OFF") return true;
  return !bot.dashboardChatEnabled && conversation.topicId === null;
}

/** True once a HANDED_OFF/ENDED conversation has gone quiet longer than the chatbot's timeout. */
export function isSessionStale(conversation: Pick<Conversation, "lastMessageAt">, timeoutMinutes: number): boolean {
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
  chatbot: Pick<Chatbot, "sessionTimeoutMinutes" | "restartKeywords">;
  conversation: Pick<Conversation, "flowStatus" | "lastMessageAt">;
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
      currentFlowId: null,
      flowStack: [],
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
/** Everything the engine needs about a chatbot's flows. */
export interface FlowSet {
  /** The main flow's row — its isEnabled switches flows on for the chatbot. */
  main: { id: string; isEnabled: boolean };
  flows: Record<string, FlowGraph>;
}

/**
 * Loads all of a chatbot's flows, or null if it has none. The main flow is
 * the one marked isMain, falling back to the oldest — a chatbot always has
 * somewhere to start even if that flag were somehow missing.
 */
export async function loadFlowSet(chatbotId: string): Promise<FlowSet | null> {
  const rows = await prisma.flow.findMany({ where: { chatbotId }, orderBy: { createdAt: "asc" } });
  if (rows.length === 0) return null;
  const main = rows.find((f) => f.isMain) ?? rows[0];
  return {
    main: { id: main.id, isEnabled: main.isEnabled },
    flows: Object.fromEntries(
      rows.map((f) => [f.id, { nodes: f.nodes, edges: f.edges } as unknown as FlowGraph])
    ),
  };
}

export async function runConversationTurn(params: {
  bot: Chatbot;
  flowSet: FlowSet;
  conversation: Conversation;
  visitorId: string;
  visitorName: string | null | undefined;
  input: FlowInput | null;
}): Promise<TurnResult> {
  const { bot, flowSet, visitorId, visitorName, input } = params;
  let conversation = params.conversation;

  const result = runFlows({
    flows: flowSet.flows,
    mainFlowId: flowSet.main.id,
    position: conversation.currentNodeId
      ? { flowId: conversation.currentFlowId ?? flowSet.main.id, nodeId: conversation.currentNodeId }
      : null,
    stack: Array.isArray(conversation.flowStack) ? (conversation.flowStack as unknown as FlowFrame[]) : [],
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
      data: { variables: result.variables, currentNodeId: null, currentFlowId: null, flowStack: [] },
    });
  } else {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        currentNodeId: result.position?.nodeId ?? null,
        currentFlowId: result.position?.flowId ?? null,
        flowStack: result.stack as unknown as Prisma.InputJsonValue,
        variables: result.variables,
        flowStatus: result.ended ? "ENDED" : "RUNNING",
        lastMessageAt: new Date(),
      },
    });
  }

  return { botMessages, conversation };
}
