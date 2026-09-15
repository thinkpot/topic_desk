import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { verifyConnection } from "@/lib/verify-connection";

const schema = z.object({
  botToken: z.string().min(20),
  groupChatId: z.string().min(1),
});

// Used by the setup wizard to check a Telegram group before anything is saved.
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const result = await verifyConnection(parsed.data.botToken, parsed.data.groupChatId);
  return NextResponse.json(result);
}
