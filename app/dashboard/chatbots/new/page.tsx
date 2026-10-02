"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Alert, Field } from "@/components/ui/primitives";
import { trackEvent } from "@/lib/gtag";

interface ConnectionCheck {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

interface ConnectionResult {
  ok: boolean;
  botUsername: string | null;
  groupTitle: string | null;
  checks: ConnectionCheck[];
}

const STEPS = ["Basics", "Connect Telegram", "Review"];

function StepDots({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`metric flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold ${
              i < current
                ? "bg-ink text-white"
                : i === current
                  ? "bg-ink text-white"
                  : "border border-line-strong bg-surface text-ink-3"
            }`}
          >
            {i < current ? "✓" : i + 1}
          </span>
          <span className={`text-[13px] font-medium ${i === current ? "text-ink" : "text-ink-3"}`}>{label}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-line-strong" />}
        </li>
      ))}
    </ol>
  );
}

export default function NewChatbotPage() {
  const router = useRouter();
  const { blockReason, refresh } = useAuth();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [allowedDomains, setAllowedDomains] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("Hi! How can we help you today?");
  const [botToken, setBotToken] = useState("");
  const [groupChatId, setGroupChatId] = useState("");

  const [connection, setConnection] = useState<ConnectionResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (blockReason) {
    return (
      <div className="mx-auto max-w-xl space-y-4 pt-4">
        <h1 className="text-[24px] font-semibold tracking-[-0.025em]">New chatbot</h1>
        <Alert tone="warning">{blockReason}</Alert>
        <Link href="/dashboard/billing" className="btn-primary">
          View plans
        </Link>
      </div>
    );
  }

  async function verify() {
    setVerifying(true);
    setError(null);
    try {
      const res = await api.post("/chatbots/verify", { botToken: botToken.trim(), groupChatId: groupChatId.trim() });
      setConnection(res.data);
      if (res.data.ok) setStep(2);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setVerifying(false);
    }
  }

  async function create() {
    setCreating(true);
    setError(null);
    try {
      const res = await api.post("/chatbots", {
        name: name.trim(),
        botToken: botToken.trim(),
        groupChatId: groupChatId.trim(),
        welcomeMessage: welcomeMessage.trim() || undefined,
        allowedDomains: allowedDomains.trim() || undefined,
      });
      await refresh();
      // The activation moment: Telegram verified and the webhook registered,
      // so this chatbot can now serve real traffic.
      trackEvent("chatbot_created", { has_allowed_domains: !!allowedDomains.trim() });
      router.push(`/dashboard/chatbots/${res.data.chatbot.id}?created=1`);
    } catch (err) {
      setError(apiErrorMessage(err));
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/chatbots" className="text-[13px] text-ink-3 hover:text-ink">
        ← Back to chatbots
      </Link>
      <h1 className="mt-3 text-[24px] font-semibold tracking-[-0.025em]">Set up a chatbot</h1>

      <div className="mt-6">
        <StepDots current={step} />
      </div>

      {error && (
        <div className="mt-5">
          <Alert>{error}</Alert>
        </div>
      )}

      {step === 0 && (
        <section className="surface mt-5 space-y-5 p-6">
          <Field label="What should we call it?" hint="Only you see this — it labels the chatbot in your dashboard.">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Storefront support"
              className="input"
            />
          </Field>

          <Field
            label="Which website will it run on?"
            hint="Optional but recommended: only these domains can load the widget. Comma-separate multiple."
          >
            <input
              value={allowedDomains}
              onChange={(e) => setAllowedDomains(e.target.value)}
              placeholder="yourstore.com, www.yourstore.com"
              className="input"
            />
          </Field>

          <Field label="First message visitors see">
            <input
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="input"
              maxLength={200}
            />
          </Field>

          <div className="flex justify-end">
            <button
              disabled={!name.trim()}
              onClick={() => {
                trackEvent("chatbot_setup_started");
                setStep(1);
              }}
              className="btn-primary"
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="mt-5 space-y-5">
          <div className="surface p-6">
            <h2 className="text-[17px] font-semibold">1. Create your Telegram bot</h2>
            <ol className="mt-3 space-y-2 text-[14px] leading-relaxed text-ink-2">
              <li>
                1. Open{" "}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-ink underline underline-offset-2"
                >
                  @BotFather
                </a>{" "}
                in Telegram and send <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-[13px]">/newbot</code>.
              </li>
              <li>2. Pick a name and username. BotFather replies with a token.</li>
              <li>3. Paste that token below.</li>
            </ol>
            <div className="mt-4">
              <Field label="Bot token">
                <input
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="123456789:AAH..."
                  className="input font-mono text-[13px]"
                />
              </Field>
            </div>
          </div>

          <div className="surface p-6">
            <h2 className="text-[17px] font-semibold">2. Prepare your group</h2>
            <ol className="mt-3 space-y-2 text-[14px] leading-relaxed text-ink-2">
              <li>1. Create a Telegram group, then open its settings and turn on <strong>Topics</strong>.</li>
              <li>
                2. Add your bot to the group, then promote it to <strong>admin</strong> with the{" "}
                <strong>Manage Topics</strong> permission.
              </li>
              <li>
                3. To find the group ID, add{" "}
                <a
                  href="https://t.me/RawDataBot"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-ink underline underline-offset-2"
                >
                  @RawDataBot
                </a>{" "}
                to the group. It posts the chat ID (starts with <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-[13px]">-100</code>), then you can remove it.
              </li>
            </ol>
            <div className="mt-4">
              <Field label="Group chat ID">
                <input
                  value={groupChatId}
                  onChange={(e) => setGroupChatId(e.target.value)}
                  placeholder="-1001234567890"
                  className="input font-mono text-[13px]"
                />
              </Field>
            </div>
          </div>

          {connection && !connection.ok && (
            <div className="surface p-6">
              <h3 className="text-[15px] font-semibold">Almost there — fix these, then check again</h3>
              <ul className="mt-3 space-y-3">
                {connection.checks.map((check) => (
                  <li key={check.key} className="flex gap-3">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] ${
                        check.ok ? "bg-[#f1faf1] text-[#0a7a0a]" : "bg-surface-sunken text-ink-3"
                      }`}
                    >
                      {check.ok ? "✓" : "·"}
                    </span>
                    <div>
                      <p className="text-[14px] font-medium">{check.label}</p>
                      <p className="text-[13px] text-ink-2">{check.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(0)} className="btn-secondary">
              Back
            </button>
            <button
              onClick={verify}
              disabled={verifying || botToken.trim().length < 20 || !groupChatId.trim()}
              className="btn-primary"
            >
              {verifying ? "Checking…" : connection ? "Check again" : "Check connection"}
            </button>
          </div>
        </section>
      )}

      {step === 2 && connection?.ok && (
        <section className="mt-5 space-y-5">
          <div className="surface p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f1faf1] text-[13px] text-[#0a7a0a]">
                ✓
              </span>
              <h2 className="text-[17px] font-semibold">Telegram is connected</h2>
            </div>
            <dl className="mt-4 divide-y divide-line text-[14px]">
              <div className="flex justify-between py-2.5">
                <dt className="text-ink-2">Chatbot</dt>
                <dd className="font-medium">{name}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-ink-2">Bot</dt>
                <dd className="font-medium">@{connection.botUsername}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-ink-2">Group</dt>
                <dd className="font-medium">{connection.groupTitle ?? groupChatId}</dd>
              </div>
              <div className="flex justify-between py-2.5">
                <dt className="text-ink-2">Allowed domains</dt>
                <dd className="font-medium">{allowedDomains.trim() || "Any"}</dd>
              </div>
            </dl>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="btn-secondary">
              Back
            </button>
            <button onClick={create} disabled={creating} className="btn-primary">
              {creating ? "Creating…" : "Create chatbot"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
