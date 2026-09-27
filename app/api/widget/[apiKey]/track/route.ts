import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { withCors, corsPreflight } from "@/lib/cors";
import { resolveWidgetChatbot, utcToday } from "@/lib/widget";

type RouteContext = { params: Promise<{ apiKey: string }> };

export async function OPTIONS() {
  return corsPreflight();
}

const schema = z.object({ event: z.enum(["view", "open"]) });

// Increments the daily rollup behind the "widget seen / chat opened" funnel.
export async function POST(req: NextRequest, { params }: RouteContext) {
  const limited = rateLimit(req, "widgetTrack");
  if (limited) return withCors(limited);
  const { apiKey } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return withCors(NextResponse.json({ error: "Invalid event" }, { status: 400 }));

  const resolved = await resolveWidgetChatbot(apiKey);
  if ("error" in resolved) {
    return withCors(NextResponse.json({ error: resolved.error }, { status: resolved.status }));
  }

  const date = utcToday();
  const field = parsed.data.event === "view" ? "views" : "opens";
  await prisma.widgetStat.upsert({
    where: { chatbotId_date: { chatbotId: resolved.bot.id, date } },
    create: { chatbotId: resolved.bot.id, date, [field]: 1 },
    update: { [field]: { increment: 1 } },
  });

  return withCors(NextResponse.json({ ok: true }));
}
