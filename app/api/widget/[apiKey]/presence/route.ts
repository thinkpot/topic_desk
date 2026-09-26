import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withCors, corsPreflight } from "@/lib/cors";
import { isDomainAllowed } from "@/lib/domain";
import { resolveWidgetChatbot } from "@/lib/widget";

type RouteContext = { params: Promise<{ apiKey: string }> };

export async function OPTIONS() {
  return corsPreflight();
}

const MAX_PAGE_VIEWS = 30;

const schema = z.object({
  visitorId: z.string().min(1).max(200),
  url: z.string().min(1).max(500),
  scrollPercent: z.number().int().min(0).max(100).optional(),
  referrer: z.string().max(500).optional(),
});

interface PageView {
  url: string;
  at: string;
}

// Heartbeat the widget calls every few seconds while a page is open — powers
// the dashboard's Live tab. Independent of whether the visitor has ever
// opened the chat: this is presence, not a conversation.
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { apiKey } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return withCors(NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 }));
  const { visitorId, url, referrer } = parsed.data;
  const scrollPercent = parsed.data.scrollPercent ?? 0;

  const resolved = await resolveWidgetChatbot(apiKey);
  if ("error" in resolved) return withCors(NextResponse.json({ error: resolved.error }, { status: resolved.status }));
  const { bot } = resolved;

  if (!isDomainAllowed(bot.allowedDomains, req.headers.get("origin"))) {
    return withCors(NextResponse.json({ error: "This website is not authorized to use this chatbot" }, { status: 403 }));
  }

  const existing = await prisma.liveVisitor.findUnique({
    where: { chatbotId_visitorId: { chatbotId: bot.id, visitorId } },
  });

  const now = new Date();
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;

  if (!existing) {
    await prisma.liveVisitor.create({
      data: {
        chatbotId: bot.id,
        visitorId,
        currentUrl: url,
        scrollPercent,
        referrer: referrer ?? null,
        userAgent,
        pageViews: [{ url, at: now.toISOString() } satisfies PageView],
        firstSeenAt: now,
        lastSeenAt: now,
      },
    });
  } else {
    const pageViews = existing.pageViews as unknown as PageView[];
    const changedPage = existing.currentUrl !== url;
    const nextPageViews = changedPage ? [...pageViews, { url, at: now.toISOString() }].slice(-MAX_PAGE_VIEWS) : pageViews;

    await prisma.liveVisitor.update({
      where: { id: existing.id },
      data: {
        currentUrl: url,
        scrollPercent,
        userAgent,
        lastSeenAt: now,
        ...(changedPage ? { pageViews: nextPageViews as unknown as Prisma.InputJsonValue } : {}),
      },
    });
  }

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
