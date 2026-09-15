"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatPriceINR } from "@/lib/plans";
import { Alert, Badge, Field, Modal, Spinner } from "@/components/ui/primitives";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  isSuspended: boolean;
  planExpiresAt: string | null;
  createdAt: string;
  plan: { id: string; name: string; slug: string; priceINR: number };
  _count: { chatbots: number };
}

interface AdminPlan {
  id: string;
  name: string;
  slug: string;
  priceINR: number;
}

const BLANK = { name: "", email: "", password: "", planId: "", role: "USER" as const, planExpiresAt: "" };

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", planId: "", role: "USER", planExpiresAt: "", password: "" });

  const load = useCallback(async (q: string) => {
    try {
      const res = await api.get(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      setUsers(res.data.users);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    load("");
    api
      .get("/admin/plans")
      .then((res) => setPlans(res.data.plans))
      .catch(() => setPlans([]));
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => load(query), 250);
    return () => clearTimeout(timer);
  }, [query, load]);

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.post("/admin/users", {
        name: form.name,
        email: form.email,
        password: form.password,
        planId: form.planId || plans[0]?.id,
        role: form.role,
        planExpiresAt: form.planExpiresAt ? new Date(form.planExpiresAt).toISOString() : null,
      });
      setCreateOpen(false);
      setForm(BLANK);
      await load(query);
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    try {
      await api.patch(`/admin/users/${editing.id}`, {
        name: editForm.name,
        email: editForm.email,
        planId: editForm.planId,
        role: editForm.role,
        planExpiresAt: editForm.planExpiresAt ? new Date(editForm.planExpiresAt).toISOString() : null,
        ...(editForm.password ? { password: editForm.password } : {}),
      });
      setEditing(null);
      await load(query);
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleSuspended(target: AdminUser) {
    try {
      await api.patch(`/admin/users/${target.id}`, { isSuspended: !target.isSuspended });
      await load(query);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function removeUser(target: AdminUser) {
    if (!confirm(`Delete ${target.email}? Their chatbots and conversations are deleted too.`)) return;
    try {
      await api.delete(`/admin/users/${target.id}`);
      await load(query);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  function openEdit(target: AdminUser) {
    setEditing(target);
    setFormError(null);
    setEditForm({
      name: target.name,
      email: target.email,
      planId: target.plan.id,
      role: target.role,
      planExpiresAt: target.planExpiresAt ? target.planExpiresAt.slice(0, 10) : "",
      password: "",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em]">Users</h1>
          <p className="mt-1 text-[14px] text-ink-2">Create accounts, assign plans, and suspend access.</p>
        </div>
        <button
          onClick={() => {
            setForm({ ...BLANK, planId: plans[0]?.id ?? "" });
            setFormError(null);
            setCreateOpen(true);
          }}
          className="btn-primary"
        >
          Create user
        </button>
      </div>

      {error && <Alert>{error}</Alert>}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or email"
        className="input max-w-sm"
      />

      {!users && <Spinner />}

      {users && (
        <div className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[14px]">
              <thead>
                <tr className="border-b border-line text-left text-[12px] uppercase tracking-[0.06em] text-ink-3">
                  <th className="px-5 py-3 font-medium">Account</th>
                  <th className="px-5 py-3 font-medium">Plan</th>
                  <th className="px-5 py-3 font-medium">Expires</th>
                  <th className="px-5 py-3 text-right font-medium">Chatbots</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.name}</span>
                        {u.role === "ADMIN" && <Badge tone="solid">Admin</Badge>}
                        {u.isSuspended && <Badge tone="critical">Suspended</Badge>}
                      </div>
                      <p className="text-[13px] text-ink-3">{u.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-medium">{u.plan.name}</span>
                      <p className="metric text-[13px] text-ink-3">{formatPriceINR(u.plan.priceINR)}</p>
                    </td>
                    <td className="metric px-5 py-3 text-ink-2">
                      {u.planExpiresAt
                        ? new Date(u.planExpiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="metric px-5 py-3 text-right">{u._count.chatbots}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(u)} className="btn-ghost btn-sm">
                          Edit
                        </button>
                        {u.id !== currentUser?.id && (
                          <>
                            <button onClick={() => toggleSuspended(u)} className="btn-ghost btn-sm">
                              {u.isSuspended ? "Restore" : "Suspend"}
                            </button>
                            <button onClick={() => removeUser(u)} className="btn-ghost btn-sm text-critical">
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-ink-3">
                      No accounts match that search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create user"
        footer={
          <>
            <button onClick={() => setCreateOpen(false)} className="btn-secondary btn-sm">
              Cancel
            </button>
            <button form="create-user" type="submit" disabled={saving} className="btn-primary btn-sm">
              {saving ? "Creating…" : "Create user"}
            </button>
          </>
        }
      >
        <form id="create-user" onSubmit={createUser} className="space-y-4">
          {formError && <Alert>{formError}</Alert>}
          <Field label="Name">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </Field>
          <Field label="Email">
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Password" hint="Share this with the customer — they can't reset it themselves yet.">
            <input
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input font-mono text-[13px]"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plan">
              <select
                value={form.planId}
                onChange={(e) => setForm({ ...form, planId: e.target.value })}
                className="input"
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} · {formatPriceINR(plan.priceINR)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Plan expires" hint="Leave empty for no expiry.">
              <input
                type="date"
                value={form.planExpiresAt}
                onChange={(e) => setForm({ ...form, planExpiresAt: e.target.value })}
                className="input"
              />
            </Field>
          </div>
        </form>
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${editing.name}` : ""}
        footer={
          <>
            <button onClick={() => setEditing(null)} className="btn-secondary btn-sm">
              Cancel
            </button>
            <button form="edit-user" type="submit" disabled={saving} className="btn-primary btn-sm">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </>
        }
      >
        <form id="edit-user" onSubmit={saveEdit} className="space-y-4">
          {formError && <Alert>{formError}</Alert>}
          <Field label="Name">
            <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input" />
          </Field>
          <Field label="Email">
            <input
              type="email"
              required
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className="input"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plan">
              <select
                value={editForm.planId}
                onChange={(e) => setEditForm({ ...editForm, planId: e.target.value })}
                className="input"
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} · {formatPriceINR(plan.priceINR)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Plan expires">
              <input
                type="date"
                value={editForm.planExpiresAt}
                onChange={(e) => setEditForm({ ...editForm, planExpiresAt: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role">
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                disabled={editing?.id === currentUser?.id}
                className="input"
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </Field>
            <Field label="New password" hint="Leave empty to keep the current one.">
              <input
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="••••••••"
                className="input font-mono text-[13px]"
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
