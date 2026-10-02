import { Prisma, LiveVisitor } from "@prisma/client";
import { prisma } from "./prisma";

const MAX_PAGE_VIEWS = 30;

interface PageView {
  url: string;
  at: string;
}

export interface PresenceInput {
  chatbotId: string;
  visitorId: string;
  url: string;
  scrollPercent?: number;
  referrer?: string | null;
  userAgent?: string | null;
}

// Shared by the REST /presence route (HTTP fallback) and the socket
// heartbeat handler (lib/socket-server.ts) so both paths upsert identically.
export async function upsertPresence(input: PresenceInput): Promise<LiveVisitor> {
  const { chatbotId, visitorId, url } = input;
  const scrollPercent = input.scrollPercent ?? 0;
  const now = new Date();

  const existing = await prisma.liveVisitor.findUnique({
    where: { chatbotId_visitorId: { chatbotId, visitorId } },
  });

  const pageViews = (existing?.pageViews ?? []) as unknown as PageView[];
  const changedPage = existing ? existing.currentUrl !== url : true;
  const nextPageViews = changedPage ? [...pageViews, { url, at: now.toISOString() }].slice(-MAX_PAGE_VIEWS) : pageViews;

  // Upsert rather than branching on `existing`: the widget fires an HTTP
  // heartbeat and a socket heartbeat at almost the same moment, so on a
  // visitor's very first page load two requests both find no row and both
  // insert. One won; the others died on the (chatbotId, visitorId) unique
  // constraint and returned a 500 to every visitor's browser. The constraint
  // already existed — this just lets the database resolve the race.
  return prisma.liveVisitor.upsert({
    where: { chatbotId_visitorId: { chatbotId, visitorId } },
    create: {
      chatbotId,
      visitorId,
      currentUrl: url,
      scrollPercent,
      referrer: input.referrer ?? null,
      userAgent: input.userAgent ?? null,
      pageViews: nextPageViews as unknown as Prisma.InputJsonValue,
      firstSeenAt: now,
      lastSeenAt: now,
    },
    update: {
      currentUrl: url,
      scrollPercent,
      userAgent: input.userAgent ?? existing?.userAgent ?? null,
      lastSeenAt: now,
      ...(changedPage ? { pageViews: nextPageViews as unknown as Prisma.InputJsonValue } : {}),
    },
  });
}
