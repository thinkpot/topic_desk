"use client";

import { useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { Field } from "@/components/ui/primitives";

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

/**
 * Lets an existing chatbot be pointed at a different bot token and/or group,
 * running the same check the setup wizard does before saving either one.
 *
 * The bot token is never sent back to the browser (see /api/chatbots/[id]),
 * so this always starts blank with a "leave blank to keep current" hint —
 * changing only the group doesn't require re-pasting a token nobody can see.
 */
export default function ReconnectTelegram({
  chatbotId,
  botUsername,
  groupChatId,
  onSaved,
}: {
  chatbotId: string;
  botUsername: string | null;
  groupChatId: string;
  onSaved: (next: { botUsername: string | null; groupChatId: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [botToken, setBotToken] = useState("");
  const [groupChatIdInput, setGroupChatIdInput] = useState(groupChatId);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function payload() {
    const body: { botToken?: string; groupChatId?: string } = {};
    if (botToken.trim()) body.botToken = botToken.trim();
    if (groupChatIdInput.trim() !== groupChatId) body.groupChatId = groupChatIdInput.trim();
    return body;
  }

  async function check() {
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post(`/chatbots/${chatbotId}/verify`, payload());
      setResult(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setChecking(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.patch(`/chatbots/${chatbotId}`, payload());
      onSaved({ botUsername: res.data.chatbot.botUsername, groupChatId: res.data.chatbot.groupChatId });
      setBotToken("");
      setResult(null);
      setOpen(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-[15px] font-medium">Telegram bot &amp; group</p>
          <p className="mt-0.5 text-[13px] text-ink-2">
            {botUsername ? `@${botUsername}` : "No bot"} · group {groupChatId}
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-secondary btn-sm">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[15px] font-medium">Change bot or group</p>
        <button
          onClick={() => {
            setOpen(false);
            setBotToken("");
            setGroupChatIdInput(groupChatId);
            setResult(null);
            setError(null);
          }}
          className="text-[13px] text-ink-3 hover:text-ink"
        >
          Cancel
        </button>
      </div>

      {error && <p className="text-[13px] text-[#a72c2c]">{error}</p>}

      <Field label="Bot token" hint="Leave blank to keep the current bot.">
        <input
          value={botToken}
          onChange={(e) => {
            setBotToken(e.target.value);
            setResult(null);
          }}
          placeholder="Unchanged"
          className="input font-mono text-[13px]"
        />
      </Field>

      <Field label="Group chat ID">
        <input
          value={groupChatIdInput}
          onChange={(e) => {
            setGroupChatIdInput(e.target.value);
            setResult(null);
          }}
          className="input font-mono text-[13px]"
        />
      </Field>

      {result && (
        <ul className="space-y-2.5 rounded-md border border-line p-4">
          {result.checks.map((c) => (
            <li key={c.key} className="flex gap-3">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] ${
                  c.ok ? "bg-[#f1faf1] text-[#0a7a0a]" : "bg-surface-sunken text-ink-3"
                }`}
              >
                {c.ok ? "✓" : "·"}
              </span>
              <div>
                <p className="text-[14px] font-medium">{c.label}</p>
                <p className="text-[13px] text-ink-2">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end gap-2.5">
        <button onClick={check} disabled={checking} className="btn-secondary btn-sm">
          {checking ? "Checking…" : "Check connection"}
        </button>
        <button onClick={save} disabled={!result?.ok || saving} className="btn-primary btn-sm">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
