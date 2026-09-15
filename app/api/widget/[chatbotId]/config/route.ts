import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCors, corsPreflight } from "@/lib/cors";

type RouteContext = { params: Promise<{ chatbotId: string }> };

export async function OPTIONS() {
  return corsPreflight();
}

// Public, unauthenticated: the embed script calls this to bootstrap the widget UI.
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { chatbotId } = await params;
  const bot = await prisma.chatbot.findUnique({ where: { id: chatbotId } });
  if (!bot || !bot.isActive) {
    return withCors(NextResponse.json({ error: "Chatbot not found or inactive" }, { status: 404 }));
  }

  return withCors(
    NextResponse.json({
      id: bot.id,
      name: bot.name,
      welcomeMessage: bot.welcomeMessage,
      widgetColor: bot.widgetColor,
    })
  );
}
