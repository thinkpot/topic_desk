import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyConnection } from "@/lib/verify-connection";
import { appUrlProblem } from "@/lib/webhook";

const schema = z.object({
  botToken: z.string().min(20),
  groupChatId: z.string().min(1),
});

// Used by the setup wizard to check a Telegram group before anything is saved.
export async function POST(req: NextRequest) {
  const auth = await requireActiveUser(req);
  if ("response" in auth) return auth.response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  // Same preconditions creation enforces — surfaced here so the wizard stops at
  // the step the user can act on instead of failing on "Create".
  const serverProblem = appUrlProblem();
  if (serverProblem) return NextResponse.json({ error: serverProblem }, { status: 503 });

  const tokenInUse = await prisma.chatbot.findFirst({
    where: { botToken: parsed.data.botToken },
    select: { id: true },
  });
  if (tokenInUse) {
    return NextResponse.json(
      { error: "This Telegram bot is already connected to a chatbot. Each chatbot needs its own bot from @BotFather." },
      { status: 409 }
    );
  }

  const result = await verifyConnection(parsed.data.botToken, parsed.data.groupChatId);
  return NextResponse.json(result);
}
