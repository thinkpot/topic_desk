"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, apiErrorMessage } from "@/lib/api";
import { Alert, Badge, EmptyState, Modal, Spinner, StatTile } from "@/components/ui/primitives";

type LeadStatus = "NEW" | "CONTACTED" | "WON" | "LOST";
type FollowUpState = "PENDING" | "SENT" | "SKIPPED" | "FAILED";

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  data: Record<string, unknown>;
  pageUrl: string | null;
  status: LeadStatus;
  followUpState: FollowUpState;
  followUpAt: string | null;
  followUpNote: string | null;
  createdAt: string;
  chatbot: { id: string; name: string; followUpEnabled: boolean; followUpDelayHours: number };
}

const STATUSES: { key: LeadStatus; label: string }[] = [
  { key: "NEW", label: "New" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "WON", label: "Won" },
  { key: "LOST", label: "Lost" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function followUpLabel(lead: Lead): { text: string; tone: "neutral" | "positive" | "warning" | "critical"; hint?: string } {
  if (lead.followUpState === "SENT") return { text: "Sent", tone: "positive", hint: lead.followUpAt ? formatDate(lead.followUpAt) : undefined };
  if (lead.followUpState === "SKIPPED") return { text: "Skipped", tone: "neutral", hint: lead.followUpNote ?? undefined };
  if (lead.followUpState === "FAILED") return { text: "Failed", tone: "critical", hint: lead.followUpNote ?? undefined };
  if (!lead.email) return { text: "No email", tone: "neutral" };
  if (!lead.chatbot.followUpEnabled) return { text: "Off", tone: "neutral", hint: "Turn on in the chatbot's settings" };
  const due = new Date(new Date(lead.createdAt).getTime() + lead.chatbot.followUpDelayHours * 3_600_000);
  return { text: "Scheduled", tone: "warning", hint: `Due ${formatDate(due.toISOString())} if nobody replies` };
}

function toCsv(leads: Lead[]): string {
  const answerKeys = Array.from(new Set(leads.flatMap((l) => Object.keys(l.data ?? {}))));
  const header = ["Name", "Email", "Phone", "Status", "Chatbot", "Captured", "Page", "Follow-up", ...answerKeys];
  const cell = (value: unknown) => {
    const text = value == null ? "" : String(value);
    // Quote everything, and defuse spreadsheet formulas typed in by visitors.
    return `"${(/^[=+\-@]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
  };
  const rows = leads.map((l) => [
    l.name,
    l.email,
    l.phone,
    l.status,
    l.chatbot.name,
    new Date(l.createdAt).toISOString(),
    l.pageUrl,
    followUpLabel(l).text,
    ...answerKeys.map((k) => (l.data ?? {})[k]),
  ]);
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [counts, setCounts] = useState<Partial<Record<LeadStatus, number>>>({});
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "ALL">("ALL");
  const [chatbotFilter, setChatbotFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (chatbotFilter) params.set("chatbotId", chatbotFilter);
    api
      .get(`/leads?${params}`)
      .then((res) => {
        setLeads(res.data.leads);
        setCounts(res.data.counts);
      })
      .catch((err) => setError(apiErrorMessage(err)));
  }, [statusFilter, chatbotFilter]);

  useEffect(load, [load]);

  // Chatbot options come from an unfiltered view so the dropdown doesn't
  // shrink to only the chatbot already selected.
  const [chatbots, setChatbots] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    api
      .get("/chatbots")
      .then((res) => setChatbots(res.data.chatbots.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
  }, []);

  const total = useMemo(() => Object.values(counts).reduce((a, b) => a + (b ?? 0), 0), [counts]);

  async function setStatus(lead: Lead, status: LeadStatus) {
    setError(null);
    setLeads((prev) => prev?.map((l) => (l.id === lead.id ? { ...l, status } : l)) ?? prev);
    try {
      await api.patch(`/leads/${lead.id}`, { status });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
      load();
    }
  }

  async function remove(lead: Lead) {
    setConfirmDelete(null);
    try {
      await api.delete(`/leads/${lead.id}`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  function exportCsv() {
    if (!leads?.length) return;
    const blob = new Blob([toCsv(leads)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error && !leads) return <Alert>{error}</Alert>;
  if (!leads) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em]">Leads</h1>
          <p className="mt-1 text-[14px] text-ink-2">
            Visitors who left an email or phone number, from a flow question or typed into the chat.
          </p>
        </div>
        <button onClick={exportCsv} disabled={!leads.length} className="btn-secondary btn-sm">
          Export CSV
        </button>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="All leads" value={total} />
        <StatTile label="New" value={counts.NEW ?? 0} />
        <StatTile label="Contacted" value={counts.CONTACTED ?? 0} />
        <StatTile label="Won" value={counts.WON ?? 0} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", ...STATUSES.map((s) => s.key)] as const).map((key) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`rounded-full border px-3 py-1 text-[13px] font-medium ${
              statusFilter === key ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-2 hover:text-ink"
            }`}
          >
            {key === "ALL" ? "All" : STATUSES.find((s) => s.key === key)!.label}
          </button>
        ))}
        {chatbots.length > 1 && (
          <select
            value={chatbotFilter}
            onChange={(e) => setChatbotFilter(e.target.value)}
            className="input ml-auto w-auto py-1.5 text-[13px]"
            aria-label="Filter by chatbot"
          >
            <option value="">All chatbots</option>
            {chatbots.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {leads.length === 0 ? (
        <EmptyState
          title={total === 0 ? "No leads yet" : "No leads match this filter"}
          description={
            total === 0
              ? "Leads appear here when a visitor shares an email address or phone number — add a question to your chatbot's flow to ask for one."
              : "Try a different status or chatbot."
          }
          action={
            total === 0 ? (
              <Link href="/dashboard/chatbots" className="btn-primary">
                Open chatbots
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-line text-[12px] uppercase tracking-wide text-ink-3">
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Chatbot</th>
                <th className="px-4 py-3 font-medium">Captured</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Follow-up</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const followUp = followUpLabel(lead);
                const answers = Object.entries(lead.data ?? {}).filter(([, v]) => typeof v === "string" && v);
                return (
                  <Fragment key={lead.id}>
                    <tr className="border-b border-line align-top last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{lead.name || "Unnamed visitor"}</p>
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="block text-[13px] text-ink-2 hover:text-ink">
                            {lead.email}
                          </a>
                        )}
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} className="block text-[13px] text-ink-2 hover:text-ink">
                            {lead.phone}
                          </a>
                        )}
                        {answers.length > 0 && (
                          <button
                            onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                            className="mt-1 text-[12.5px] text-ink-3 underline underline-offset-2 hover:text-ink"
                          >
                            {expanded === lead.id ? "Hide answers" : `${answers.length} answer${answers.length === 1 ? "" : "s"}`}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-2">{lead.chatbot.name}</td>
                      <td className="px-4 py-3 text-ink-2">{formatDate(lead.createdAt)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={lead.status}
                          onChange={(e) => setStatus(lead, e.target.value as LeadStatus)}
                          className="input w-auto py-1 text-[13px]"
                          aria-label="Lead status"
                        >
                          {STATUSES.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={followUp.tone}>{followUp.text}</Badge>
                        {followUp.hint && <p className="mt-1 max-w-[220px] text-[12px] text-ink-3">{followUp.hint}</p>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setConfirmDelete(lead)}
                          className="text-[13px] text-ink-3 hover:text-[#a72c2c]"
                          aria-label="Delete lead"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {expanded === lead.id && (
                      <tr className="border-b border-line bg-surface-sunken">
                        <td colSpan={6} className="px-4 py-3">
                          <dl className="grid gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
                            {answers.map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <dt className="text-ink-3">{key}</dt>
                                <dd className="font-medium">{String(value)}</dd>
                              </div>
                            ))}
                            {lead.pageUrl && (
                              <div className="flex gap-2">
                                <dt className="text-ink-3">Page</dt>
                                <dd className="truncate font-medium">{lead.pageUrl}</dd>
                              </div>
                            )}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!confirmDelete}
        title="Delete this lead?"
        onClose={() => setConfirmDelete(null)}
        footer={
          <>
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary btn-sm">
              Cancel
            </button>
            <button onClick={() => confirmDelete && remove(confirmDelete)} className="btn-danger btn-sm">
              Delete
            </button>
          </>
        }
      >
        <p className="text-[14px] text-ink-2">
          {confirmDelete?.name || confirmDelete?.email || confirmDelete?.phone} will be removed from your leads. The
          chat conversation itself is kept.
        </p>
      </Modal>
    </div>
  );
}
