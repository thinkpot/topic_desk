import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { verifyConnection } from "@/lib/verify-connection";

type RouteContext = { params: Promise<{ id: string }> };

const schema = z.object({
  botToken: z.string().min(20).optional(),
  groupChatId: z.string().min(1).optional(),
});

// Re-runs the setup wizard's connection check against an already-created
// chatbot. Either field can be left out to check it against what's already
// saved — the token is never sent back to the browser in the first place, so
// "check the group again without re-pasting the token" has to work this way.
export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireActiveUser(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const bot = await prisma.chatbot.findFirst({ where: { id, userId: auth.user.id } });
  if (!bot) return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });

  // Same cap as the wizard's verify call — this also fans out to Telegram
  // with a caller-supplied token.
  const limited = rateLimit(req, "telegramVerify", auth.user.id);
  if (limited) return limited;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const botToken = parsed.data.botToken?.trim() || bot.botToken;
  const groupChatId = parsed.data.groupChatId?.trim() || bot.groupChatId;

  if (botToken !== bot.botToken) {
    const tokenInUse = await prisma.chatbot.findFirst({
      where: { botToken, id: { not: bot.id } },
      select: { id: true },
    });
    if (tokenInUse) {
      return NextResponse.json(
        {
          error: "This Telegram bot is already connected to a chatbot. Each chatbot needs its own bot from @BotFather.",
        },
        { status: 409 }
      );
    }
  }

  const result = await verifyConnection(botToken, groupChatId);
  return NextResponse.json(result);
}
