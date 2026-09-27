import { NextRequest, NextResponse } from "next/server";
import { CLIENT_IP_HEADER, RATE_LIMITS, hit } from "./rate-limit-core";

export { RATE_LIMITS };

/** server.ts stamps every request with the resolved IP (overwriting anything the client sent). */
export function clientIp(req: NextRequest): string {
  return req.headers.get(CLIENT_IP_HEADER) ?? "unknown";
}

/**
 * Counts this request against `name` and returns a 429 response once the
 * limit is exceeded, or null to carry on. Keyed by the caller's IP unless
 * `key` is given — e.g. the email being tried, so one account can't be
 * brute-forced from many IPs.
 */
export function rateLimit(req: NextRequest, name: keyof typeof RATE_LIMITS, key?: string): NextResponse | null {
  const retryAfter = hit(`${name}:${key ?? `ip:${clientIp(req)}`}`, RATE_LIMITS[name]);
  if (!retryAfter) return null;
  return NextResponse.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}
