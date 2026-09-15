"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, apiErrorMessage } from "@/lib/api";

export default function NewChatbotPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [botToken, setBotToken] = useState("");
  const [groupChatId, setGroupChatId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/chatbots", { name, botToken, groupChatId });
      router.push(`/dashboard/chatbots/${res.data.chatbot.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">New chatbot</h1>

      <div className="mt-6 rounded-xl border bg-white p-6">
        <h2 className="font-semibold">Before you start: set up your Telegram group</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-600">
          <li>
            Create a Telegram <strong>supergroup</strong> and enable <strong>Topics</strong> in the group settings
            (Group settings → Topics → toggle on).
          </li>
          <li>
            Create a bot with{" "}
            <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-blue-600">
              @BotFather
            </a>{" "}
            and copy its token.
          </li>
          <li>Add the bot to your group and promote it to admin with the &quot;Manage Topics&quot; permission.</li>
          <li>
            Get your group&apos;s chat ID (forward any message from the group to{" "}
            <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-blue-600">
              @userinfobot
            </a>
            , or add{" "}
            <a href="https://t.me/RawDataBot" target="_blank" rel="noreferrer" className="text-blue-600">
              @RawDataBot
            </a>{" "}
            temporarily). It will look like <code>-1001234567890</code>.
          </li>
        </ol>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border bg-white p-6">
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div>
          <label className="block text-sm font-medium">Chatbot name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My website support bot"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Telegram bot token</label>
          <input
            required
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="123456789:AA...your-bot-token"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Telegram group chat ID</label>
          <input
            required
            value={groupChatId}
            onChange={(e) => setGroupChatId(e.target.value)}
            placeholder="-1001234567890"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create chatbot"}
        </button>
      </form>
    </div>
  );
}
