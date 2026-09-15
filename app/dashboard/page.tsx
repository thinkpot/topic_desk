"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { UNLIMITED } from "@/lib/plans";

interface ChatbotSummary {
  id: string;
  name: string;
  botUsername: string | null;
  isActive: boolean;
  stats: { totalConversations: number; monthlyConversations: number; totalMessages: number };
}

export default function DashboardPage() {
  const { planLimits } = useAuth();
  const [chatbots, setChatbots] = useState<ChatbotSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/chatbots")
      .then((res) => setChatbots(res.data.chatbots))
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  const atLimit = planLimits && chatbots ? chatbots.length >= planLimits.maxChatbots : false;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your chatbots</h1>
        {atLimit ? (
          <Link
            href="/dashboard/billing"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Upgrade to add more
          </Link>
        ) : (
          <Link
            href="/dashboard/chatbots/new"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New chatbot
          </Link>
        )}
      </div>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!chatbots && !error && <p className="mt-8 text-sm text-gray-500">Loading...</p>}

      {chatbots && chatbots.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed bg-white p-12 text-center">
          <p className="text-gray-600">You haven&apos;t created a chatbot yet.</p>
          <Link href="/dashboard/chatbots/new" className="mt-4 inline-block font-medium text-blue-600">
            Create your first chatbot →
          </Link>
        </div>
      )}

      {chatbots && chatbots.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chatbots.map((bot) => (
            <Link
              key={bot.id}
              href={`/dashboard/chatbots/${bot.id}`}
              className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{bot.name}</h3>
                <span
                  className={`h-2 w-2 rounded-full ${bot.isActive ? "bg-green-500" : "bg-gray-300"}`}
                  title={bot.isActive ? "Active" : "Inactive"}
                />
              </div>
              {bot.botUsername && <p className="mt-1 text-xs text-gray-500">@{bot.botUsername}</p>}
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">This month</p>
                  <p className="font-semibold">{bot.stats.monthlyConversations} users</p>
                </div>
                <div>
                  <p className="text-gray-500">Messages</p>
                  <p className="font-semibold">{bot.stats.totalMessages}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {planLimits && chatbots && (
        <p className="mt-6 text-xs text-gray-500">
          {chatbots.length} / {planLimits.maxChatbots === UNLIMITED ? "unlimited" : planLimits.maxChatbots} chatbots
          used on your {planLimits.label} plan.
        </p>
      )}
    </div>
  );
}
