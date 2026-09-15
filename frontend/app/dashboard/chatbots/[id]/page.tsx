"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, apiErrorMessage, API_URL } from "@/lib/api";
import CodeBlock from "@/components/CodeBlock";

interface Chatbot {
  id: string;
  name: string;
  botUsername: string | null;
  isActive: boolean;
  welcomeMessage: string;
  widgetColor: string;
  allowedDomains: string | null;
}

interface Stats {
  totalConversations: number;
  monthlyConversations: number;
  totalMessages: number;
}

export default function ChatbotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [bot, setBot] = useState<Chatbot | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function load() {
    api
      .get(`/chatbots/${id}`)
      .then((res) => {
        setBot(res.data.chatbot);
        setStats(res.data.stats);
      })
      .catch((err) => setError(apiErrorMessage(err)));
  }

  async function save(patch: Partial<Chatbot>) {
    if (!bot) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.patch(`/chatbots/${id}`, patch);
      setBot(res.data.chatbot);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this chatbot? This cannot be undone.")) return;
    await api.delete(`/chatbots/${id}`);
    router.push("/dashboard");
  }

  if (error && !bot) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (!bot) return <p className="text-sm text-gray-500">Loading...</p>;

  const embedCode = `<script src="${API_URL}/widget.js" data-chatbot-id="${bot.id}" async></script>`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{bot.name}</h1>
          {bot.botUsername && <p className="text-sm text-gray-500">@{bot.botUsername}</p>}
        </div>
        <button onClick={remove} className="text-sm font-medium text-red-600 hover:text-red-800">
          Delete chatbot
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">Total users</p>
            <p className="text-xl font-bold">{stats.totalConversations}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">This month</p>
            <p className="text-xl font-bold">{stats.monthlyConversations}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">Messages</p>
            <p className="text-xl font-bold">{stats.totalMessages}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-white p-6">
        <h2 className="font-semibold">Embed code</h2>
        <p className="mt-1 text-sm text-gray-600">
          Paste this snippet before the closing <code>&lt;/body&gt;</code> tag on your website.
        </p>
        <div className="mt-3">
          <CodeBlock code={embedCode} />
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6">
        <h2 className="font-semibold">Settings</h2>
        {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-gray-500">Turn off to temporarily disable this widget everywhere.</p>
            </div>
            <button
              onClick={() => save({ isActive: !bot.isActive })}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                bot.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
              }`}
            >
              {bot.isActive ? "Active" : "Inactive"}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium">Welcome message</label>
            <textarea
              defaultValue={bot.welcomeMessage}
              onBlur={(e) => e.target.value !== bot.welcomeMessage && save({ welcomeMessage: e.target.value })}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Widget color</label>
            <input
              type="color"
              defaultValue={bot.widgetColor}
              onChange={(e) => save({ widgetColor: e.target.value })}
              className="mt-1 h-9 w-16 rounded-md border"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Allowed domains (optional)</label>
            <input
              defaultValue={bot.allowedDomains ?? ""}
              onBlur={(e) => e.target.value !== (bot.allowedDomains ?? "") && save({ allowedDomains: e.target.value })}
              placeholder="example.com, www.example.com"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Comma-separated hostnames allowed to load this widget. Leave empty to allow any website.
            </p>
          </div>

          {(saving || saved) && (
            <p className="text-xs text-gray-500">{saving ? "Saving..." : "Saved."}</p>
          )}
        </div>
      </div>
    </div>
  );
}
