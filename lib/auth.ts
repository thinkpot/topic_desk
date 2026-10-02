import { NextRequest, NextResponse } from "next/server";
import { accountBlockReason } from "./plans";
import { userFromToken, type SessionUser } from "./session";

export { userFromToken, type SessionUser };

function bearerToken(req: NextRequest): string | undefined {
  const header = req.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
}

export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  return userFromToken(bearerToken(req));
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

/**
 * Same as requireUser, but also refuses a blocked account (suspended, unpaid
 * tier, or an expired trial/plan) — for endpoints that actually serve
 * chatbot/analytics data. Deliberately not applied to /auth/me or /plans,
 * since the dashboard needs those to keep working even while blocked (it's
 * how the frontend learns *why* it's blocked and what to do about it).
 */
export async function requireActiveUser(req: NextRequest): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const result = await requireUser(req);
  if ("response" in result) return result;
  const blocked = accountBlockReason(result.user);
  if (blocked) return { response: NextResponse.json({ error: blocked, blocked: true }, { status: 403 }) };
  return result;
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
    trialStartedAt: user.trialStartedAt,
    emailVerifiedAt: user.emailVerifiedAt,
    companyName: user.companyName,
    websiteUrl: user.websiteUrl,
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
