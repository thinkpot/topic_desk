import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getAnalytics } from "@/lib/analytics";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const bot = await prisma.chatbot.findFirst({ where: { id, userId: auth.user.id }, select: { id: true } });
  if (!bot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

  const days = Math.min(Math.max(Number(req.nextUrl.searchParams.get("days") ?? 14), 7), 90);
  return NextResponse.json({ analytics: await getAnalytics([bot.id], days) });
}
