import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withCors, corsPreflight } from "@/lib/cors";
import { isDomainAllowed } from "@/lib/domain";
import { resolveWidgetChatbot } from "@/lib/widget";
import { upsertPresence } from "@/lib/presence-store";
import { buildLiveVisitorView } from "@/lib/live-visitor-view";
import { emitLiveUpdate } from "@/lib/socket-server";

type RouteContext = { params: Promise<{ apiKey: string }> };

export async function OPTIONS() {
  return corsPreflight();
}

const schema = z.object({
  visitorId: z.string().min(1).max(200),
  url: z.string().min(1).max(500),
  scrollPercent: z.number().int().min(0).max(100).optional(),
  referrer: z.string().max(500).optional(),
});

// HTTP fallback for the widget's presence heartbeat — used when the socket
// connection (see public/widget.js + server.ts) can't be established, e.g. a
// host page's CSP blocks the CDN script or the WS upgrade. Same upsert used
// by the socket path, so the dashboard's Live tab sees either uniformly.
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { apiKey } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return withCors(NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 }));
  const { visitorId, url, referrer } = parsed.data;

  const resolved = await resolveWidgetChatbot(apiKey);
  if ("error" in resolved) return withCors(NextResponse.json({ error: resolved.error }, { status: resolved.status }));
  const { bot } = resolved;

  if (!isDomainAllowed(bot.allowedDomains, req.headers.get("origin"))) {
    return withCors(NextResponse.json({ error: "This website is not authorized to use this chatbot" }, { status: 403 }));
  }

  const visitor = await upsertPresence({
    chatbotId: bot.id,
    visitorId,
    url,
    scrollPercent: parsed.data.scrollPercent,
    referrer,
    userAgent: req.headers.get("user-agent")?.slice(0, 300),
  });

  const view = await buildLiveVisitorView(visitor, bot);
  emitLiveUpdate(bot.userId, view);

  // Piggybacks unread-detection onto the same heartbeat: the widget can show
  // a badge on a closed bubble without a second polling loop.
  const conversation = await prisma.conversation.findUnique({
    where: { chatbotId_visitorId: { chatbotId: bot.id, visitorId } },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const latest = conversation?.messages[0];

  return withCors(
    NextResponse.json({
      latestMessage:
        latest && latest.sender !== "VISITOR" ? { id: latest.id, text: latest.text, createdAt: latest.createdAt } : null,
    })
  );
}
