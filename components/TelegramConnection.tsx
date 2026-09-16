"use client";

import { useCallback, useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";

interface WebhookStatus {
  connected: boolean;
  expectedUrl: string;
  currentUrl: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  pendingUpdates: number;
  serverProblem: string | null;
}

function describeProblem(status: WebhookStatus): string {
  if (status.serverProblem) return status.serverProblem;
  if (!status.currentUrl) return "Telegram has no address to deliver replies to, so replies from your group won't reach visitors.";
  if (status.currentUrl !== status.expectedUrl) {
    return `This bot is currently sending replies to a different address (${status.currentUrl}) — usually an old tunnel URL or another chatbot using the same bot.`;
  }
  return "Telegram can't deliver replies right now.";
}

export default function TelegramConnection({ chatbotId }: { chatbotId: string }) {
  const [status, setStatus] = useState<WebhookStatus | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get(`/chatbots/${chatbotId}/webhook`)
      .then((res) => setStatus(res.data.status))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [chatbotId]);

  useEffect(load, [load]);

  async function reconnect() {
    setReconnecting(true);
    setError(null);
    try {
      const res = await api.post(`/chatbots/${chatbotId}/webhook`);
      setStatus(res.data.status);
    } catch (err) {
      setError(apiErrorMessage(err));
      load();
    } finally {
      setReconnecting(false);
    }
  }

  if (!status) return null;

  if (status.connected) {
    return (
      <div className="surface flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-positive" aria-hidden />
          <p className="text-[14px]">
            <span className="font-medium">Connected to Telegram</span>
            <span className="text-ink-2"> · replies from your group reach visitors</span>
          </p>
        </div>
        {status.lastError && (
          <p className="text-[12.5px] text-ink-3">Last delivery error: {status.lastError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#f2c9c9] bg-[#fdf3f3] px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <p className="text-[14px] font-semibold text-[#a72c2c]">Not receiving replies from Telegram</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#7a2626]">{describeProblem(status)}</p>
          {error && <p className="mt-2 text-[13px] text-[#a72c2c]">{error}</p>}
        </div>
        {!status.serverProblem && (
          <button onClick={reconnect} disabled={reconnecting} className="btn-primary btn-sm shrink-0">
            {reconnecting ? "Reconnecting…" : "Reconnect"}
          </button>
        )}
      </div>
    </div>
  );
}
