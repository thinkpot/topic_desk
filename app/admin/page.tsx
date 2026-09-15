"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, apiErrorMessage } from "@/lib/api";
import { formatPriceINR } from "@/lib/plans";
import { Alert, Badge, Spinner, StatTile } from "@/components/ui/primitives";

interface Overview {
  totals: {
    totalUsers: number;
    activeChatbots: number;
    conversationsThisMonth: number;
    totalMessages: number;
    monthlyRecurringINR: number;
  };
  planBreakdown: {
    id: string;
    name: string;
    slug: string;
    priceINR: number;
    isPaid: boolean;
    _count: { users: number };
  }[];
  recentUsers: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    isSuspended: boolean;
    plan: { name: string };
  }[];
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/admin/overview")
      .then((res) => setData(res.data))
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Spinner />;

  const totalOnPaidPlans = data.planBreakdown
    .filter((p) => p.isPaid)
    .reduce((sum, p) => sum + p._count.users, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.025em]">Admin overview</h1>
        <p className="mt-1 text-[14px] text-ink-2">Accounts, usage, and revenue across the whole platform.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Accounts"
          value={data.totals.totalUsers.toLocaleString("en-IN")}
          sublabel={`${totalOnPaidPlans.toLocaleString("en-IN")} on paid plans`}
        />
        <StatTile label="Live chatbots" value={data.totals.activeChatbots.toLocaleString("en-IN")} />
        <StatTile
          label="Chats this month"
          value={data.totals.conversationsThisMonth.toLocaleString("en-IN")}
          sublabel={`${data.totals.totalMessages.toLocaleString("en-IN")} messages all time`}
        />
        <StatTile
          label="Monthly recurring"
          value={formatPriceINR(data.totals.monthlyRecurringINR)}
          sublabel="Sum of active paid plans"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Accounts by plan</h2>
            <Link href="/admin/plans" className="text-[13px] font-medium text-ink-2 underline underline-offset-2 hover:text-ink">
              Edit plans
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {data.planBreakdown.map((plan) => (
              <li key={plan.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-[14px] font-medium">{plan.name}</p>
                  <p className="text-[13px] text-ink-3">{formatPriceINR(plan.priceINR)} / month</p>
                </div>
                <span className="metric text-[15px] font-semibold">{plan._count.users}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Newest accounts</h2>
            <Link href="/admin/users" className="text-[13px] font-medium text-ink-2 underline underline-offset-2 hover:text-ink">
              All users
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-line">
            {data.recentUsers.map((user) => (
              <li key={user.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">{user.name}</p>
                  <p className="truncate text-[13px] text-ink-3">{user.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {user.isSuspended && <Badge tone="critical">Suspended</Badge>}
                  <Badge>{user.plan.name}</Badge>
                </div>
              </li>
            ))}
            {data.recentUsers.length === 0 && <li className="py-3 text-[14px] text-ink-3">No accounts yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
