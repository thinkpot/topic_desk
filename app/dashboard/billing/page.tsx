"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  formatLimit,
  formatPriceINR,
  formatTimeLeft,
  isUnlimited,
  trialStatus,
  yearlyDiscountPercent,
  yearlyMonthlyEquivalent,
} from "@/lib/plans";
import { Alert, Badge, Field, Modal, Spinner } from "@/components/ui/primitives";

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
  const { user, usage, pendingUpgrade, refresh } = useAuth();
  const [plans, setPlans] = useState<PublicPlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [yearly, setYearly] = useState(false);
  const [requesting, setRequesting] = useState<PublicPlan | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const trial = user ? trialStatus(user) : null;

  function openRequest(plan: PublicPlan) {
    setRequesting(plan);
    setNote("");
    setRequestError(null);
  }

  async function submitRequest() {
    if (!requesting) return;
    setSubmitting(true);
    setRequestError(null);
    try {
      await api.post("/upgrade-requests", {
        planId: requesting.id,
        billingCycle: yearly && requesting.priceYearlyINR > 0 ? "YEARLY" : "MONTHLY",
        note,
      });
      await refresh();
      setRequesting(null);
    } catch (err) {
      setRequestError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRequest() {
    if (!pendingUpgrade) return;
    try {
      await api.delete(`/upgrade-requests/${pendingUpgrade.id}`);
      await refresh();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

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
            <p className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em]">
              {trial?.onTrial ? "Free trial" : user?.plan.name}
            </p>
            <p className="mt-1 text-[14px] text-ink-2">
              {trial?.onTrial ? "No card on file" : formatPriceINR(user?.plan.priceINR ?? 0)}
              {user?.plan.isPaid && !trial?.onTrial && " per month"}
              {user?.planExpiresAt &&
                ` · ${user.plan.slug === "free" ? "trial ends" : "renews"} ${new Date(
                  user.planExpiresAt
                ).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}`}
            </p>
          </div>
          {!user?.plan.isPaid && <Badge tone="warning">Chatbots not included</Badge>}
          {trial?.onTrial && (
            <Badge tone={trial.expired ? "critical" : "neutral"}>
              {trial.expired ? "Trial ended" : `${formatTimeLeft(trial.msLeft)} left`}
            </Badge>
          )}
        </div>

        {pendingUpgrade && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface-sunken px-4 py-3">
            <p className="text-[13.5px] text-ink-2">
              You&apos;ve requested <span className="font-medium text-ink">{pendingUpgrade.planName}</span> (
              {pendingUpgrade.billingCycle === "YEARLY" ? "yearly" : "monthly"}). We&apos;ll activate it and email{" "}
              {user?.email} about payment — nothing is charged automatically.
            </p>
            <button onClick={cancelRequest} className="btn-ghost btn-sm">
              Cancel request
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-ink-2">Conversations this month</span>
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

          <div className="grid max-w-4xl gap-5 sm:grid-cols-3">
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
                    <span className="text-ink-2">Conversations / month</span>
                    <span className="metric font-medium">{formatLimit(plan.maxMonthlyUsers)}</span>
                  </li>
                </ul>
                {plan.priceINR === 0 ? (
                  <button disabled className="btn-secondary mt-6 w-full">
                    {isCurrent ? "Your trial" : "Trial only"}
                  </button>
                ) : pendingUpgrade?.planId === plan.id ? (
                  <button disabled className="btn-secondary mt-6 w-full">
                    Requested
                  </button>
                ) : (
                  <button
                    onClick={() => openRequest(plan)}
                    className={`${isCurrent && !trial?.onTrial ? "btn-secondary" : "btn-primary"} mt-6 w-full`}
                  >
                    {isCurrent ? "Renew" : `Choose ${plan.name}`}
                  </button>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[13px] leading-relaxed text-ink-3">
        We don&apos;t take card payments in the app. Choosing a plan sends us a request; we activate it and send you an
        invoice by email, so your card details are never entered here.
      </p>

      <Modal
        open={!!requesting}
        onClose={() => setRequesting(null)}
        title={requesting ? `Switch to ${requesting.name}` : ""}
        footer={
          <>
            <button onClick={() => setRequesting(null)} className="btn-ghost">
              Cancel
            </button>
            <button onClick={submitRequest} disabled={submitting} className="btn-primary">
              {submitting ? "Sending…" : "Send request"}
            </button>
          </>
        }
      >
        {requesting && (
          <div className="space-y-4">
            {requestError && <Alert>{requestError}</Alert>}
            <div className="flex items-baseline justify-between rounded-md border border-line px-4 py-3">
              <span className="text-[14px] text-ink-2">
                {requesting.name} · {yearly && requesting.priceYearlyINR > 0 ? "billed yearly" : "billed monthly"}
              </span>
              <span className="metric text-[15px] font-semibold">
                {yearly && requesting.priceYearlyINR > 0
                  ? `${formatPriceINR(requesting.priceYearlyINR)}/yr`
                  : `${formatPriceINR(requesting.priceINR)}/mo`}
              </span>
            </div>
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              No payment is taken now. We&apos;ll switch your account over and email {user?.email} with the invoice.
              {trial?.expired && " Your chatbots come back on as soon as it's activated — nothing was deleted."}
            </p>
            <Field label="Anything we should know?" hint="Optional — e.g. GST details, or a preferred payment method.">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={3}
                className="input"
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
