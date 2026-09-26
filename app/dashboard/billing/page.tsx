"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatLimit, formatPriceINR, isUnlimited, yearlyDiscountPercent, yearlyMonthlyEquivalent } from "@/lib/plans";
import { Alert, Badge, Spinner } from "@/components/ui/primitives";

interface PublicPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceINR: number;
  priceYearlyINR: number;
  maxChatbots: number;
  maxMonthlyUsers: number;
  isPaid: boolean;
}

export default function BillingPage() {
  const { user, usage } = useAuth();
  const [plans, setPlans] = useState<PublicPlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [yearly, setYearly] = useState(false);

  useEffect(() => {
    api
      .get("/plans")
      .then((res) => setPlans(res.data.plans))
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  const monthlyLimit = user?.plan.maxMonthlyUsers ?? 0;
  const monthlyUsed = usage?.monthlyConversations ?? 0;
  const usagePct = isUnlimited(monthlyLimit)
    ? 0
    : Math.min(Math.round((monthlyUsed / Math.max(monthlyLimit, 1)) * 100), 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.025em]">Billing</h1>
        <p className="mt-1 text-[14px] text-ink-2">Your plan and how much of it you&apos;ve used this month.</p>
      </div>

      {error && <Alert>{error}</Alert>}

      <section className="surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label-eyebrow">Current plan</p>
            <p className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em]">{user?.plan.name}</p>
            <p className="mt-1 text-[14px] text-ink-2">
              {formatPriceINR(user?.plan.priceINR ?? 0)}
              {user?.plan.isPaid && " per month"}
              {user?.planExpiresAt &&
                ` · renews ${new Date(user.planExpiresAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}`}
            </p>
          </div>
          {!user?.plan.isPaid && <Badge tone="warning">Chatbots not included</Badge>}
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-ink-2">Visitors this month</span>
              <span className="metric text-[13px] font-medium">
                {monthlyUsed.toLocaleString("en-IN")}
                <span className="text-ink-3"> / {formatLimit(monthlyLimit)}</span>
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-[4px] bg-surface-sunken">
              <div
                className="h-full rounded-[4px]"
                style={{
                  width: `${
                    isUnlimited(monthlyLimit) ? 100 : Math.max(usagePct, monthlyUsed > 0 ? 1.5 : 0)
                  }%`,
                  background: usagePct >= 90 && !isUnlimited(monthlyLimit) ? "var(--critical)" : "var(--series-1)",
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-ink-2">Chatbots</span>
              <span className="metric text-[13px] font-medium">
                {usage?.chatbots ?? 0}
                <span className="text-ink-3"> / {formatLimit(user?.plan.maxChatbots ?? 0)}</span>
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-[4px] bg-surface-sunken">
              <div
                className="h-full rounded-[4px]"
                style={{
                  width: `${
                    isUnlimited(user?.plan.maxChatbots ?? 0)
                      ? 100
                      : Math.min(((usage?.chatbots ?? 0) / Math.max(user?.plan.maxChatbots ?? 1, 1)) * 100, 100)
                  }%`,
                  background: "var(--series-1)",
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {!plans && !error && <Spinner />}

      {plans && (
        <div>
          {plans.some((p) => p.priceYearlyINR > 0) && (
            <div className="mb-5 inline-flex items-center gap-1 rounded-full border border-line bg-surface-sunken p-1">
              <button
                onClick={() => setYearly(false)}
                className={`rounded-full px-4 py-1.5 text-[13.5px] font-medium transition-colors ${
                  !yearly ? "bg-ink text-white" : "text-ink-2 hover:text-ink"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setYearly(true)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13.5px] font-medium transition-colors ${
                  yearly ? "bg-ink text-white" : "text-ink-2 hover:text-ink"
                }`}
              >
                Yearly
                <Badge tone="positive">
                  Save {Math.max(...plans.map((p) => yearlyDiscountPercent(p.priceINR, p.priceYearlyINR)))}%
                </Badge>
              </button>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:max-w-3xl">
            {plans.map((plan) => {
              const isCurrent = user?.plan.id === plan.id;
              const discount = yearlyDiscountPercent(plan.priceINR, plan.priceYearlyINR);
              const showYearly = yearly && plan.priceYearlyINR > 0;
              const displayPrice = showYearly ? yearlyMonthlyEquivalent(plan.priceYearlyINR) : plan.priceINR;
              return (
                <div key={plan.id} className={`surface p-6 ${isCurrent ? "ring-1 ring-ink" : ""}`}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-[17px] font-semibold">{plan.name}</h2>
                    {isCurrent && <Badge tone="solid">Current</Badge>}
                  </div>
                  <div className="mt-2 flex flex-wrap items-baseline gap-2">
                    <p className="metric text-[28px] font-semibold tracking-[-0.03em]">
                      {formatPriceINR(displayPrice)}
                      {displayPrice > 0 && <span className="text-[14px] font-normal text-ink-3">/month</span>}
                    </p>
                    {showYearly && discount > 0 && <Badge tone="positive">{discount}% off</Badge>}
                  </div>
                  {showYearly && (
                    <p className="mt-0.5 text-[12.5px] text-ink-3">Billed {formatPriceINR(plan.priceYearlyINR)} yearly</p>
                  )}
                  {plan.description && <p className="mt-2 text-[14px] text-ink-2">{plan.description}</p>}
                <ul className="mt-5 space-y-2.5 text-[14px]">
                  <li className="flex justify-between border-b border-line pb-2.5">
                    <span className="text-ink-2">Chatbots</span>
                    <span className="metric font-medium">{formatLimit(plan.maxChatbots)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-ink-2">Visitors / month</span>
                    <span className="metric font-medium">{formatLimit(plan.maxMonthlyUsers)}</span>
                  </li>
                </ul>
                <button disabled className="btn-secondary mt-6 w-full">
                  {isCurrent ? "Your current plan" : "Contact us to switch"}
                </button>
              </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[13px] leading-relaxed text-ink-3">
        Online payments aren&apos;t connected yet — plan changes are applied by an administrator. Wire up a payment
        gateway to make these buttons self-serve.
      </p>
    </div>
  );
}
