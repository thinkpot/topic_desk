import Link from "next/link";
import { ReactNode } from "react";
import { LEGAL, legalDetailsMissing } from "@/lib/legal";
import { LogoLockup } from "@/components/Logo";

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refunds", label: "Refund Policy" },
];

/**
 * Shared shell for the three legal pages. Body copy is styled through the
 * `.legal` block in globals.css so the pages themselves stay readable as
 * near-prose JSX instead of carrying a class on every paragraph.
 */
export default function LegalPage({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
          <Link href="/">
            <LogoLockup />
          </Link>
          <Link href="/" className="btn-ghost btn-sm">
            Back to site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <p className="label-eyebrow">Legal</p>
        <h1 className="mt-3 text-[32px] font-semibold tracking-[-0.03em]">{title}</h1>
        <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">{summary}</p>
        <p className="mt-5 border-t border-line pt-5 text-[13px] text-ink-3">
          Last updated {LEGAL.effectiveDate} · {LEGAL.entity}
        </p>

        {/* Visible only until the placeholders in lib/legal.ts are filled in, so
            an unfinished policy can't be published without somebody noticing. */}
        {legalDetailsMissing() && (
          <div className="mt-6 rounded-md border border-[#f4dfa8] bg-[#fdf8ea] px-4 py-3 text-[13px] leading-relaxed text-[#7a5800]">
            <strong className="font-semibold">Draft:</strong> company details in{" "}
            <code className="text-[12px]">lib/legal.ts</code> are still placeholders, and this document
            has not been reviewed by a lawyer. Fill them in and get it reviewed before relying on this page.
          </div>
        )}

        <div className="legal mt-10">{children}</div>

        <div className="mt-14 border-t border-line pt-6">
          <p className="label-eyebrow">Other policies</p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13.5px] text-ink-2 underline underline-offset-2 hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-3xl px-6 py-8 text-[12.5px] text-ink-3">
          © {new Date().getFullYear()} {LEGAL.entity}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
