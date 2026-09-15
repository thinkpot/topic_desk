import { Plan } from "@prisma/client";

// JSON.stringify turns Infinity into null, so "unlimited" is represented as
// this large finite sentinel instead — safe for both JSON transport and
// plain numeric comparisons.
export const UNLIMITED = Number.MAX_SAFE_INTEGER;

export const PLAN_LIMITS: Record<
  Plan,
  { maxChatbots: number; maxMonthlyUsers: number; priceINR: number; label: string }
> = {
  BASIC: { maxChatbots: 1, maxMonthlyUsers: 3000, priceINR: 1000, label: "Basic" },
  PRO: { maxChatbots: UNLIMITED, maxMonthlyUsers: UNLIMITED, priceINR: 3000, label: "Pro" },
};
