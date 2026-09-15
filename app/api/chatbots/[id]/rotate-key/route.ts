import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { accountBlockReason } from "@/lib/plans";
import { generateApiKey } from "@/lib/keys";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const blocked = accountBlockReason(auth.user);
  if (blocked) return NextResponse.json({ error: blocked }, { status: 403 });

  const bot = await prisma.chatbot.findFirst({ where: { id, userId: auth.user.id } });
  if (!bot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

  const updated = await prisma.chatbot.update({ where: { id: bot.id }, data: { apiKey: generateApiKey() } });
  return NextResponse.json({ apiKey: updated.apiKey });
}
