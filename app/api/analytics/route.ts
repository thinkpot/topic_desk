import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getAnalytics } from "@/lib/analytics";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get("days") ?? 14), 7), 90);
  const chatbots = await prisma.chatbot.findMany({
    where: { userId: auth.user.id },
    select: { id: true, name: true },
  });

  return NextResponse.json({
    analytics: await getAnalytics(
      chatbots.map((c) => c.id),
      days
    ),
  });
}
