"use client";

import { useState } from "react";
import Link from "next/link";
import { api, apiErrorMessage } from "@/lib/api";
import { Field, Toggle } from "@/components/ui/primitives";
import { DEFAULT_FOLLOW_UP_BODY, DEFAULT_FOLLOW_UP_SUBJECT, FOLLOW_UP_DELAY_HOURS } from "@/lib/follow-up-defaults";

interface FollowUpFields {
  followUpEnabled: boolean;
  followUpDelayHours: number;
  followUpSubject: string | null;
  followUpBody: string | null;
}

function delayLabel(hours: number): string {
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = hours / 24;
  return `${days} day${days === 1 ? "" : "s"}`;
}

/**
 * Automatic follow-up email for leads nobody has replied to. Text fields save
 * on blur like the rest of the settings tab; a blank field means "use the
 * default", which is shown as the placeholder.
 */
export default function FollowUpSettings({
  chatbotId,
  value,
  save,
}: {
  chatbotId: string;
  value: FollowUpFields;
  save: (patch: Partial<FollowUpFields>) => Promise<void>;
}) {
  const [testState, setTestState] = useState<{ sending: boolean; message: string | null; error: boolean }>({
    sending: false,
    message: null,
    error: false,
  });

  async function sendTest() {
    setTestState({ sending: true, message: null, error: false });
    try {
      const res = await api.post(`/chatbots/${chatbotId}/follow-up-test`);
      setTestState({ sending: false, message: `Test sent to ${res.data.sentTo}`, error: false });
    } catch (err) {
      setTestState({ sending: false, message: apiErrorMessage(err), error: true });
    }
  }

  return (
    <section className="surface divide-y divide-line">
      <div className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-[15px] font-medium">Automatic follow-up email</p>
          <p className="mt-0.5 max-w-xl text-[13px] text-ink-2">
            If a visitor leaves their email and nobody on your team replies in time, they get a follow-up from you.
            Replies go straight to your inbox. Track every lead on the{" "}
            <Link href="/dashboard/leads" className="underline underline-offset-2">
              Leads
            </Link>{" "}
            page.
          </p>
        </div>
        <Toggle
          checked={value.followUpEnabled}
          onChange={(next) => save({ followUpEnabled: next })}
          label="Automatic follow-up email"
        />
      </div>

      {value.followUpEnabled && (
        <div className="space-y-5 p-5">
          <Field label="Send it if nobody has replied after">
            <select
              value={value.followUpDelayHours}
              onChange={(e) => save({ followUpDelayHours: Number(e.target.value) })}
              className="input w-auto"
            >
              {FOLLOW_UP_DELAY_HOURS.map((h) => (
                <option key={h} value={h}>
                  {delayLabel(h)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Subject" hint="Leave blank to use the default shown.">
            <input
              defaultValue={value.followUpSubject ?? ""}
              placeholder={DEFAULT_FOLLOW_UP_SUBJECT}
              maxLength={200}
              onBlur={(e) => e.target.value.trim() !== (value.followUpSubject ?? "") && save({ followUpSubject: e.target.value })}
              className="input"
            />
          </Field>

          <Field
            label="Message"
            hint="{name} becomes the lead's first name (or “there”), {business} your company name. Leave blank to use the default shown."
          >
            <textarea
              defaultValue={value.followUpBody ?? ""}
              placeholder={DEFAULT_FOLLOW_UP_BODY}
              rows={8}
              maxLength={5000}
              onBlur={(e) => e.target.value.trim() !== (value.followUpBody ?? "") && save({ followUpBody: e.target.value })}
              className="input font-[inherit]"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={sendTest} disabled={testState.sending} className="btn-secondary btn-sm">
              {testState.sending ? "Sending…" : "Send me a test"}
            </button>
            {testState.message && (
              <p className={`text-[13px] ${testState.error ? "text-[#a72c2c]" : "text-ink-2"}`}>{testState.message}</p>
            )}
          </div>

          <p className="text-[12.5px] leading-relaxed text-ink-3">
            Sent once per lead, only to leads with an email address. It's cancelled if your team replies first, or if
            you mark the lead Contacted, Won or Lost.
          </p>
        </div>
      )}
    </section>
  );
}
