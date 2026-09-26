import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { verifyToken } from "./jwt";
import { prisma } from "./prisma";

export type SessionUser = Prisma.UserGetPayload<{ include: { plan: true } }>;

export function getUserId(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return null;
  try {
    return verifyToken(token).userId;
  } catch {
    return null;
  }
}

export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const userId = getUserId(req);
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId }, include: { plan: true } });
}

export function unauthorized() {
  return NextResponse.json({ error: "Missing or invalid authorization token" }, { status: 401 });
}

export function forbidden(message = "You don't have access to this resource") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/** Resolves to the signed-in user, or a response to return instead. */
export async function requireUser(req: NextRequest): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const user = await getSessionUser(req);
  if (!user) return { response: unauthorized() };
  if (user.isSuspended) return { response: forbidden("This account has been suspended.") };
  return { user };
}

export async function requireAdmin(req: NextRequest): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const result = await requireUser(req);
  if ("response" in result) return result;
  if (result.user.role !== "ADMIN") return { response: forbidden("Admin access required") };
  return result;
}

export function publicUser(user: SessionUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isSuspended: user.isSuspended,
    planExpiresAt: user.planExpiresAt,
    plan: {
      id: user.plan.id,
      slug: user.plan.slug,
      name: user.plan.name,
      priceINR: user.plan.priceINR,
      priceYearlyINR: user.plan.priceYearlyINR,
      maxChatbots: user.plan.maxChatbots,
      maxMonthlyUsers: user.plan.maxMonthlyUsers,
      isPaid: user.plan.isPaid,
      maxLiveVisitors: user.plan.maxLiveVisitors,
      supportsDashboardChat: user.plan.supportsDashboardChat,
    },
  };
}
