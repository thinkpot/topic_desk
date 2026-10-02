import crypto from "crypto";

/**
 * Realtime delivery through Supabase Broadcast.
 *
 * Supabase is used purely as a transport — Postgres remains the single source
 * of truth, and nothing here writes application data. That keeps the database
 * untouched and avoids the dual-write divergence a second data store brings.
 *
 * Publishing goes over Supabase's HTTP broadcast endpoint rather than their
 * SDK, so the server gains no dependency: it is one POST.
 *
 * ## Why channel names are hashed
 *
 * Socket.io enforced authorization server-side — server.ts verified the JWT
 * before joining a dashboard room, and the API key plus domain allowlist before
 * joining a visitor room. A Supabase broadcast channel has no such check: anyone
 * who knows the channel name can subscribe to it.
 *
 * So the name itself is the capability. It is an HMAC of the id under
 * JWT_SECRET, which makes it unguessable, and it is only ever handed to a
 * caller that has already passed the existing checks — the dashboard gets its
 * channel from /api/auth/me (authenticated), and the widget gets its channel
 * from /api/widget/[apiKey]/config (API key plus domain allowlist). Knowing a
 * user id or a visitor id is not enough to listen in.
 */

const BROADCAST_PATH = "/realtime/v1/api/broadcast";

function config() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, ""),
    // Server-only secret key; never reaches a browser.
    key: process.env.SUPABASE_SECRET_KEY?.trim(),
  };
}

export function realtimeEnabled(): boolean {
  const { url, key } = config();
  return !!url && !!key;
}

/**
 * An unguessable channel name for an id. Truncated to 32 hex characters —
 * 128 bits, far beyond brute force, and short enough to read in a log.
 */
export function channelFor(kind: "user" | "visitor", id: string): string {
  const secret = process.env.JWT_SECRET ?? "";
  const digest = crypto.createHmac("sha256", secret).update(`realtime:${kind}:${id}`).digest("hex");
  return `${kind}-${digest.slice(0, 32)}`;
}

/**
 * Publishes one event. Never throws and never blocks the caller's response:
 * realtime is an enhancement, and a message that fails to push is still saved
 * in Postgres and picked up by the client's next poll.
 */
export async function broadcast(channel: string, event: string, payload: unknown): Promise<boolean> {
  const { url, key } = config();
  if (!url || !key) return false;

  try {
    const res = await fetch(`${url}${BROADCAST_PATH}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ topic: channel, event, payload }] }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      console.error(`> [realtime] broadcast ${event} failed (${res.status})`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`> [realtime] broadcast ${event} failed:`, error);
    return false;
  }
}

/** Fire-and-forget, so a request never waits on the push. */
export function broadcastInBackground(channel: string, event: string, payload: unknown): void {
  void broadcast(channel, event, payload).catch(() => {});
}
