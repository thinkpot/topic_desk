import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const STATUSES = ["NEW", "CONTACTED", "WON", "LOST"] as const;

// Readable even after a trial lapses (requireUser, not requireActiveUser):
// leads are the owner's own data, and they should be able to export them.
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;

  const status = req.nextUrl.searchParams.get("status");
  const chatbotId = req.nextUrl.searchParams.get("chatbotId");

  const leads = await prisma.lead.findMany({
    where: {
      chatbot: { userId: auth.user.id },
      ...(chatbotId && { chatbotId }),
      ...(status && (STATUSES as readonly string[]).includes(status) && { status: status as (typeof STATUSES)[number] }),
    },
    include: {
      chatbot: { select: { id: true, name: true, followUpEnabled: true, followUpDelayHours: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const counts = await prisma.lead.groupBy({
    by: ["status"],
    where: { chatbot: { userId: auth.user.id }, ...(chatbotId && { chatbotId }) },
    _count: true,
  });

  return NextResponse.json({
    leads,
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
  });
}
