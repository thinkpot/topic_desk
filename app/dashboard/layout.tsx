"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import TrialLockOverlay from "@/components/TrialLockOverlay";
import { Spinner } from "@/components/ui/primitives";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, blockReason } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // The flow canvas needs the full viewport, not the standard content column.
  const isFullBleed = pathname.endsWith("/flow");
  // Billing stays reachable while blocked — it's the only way to actually
  // see plans and upgrade, so it can't be behind the same lock it clears.
  const isBillingPage = pathname === "/dashboard/billing";
  const locked = !!blockReason && !isBillingPage;

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      {blockReason && isBillingPage && (
        <div className="border-b border-[#f4dfa8] bg-[#fdf8ea]">
          <div className="mx-auto max-w-6xl px-6 py-2.5 text-[13px] text-[#7a5800]">{blockReason}</div>
        </div>
      )}
      {locked && <TrialLockOverlay reason={blockReason!} />}
      <main className={isFullBleed ? "relative min-h-0 flex-1" : "mx-auto w-full max-w-6xl px-6 py-8"}>
        {locked ? null : children}
      </main>
    </div>
  );
}
