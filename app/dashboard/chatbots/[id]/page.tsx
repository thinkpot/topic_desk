"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Analytics } from "@/lib/analytics";
import ActivityChart from "@/components/charts/ActivityChart";
import Funnel from "@/components/charts/Funnel";
import TelegramConnection from "@/components/TelegramConnection";
import ThemeFontPicker from "@/components/ThemeFontPicker";
import { Alert, Badge, CodeBlock, CopyButton, Field, Modal, Spinner, StatTile, Toggle } from "@/components/ui/primitives";

interface Chatbot {
  id: string;
  name: string;
  apiKey: string;
  botUsername: string | null;
  isActive: boolean;
  welcomeMessage: string;
  widgetTheme: string;
  widgetFont: string;
  allowedDomains: string | null;
  sessionTimeoutMinutes: number;
  restartKeywords: string;
  keepVariablesAcrossSessions: boolean;
  dashboardChatEnabled: boolean;
}

type Tab = "install" | "metrics" | "settings";
const TABS: { key: Tab; label: string }[] = [
  { key: "install", label: "Install" },
  { key: "metrics", label: "Metrics" },
  { key: "settings", label: "Settings" },
];

function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  return hours < 24 ? `${hours.toFixed(1)} hr` : `${(hours / 24).toFixed(1)} days`;
}

