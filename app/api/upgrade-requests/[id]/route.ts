import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

// Withdraws the caller's own pending request.
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(req);
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const { count } = await prisma.upgradeRequest.updateMany({
    where: { id, userId: auth.user.id, status: "PENDING" },
    data: { status: "CANCELLED", resolvedAt: new Date() },
  });
  if (!count) return NextResponse.json({ error: "No pending request to cancel" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
