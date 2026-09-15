import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, publicUser } from "@/lib/auth";
import { accountBlockReason } from "@/lib/plans";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [chatbotCount, monthlyConversations] = await Promise.all([
    prisma.chatbot.count({ where: { userId: user.id } }),
    prisma.conversation.count({
      where: { chatbot: { userId: user.id }, createdAt: { gte: monthStart } },
    }),
  ]);

  return NextResponse.json({
    user: publicUser(user),
    usage: { chatbots: chatbotCount, monthlyConversations },
    blockReason: accountBlockReason(user),
  });
}