export default function ChatbotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [bot, setBot] = useState<Chatbot | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [tab, setTab] = useState<Tab>("install");
  const [justCreated, setJustCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  useEffect(() => {
    setJustCreated(new URLSearchParams(window.location.search).get("created") === "1");
  }, []);

  const load = useCallback(() => {
    api
      .get(`/chatbots/${id}`)
      .then((res) => setBot(res.data.chatbot))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [id]);

  useEffect(load, [load]);

  useEffect(() => {
    if (tab !== "metrics" || analytics) return;
    api
      .get(`/chatbots/${id}/analytics?days=14`)
      .then((res) => setAnalytics(res.data.analytics))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [tab, analytics, id]);

  async function save(patch: Partial<Chatbot>) {
    setError(null);
    try {
      const res = await api.patch(`/chatbots/${id}`, patch);
      setBot(res.data.chatbot);
      setSavedAt(Date.now());
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function rotateKey() {
    setConfirmRotate(false);
    try {
      const res = await api.post(`/chatbots/${id}/rotate-key`);
      setBot((prev) => (prev ? { ...prev, apiKey: res.data.apiKey } : prev));
      setSavedAt(Date.now());
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function remove() {
    try {
      await api.delete(`/chatbots/${id}`);
      router.push("/dashboard/chatbots");
    } catch (err) {
      setError(apiErrorMessage(err));
      setConfirmDelete(false);
    }
  }

  if (error && !bot) return <Alert>{error}</Alert>;
  if (!bot) return <Spinner />;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const embedCode = `<script src="${origin}/widget.js" data-api-key="${bot.apiKey}" async></script>`;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/chatbots" className="text-[13px] text-ink-3 hover:text-ink">
          ← Chatbots
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold tracking-[-0.025em]">{bot.name}</h1>
            <Badge tone={bot.isActive ? "positive" : "neutral"}>{bot.isActive ? "Live" : "Paused"}</Badge>
          </div>
          {bot.botUsername && <span className="text-[13px] text-ink-3">@{bot.botUsername}</span>}
        </div>
      </div>

      {justCreated && (
        <Alert tone="info">
          <strong className="text-ink">Your chatbot is ready.</strong> Paste the snippet below on your site — messages
          will arrive as topics in your Telegram group.
        </Alert>
      )}
      {error && <Alert>{error}</Alert>}

      <TelegramConnection chatbotId={bot.id} />

      <div className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 pb-2.5 text-[14px] font-medium transition-colors ${
              tab === t.key ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
        <Link
          href={`/dashboard/chatbots/${bot.id}/flow`}
          className="-mb-px flex items-center gap-1.5 border-b-2 border-transparent px-3 pb-2.5 text-[14px] font-medium text-ink-3 transition-colors hover:text-ink"
        >
          Flow
          <span className="rounded-full bg-surface-sunken px-1.5 py-0.5 text-[10.5px] font-semibold text-ink-2">
            New
          </span>
        </Link>
      </div>

      {tab === "install" && (
        <div className="space-y-5">
          <section className="surface p-6">
            <h2 className="text-[17px] font-semibold">Add this to your website</h2>
            <p className="mt-1 text-[14px] text-ink-2">
              Paste it just before the closing <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-[13px]">&lt;/body&gt;</code> tag on
              every page where the chat should appear.
            </p>
            <div className="mt-4">
              <CodeBlock code={embedCode} label="Embed snippet" />
            </div>
            <p className="mt-3 text-[13px] text-ink-3">
              Works on any site — WordPress, Shopify, Webflow, or plain HTML. No build step needed.
            </p>
          </section>

          <section className="surface p-6">
            <h2 className="text-[17px] font-semibold">API key</h2>
            <p className="mt-1 text-[14px] text-ink-2">
              This key identifies your chatbot in the snippet above. It&apos;s visible in your page source by design —
              lock the widget to your domains in Settings to control who can use it.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <code className="flex-1 truncate rounded-md border border-line bg-surface-sunken px-3 py-2.5 font-mono text-[13px]">
                {bot.apiKey}
              </code>
              <CopyButton value={bot.apiKey} />
              <button onClick={() => setConfirmRotate(true)} className="btn-secondary btn-sm">
                Regenerate
              </button>
            </div>
            <p className="mt-2 text-[13px] text-ink-3">
              Allowed domains: <strong className="text-ink-2">{bot.allowedDomains || "any website"}</strong>
            </p>
          </section>
        </div>
      )}

      {tab === "metrics" && (
        <div className="space-y-5">
          {!analytics && <Spinner label="Loading metrics…" />}
          {analytics && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="Widget seen" value={analytics.totals.views.toLocaleString("en-IN")} sublabel="Last 14 days" />
                <StatTile
                  label="Chats started"
                  value={analytics.totals.conversations.toLocaleString("en-IN")}
                  sublabel={`${analytics.totals.messages.toLocaleString("en-IN")} messages`}
                />
                <StatTile
                  label="Reply rate"
                  value={`${analytics.responseRatePct}%`}
                  sublabel={`${analytics.totals.repliedConversations.toLocaleString("en-IN")} answered`}
                />
                <StatTile
                  label="First reply time"
                  value={formatDuration(analytics.avgFirstResponseMinutes)}
                  sublabel="Average"
                />
              </div>
              <ActivityChart series={analytics.series} />
              <Funnel stages={analytics.funnel} />
            </>
          )}
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-5">
          <section className="surface divide-y divide-line">
            <div className="flex items-center justify-between gap-4 p-5">
              <div>
                <p className="text-[15px] font-medium">Widget is live</p>
                <p className="mt-0.5 text-[13px] text-ink-2">
                  Turn off to hide the widget everywhere without removing the snippet.
                </p>
              </div>
              <Toggle checked={bot.isActive} onChange={(next) => save({ isActive: next })} label="Widget is live" />
            </div>

            <div className="space-y-5 p-5">
              <Field label="Name">
                <input
                  defaultValue={bot.name}
                  onBlur={(e) => e.target.value !== bot.name && e.target.value.trim() && save({ name: e.target.value })}
                  className="input"
                />
              </Field>

              <Field label="Welcome message" hint="Shown as the first message when a visitor opens the chat.">
                <textarea
                  defaultValue={bot.welcomeMessage}
                  onBlur={(e) => e.target.value !== bot.welcomeMessage && save({ welcomeMessage: e.target.value })}
                  rows={2}
                  className="input resize-none"
                />
              </Field>

              <Field label="Allowed domains" hint="Comma-separated hostnames. Leave empty to allow any website.">
                <input
                  defaultValue={bot.allowedDomains ?? ""}
                  onBlur={(e) =>
                    e.target.value !== (bot.allowedDomains ?? "") && save({ allowedDomains: e.target.value })
                  }
                  placeholder="yourstore.com, www.yourstore.com"
                  className="input"
                />
              </Field>

              {savedAt && <p className="text-[13px] text-ink-3">Saved.</p>}
            </div>
          </section>

          <section className="surface p-5">
            <h2 className="text-[15px] font-medium">Session behaviour</h2>
            <p className="mt-0.5 text-[13px] text-ink-2">
              Controls when the flow bot re-engages a visitor who&apos;s already been handed off to a human or
              reached the end of the flow.
            </p>
            <div className="mt-5 space-y-5">
              <Field
                label="Restart after inactivity"
                hint="Minutes of silence after handoff/end before the bot greets the visitor again on their next visit or message."
              >
                <input
                  type="number"
                  min={1}
                  max={43200}
                  defaultValue={bot.sessionTimeoutMinutes}
                  onBlur={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isFinite(next) && next >= 1 && next !== bot.sessionTimeoutMinutes) {
                      save({ sessionTimeoutMinutes: next });
                    }
                  }}
                  className="input w-32"
                />
              </Field>

              <Field
                label="Restart keywords"
                hint="Comma-separated words that restart the flow immediately, even before the timeout."
              >
                <input
                  defaultValue={bot.restartKeywords}
                  onBlur={(e) =>
                    e.target.value !== bot.restartKeywords && save({ restartKeywords: e.target.value })
                  }
                  placeholder="hi, menu, restart, start over"
                  className="input"
                />
              </Field>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[14px] font-medium">Keep collected answers across restarts</p>
                  <p className="mt-0.5 text-[13px] text-ink-2">
                    When off, a restarted flow forgets anything it collected earlier in the conversation.
                  </p>
                </div>
                <Toggle
                  checked={bot.keepVariablesAcrossSessions}
                  onChange={(next) => save({ keepVariablesAcrossSessions: next })}
                  label="Keep collected answers across restarts"
                />
              </div>
            </div>
          </section>

          <section className="surface p-5">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-medium">Dashboard chat</h2>
              {!user?.plan.supportsDashboardChat && <Badge tone="warning">Pro</Badge>}
            </div>
            <p className="mt-0.5 text-[13px] text-ink-2">
              When on, visitor messages are handled from this account&apos;s{" "}
              <Link href="/dashboard/live" className="underline underline-offset-2">
                Live tab
              </Link>{" "}
              instead of Telegram — no topic gets created, and you reply directly from the dashboard.
            </p>
            {user?.plan.supportsDashboardChat ? (
              <div className="mt-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[14px] font-medium">Enable dashboard chat</p>
                  <p className="mt-0.5 text-[13px] text-ink-2">Turn this off to go back to Telegram handoff.</p>
                </div>
                <Toggle
                  checked={bot.dashboardChatEnabled}
                  onChange={(next) => save({ dashboardChatEnabled: next })}
                  label="Enable dashboard chat"
                />
              </div>
            ) : (
              <p className="mt-4 text-[13px] text-ink-3">
                Included on Pro.{" "}
                <Link href="/dashboard/billing" className="underline underline-offset-2">
                  Upgrade
                </Link>{" "}
                to reply to visitors straight from your dashboard.
              </p>
            )}
          </section>

          <section className="surface p-5">
            <h2 className="text-[15px] font-medium">Appearance</h2>
            <p className="mt-0.5 text-[13px] text-ink-2">
              Choose a theme and font for the chat window. Changes apply immediately for new visitors.
            </p>
            <div className="mt-5">
              <ThemeFontPicker
                themeKey={bot.widgetTheme}
                fontKey={bot.widgetFont}
                onSave={(next) => save(next)}
              />
            </div>
          </section>

          <section className="surface flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-[15px] font-medium">Delete this chatbot</p>
              <p className="mt-0.5 text-[13px] text-ink-2">
                Removes the widget, its API key, and every stored conversation. This can&apos;t be undone.
              </p>
            </div>
            <button onClick={() => setConfirmDelete(true)} className="btn-danger btn-sm">
              Delete
            </button>
          </section>
        </div>
      )}

      <Modal
        open={confirmRotate}
        onClose={() => setConfirmRotate(false)}
        title="Regenerate API key?"
        footer={
          <>
            <button onClick={() => setConfirmRotate(false)} className="btn-secondary btn-sm">
              Cancel
            </button>
            <button onClick={rotateKey} className="btn-primary btn-sm">
              Regenerate key
            </button>
          </>
        }
      >
        <p className="text-[14px] leading-relaxed text-ink-2">
          The current key stops working immediately. Your widget will go offline until you replace the snippet on your
          website with the new one.
        </p>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete "${bot.name}"?`}
        footer={
          <>
            <button onClick={() => setConfirmDelete(false)} className="btn-secondary btn-sm">
              Cancel
            </button>
            <button onClick={remove} className="btn-primary btn-sm bg-critical hover:bg-[#b83232]">
              Delete permanently
            </button>
          </>
        }
      >
        <p className="text-[14px] leading-relaxed text-ink-2">
          Every conversation and metric for this chatbot is deleted with it. The topics already created in your Telegram
          group stay there.
        </p>
      </Modal>
    </div>
  );
}
