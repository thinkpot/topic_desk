"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const links = [
  { href: "/dashboard", label: "Chatbots" },
  { href: "/dashboard/billing", label: "Billing" },
];

export default function Navbar() {
  const { user, logout, planLimits } = useAuth();
  const pathname = usePathname();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-lg font-bold">
            ChatWidget
          </Link>
          <nav className="flex gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  pathname === link.href ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {planLimits?.label ?? user.plan} plan
            </span>
          )}
          <span className="text-sm text-gray-600">{user?.email}</span>
          <button onClick={logout} className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
