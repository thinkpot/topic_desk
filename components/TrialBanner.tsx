"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Me } from "@/lib/auth-context";
import { formatTimeLeft, trialStatus } from "@/lib/plans";

// Countdown strip shown across the dashboard for the whole trial. Turns amber
// in the last 24 hours. Once the trial has actually ended the lock overlay
// takes over, so this renders nothing then.
export default function TrialBanner({ user, pendingPlanName }: { user: Me; pendingPlanName: string | null }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const trial = trialStatus(user);
  if (!trial.onTrial || trial.expired) return null;
  const urgent = trial.msLeft < 24 * 3_600_000;

  return (
    <div className={`border-b ${urgent ? "border-[#f4dfa8] bg-[#fdf8ea]" : "border-line bg-surface-sunken"}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-2.5 text-[13px]">
        <p className={urgent ? "text-[#7a5800]" : "text-ink-2"}>
          <span className="font-medium text-ink">Free trial</span> · {formatTimeLeft(trial.msLeft)} left
          <span className="hidden sm:inline"> · no card on file, nothing will be charged</span>
        </p>
        {pendingPlanName ? (
          <span className="text-ink-2">{pendingPlanName} requested — we&apos;ll activate it shortly</span>
        ) : (
          <Link href="/dashboard/billing" className="font-medium text-ink underline underline-offset-2">
            Choose a plan
          </Link>
        )}
      </div>
    </div>
  );
}
