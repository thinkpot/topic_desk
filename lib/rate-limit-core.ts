// No next/* imports here — server.ts uses this directly (see lib/session.ts).

// Fixed-window counters held in process memory. That's sufficient because the
// app runs as one always-on Node process (server.ts) — if it's ever scaled to
// several instances, move this to Redis or similar so the limits are shared.
// Kept on globalThis because Next bundles route handlers separately from
// server.ts, and both need the same store.
interface Bucket {
  count: number;
  resetAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __rateLimitStore: Map<string, Bucket> | undefined;
}

const store = (globalThis.__rateLimitStore ??= new Map<string, Bucket>());

let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of store) if (bucket.resetAt <= now) store.delete(key);
}

export interface RateLimitRule {
  /** Max requests allowed per window. */
  limit: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  login: { limit: 10, windowMs: 15 * 60_000 },
  loginAccount: { limit: 20, windowMs: 15 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  upgradeRequest: { limit: 10, windowMs: 60 * 60_000 },
  telegramVerify: { limit: 20, windowMs: 10 * 60_000 },
  // An open widget polls ~26 times a minute, and an office NAT can put many
  // visitors behind one IP — so reads are generous; writes are what cost.
  widgetRead: { limit: 300, windowMs: 60_000 },
  widgetWrite: { limit: 30, windowMs: 60_000 },
  widgetTrack: { limit: 60, windowMs: 60_000 },
  socketHeartbeat: { limit: 120, windowMs: 60_000 },
} satisfies Record<string, RateLimitRule>;

/** Returns seconds until the caller may retry, or 0 if this hit is allowed. */
export function hit(key: string, rule: RateLimitRule): number {
  const now = Date.now();
  sweep(now);
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + rule.windowMs });
    return 0;
  }
  bucket.count += 1;
  if (bucket.count > rule.limit) return Math.ceil((bucket.resetAt - now) / 1000);
  return 0;
}

export const CLIENT_IP_HEADER = "x-client-ip";

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/**
 * Resolves the real client IP for a raw connection. Proxy headers are only
 * trusted when the connection itself comes from a proxy on this machine
 * (cloudflared, nginx) — otherwise any caller could send a fake
 * X-Forwarded-For and get a fresh rate-limit bucket per request.
 */
export function resolveClientIp(
  remoteAddress: string | undefined,
  header: (name: string) => string | string[] | undefined
): string {
  const one = (name: string) => {
    const value = header(name);
    return Array.isArray(value) ? value[0] : value;
  };
  if (remoteAddress && LOOPBACK.has(remoteAddress)) {
    const forwarded = one("x-forwarded-for")?.split(",").pop()?.trim();
    return one("cf-connecting-ip") ?? one("x-real-ip") ?? forwarded ?? remoteAddress;
  }
  return remoteAddress ?? "unknown";
}
