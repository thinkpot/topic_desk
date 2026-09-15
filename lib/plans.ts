// Postgres int4 max — used as the "unlimited" sentinel so limit checks stay
// plain numeric comparisons (and survive JSON, unlike Infinity).
export const UNLIMITED = 2147483647;

export function isUnlimited(limit: number): boolean {
  return limit >= UNLIMITED;
}

export function formatLimit(limit: number): string {
  return isUnlimited(limit) ? "Unlimited" : limit.toLocaleString("en-IN");
}

export function formatPriceINR(price: number): string {
  return price === 0 ? "Free" : `₹${price.toLocaleString("en-IN")}`;
}

export interface AccountPlan {
  id: string;
  slug: string;
  name: string;
  priceINR: number;
  maxChatbots: number;
  maxMonthlyUsers: number;
  isPaid: boolean;
}

export interface AccountState {
  isSuspended: boolean;
  planExpiresAt: Date | string | null;
  plan: AccountPlan;
}

/**
 * A chatbot only serves traffic (and only gets an API key) while its owner is on
 * an unexpired paid plan and not suspended.
 */
export function accountBlockReason(account: AccountState): string | null {
  if (account.isSuspended) return "This account has been suspended.";
  if (!account.plan.isPaid) return "Your current plan doesn't include chatbots. Upgrade to get started.";
  if (account.planExpiresAt && new Date(account.planExpiresAt) < new Date()) {
    return "Your plan has expired. Renew it to keep your chatbots running.";
  }
  return null;
}
