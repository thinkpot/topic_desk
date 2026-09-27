import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { withCors, corsPreflight } from "@/lib/cors";
import { isDomainAllowed } from "@/lib/domain";
import { telegram } from "@/lib/telegram";
import { resolveWidgetChatbot } from "@/lib/widget";
import { FlowGraph } from "@/lib/flow-engine";
import { handOffToHuman, runConversationTurn, needsSessionRestart, restartSession } from "@/lib/flow-runtime";
import { emitChatMessageToDashboard } from "@/lib/socket-server";

type RouteContext = { params: Promise<{ apiKey: string }> };

export async function OPTIONS() {
  return corsPreflight();
}

function startOfMonth(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function toClientMessage(m: { id: string; sender: string; text: string; buttons: unknown; createdAt: Date }) {
  return {
    id: m.id,
    sender: m.sender,
    text: m.text,
    buttons: (m.buttons as { id: string; label: string }[] | null) ?? undefined,
    createdAt: m.createdAt,
  };
}

// Polling endpoint: the widget calls this every few seconds while open, and
// once on chat-open to load history — which, for a flow-enabled chatbot with
// no conversation yet, is also what starts the flow (the bot gets to speak
// first, same as Wati/AiSensy triggering on session start).
export async function GET(req: NextRequest, { params }: RouteContext) {
  const limited = rateLimit(req, "widgetRead");
  if (limited) return withCors(limited);
  const { apiKey } = await params;
  const visitorId = req.nextUrl.searchParams.get("visitorId");
  const after = req.nextUrl.searchParams.get("after");
  if (!visitorId) {
    return withCors(NextResponse.json({ error: "visitorId is required" }, { status: 400 }));
  }

  const resolved = await resolveWidgetChatbot(apiKey);
  if ("error" in resolved) {
    return withCors(NextResponse.json({ error: resolved.error }, { status: resolved.status }));
  }
  const { bot } = resolved;

  let conversation = await prisma.conversation.findUnique({
    where: { chatbotId_visitorId: { chatbotId: bot.id, visitorId } },
  });

  if (!conversation) {
    const flow = await prisma.flow.findUnique({ where: { chatbotId: bot.id } });
    const monthlyCount = await prisma.conversation.count({
      where: { chatbot: { userId: bot.userId }, createdAt: { gte: startOfMonth() } },
    });

    if (flow?.isEnabled && monthlyCount < bot.user.plan.maxMonthlyUsers) {
      conversation = await prisma.conversation.create({
        data: { chatbotId: bot.id, visitorId, flowStatus: "RUNNING" },
      });
      const { botMessages } = await runConversationTurn({
        bot,
        graph: { nodes: flow.nodes, edges: flow.edges } as unknown as FlowGraph,
        conversation,
        visitorId,
        visitorName: null,
        input: null,
      }).catch(() => ({ botMessages: [] as Awaited<ReturnType<typeof prisma.message.create>>[] }));

      for (const m of botMessages) {
        emitChatMessageToDashboard(bot.userId, bot.id, visitorId, toClientMessage(m));
      }

      return withCors(
        NextResponse.json({
          conversationId: conversation.id,
          welcomeMessage: bot.welcomeMessage,
          messages: botMessages.map(toClientMessage),
        })
      );
    }

    return withCors(NextResponse.json({ conversationId: null, welcomeMessage: bot.welcomeMessage, messages: [] }));
  }

  // A HANDED_OFF/ENDED conversation that's gone cold re-engages the bot the
  // moment the visitor reopens the widget — they shouldn't have to type
  // anything to get a "welcome back" out of a bot that's supposed to be
  // running. Self-limiting: this bumps lastMessageAt, so the very next poll
  // is no longer stale and this doesn't refire on every 3s tick.
  const flowForRestart = await prisma.flow.findUnique({ where: { chatbotId: bot.id } });
  if (needsSessionRestart({ chatbot: bot, conversation, flowEnabled: !!flowForRestart?.isEnabled })) {
    conversation = await restartSession(bot, conversation);
    const restartResult = await runConversationTurn({
      bot,
      graph: { nodes: flowForRestart!.nodes, edges: flowForRestart!.edges } as unknown as FlowGraph,
      conversation,
      visitorId,
      visitorName: conversation.visitorName,
      input: null,
    }).catch(() => null);
    for (const m of restartResult?.botMessages ?? []) {
      emitChatMessageToDashboard(bot.userId, bot.id, visitorId, toClientMessage(m));
    }
  }

  const afterDate = after ? new Date(after) : new Date(0);
  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id, createdAt: { gt: afterDate } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return withCors(
    NextResponse.json({
      conversationId: conversation.id,
      welcomeMessage: bot.welcomeMessage,
      messages: messages.map(toClientMessage),
    })
  );
}

const sendSchema = z.object({
  visitorId: z.string().min(1).max(200),
  visitorName: z.string().max(200).optional(),
  pageUrl: z.string().max(500).optional(),
  text: z.string().min(1).max(2000),
  // Set when the visitor tapped a flow "buttons" option rather than typing.
  choiceId: z.string().max(200).optional(),
});

// Sends a visitor message (typed or a button tap). Routes into the flow while
// it's running; otherwise relays straight into Telegram, creating the topic
// on first contact — unchanged from before flows existed.
export async function POST(req: NextRequest, { params }: RouteContext) {
  const limited = rateLimit(req, "widgetWrite");
  if (limited) return withCors(limited);
  const { apiKey } = await params;
  const parsed = sendSchema.safeParse(await req.json());
  if (!parsed.success) {
    return withCors(NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 }));
  }
  const { visitorId, visitorName, pageUrl, text, choiceId } = parsed.data;

  const resolved = await resolveWidgetChatbot(apiKey);
  if ("error" in resolved) {
    return withCors(NextResponse.json({ error: resolved.error }, { status: resolved.status }));
  }
  const { bot } = resolved;

  if (!isDomainAllowed(bot.allowedDomains, req.headers.get("origin"))) {
    return withCors(
      NextResponse.json({ error: "This website is not authorized to use this chatbot" }, { status: 403 })
    );
  }

  let conversation = await prisma.conversation.findUnique({
    where: { chatbotId_visitorId: { chatbotId: bot.id, visitorId } },
  });
  const flow = await prisma.flow.findUnique({ where: { chatbotId: bot.id } });
  const flowActive = !!flow?.isEnabled;

  if (!conversation) {
    const monthlyCount = await prisma.conversation.count({
      where: { chatbot: { userId: bot.userId }, createdAt: { gte: startOfMonth() } },
    });
    if (monthlyCount >= bot.user.plan.maxMonthlyUsers) {
      return withCors(
        NextResponse.json(
          { error: "This chat has reached its monthly limit. Please try again later." },
          { status: 403 }
        )
      );
    }

    conversation = await prisma.conversation.create({
      data: {
        chatbotId: bot.id,
        visitorId,
        visitorName: visitorName?.trim() || undefined,
        pageUrl: pageUrl || undefined,
        flowStatus: flowActive ? "RUNNING" : "NOT_STARTED",
      },
    });

    if (!flowActive) {
      try {
        conversation = await handOffToHuman(
          bot,
          conversation,
          visitorId,
          visitorName,
          pageUrl ? [`New chat from ${pageUrl}`] : []
        );
      } catch {
        return withCors(
          NextResponse.json({ error: "Chat is temporarily unavailable, please try again shortly." }, { status: 503 })
        );
      }
    }
  }

  const visitorMessage = await prisma.message.create({
    data: { conversationId: conversation.id, sender: "VISITOR", text },
  });
  const responseMessages = [toClientMessage(visitorMessage)];

  // A cold HANDED_OFF/ENDED conversation (or an explicit "hi"/"menu"/"restart")
  // re-engages the bot from Start rather than staying silent — see
  // needsSessionRestart in lib/flow-runtime.ts.
  const restarting = needsSessionRestart({ chatbot: bot, conversation, flowEnabled: flowActive, incomingText: text });
  if (restarting) {
    conversation = await restartSession(bot, conversation);
  }

  if (conversation.flowStatus === "RUNNING" && flow) {
    const { botMessages, conversation: updated } = await runConversationTurn({
      bot,
      graph: { nodes: flow.nodes, edges: flow.edges } as unknown as FlowGraph,
      conversation,
      visitorId,
      visitorName,
      // On a restart, this message was the wake-up trigger, not an answer to
      // whatever node Start leads to — the engine should greet fresh, not
      // silently consume "hi" as a reply to its first Question node.
      input: restarting ? null : { text, choiceId },
    });
    conversation = updated;
    responseMessages.push(...botMessages.map(toClientMessage));
  } else {
    // Plain human relay: ENDED-without-a-topic and NOT_STARTED-with-no-flow
    // both fall through here and get a topic the same way first contact does.
    // A dashboard-chat bot never gets a topic at all, so guard on flowStatus
    // (which handOffToHuman always sets) rather than topicId being present.
    if (conversation.flowStatus !== "HANDED_OFF") {
      try {
        conversation = await handOffToHuman(bot, conversation, visitorId, visitorName);
      } catch {
        return withCors(
          NextResponse.json({ error: "Chat is temporarily unavailable, please try again shortly." }, { status: 503 })
        );
      }
    }
    await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
    if (!bot.dashboardChatEnabled) {
      try {
        await telegram.sendMessage(bot.botToken, bot.groupChatId, text, conversation.topicId!);
      } catch {
        // The message is saved and shown in the widget even if the Telegram relay fails momentarily.
      }
    }
  }

  for (const m of responseMessages) {
    emitChatMessageToDashboard(bot.userId, bot.id, visitorId, m);
  }

  return withCors(NextResponse.json({ conversationId: conversation.id, messages: responseMessages }));
}
