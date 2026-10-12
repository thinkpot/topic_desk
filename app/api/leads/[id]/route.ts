import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

async function loadOwnedLead(req: NextRequest, params: RouteContext["params"]) {
  const auth = await requireUser(req);
  if ("response" in auth) return { response: auth.response };
  const { id } = await params;
  const lead = await prisma.lead.findFirst({ where: { id, chatbot: { userId: auth.user.id } } });
  if (!lead) return { response: NextResponse.json({ error: "Lead not found" }, { status: 404 }) };
  return { lead };
}

const updateSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "WON", "LOST"]),
});

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const loaded = await loadOwnedLead(req, params);
  if ("response" in loaded) return loaded.response;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  // Moving a lead off NEW is the owner saying "handled" — the pending
  // follow-up is cancelled by the sweep (followUpDecision), not here, so the
  // dashboard shows why it was skipped.
  const lead = await prisma.lead.update({ where: { id: loaded.lead.id }, data: { status: parsed.data.status } });
  return NextResponse.json({ lead });
}

// Lets an owner honour a deletion request from one of their visitors.
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const loaded = await loadOwnedLead(req, params);
  if ("response" in loaded) return loaded.response;
  await prisma.lead.delete({ where: { id: loaded.lead.id } });
  return new NextResponse(null, { status: 204 });
}
