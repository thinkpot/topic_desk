import { LiveVisitor } from "@prisma/client";
import { prisma } from "./prisma";

export function visitorLabel(variables: Record<string, unknown>, visitorId: string): string {
  const name = variables.name ?? variables.Name;
  return typeof name === "string" && name.trim() ? name.trim() : `Visitor ${visitorId.slice(-6)}`;
}

export interface LiveVisitorView {
  id: string;
  chatbotId: string;
  chatbotName: string;
  dashboardChatEnabled: boolean;
  visitorId: string;
  visitorLabel: string;
  currentUrl: string;
  scrollPercent: number;
  referrer: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  hasConversation: boolean;
  lastMessage: { sender: string; text: string; createdAt: Date } | null;
}

// One-visitor version of the shaping app/api/live/route.ts does in bulk —
// used by the socket heartbeat handler, which only ever has one visitor at a
// time. Same per-heartbeat conversation lookup the REST /presence route
// already did before sockets existed, so this adds no new DB load.
export async function buildLiveVisitorView(
  visitor: LiveVisitor,
  chatbot: { name: string; dashboardChatEnabled: boolean }
): Promise<LiveVisitorView> {
  const conversation = await prisma.conversation.findUnique({
    where: { chatbotId_visitorId: { chatbotId: visitor.chatbotId, visitorId: visitor.visitorId } },
    select: {
      variables: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { sender: true, text: true, createdAt: true } },
    },
  });
  const variables = (conversation?.variables as Record<string, unknown>) ?? {};

  return {
    id: visitor.id,
    chatbotId: visitor.chatbotId,
    chatbotName: chatbot.name,
    dashboardChatEnabled: chatbot.dashboardChatEnabled,
    visitorId: visitor.visitorId,
    visitorLabel: visitorLabel(variables, visitor.visitorId),
    currentUrl: visitor.currentUrl,
    scrollPercent: visitor.scrollPercent,
    referrer: visitor.referrer,
    firstSeenAt: visitor.firstSeenAt,
    lastSeenAt: visitor.lastSeenAt,
    hasConversation: !!conversation,
    lastMessage: conversation?.messages[0] ?? null,
  };
}
