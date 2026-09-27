"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { trialStatus } from "@/lib/plans";
import Logo from "@/components/Logo";
import { BRAND_NAME } from "@/lib/brand";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const isAdminArea = pathname.startsWith("/admin");

  const links = isAdminArea
    ? [
        { href: "/admin", label: "Overview", exact: true },
        { href: "/admin/users", label: "Users" },
        { href: "/admin/plans", label: "Plans" },
      ]
    : [
        { href: "/dashboard", label: "Overview", exact: true },
        { href: "/dashboard/chatbots", label: "Chatbots" },
        { href: "/dashboard/live", label: "Live" },
        { href: "/dashboard/billing", label: "Billing" },
      ];

  const isCurrent = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={isAdminArea ? "/admin" : "/dashboard"}
              className="inline-flex items-center gap-2 text-[16px] font-semibold tracking-[-0.02em]"
            >
              <Logo size={24} />
              {BRAND_NAME}
            </Link>
            {isAdminArea && (
              <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-white">Admin</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user?.role === "ADMIN" && (
              <Link
                href={isAdminArea ? "/dashboard" : "/admin"}
                className="hidden text-[13px] font-medium text-ink-2 underline underline-offset-2 hover:text-ink sm:block"
              >
                {isAdminArea ? "My dashboard" : "Admin panel"}
              </Link>
            )}
            {!isAdminArea && user && (
              <span className="hidden text-[13px] text-ink-2 sm:block">
                {trialStatus(user).onTrial ? "Free trial" : user.plan.name}
                {!user.plan.isPaid && " · no chatbots"}
              </span>
            )}
            <span className="hidden text-[13px] text-ink-3 md:block">{user?.email}</span>
            <button onClick={logout} className="btn-ghost btn-sm">
              Log out
            </button>
          </div>
        </div>

        <nav className="-mb-px flex gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`border-b-2 pb-2.5 pt-1 text-[14px] font-medium transition-colors ${
                isCurrent(link.href, link.exact)
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-3 hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
