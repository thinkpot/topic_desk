"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiErrorMessage, isEmailFieldError } from "@/lib/api";
import { TRIAL_DAYS } from "@/lib/plans";
import { emailFormatProblem } from "@/lib/email-format";
import AuthShell from "@/components/AuthShell";
import { Alert, Field } from "@/components/ui/primitives";

const TRIAL_POINTS = [
  "No credit card or payment details",
  "One chatbot, up to 500 visitor chats",
  "Flow builder, themes and live analytics included",
  "Nothing is charged when the trial ends",
];

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Catch the obvious problems before a round trip; the server repeats this
    // check and additionally verifies the domain can receive mail.
    const formatProblem = emailFormatProblem(email);
    if (formatProblem) {
      setEmailError(formatProblem);
      return;
    }

    setEmailError(null);
    setLoading(true);
    try {
      await register({ name, email, password, companyName, websiteUrl });
    } catch (err) {
      const message = apiErrorMessage(err);
      // The server tags email-specific rejections (disposable address, domain
      // with no mail server) so they appear against the field, not at the top.
      if (isEmailFieldError(err)) setEmailError(message);
      else setError(message);
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={`Start your ${TRIAL_DAYS}-day free trial`}
      subtitle="No card needed. Get your chat live in about five minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-ink underline underline-offset-2">
            Log in
          </Link>
        </>
      }
    >
      <ul className="mb-7 space-y-2 rounded-lg border border-line bg-surface-sunken px-4 py-3.5 text-[13.5px] text-ink-2">
        {TRIAL_POINTS.map((point) => (
          <li key={point} className="flex gap-2.5">
            <span aria-hidden className="text-ink">
              ✓
            </span>
            {point}
          </li>
        ))}
      </ul>

      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Full name">
          <input
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Priya Sharma"
          />
        </Field>
        <Field label="Work email">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            onBlur={() => setEmailError(email ? emailFormatProblem(email) : null)}
            aria-invalid={!!emailError}
            aria-describedby={emailError ? "email-error" : undefined}
            className={`input ${emailError ? "border-[color:var(--critical)] focus:border-[color:var(--critical)] focus:ring-[color:var(--critical)]" : ""}`}
            placeholder="you@company.com"
          />
          {emailError && (
            <p id="email-error" className="mt-1.5 text-[13px] leading-snug text-[color:var(--critical)]">
              {emailError}
            </p>
          )}
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company" hint="Optional">
            <input
              autoComplete="organization"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="input"
              placeholder="Acme Studio"
            />
          </Field>
          <Field label="Website" hint="Optional">
            <input
              autoComplete="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="input"
              placeholder="acme.com"
            />
          </Field>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Starting your trial…" : "Start free trial"}
        </button>
        <p className="text-center text-[12.5px] text-ink-3">
          Your trial runs {TRIAL_DAYS} days. We&apos;ll never ask for payment details to start it.
        </p>
      </form>
    </AuthShell>
  );
}
