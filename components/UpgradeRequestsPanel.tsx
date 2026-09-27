"use client";

import { useCallback, useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { formatPriceINR } from "@/lib/plans";
import { Alert, Badge, Spinner } from "@/components/ui/primitives";

interface UpgradeRequestRow {
  id: string;
  billingCycle: "MONTHLY" | "YEARLY";
  note: string | null;
  createdAt: string;
  plan: { id: string; name: string; priceINR: number; priceYearlyINR: number };
  user: {
    id: string;
    name: string;
    email: string;
    companyName: string | null;
    websiteUrl: string | null;
    planExpiresAt: string | null;
    plan: { name: string; slug: string };
  };
}

// Stand-in for a payment webhook: approving moves the account onto the plan
// for one billing period; invoicing happens outside the app.
export default function UpgradeRequestsPanel() {
  const [requests, setRequests] = useState<UpgradeRequestRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get("/admin/upgrade-requests")
      .then((res) => setRequests(res.data.requests))
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  useEffect(load, [load]);

  async function resolve(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      await api.patch(`/admin/upgrade-requests/${id}`, { action });
      setRequests((rows) => rows?.filter((r) => r.id !== id) ?? null);
    } catch (err) {
      setError(apiErrorMessage(err));
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Plan requests</h2>
        {requests && requests.length > 0 && <Badge tone="warning">{requests.length} pending</Badge>}
      </div>
      <p className="mt-0.5 text-[13px] text-ink-3">
        Approving switches the account over for one billing period. Send the invoice yourself.
      </p>

      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {!requests && !error && (
        <div className="mt-4">
          <Spinner />
        </div>
      )}

      {requests && (
        <ul className="mt-4 divide-y divide-line">
          {requests.map((r) => {
            const yearly = r.billingCycle === "YEARLY";
            const trialEnded =
              r.user.plan.slug === "free" && r.user.planExpiresAt && new Date(r.user.planExpiresAt) < new Date();
            return (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium">
                    {r.user.name}
                    {r.user.companyName && <span className="font-normal text-ink-3"> · {r.user.companyName}</span>}
                  </p>
                  <p className="truncate text-[13px] text-ink-3">
                    {r.user.email}
                    {r.user.websiteUrl && ` · ${r.user.websiteUrl}`}
                  </p>
                  <p className="mt-1.5 text-[13px] text-ink-2">
                    {r.user.plan.slug === "free" ? "Trial" : r.user.plan.name} →{" "}
                    <span className="font-medium text-ink">{r.plan.name}</span>,{" "}
                    {yearly ? `${formatPriceINR(r.plan.priceYearlyINR)}/yr` : `${formatPriceINR(r.plan.priceINR)}/mo`}
                    {trialEnded && <span className="text-[#a72c2c]"> · trial ended, chatbots paused</span>}
                  </p>
                  {r.note && <p className="mt-1.5 text-[13px] italic text-ink-2">&ldquo;{r.note}&rdquo;</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => resolve(r.id, "reject")}
                    disabled={busyId === r.id}
                    className="btn-ghost btn-sm"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => resolve(r.id, "approve")}
                    disabled={busyId === r.id}
                    className="btn-primary btn-sm"
                  >
                    Approve
                  </button>
                </div>
              </li>
            );
          })}
          {requests.length === 0 && <li className="py-3 text-[14px] text-ink-3">No pending requests.</li>}
        </ul>
      )}
    </section>
  );
}
