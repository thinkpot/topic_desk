import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type RouteContext = { params: Promise<{ liveVisitorId: string }> };

// Detail pane for one live visitor: their recent page path plus the full
// conversation transcript, if they've started one.
export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const { liveVisitorId } = await params;

  const visitor = await prisma.liveVisitor.findUnique({
    where: { id: liveVisitorId },
    include: { chatbot: { select: { id: true, name: true, userId: true, dashboardChatEnabled: true } } },
  });
  if (!visitor || visitor.chatbot.userId !== auth.user.id) {
    return NextResponse.json({ error: "Live visitor not found" }, { status: 404 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { chatbotId_visitorId: { chatbotId: visitor.chatbotId, visitorId: visitor.visitorId } },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({
    visitor: {
      id: visitor.id,
      chatbotId: visitor.chatbotId,
      chatbotName: visitor.chatbot.name,
      visitorId: visitor.visitorId,
      currentUrl: visitor.currentUrl,
      scrollPercent: visitor.scrollPercent,
      referrer: visitor.referrer,
      userAgent: visitor.userAgent,
      firstSeenAt: visitor.firstSeenAt,
      lastSeenAt: visitor.lastSeenAt,
      pageViews: visitor.pageViews,
    },
    conversation: conversation
      ? {
          id: conversation.id,
          flowStatus: conversation.flowStatus,
          variables: conversation.variables,
          messages: conversation.messages.map((m) => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            createdAt: m.createdAt,
          })),
        }
      : null,
    canChat: auth.user.plan.supportsDashboardChat && visitor.chatbot.dashboardChatEnabled,
  });
}
