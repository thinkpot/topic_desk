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

  if (!existing) {
    return prisma.liveVisitor.create({
      data: {
        chatbotId,
        visitorId,
        currentUrl: url,
        scrollPercent,
        referrer: input.referrer ?? null,
        userAgent: input.userAgent ?? null,
        pageViews: [{ url, at: now.toISOString() } satisfies PageView] as unknown as Prisma.InputJsonValue,
        firstSeenAt: now,
        lastSeenAt: now,
      },
    });
  }

  const pageViews = existing.pageViews as unknown as PageView[];
  const changedPage = existing.currentUrl !== url;
  const nextPageViews = changedPage ? [...pageViews, { url, at: now.toISOString() }].slice(-MAX_PAGE_VIEWS) : pageViews;

  return prisma.liveVisitor.update({
    where: { id: existing.id },
    data: {
      currentUrl: url,
      scrollPercent,
      userAgent: input.userAgent ?? existing.userAgent,
      lastSeenAt: now,
      ...(changedPage ? { pageViews: nextPageViews as unknown as Prisma.InputJsonValue } : {}),
    },
  });
}
