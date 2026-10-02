"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import AuthShell from "@/components/AuthShell";
import { Spinner } from "@/components/ui/primitives";

type State = "checking" | "verified" | "already-verified" | "invalid" | "expired" | "error";

const COPY: Record<Exclude<State, "checking">, { title: string; body: string }> = {
  verified: {
    title: "Email confirmed",
    body: "Thanks — your address is confirmed. You can connect a Telegram group and put the widget on your site now.",
  },
  "already-verified": {
    title: "Already confirmed",
    body: "This address was confirmed earlier, so there's nothing more to do.",
  },
  expired: {
    title: "That link has expired",
    body: "Confirmation links last 24 hours. Sign in and request a fresh one from the banner on your dashboard.",
  },
  invalid: {
    title: "That link didn't work",
    body: "It may have already been used, or been cut short by your email client. Sign in and request a new one.",
  },
  error: {
    title: "Something went wrong",
    body: "We couldn't confirm the link just now. Please try again in a moment.",
  },
};

export default function VerifyEmailPage() {
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    // Read from window rather than useSearchParams, so the page needs no
    // Suspense boundary — same approach as the dashboard's welcome flag.
    const token = new URL(window.location.href).searchParams.get("token");
    if (!token) {
      setState("invalid");
      return;
    }
    api
      .post("/auth/verify-email", { token })
      .then((res) => setState(res.data.outcome))
      .catch((err) => setState(err?.response?.data?.outcome ?? "error"));
  }, []);

  if (state === "checking") {
    return (
      <AuthShell title="Confirming your email" subtitle="One moment." footer={null}>
        <Spinner label="Checking your link…" />
      </AuthShell>
    );
  }

  const { title, body } = COPY[state];
  const succeeded = state === "verified" || state === "already-verified";

  return (
    <AuthShell
      title={title}
      subtitle={body}
      footer={
        <>
          Need help?{" "}
          <Link href="/" className="font-medium text-ink underline underline-offset-2">
            Back to site
          </Link>
        </>
      }
    >
      <Link href={succeeded ? "/dashboard" : "/login"} className="btn-primary w-full">
        {succeeded ? "Go to dashboard" : "Sign in"}
      </Link>
    </AuthShell>
  );
}
