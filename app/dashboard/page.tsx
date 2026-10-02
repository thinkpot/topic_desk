"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatLimit, isUnlimited } from "@/lib/plans";
import type { Analytics } from "@/lib/analytics";
import ActivityChart from "@/components/charts/ActivityChart";
import Funnel from "@/components/charts/Funnel";
import { Alert, Spinner, StatTile } from "@/components/ui/primitives";
import OnboardingChecklist, { onboardingComplete } from "@/components/OnboardingChecklist";
import type { OnboardingProgress } from "@/lib/onboarding";

const CHECKLIST_HIDDEN_KEY = "onboardingChecklistHidden";

const RANGES = [7, 14, 30, 90];

function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)} hr`;
  return `${(hours / 24).toFixed(1)} days`;
}

export default function DashboardOverviewPage() {
  const { user, usage } = useAuth();
  const [days, setDays] = useState(14);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [chatbotCount, setChatbotCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingProgress | null>(null);
  const [welcome, setWelcome] = useState(false);
  const [checklistHidden, setChecklistHidden] = useState(false);

  useEffect(() => {
    // Read from window rather than useSearchParams so the page doesn't need a
    // Suspense boundary; strip the param so a reload doesn't re-welcome.
    const url = new URL(window.location.href);
    if (url.searchParams.get("welcome") === "1") {
      setWelcome(true);
      url.searchParams.delete("welcome");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
    try {
      setChecklistHidden(localStorage.getItem(CHECKLIST_HIDDEN_KEY) === "1");
    } catch {
      // Storage blocked: the checklist just stays visible.
    }
    api
      .get("/onboarding")
      .then((res) => setOnboarding(res.data.progress))
      .catch(() => setOnboarding(null));
  }, []);

  function hideChecklist() {
    setChecklistHidden(true);
    try {
      localStorage.setItem(CHECKLIST_HIDDEN_KEY, "1");
    } catch {
      // Hidden for this visit only.
    }
  }

  const firstName = user?.name.split(" ")[0] ?? "there";

  useEffect(() => {
    setAnalytics(null);
    api
      .get(`/analytics?days=${days}`)
      .then((res) => setAnalytics(res.data.analytics))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [days]);

  useEffect(() => {
    api
      .get("/chatbots")
      .then((res) => setChatbotCount(res.data.chatbots.length))
      .catch(() => setChatbotCount(0));
  }, []);

  if (chatbotCount === 0) {
    // Nothing to chart yet — the checklist is the whole page until a bot exists.
    return (
      <div className="mx-auto max-w-2xl pt-2">
        {onboarding ? (
          <OnboardingChecklist progress={onboarding} firstName={firstName} welcome={welcome} />
        ) : (
          <Spinner />
        )}
      </div>
    );
  }

  const showChecklist = onboarding && !onboardingComplete(onboarding) && (!checklistHidden || welcome);

  const monthlyLimit = user?.plan.maxMonthlyUsers ?? 0;
  const monthlyUsed = usage?.monthlyConversations ?? 0;
  const usagePct = isUnlimited(monthlyLimit) ? 0 : Math.min(Math.round((monthlyUsed / Math.max(monthlyLimit, 1)) * 100), 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em]">Overview</h1>
          <p className="mt-1 text-[14px] text-ink-2">How your chat is performing across all chatbots.</p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-line bg-surface p-1">
          {RANGES.map((range) => (
            <button
              key={range}
              onClick={() => setDays(range)}
              className={`rounded px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                days === range ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-sunken"
              }`}
            >
              {range}d
            </button>
          ))}
        </div>
      </div>

      {showChecklist && (
        <OnboardingChecklist progress={onboarding} firstName={firstName} welcome={welcome} onDismiss={hideChecklist} />
      )}

      {error && <Alert>{error}</Alert>}
      {!analytics && !error && <Spinner label="Loading metrics…" />}

      {analytics && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Widget seen"
              value={analytics.totals.views.toLocaleString("en-IN")}
              sublabel={`${analytics.totals.opens.toLocaleString("en-IN")} opened the chat`}
            />
            <StatTile
              label="Chats started"
              value={analytics.totals.conversations.toLocaleString("en-IN")}
              sublabel={`${analytics.totals.messages.toLocaleString("en-IN")} messages exchanged`}
            />
            <StatTile
              label="Reply rate"
              value={`${analytics.responseRatePct}%`}
              sublabel={`${analytics.totals.repliedConversations.toLocaleString("en-IN")} chats answered`}
            />
            <StatTile
              label="First reply time"
              value={formatDuration(analytics.avgFirstResponseMinutes)}
              sublabel="Average across answered chats"
            />
          </div>

          <ActivityChart series={analytics.series} />

          <div className="grid gap-5 lg:grid-cols-2">
            <Funnel stages={analytics.funnel} />

            <section className="surface p-5">
              <h2 className="text-base font-semibold">This month</h2>
              <p className="mt-0.5 text-[13px] text-ink-3">Usage counts against your {user?.plan.name} plan.</p>

              <div className="mt-5 space-y-5">
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-ink-2">Conversations</span>
                    <span className="metric text-sm font-medium">
                      {monthlyUsed.toLocaleString("en-IN")}
                      <span className="text-ink-3"> / {formatLimit(monthlyLimit)}</span>
                    </span>
                  </div>
                  {!isUnlimited(monthlyLimit) && (
                    <div className="mt-2 h-2.5 overflow-hidden rounded-[4px] bg-surface-sunken">
                      <div
                        className="h-full rounded-[4px]"
                        style={{
                          width: `${Math.max(usagePct, monthlyUsed > 0 ? 1.5 : 0)}%`,
                          background: usagePct >= 90 ? "var(--critical)" : "var(--series-1)",
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-baseline justify-between border-t border-line pt-4">
                  <span className="text-sm text-ink-2">Chatbots</span>
                  <span className="metric text-sm font-medium">
                    {usage?.chatbots ?? 0}
                    <span className="text-ink-3"> / {formatLimit(user?.plan.maxChatbots ?? 0)}</span>
                  </span>
                </div>

                <div className="flex items-baseline justify-between border-t border-line pt-4">
                  <span className="text-sm text-ink-2">Messages from visitors</span>
                  <span className="metric text-sm font-medium">
                    {analytics.totals.visitorMessages.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t border-line pt-4">
                  <span className="text-sm text-ink-2">Replies from your team</span>
                  <span className="metric text-sm font-medium">
                    {analytics.totals.agentMessages.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <Link href="/dashboard/billing" className="btn-secondary btn-sm mt-6">
                Manage plan
              </Link>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
