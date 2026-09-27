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

/** priceYearlyINR is the total charged per year — this is the equivalent monthly rate to display. */
export function yearlyMonthlyEquivalent(priceYearlyINR: number): number {
  return Math.round(priceYearlyINR / 12);
}

/** % cheaper the yearly plan's monthly-equivalent rate is versus paying monthly. 0 if no yearly price is set. */
export function yearlyDiscountPercent(priceMonthlyINR: number, priceYearlyINR: number): number {
  if (priceMonthlyINR <= 0 || priceYearlyINR <= 0) return 0;
  const equivalentMonthly = priceYearlyINR / 12;
  return Math.round((1 - equivalentMonthly / priceMonthlyINR) * 100);
}

/** Length of the no-card free trial every self-signup gets. */
export const TRIAL_DAYS = 3;
export const TRIAL_PLAN_SLUG = "free";

export function trialEndsAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export interface TrialStatus {
  onTrial: boolean;
  endsAt: Date | null;
  msLeft: number;
  expired: boolean;
}

export function trialStatus(account: { planExpiresAt: Date | string | null; plan: { slug: string } }): TrialStatus {
  if (account.plan.slug !== TRIAL_PLAN_SLUG || !account.planExpiresAt) {
    return { onTrial: false, endsAt: null, msLeft: 0, expired: false };
  }
  const endsAt = new Date(account.planExpiresAt);
  const msLeft = endsAt.getTime() - Date.now();
  return { onTrial: true, endsAt, msLeft: Math.max(msLeft, 0), expired: msLeft <= 0 };
}

/** "2 days 5 hours", "3 hours", "under an hour" — for the trial countdown. */
export function formatTimeLeft(ms: number): string {
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "under an hour";
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  if (days === 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return rem ? `${days} day${days === 1 ? "" : "s"} ${rem} hour${rem === 1 ? "" : "s"}` : `${days} day${days === 1 ? "" : "s"}`;
}

/** How long an approved upgrade runs before it needs renewing. */
export function planPeriodEnd(cycle: "MONTHLY" | "YEARLY", from: Date = new Date()): Date {
  const end = new Date(from);
  if (cycle === "YEARLY") end.setFullYear(end.getFullYear() + 1);
  else end.setMonth(end.getMonth() + 1);
  return end;
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
    return account.plan.slug === TRIAL_PLAN_SLUG
      ? `Your ${TRIAL_DAYS}-day free trial has ended. Pick a plan to keep your chatbots running — your setup and conversations are saved.`
      : "Your plan has expired. Renew it to keep your chatbots running.";
  }
  return null;
}
