"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import { Spinner } from "@/components/ui/primitives";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, blockReason } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // The flow canvas needs the full viewport, not the standard content column.
  const isFullBleed = pathname.endsWith("/flow");

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
      {blockReason && (
        <div className="border-b border-[#f4dfa8] bg-[#fdf8ea]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-2.5">
            <p className="text-[13px] text-[#7a5800]">{blockReason}</p>
            <Link href="/dashboard/billing" className="btn-secondary btn-sm">
              View plans
            </Link>
          </div>
        </div>
      )}
      <main className={isFullBleed ? "relative min-h-0 flex-1" : "mx-auto w-full max-w-6xl px-6 py-8"}>{children}</main>
    </div>
  );
}
