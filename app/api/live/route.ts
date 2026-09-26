import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { liveSince } from "@/lib/presence";

function visitorLabel(variables: Record<string, unknown>, visitorId: string): string {
  const name = variables.name ?? variables.Name;
  return typeof name === "string" && name.trim() ? name.trim() : `Visitor ${visitorId.slice(-6)}`;
}

// Live tab: every visitor currently browsing any of this account's chatbots,
// capped to what their plan allows (Plan.maxLiveVisitors). totalLiveCount is
// the real number, so the dashboard can show "provides an upsell banner
// (\"37 live, showing top 10\") without leaking the extra rows themselves.
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const since = liveSince();
  const where = { chatbot: { userId: user.id }, lastSeenAt: { gte: since } };

  const [totalLiveCount, visitors] = await Promise.all([
    prisma.liveVisitor.count({ where }),
    prisma.liveVisitor.findMany({
      where,
      orderBy: { lastSeenAt: "desc" },
      take: user.plan.maxLiveVisitors,
      include: { chatbot: { select: { id: true, name: true, dashboardChatEnabled: true } } },
    }),
  ]);

  const chatbotIds = [...new Set(visitors.map((v) => v.chatbotId))];
  const visitorIds = [...new Set(visitors.map((v) => v.visitorId))];
  const conversations = chatbotIds.length
    ? await prisma.conversation.findMany({
        where: { chatbotId: { in: chatbotIds }, visitorId: { in: visitorIds } },
        select: {
          chatbotId: true,
          visitorId: true,
          variables: true,
          messages: { orderBy: { createdAt: "desc" }, take: 1, select: { sender: true, text: true, createdAt: true } },
        },
      })
    : [];
  const convByKey = new Map(conversations.map((c) => [`${c.chatbotId}:${c.visitorId}`, c]));

  return NextResponse.json({
    cap: user.plan.maxLiveVisitors,
    totalLiveCount,
    canDashboardChat: user.plan.supportsDashboardChat,
    visitors: visitors.map((v) => {
      const conv = convByKey.get(`${v.chatbotId}:${v.visitorId}`);
      const variables = (conv?.variables as Record<string, unknown>) ?? {};
      const lastMessage = conv?.messages[0] ?? null;
      return {
        id: v.id,
        chatbotId: v.chatbotId,
        chatbotName: v.chatbot.name,
        dashboardChatEnabled: v.chatbot.dashboardChatEnabled,
        visitorId: v.visitorId,
        visitorLabel: visitorLabel(variables, v.visitorId),
        currentUrl: v.currentUrl,
        scrollPercent: v.scrollPercent,
        referrer: v.referrer,
        firstSeenAt: v.firstSeenAt,
        lastSeenAt: v.lastSeenAt,
        hasConversation: !!conv,
        lastMessage,
      };
    }),
  });
}
