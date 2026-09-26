import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import { emitChatMessageToWidget } from "@/lib/socket-server";

type RouteContext = { params: Promise<{ liveVisitorId: string }> };

const schema = z.object({ text: z.string().min(1).max(2000) });

// Lets the chatbot owner message a live visitor directly from the dashboard —
// including one who's only browsing and has never opened the chat
// (proactive outreach). Reuses the same Message/Conversation rows the widget
// already polls, so no widget-side delivery code is needed beyond the
// heartbeat's unread check.
export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireActiveUser(req);
  if ("response" in auth) return auth.response;
  const { liveVisitorId } = await params;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  if (!auth.user.plan.supportsDashboardChat) {
    return NextResponse.json({ error: "Dashboard chat isn't included in your current plan." }, { status: 403 });
  }

  const visitor = await prisma.liveVisitor.findUnique({
    where: { id: liveVisitorId },
    include: { chatbot: true },
  });
  if (!visitor || visitor.chatbot.userId !== auth.user.id) {
    return NextResponse.json({ error: "Live visitor not found" }, { status: 404 });
  }
  if (!visitor.chatbot.dashboardChatEnabled) {
    return NextResponse.json({ error: "Turn on dashboard chat for this chatbot first." }, { status: 400 });
  }

  let conversation = await prisma.conversation.findUnique({
    where: { chatbotId_visitorId: { chatbotId: visitor.chatbotId, visitorId: visitor.visitorId } },
  });
  conversation = conversation
    ? await prisma.conversation.update({
        where: { id: conversation.id },
        data: { flowStatus: "HANDED_OFF", lastMessageAt: new Date() },
      })
    : await prisma.conversation.create({
        data: {
          chatbotId: visitor.chatbotId,
          visitorId: visitor.visitorId,
          flowStatus: "HANDED_OFF",
          lastMessageAt: new Date(),
        },
      });

  const message = await prisma.message.create({
    data: { conversationId: conversation.id, sender: "AGENT", text: parsed.data.text },
  });
  const payload = { id: message.id, sender: message.sender, text: message.text, createdAt: message.createdAt };

  emitChatMessageToWidget(visitor.chatbotId, visitor.visitorId, payload);

  return NextResponse.json({ message: payload }, { status: 201 });
}
