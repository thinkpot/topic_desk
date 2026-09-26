// A visitor counts as "live" while a heartbeat has arrived within this
// window. The widget pings roughly every 10s, so this leaves margin for
// network jitter and a backgrounded tab without holding on to stale rows —
// same filter-don't-clean-up pattern as session-lifecycle staleness.
export const LIVE_WINDOW_MS = 25_000;

export function liveSince(): Date {
  return new Date(Date.now() - LIVE_WINDOW_MS);
}
