"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatLimit } from "@/lib/plans";
import { Alert, Badge, EmptyState, Spinner } from "@/components/ui/primitives";

interface ChatbotSummary {
  id: string;
  name: string;
  apiKey: string;
  botUsername: string | null;
  isActive: boolean;
  allowedDomains: string | null;
  stats: { conversations: number; monthlyConversations: number; messages: number };
}

export default function ChatbotsPage() {
  const { user, usage, blockReason } = useAuth();
  const [chatbots, setChatbots] = useState<ChatbotSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/chatbots")
      .then((res) => setChatbots(res.data.chatbots))
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  const atLimit = user && usage ? usage.chatbots >= user.plan.maxChatbots : false;
  const canCreate = !blockReason && !atLimit;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em]">Chatbots</h1>
          <p className="mt-1 text-[14px] text-ink-2">
            {usage?.chatbots ?? 0} of {formatLimit(user?.plan.maxChatbots ?? 0)} used on your {user?.plan.name} plan.
          </p>
        </div>
        {canCreate ? (
          <Link href="/dashboard/chatbots/new" className="btn-primary">
            New chatbot
          </Link>
        ) : (
          <Link href="/dashboard/billing" className="btn-secondary">
            Upgrade to add more
          </Link>
        )}
      </div>

      {error && <Alert>{error}</Alert>}
      {!chatbots && !error && <Spinner />}

      {chatbots?.length === 0 && (
        <EmptyState
          title="No chatbots yet"
          description="Connect a Telegram group and we'll give you a snippet to paste on your website."
          action={
            canCreate ? (
              <Link href="/dashboard/chatbots/new" className="btn-primary px-5">
                Set up a chatbot
              </Link>
            ) : (
              <Link href="/dashboard/billing" className="btn-primary px-5">
                Choose a plan
              </Link>
            )
          }
        />
      )}

      {chatbots && chatbots.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {chatbots.map((bot) => (
            <Link
              key={bot.id}
              href={`/dashboard/chatbots/${bot.id}`}
              className="surface block p-5 transition-shadow hover:shadow-pop"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-[17px] font-semibold">{bot.name}</h2>
                  <p className="mt-0.5 truncate text-[13px] text-ink-3">
                    {bot.botUsername ? `@${bot.botUsername}` : "Telegram bot"}
                    {bot.allowedDomains ? ` · ${bot.allowedDomains}` : " · any domain"}
                  </p>
                </div>
                <Badge tone={bot.isActive ? "positive" : "neutral"}>{bot.isActive ? "Live" : "Paused"}</Badge>
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
                <div>
                  <dt className="text-[12px] text-ink-3">This month</dt>
                  <dd className="metric mt-0.5 text-[17px] font-semibold">
                    {bot.stats.monthlyConversations.toLocaleString("en-IN")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-ink-3">All chats</dt>
                  <dd className="metric mt-0.5 text-[17px] font-semibold">
                    {bot.stats.conversations.toLocaleString("en-IN")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-ink-3">Messages</dt>
                  <dd className="metric mt-0.5 text-[17px] font-semibold">
                    {bot.stats.messages.toLocaleString("en-IN")}
                  </dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
