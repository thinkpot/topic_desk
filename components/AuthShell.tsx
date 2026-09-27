import Link from "next/link";
import { ReactNode } from "react";
import { BRAND_NAME } from "@/lib/brand";
import Logo from "@/components/Logo";

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="hidden flex-col justify-between bg-ink px-12 py-10 text-white lg:flex">
        <Link href="/" className="inline-flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]">
          {/* On the ink panel the mark needs a light chip to sit on, or its
              blue edge muddies against the near-black background. */}
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
            <Logo size={20} />
          </span>
          {BRAND_NAME}
        </Link>
        <div>
          <p className="text-[30px] font-semibold leading-tight tracking-[-0.03em]">
            Every visitor gets their own topic in your Telegram group.
          </p>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/60">
            Answer website chats from the app your team already has open all day.
          </p>
        </div>
        <p className="text-[13px] text-white/40">Setup takes about five minutes.</p>
      </aside>

      <main className="flex items-center justify-center bg-surface px-6 py-14">
        <div className="w-full max-w-[380px]">
          <Link href="/" className="inline-flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em] lg:hidden">
            <Logo size={22} />
            {BRAND_NAME}
          </Link>
          <h1 className="mt-8 text-[26px] font-semibold tracking-[-0.025em] lg:mt-0">{title}</h1>
          <p className="mt-1.5 text-[15px] text-ink-2">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-[14px] text-ink-2">{footer}</div>
        </div>
      </main>
    </div>
  );
}
