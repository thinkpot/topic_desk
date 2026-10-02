import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, publicUser } from "@/lib/auth";
import { accountBlockReason } from "@/lib/plans";
import { channelFor, realtimeEnabled } from "@/lib/realtime";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [chatbotCount, monthlyConversations, pending] = await Promise.all([
    prisma.chatbot.count({ where: { userId: user.id } }),
    prisma.conversation.count({
      where: { chatbot: { userId: user.id }, createdAt: { gte: monthStart } },
    }),
    prisma.upgradeRequest.findFirst({
      where: { userId: user.id, status: "PENDING" },
      select: { id: true, billingCycle: true, createdAt: true, plan: { select: { id: true, name: true } } },
    }),
  ]);

  return NextResponse.json({
    user: publicUser(user),
    usage: { chatbots: chatbotCount, monthlyConversations },
    blockReason: accountBlockReason(user),
    // Only an authenticated caller learns its channel name, which is what keeps
    // a Supabase broadcast channel private without Supabase-side RLS.
    realtime: realtimeEnabled()
      ? {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
          channel: channelFor("user", user.id),
        }
      : null,
    pendingUpgrade: pending
      ? { id: pending.id, planId: pending.plan.id, planName: pending.plan.name, billingCycle: pending.billingCycle, createdAt: pending.createdAt }
      : null,
  });
}
