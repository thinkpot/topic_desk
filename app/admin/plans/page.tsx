"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { UNLIMITED, formatLimit, formatPriceINR, isUnlimited, yearlyDiscountPercent } from "@/lib/plans";
import { Alert, Badge, Field, Modal, Spinner, Toggle } from "@/components/ui/primitives";

interface AdminPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceINR: number;
  priceYearlyINR: number;
  maxChatbots: number;
  maxMonthlyUsers: number;
  isPaid: boolean;
  isPublic: boolean;
  sortOrder: number;
  maxLiveVisitors: number;
  supportsDashboardChat: boolean;
  _count: { users: number };
}

interface PlanForm {
  slug: string;
  name: string;
  description: string;
  priceINR: string;
  priceYearlyMonthlyEquivalent: string;
  maxChatbots: string;
  maxMonthlyUsers: string;
  unlimitedChatbots: boolean;
  unlimitedUsers: boolean;
  isPaid: boolean;
  isPublic: boolean;
  sortOrder: string;
  maxLiveVisitors: string;
  supportsDashboardChat: boolean;
}

const BLANK: PlanForm = {
  slug: "",
  name: "",
  description: "",
  priceINR: "0",
  priceYearlyMonthlyEquivalent: "0",
  maxChatbots: "1",
  maxMonthlyUsers: "1000",
  unlimitedChatbots: false,
  unlimitedUsers: false,
  isPaid: true,
  isPublic: true,
  sortOrder: "10",
  maxLiveVisitors: "10",
  supportsDashboardChat: false,
};

