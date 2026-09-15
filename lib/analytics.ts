import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  views: number;
  opens: number;
  conversations: number;
  messages: number;
}

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  /** Share of the first stage, 0-100. */
  pctOfTop: number;
}

export interface Analytics {
  rangeDays: number;
  totals: {
    views: number;
    opens: number;
    conversations: number;
    messages: number;
    visitorMessages: number;
    agentMessages: number;
    repliedConversations: number;
    monthlyConversations: number;
  };
  funnel: FunnelStage[];
  series: DailyPoint[];
  responseRatePct: number;
  avgFirstResponseMinutes: number | null;
}

function startOfDayUTC(daysAgo: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function emptyAnalytics(rangeDays: number): Analytics {
  return {
    rangeDays,
    totals: {
      views: 0,
      opens: 0,
      conversations: 0,
      messages: 0,
      visitorMessages: 0,
      agentMessages: 0,
      repliedConversations: 0,
      monthlyConversations: 0,
    },
    funnel: [],
    series: [],
    responseRatePct: 0,
    avgFirstResponseMinutes: null,
  };
}

export async function getAnalytics(chatbotIds: string[], rangeDays: number): Promise<Analytics> {
  if (chatbotIds.length === 0) return emptyAnalytics(rangeDays);

  const start = startOfDayUTC(rangeDays - 1);
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const ids = Prisma.join(chatbotIds);

  const [
    statTotals,
    statRows,
    conversationTotal,
    monthlyConversations,
    repliedConversations,
    messagesBySender,
    conversationSeries,
    messageSeries,
    firstResponse,
  ] = await Promise.all([
    prisma.widgetStat.aggregate({
      _sum: { views: true, opens: true },
      where: { chatbotId: { in: chatbotIds }, date: { gte: start } },
    }),
    prisma.widgetStat.findMany({
      where: { chatbotId: { in: chatbotIds }, date: { gte: start } },
      select: { date: true, views: true, opens: true },
    }),
    prisma.conversation.count({ where: { chatbotId: { in: chatbotIds }, createdAt: { gte: start } } }),
    prisma.conversation.count({ where: { chatbotId: { in: chatbotIds }, createdAt: { gte: monthStart } } }),
    prisma.conversation.count({
      where: {
        chatbotId: { in: chatbotIds },
        createdAt: { gte: start },
        messages: { some: { sender: "AGENT" } },
      },
    }),
    prisma.message.groupBy({
      by: ["sender"],
      _count: { _all: true },
      where: { conversation: { chatbotId: { in: chatbotIds } }, createdAt: { gte: start } },
    }),
    prisma.$queryRaw<{ day: Date; count: number }[]>`
      SELECT date_trunc('day', "createdAt")::date AS day, count(*)::int AS count
      FROM "Conversation"
      WHERE "chatbotId" IN (${ids}) AND "createdAt" >= ${start}
      GROUP BY 1
    `,
    prisma.$queryRaw<{ day: Date; count: number }[]>`
      SELECT date_trunc('day', m."createdAt")::date AS day, count(*)::int AS count
      FROM "Message" m
      JOIN "Conversation" c ON c.id = m."conversationId"
      WHERE c."chatbotId" IN (${ids}) AND m."createdAt" >= ${start}
      GROUP BY 1
    `,
    prisma.$queryRaw<{ minutes: number | null }[]>`
      SELECT avg(EXTRACT(EPOCH FROM (first_agent - first_visitor)) / 60)::float AS minutes
      FROM (
        SELECT c.id,
               min(CASE WHEN m.sender::text = 'VISITOR' THEN m."createdAt" END) AS first_visitor,
               min(CASE WHEN m.sender::text = 'AGENT' THEN m."createdAt" END) AS first_agent
        FROM "Conversation" c
        JOIN "Message" m ON m."conversationId" = c.id
        WHERE c."chatbotId" IN (${ids}) AND c."createdAt" >= ${start}
        GROUP BY c.id
      ) t
      WHERE first_agent IS NOT NULL AND first_agent > first_visitor
    `,
  ]);

  const byDay = new Map<string, DailyPoint>();
  for (let i = rangeDays - 1; i >= 0; i--) {
    const key = dayKey(startOfDayUTC(i));
    byDay.set(key, { date: key, views: 0, opens: 0, conversations: 0, messages: 0 });
  }
  for (const row of statRows) {
    const point = byDay.get(dayKey(row.date));
    if (point) {
      point.views += row.views;
      point.opens += row.opens;
    }
  }
  for (const row of conversationSeries) {
    const point = byDay.get(dayKey(row.day));
    if (point) point.conversations = Number(row.count);
  }
  for (const row of messageSeries) {
    const point = byDay.get(dayKey(row.day));
    if (point) point.messages = Number(row.count);
  }

  const visitorMessages = messagesBySender.find((m) => m.sender === "VISITOR")?._count._all ?? 0;
  const agentMessages = messagesBySender.find((m) => m.sender === "AGENT")?._count._all ?? 0;
  const views = statTotals._sum.views ?? 0;
  const opens = statTotals._sum.opens ?? 0;

  const stages: Array<{ key: string; label: string; count: number }> = [
    { key: "views", label: "Widget seen", count: views },
    { key: "opens", label: "Chat opened", count: opens },
    { key: "conversations", label: "Chat started", count: conversationTotal },
    { key: "replied", label: "You replied", count: repliedConversations },
  ];
  const top = stages[0].count;
  const funnel: FunnelStage[] = stages.map((stage) => ({
    ...stage,
    pctOfTop: top > 0 ? Math.round((stage.count / top) * 100) : 0,
  }));

  return {
    rangeDays,
    totals: {
      views,
      opens,
      conversations: conversationTotal,
      messages: visitorMessages + agentMessages,
      visitorMessages,
      agentMessages,
      repliedConversations,
      monthlyConversations,
    },
    funnel,
    series: Array.from(byDay.values()),
    responseRatePct: conversationTotal > 0 ? Math.round((repliedConversations / conversationTotal) * 100) : 0,
    avgFirstResponseMinutes: firstResponse[0]?.minutes ?? null,
  };
}
