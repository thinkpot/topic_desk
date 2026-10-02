/**
 * Email delivery through Resend.
 *
 * Uses Resend's REST API directly rather than its SDK, for the same reason
 * public/widget.js ships without a bundler: one fewer dependency to keep
 * current, and the whole surface we need is a single POST.
 *
 * Nothing here ever throws. A signup must not fail because an email provider
 * is having a bad morning — the account is the thing that matters, the email is
 * a courtesy. Failures are logged and reported in the return value for callers
 * that care.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface SendResult {
  sent: boolean;
  /** Present when the send failed, or was skipped because email isn't configured. */
  reason?: string;
}

function config() {
  return {
    apiKey: process.env.RESEND_API_KEY?.trim(),
    from: process.env.EMAIL_FROM?.trim(),
    notifyTo: process.env.NOTIFY_EMAIL?.trim(),
  };
}

export function emailConfigured(): boolean {
  const { apiKey, from } = config();
  return !!apiKey && !!from;
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<SendResult> {
  const { apiKey, from } = config();

  // Unconfigured is a normal state: local development and self-hosters without
  // an email provider should still work, so log what would have gone out.
  if (!apiKey || !from) {
    console.info(`> [email] not configured; would have sent "${options.subject}" to ${options.to}`);
    return { sent: false, reason: "Email is not configured" };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        ...(options.replyTo ? { reply_to: options.replyTo } : {}),
      }),
      // Resend is usually fast; a hung request must not hold a signup open.
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`> [email] Resend rejected "${options.subject}" (${res.status}): ${detail.slice(0, 300)}`);
      return { sent: false, reason: `Resend returned ${res.status}` };
    }
    return { sent: true };
  } catch (error) {
    console.error(`> [email] failed to send "${options.subject}":`, error);
    return { sent: false, reason: "Could not reach the email provider" };
  }
}

/** Operational notification to the operator's own inbox. Silent no-op if NOTIFY_EMAIL is unset. */
export async function notifyOperator(options: {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<SendResult> {
  const { notifyTo } = config();
  if (!notifyTo) return { sent: false, reason: "NOTIFY_EMAIL is not set" };
  return sendEmail({ to: notifyTo, ...options });
}

/**
 * Starts a send without making the caller wait or handle failure.
 *
 * Request handlers use this so email latency never shows up in the response
 * time of a signup, and so an unhandled rejection can't take the process down.
 */
export function sendInBackground(send: () => Promise<SendResult>): void {
  void send().catch((error) => console.error("> [email] background send failed:", error));
}