function toForm(plan: AdminPlan): PlanForm {
  return {
    slug: plan.slug,
    name: plan.name,
    description: plan.description ?? "",
    priceINR: String(plan.priceINR),
    priceYearlyMonthlyEquivalent: String(Math.round(plan.priceYearlyINR / 12)),
    maxChatbots: isUnlimited(plan.maxChatbots) ? "1" : String(plan.maxChatbots),
    maxMonthlyUsers: isUnlimited(plan.maxMonthlyUsers) ? "1000" : String(plan.maxMonthlyUsers),
    unlimitedChatbots: isUnlimited(plan.maxChatbots),
    unlimitedUsers: isUnlimited(plan.maxMonthlyUsers),
    isPaid: plan.isPaid,
    isPublic: plan.isPublic,
    sortOrder: String(plan.sortOrder),
    maxLiveVisitors: String(plan.maxLiveVisitors),
    supportsDashboardChat: plan.supportsDashboardChat,
  };
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<AdminPlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<PlanForm>(BLANK);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/admin/plans");
      setPlans(res.data.plans);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function payload() {
    return {
      name: form.name,
      description: form.description.trim() || null,
      priceINR: Number(form.priceINR),
      priceYearlyINR: Number(form.priceYearlyMonthlyEquivalent) * 12,
      maxChatbots: form.unlimitedChatbots ? UNLIMITED : Number(form.maxChatbots),
      maxMonthlyUsers: form.unlimitedUsers ? UNLIMITED : Number(form.maxMonthlyUsers),
      isPaid: form.isPaid,
      isPublic: form.isPublic,
      sortOrder: Number(form.sortOrder),
      maxLiveVisitors: Number(form.maxLiveVisitors),
      supportsDashboardChat: form.supportsDashboardChat,
    };
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await api.patch(`/admin/plans/${editing.id}`, payload());
      } else {
        await api.post("/admin/plans", { ...payload(), slug: form.slug });
      }
      setEditing(null);
      setCreating(false);
      await load();
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(plan: AdminPlan) {
    if (!confirm(`Delete the ${plan.name} plan?`)) return;
    try {
      await api.delete(`/admin/plans/${plan.id}`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const modalOpen = creating || editing !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em]">Plans</h1>
          <p className="mt-1 text-[14px] text-ink-2">
            Pricing and limits are read live — changes apply to every account on the plan immediately.
          </p>
        </div>
        <button
          onClick={() => {
            setForm(BLANK);
            setFormError(null);
            setCreating(true);
          }}
          className="btn-primary"
        >
          New plan
        </button>
      </div>

      {error && <Alert>{error}</Alert>}
      {!plans && <Spinner />}

      {plans && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="surface flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-[17px] font-semibold">{plan.name}</h2>
                  <p className="text-[13px] text-ink-3">/{plan.slug}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {!plan.isPaid && <Badge tone="warning">Unpaid tier</Badge>}
                  {!plan.isPublic && <Badge>Hidden</Badge>}
                </div>
              </div>

              <p className="metric mt-3 text-[26px] font-semibold tracking-[-0.03em]">
                {formatPriceINR(plan.priceINR)}
                {plan.priceINR > 0 && <span className="text-[13px] font-normal text-ink-3">/month</span>}
              </p>
              {plan.priceYearlyINR > 0 && (
                <p className="mt-1 text-[13px] text-ink-2">
                  {formatPriceINR(Math.round(plan.priceYearlyINR / 12))}/month billed yearly ·{" "}
                  <span className="font-medium text-positive">
                    {yearlyDiscountPercent(plan.priceINR, plan.priceYearlyINR)}% off
                  </span>
                </p>
              )}

              <dl className="mt-4 space-y-2 border-t border-line pt-3 text-[13px]">
                <div className="flex justify-between">
                  <dt className="text-ink-2">Chatbots</dt>
                  <dd className="metric font-medium">{formatLimit(plan.maxChatbots)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-2">Conversations / month</dt>
                  <dd className="metric font-medium">{formatLimit(plan.maxMonthlyUsers)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-2">Live visitors shown</dt>
                  <dd className="metric font-medium">{plan.maxLiveVisitors}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-2">Dashboard chat</dt>
                  <dd className="metric font-medium">{plan.supportsDashboardChat ? "Included" : "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-2">Accounts on plan</dt>
                  <dd className="metric font-medium">{plan._count.users}</dd>
                </div>
              </dl>

              <div className="mt-4 flex gap-1 border-t border-line pt-3">
                <button
                  onClick={() => {
                    setEditing(plan);
                    setForm(toForm(plan));
                    setFormError(null);
                  }}
                  className="btn-secondary btn-sm"
                >
                  Edit
                </button>
                {plan._count.users === 0 && plan.slug !== "free" && (
                  <button onClick={() => remove(plan)} className="btn-ghost btn-sm text-critical">
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        title={editing ? `Edit ${editing.name}` : "New plan"}
        footer={
          <>
            <button
              onClick={() => {
                setEditing(null);
                setCreating(false);
              }}
              className="btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button form="plan-form" type="submit" disabled={saving} className="btn-primary btn-sm">
              {saving ? "Saving…" : editing ? "Save plan" : "Create plan"}
            </button>
          </>
        }
      >
        <form id="plan-form" onSubmit={submit} className="space-y-4">
          {formError && <Alert>{formError}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
            </Field>
            <Field label="Slug" hint={editing ? "Slug can't be changed." : "Lowercase, no spaces."}>
              <input
                required
                disabled={!!editing}
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="growth"
                className="input"
              />
            </Field>
          </div>

          <Field label="Description">
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Shown on the pricing page"
              className="input"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price (₹ / month, billed monthly)">
              <input
                type="number"
                min={0}
                required
                value={form.priceINR}
                onChange={(e) => setForm({ ...form, priceINR: e.target.value })}
                className="input"
              />
            </Field>
            <Field
              label="Price (₹ / month, billed yearly)"
              hint={
                Number(form.priceYearlyMonthlyEquivalent) > 0 && Number(form.priceINR) > 0
                  ? `${yearlyDiscountPercent(Number(form.priceINR), Number(form.priceYearlyMonthlyEquivalent) * 12)}% cheaper than monthly — charged ${formatPriceINR(Number(form.priceYearlyMonthlyEquivalent) * 12)} once a year.`
                  : "0 disables the yearly option for this plan."
              }
            >
              <input
                type="number"
                min={0}
                value={form.priceYearlyMonthlyEquivalent}
                onChange={(e) => setForm({ ...form, priceYearlyMonthlyEquivalent: e.target.value })}
                className="input"
              />
            </Field>
          </div>

          <Field label="Sort order" hint="Lower numbers show first.">
            <input
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              className="input w-32"
            />
          </Field>

          <div className="space-y-3 rounded-md border border-line p-4">
            <div className="flex items-center justify-between gap-4">
              <Field label="Chatbots included">
                <input
                  type="number"
                  min={0}
                  disabled={form.unlimitedChatbots}
                  value={form.unlimitedChatbots ? "" : form.maxChatbots}
                  onChange={(e) => setForm({ ...form, maxChatbots: e.target.value })}
                  placeholder="Unlimited"
                  className="input"
                />
              </Field>
              <label className="flex shrink-0 items-center gap-2 pt-5 text-[13px]">
                <Toggle
                  checked={form.unlimitedChatbots}
                  onChange={(next) => setForm({ ...form, unlimitedChatbots: next })}
                  label="Unlimited chatbots"
                />
                Unlimited
              </label>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Field label="Visitors per month">
                <input
                  type="number"
                  min={0}
                  disabled={form.unlimitedUsers}
                  value={form.unlimitedUsers ? "" : form.maxMonthlyUsers}
                  onChange={(e) => setForm({ ...form, maxMonthlyUsers: e.target.value })}
                  placeholder="Unlimited"
                  className="input"
                />
              </Field>
              <label className="flex shrink-0 items-center gap-2 pt-5 text-[13px]">
                <Toggle
                  checked={form.unlimitedUsers}
                  onChange={(next) => setForm({ ...form, unlimitedUsers: next })}
                  label="Unlimited visitors"
                />
                Unlimited
              </label>
            </div>
          </div>

          <div className="space-y-3 rounded-md border border-line p-4">
            <Field label="Live visitors shown at once" hint="How many currently-active visitors this plan can see in the Live tab.">
              <input
                type="number"
                min={0}
                value={form.maxLiveVisitors}
                onChange={(e) => setForm({ ...form, maxLiveVisitors: e.target.value })}
                className="input"
              />
            </Field>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] font-medium">Dashboard chat</p>
                <p className="text-[13px] text-ink-2">Lets accounts reply to visitors from the dashboard instead of Telegram.</p>
              </div>
              <Toggle
                checked={form.supportsDashboardChat}
                onChange={(next) => setForm({ ...form, supportsDashboardChat: next })}
                label="Dashboard chat"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium">Paid tier</p>
                <p className="text-[13px] text-ink-2">Accounts on unpaid tiers can&apos;t create chatbots or API keys.</p>
              </div>
              <Toggle checked={form.isPaid} onChange={(next) => setForm({ ...form, isPaid: next })} label="Paid tier" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium">Show publicly</p>
                <p className="text-[13px] text-ink-2">Appears on the pricing page and billing screen.</p>
              </div>
              <Toggle checked={form.isPublic} onChange={(next) => setForm({ ...form, isPublic: next })} label="Show publicly" />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
