"use client";

import Link from "next/link";
import type { OnboardingProgress } from "@/lib/onboarding";
import { TRIAL_DAYS } from "@/lib/plans";

interface Step {
  title: string;
  description: string;
  done: boolean;
  action?: { href: string; label: string };
}

function buildSteps(p: OnboardingProgress): Step[] {
  const botHref = p.chatbotId ? `/dashboard/chatbots/${p.chatbotId}` : "/dashboard/chatbots/new";
  return [
    {
      title: "Start your free trial",
      description: "Done — no card needed.",
      done: true,
    },
    {
      title: "Connect your Telegram group",
      description:
        "Create a bot with @BotFather, add it as an admin to a group with Topics turned on, and the setup wizard checks the rest.",
      done: p.connected,
      action: { href: "/dashboard/chatbots/new", label: "Open setup wizard" },
    },
    {
      title: "Add the widget to your site",
      description: "Paste one script tag before </body>. Works on WordPress, Shopify, Webflow, Wix and plain HTML.",
      done: p.installed,
      action: { href: botHref, label: "Get the snippet" },
    },
    {
      title: "Send yourself a test message",
      description: "Open your site, click the chat bubble and say hi — a new topic appears in your Telegram group.",
      done: p.firstChat,
    },
    {
      title: "Reply from Telegram",
      description: "Answer inside that topic. Your reply shows up in the visitor's chat window within seconds.",
      done: p.firstReply,
    },
  ];
}

export function onboardingComplete(p: OnboardingProgress): boolean {
  return p.connected && p.installed && p.firstChat && p.firstReply;
}

export default function OnboardingChecklist({
  progress,
  firstName,
  welcome,
  onDismiss,
}: {
  progress: OnboardingProgress;
  firstName: string;
  welcome: boolean;
  onDismiss?: () => void;
}) {
  const steps = buildSteps(progress);
  const doneCount = steps.filter((s) => s.done).length;
  const nextIndex = steps.findIndex((s) => !s.done);

  return (
    <section className="surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.02em]">
            {welcome ? `Welcome, ${firstName} — your trial is live` : "Get your chat live"}
          </h2>
          <p className="mt-1 text-[14px] text-ink-2">
            {welcome
              ? `You have ${TRIAL_DAYS} days on us, no card required. Most people finish these steps in about five minutes.`
              : "A few steps left before visitors can reach you."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="metric text-[13px] text-ink-2">
            {doneCount} of {steps.length} done
          </span>
          {onDismiss && (
            <button onClick={onDismiss} className="btn-ghost btn-sm">
              Hide
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-ink transition-[width]"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <ol className="mt-5 divide-y divide-line">
        {steps.map((step, i) => {
          const isNext = i === nextIndex;
          return (
            <li key={step.title} className="flex gap-4 py-4">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold ${
                  step.done
                    ? "border-ink bg-ink text-white"
                    : isNext
                      ? "border-ink text-ink"
                      : "border-line-strong text-ink-3"
                }`}
              >
                {step.done ? "✓" : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-[14.5px] font-medium ${step.done ? "text-ink-3 line-through" : "text-ink"}`}>
                  {step.title}
                </p>
                {!step.done && <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{step.description}</p>}
              </div>
              {!step.done && step.action && (
                <Link
                  href={step.action.href}
                  className={`${isNext ? "btn-primary" : "btn-secondary"} btn-sm shrink-0 self-start`}
                >
                  {step.action.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
