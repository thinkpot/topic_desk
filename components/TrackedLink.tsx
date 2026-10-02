"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { trackEvent } from "@/lib/gtag";

/**
 * A Link that reports where it was clicked.
 *
 * The marketing page is a server component, so it cannot attach a handler
 * itself. `location` is what separates the hero CTA from the pricing one in
 * reporting — without it every signup looks like it came from the same place.
 */
export default function TrackedLink({
  href,
  location,
  className,
  children,
}: {
  href: string;
  location: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={() => trackEvent("cta_click", { location, href })}>
      {children}
    </Link>
  );
}
