"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { api, apiErrorMessage } from "@/lib/api";
import { Alert, Badge, EmptyState, Spinner } from "@/components/ui/primitives";

interface LiveMessagePreview {
  sender: "VISITOR" | "AGENT" | "BOT" | "SYSTEM";
  text: string;
  createdAt: string;
}

interface LiveVisitorRow {
  id: string;
  chatbotId: string;
  chatbotName: string;
  dashboardChatEnabled: boolean;
  visitorId: string;
  visitorLabel: string;
  currentUrl: string;
  scrollPercent: number;
  referrer: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  hasConversation: boolean;
  lastMessage: LiveMessagePreview | null;
}

interface LiveListResponse {
  cap: number;
  totalLiveCount: number;
  canDashboardChat: boolean;
  visitors: LiveVisitorRow[];
}

interface LiveDetailMessage {
  id: string;
  sender: "VISITOR" | "AGENT" | "BOT" | "SYSTEM";
  text: string;
  createdAt: string;
}

interface LiveDetailResponse {
  visitor: {
    id: string;
    chatbotId: string;
    chatbotName: string;
    visitorId: string;
    currentUrl: string;
    scrollPercent: number;
    referrer: string | null;
    userAgent: string | null;
    firstSeenAt: string;
    lastSeenAt: string;
    pageViews: { url: string; at: string }[];
  };
  conversation: { id: string; flowStatus: string; variables: Record<string, unknown>; messages: LiveDetailMessage[] } | null;
  canChat: boolean;
}

