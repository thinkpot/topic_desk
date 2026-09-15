import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [totalUsers, activeChatbots, conversationsThisMonth, totalMessages, planBreakdown, recentUsers] =
    await Promise.all([
      prisma.user.count(),
      prisma.chatbot.count({ where: { isActive: true } }),
      prisma.conversation.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.message.count(),
      prisma.plan.findMany({
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          priceINR: true,
          isPaid: true,
          _count: { select: { users: true } },
        },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          isSuspended: true,
          plan: { select: { name: true } },
        },
      }),
    ]);

  const monthlyRecurringINR = planBreakdown
    .filter((plan) => plan.isPaid)
    .reduce((sum, plan) => sum + plan.priceINR * plan._count.users, 0);

  return NextResponse.json({
    totals: { totalUsers, activeChatbots, conversationsThisMonth, totalMessages, monthlyRecurringINR },
    planBreakdown,
    recentUsers,
  });
}
