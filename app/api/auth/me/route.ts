import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId, unauthorized } from "@/lib/auth";
import { PLAN_LIMITS } from "@/lib/plans";

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return unauthorized();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, plan: user.plan, planExpiresAt: user.planExpiresAt },
    planLimits: PLAN_LIMITS[user.plan],
  });
}