function pageOnly(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

export default function LivePage() {
  const [data, setData] = useState<LiveListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LiveDetailResponse | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // Ids we've already counted toward totalLiveCount, independent of which
  // ones fit in the capped, rendered list — otherwise a live:update for a
  // visitor beyond the cap would look "new" every time and inflate the count.
  const knownIdsRef = useRef<Set<string>>(new Set());
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;
  const detailRef = useRef<LiveDetailResponse | null>(null);
  detailRef.current = detail;

  const loadList = useCallback(() => {
    api
      .get("/live")
      .then((res) => {
        const list: LiveListResponse = res.data;
        knownIdsRef.current = new Set(list.visitors.map((v) => v.id));
        setData(list);
      })
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadDetail = useCallback((id: string) => {
    api
      .get(`/live/${id}`)
      .then((res) => setDetail(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    const socket: Socket = io({ path: "/socket.io", auth: { role: "dashboard", token } });

    socket.on("live:update", (row: LiveVisitorRow) => {
      setData((prev) => {
        if (!prev) return prev;
        const isNew = !knownIdsRef.current.has(row.id);
        knownIdsRef.current.add(row.id);
        const withoutRow = prev.visitors.filter((v) => v.id !== row.id);
        const visitors = [row, ...withoutRow]
          .sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime())
          .slice(0, prev.cap);
        return { ...prev, visitors, totalLiveCount: prev.totalLiveCount + (isNew ? 1 : 0) };
      });
    });

    socket.on("live:left", ({ id }: { id: string }) => {
      setData((prev) => {
        if (!prev) return prev;
        const wasKnown = knownIdsRef.current.delete(id);
        return {
          ...prev,
          visitors: prev.visitors.filter((v) => v.id !== id),
          totalLiveCount: Math.max(0, prev.totalLiveCount - (wasKnown ? 1 : 0)),
        };
      });
    });

    socket.on(
      "chat:message",
      (payload: { chatbotId: string; visitorId: string; message: LiveDetailMessage }) => {
        const current = detailRef.current;
        if (!current || current.visitor.chatbotId !== payload.chatbotId || current.visitor.visitorId !== payload.visitorId) {
          return;
        }
        if (!current.conversation) {
          if (selectedIdRef.current) loadDetail(selectedIdRef.current);
          return;
        }
        setDetail((prev) => {
          if (!prev || !prev.conversation) return prev;
          if (prev.conversation.messages.some((m) => m.id === payload.message.id)) return prev;
          return { ...prev, conversation: { ...prev.conversation, messages: [...prev.conversation.messages, payload.message] } };
        });
      }
    );

    return () => {
      socket.disconnect();
    };
  }, [loadDetail]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [detail?.conversation?.messages.length]);

  async function sendMessage() {
    if (!draft.trim() || !selectedId) return;
    setSending(true);
    try {
      await api.post(`/live/${selectedId}/messages`, { text: draft.trim() });
      setDraft("");
      loadDetail(selectedId);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  if (error && !data) return <Alert>{error}</Alert>;
  if (!data) return <Spinner />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.025em]">Live visitors</h1>
        <p className="mt-1 text-[14px] text-ink-2">
          Everyone currently browsing a site with your widget installed, updated in real time.
        </p>
      </div>

      {error && <Alert>{error}</Alert>}

      {data.totalLiveCount > data.cap && (
        <Alert tone="warning">
          <strong className="text-ink">{data.totalLiveCount} people are live right now</strong> — your plan shows the{" "}
          {data.cap} most recent.{" "}
          <Link href="/dashboard/billing" className="underline underline-offset-2">
            Upgrade to see everyone
          </Link>
          .
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <section className="surface divide-y divide-line overflow-hidden">
          {data.visitors.length === 0 && (
            <EmptyState
              title="No one's on your site right now"
              description="As soon as a visitor loads a page with your widget installed, they'll show up here."
            />
          )}
          {data.visitors.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              className={`flex w-full items-start justify-between gap-3 p-4 text-left transition-colors hover:bg-surface-sunken ${
                selectedId === v.id ? "bg-surface-sunken" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
                  </span>
                  <p className="truncate text-[14px] font-medium">{v.visitorLabel}</p>
                  {v.hasConversation && <Badge tone="positive">Chatting</Badge>}
                </div>
                <p className="mt-1 truncate text-[13px] text-ink-2">{pageOnly(v.currentUrl)}</p>
                <p className="mt-0.5 text-[12px] text-ink-3">
                  {v.chatbotName} · scrolled {v.scrollPercent}% · {timeAgo(v.lastSeenAt)}
                </p>
              </div>
            </button>
          ))}
        </section>

        <section className="surface flex min-h-[420px] flex-col p-5">
          {!detail && (
            <EmptyState title="Select a visitor" description="Click anyone on the left to see their live analytics." />
          )}
          {detail && (
            <div className="flex flex-1 flex-col">
              <div>
                <h2 className="text-[16px] font-semibold">{detail.visitor.chatbotName}</h2>
                <p className="mt-2 break-all text-[13px] text-ink-2">
                  <span className="text-ink-3">On:</span> {detail.visitor.currentUrl}
                </p>
                {detail.visitor.referrer && (
                  <p className="mt-1 break-all text-[13px] text-ink-2">
                    <span className="text-ink-3">Came from:</span> {detail.visitor.referrer}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">
                  <span>Scrolled {detail.visitor.scrollPercent}%</span>
                  <span>First seen {timeAgo(detail.visitor.firstSeenAt)}</span>
                  <span>Active {timeAgo(detail.visitor.lastSeenAt)}</span>
                </div>

                {detail.visitor.pageViews.length > 1 && (
                  <div className="mt-3 border-t border-line pt-3">
                    <p className="text-[12px] font-medium text-ink-2">Recent path</p>
                    <ol className="mt-1.5 space-y-1 text-[12.5px] text-ink-3">
                      {detail.visitor.pageViews
                        .slice(-6)
                        .reverse()
                        .map((pv, i) => (
                          <li key={i} className="truncate">
                            {pageOnly(pv.url)}
                          </li>
                        ))}
                    </ol>
                  </div>
                )}
              </div>

              <div className="mt-4 flex-1 border-t border-line pt-4">
                {!detail.conversation && (
                  <p className="text-[13px] text-ink-3">This visitor hasn&apos;t started a chat yet.</p>
                )}
                {detail.conversation && (
                  <div className="flex max-h-[260px] flex-col gap-2 overflow-y-auto pr-1">
                    {detail.conversation.messages.map((m) => (
                      <div
                        key={m.id}
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] ${
                          m.sender === "VISITOR"
                            ? "self-end bg-ink text-white"
                            : "self-start border border-line bg-surface-sunken text-ink"
                        }`}
                      >
                        {m.text}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-line pt-4">
                {detail.canChat ? (
                  <div className="flex gap-2">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Message this visitor…"
                      className="input flex-1"
                    />
                    <button onClick={sendMessage} disabled={sending || !draft.trim()} className="btn-primary btn-sm">
                      Send
                    </button>
                  </div>
                ) : (
                  <p className="text-[13px] text-ink-3">
                    {data.canDashboardChat ? (
                      <>
                        Turn on dashboard chat in this chatbot&apos;s Settings to message visitors directly instead of
                        Telegram.
                      </>
                    ) : (
                      <>
                        Replying from the dashboard is a Premium feature.{" "}
                        <Link href="/dashboard/billing" className="underline underline-offset-2">
                          Upgrade
                        </Link>
                        .
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
