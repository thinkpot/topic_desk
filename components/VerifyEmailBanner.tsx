"use client";

import { useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

/**
 * Shown across the dashboard until the address is confirmed. Not dismissable:
 * creating a chatbot is blocked until this is done, so hiding it would leave
 * people stuck at the setup wizard with no explanation.
 */
export default function VerifyEmailBanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!user || user.emailVerifiedAt) return null;

  async function resend() {
    setStatus("sending");
    setError(null);
    try {
      await api.put("/auth/verify-email");
      setStatus("sent");
    } catch (err) {
      setError(apiErrorMessage(err));
      setStatus("idle");
    }
  }

  return (
    <div className="border-b border-[#f4dfa8] bg-[#fdf8ea]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-6 py-2.5 text-[13px]">
        <p className="text-[#7a5800]">
          <span className="font-medium">Confirm your email</span> — we sent a link to {user.email}. You&apos;ll need
          it before you can create a chatbot.
        </p>
        {status === "sent" ? (
          <span className="text-[#7a5800]">Sent — check your inbox.</span>
        ) : (
          <button
            onClick={resend}
            disabled={status === "sending"}
            className="font-medium text-ink underline underline-offset-2 disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Resend the link"}
          </button>
        )}
        {error && <span className="w-full text-[12.5px] text-[#a72c2c]">{error}</span>}
      </div>
    </div>
  );
}
