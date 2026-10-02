"use client";

import { useState } from "react";
import Link from "next/link";
import { TRIAL_DAYS, formatLimit, formatPriceINR, yearlyDiscountPercent, yearlyMonthlyEquivalent } from "@/lib/plans";
import { Badge } from "@/components/ui/primitives";

export interface PricingPlan {
  id: string;
  name: string;
  description: string | null;
  priceINR: number;
  priceYearlyINR: number;
  maxChatbots: number;
  maxMonthlyUsers: number;
  maxLiveVisitors: number;
  supportsDashboardChat: boolean;
}

export default function PricingCards({ plans }: { plans: PricingPlan[] }) {
  const [yearly, setYearly] = useState(false);
  const bestDiscount = Math.max(0, ...plans.map((p) => yearlyDiscountPercent(p.priceINR, p.priceYearlyINR)));

  return (
    <div>
      <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-line bg-surface-sunken p-1">
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
          {bestDiscount > 0 && <Badge tone="positive">Save {bestDiscount}%</Badge>}
        </button>
      </div>

      <div className="mt-8 grid max-w-4xl gap-5 sm:grid-cols-3">
        {plans.map((plan, i) => {
          const discount = yearlyDiscountPercent(plan.priceINR, plan.priceYearlyINR);
          const showYearly = yearly && plan.priceYearlyINR > 0;
          const displayPrice = showYearly ? yearlyMonthlyEquivalent(plan.priceYearlyINR) : plan.priceINR;

          return (
            <div key={plan.id} className={`surface p-7 ${i === plans.length - 1 ? "ring-1 ring-ink" : ""}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-semibold">{plan.name}</h3>
                {i === plans.length - 1 && (
                  <span className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-medium text-white">
                    Most complete
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-baseline gap-2">
                <p className="metric text-[34px] font-semibold tracking-[-0.03em]">
                  {formatPriceINR(displayPrice)}
                  {displayPrice > 0 && <span className="text-[15px] font-normal text-ink-3">/month</span>}
                </p>
                {showYearly && discount > 0 && <Badge tone="positive">{discount}% off</Badge>}
              </div>
              <p className="mt-1 text-[13px] text-ink-3">
                {plan.priceINR === 0
                  ? `${TRIAL_DAYS}-day trial · no card required`
                  : showYearly
                    ? `Billed ${formatPriceINR(plan.priceYearlyINR)} yearly`
                    : "Billed monthly"}
              </p>

              {plan.description && <p className="mt-2 text-[14px] text-ink-2">{plan.description}</p>}
              <ul className="mt-6 space-y-2.5 text-[14px]">
                <li className="flex justify-between border-b border-line pb-2.5">
                  <span className="text-ink-2">Chatbots</span>
                  <span className="metric font-medium">{formatLimit(plan.maxChatbots)}</span>
                </li>
                <li className="flex justify-between border-b border-line pb-2.5">
                  <span className="text-ink-2">Conversations / month</span>
                  <span className="metric font-medium">{formatLimit(plan.maxMonthlyUsers)}</span>
                </li>
                <li className="flex justify-between border-b border-line pb-2.5">
                  <span className="text-ink-2">Live visitors shown</span>
                  <span className="metric font-medium">{plan.maxLiveVisitors}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-ink-2">Dashboard chat</span>
                  <span className="font-medium">{plan.supportsDashboardChat ? "Included" : "—"}</span>
                </li>
              </ul>
              {/* Every account starts on the no-card trial, whichever plan they're eyeing. */}
              <Link href="/register" className="btn-primary mt-7 w-full">
                {plan.priceINR === 0 ? "Start free trial" : `Try free for ${TRIAL_DAYS} days`}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
