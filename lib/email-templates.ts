import { BRAND_NAME } from "./brand";

/**
 * Email bodies, as plain strings.
 *
 * Deliberately not React components: email clients support a 1990s subset of
 * HTML, so these use inline styles, a single centred column and no external
 * CSS. Every template returns a text part too — some clients prefer it, and a
 * message with no text alternative scores worse with spam filters.
 */

const INK = "#0a0a0a";
const INK_2 = "#545454";
const LINE = "#e6e4e0";

function layout(body: string, preheader: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${BRAND_NAME}</title></head>
<body style="margin:0;padding:0;background:#f7f7f5;">
<!-- Preview text: shown in the inbox list, then hidden in the body. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid ${LINE};border-radius:10px;">
<tr><td style="padding:28px 28px 8px;font:600 17px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${INK};letter-spacing:-0.02em;">${BRAND_NAME}</td></tr>
<tr><td style="padding:0 28px 28px;font:15px/1.65 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${INK_2};">
${body}
</td></tr>
</table>
<p style="max-width:520px;margin:18px auto 0;font:12px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#8a8a8a;text-align:left;">
${BRAND_NAME} — a live chat widget for your website, answered from Telegram.
</p>
</td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr>
<td style="background:${INK};border-radius:6px;">
<a href="${href}" style="display:inline-block;padding:12px 22px;font:600 15px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#ffffff;text-decoration:none;">${label}</a>
</td></tr></table>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Row used by the operator notifications, which are mostly key/value facts. */
function facts(rows: [string, string | null | undefined][]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:18px 0;">${rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:7px 0;border-bottom:1px solid ${LINE};font:13px -apple-system,sans-serif;color:#8a8a8a;">${escapeHtml(
          label
        )}</td><td style="padding:7px 0;border-bottom:1px solid ${LINE};font:13px -apple-system,sans-serif;color:${INK};text-align:right;">${escapeHtml(
          String(value)
        )}</td></tr>`
    )
    .join("")}</table>`;
}

// --- To the customer -------------------------------------------------------

export function verificationEmail(name: string, verifyUrl: string, expiryHours: number) {
  const firstName = escapeHtml(name.split(" ")[0] || "there");
  return {
    subject: `Confirm your email for ${BRAND_NAME}`,
    html: layout(
      `<p style="margin:0 0 14px;">Hi ${firstName},</p>
<p style="margin:0 0 14px;">Confirm this address to finish setting up your ${BRAND_NAME} account. You'll need it before you can connect a Telegram group and put the chat widget on your site.</p>
${button(verifyUrl, "Confirm my email")}
<p style="margin:0 0 14px;">The link works for ${expiryHours} hours. If it expires, sign in and request another from your dashboard.</p>
<p style="margin:0;font-size:13px;color:#8a8a8a;">If you didn't create this account, ignore this email and nothing will happen. The link below is the same as the button:<br><span style="word-break:break-all;">${escapeHtml(
        verifyUrl
      )}</span></p>`,
      `Confirm your email to finish setting up ${BRAND_NAME}.`
    ),
    text: `Hi ${name.split(" ")[0] || "there"},

Confirm this address to finish setting up your ${BRAND_NAME} account. You'll need it before you can connect a Telegram group and put the chat widget on your site.

${verifyUrl}

The link works for ${expiryHours} hours. If it expires, sign in and request another from your dashboard.

If you didn't create this account, ignore this email and nothing will happen.`,
  };
}

// --- To the operator -------------------------------------------------------

export function newSignupEmail(user: {
  name: string;
  email: string;
  companyName?: string | null;
  websiteUrl?: string | null;
  trialEndsAt?: Date | null;
}) {
  return {
    subject: `New trial: ${user.name}${user.companyName ? ` (${user.companyName})` : ""}`,
    html: layout(
      `<p style="margin:0 0 4px;font-weight:600;color:${INK};">Someone started a free trial.</p>
${facts([
  ["Name", user.name],
  ["Email", user.email],
  ["Company", user.companyName],
  ["Website", user.websiteUrl],
  ["Trial ends", user.trialEndsAt?.toDateString()],
])}
<p style="margin:0;font-size:13px;color:#8a8a8a;">They haven't connected Telegram yet. If they go quiet before doing that, it's worth a nudge — that step is where trials stall.</p>`,
      `${user.name} started a free trial.`
    ),
    text: `Someone started a free trial.

Name: ${user.name}
Email: ${user.email}
${user.companyName ? `Company: ${user.companyName}\n` : ""}${user.websiteUrl ? `Website: ${user.websiteUrl}\n` : ""}${
      user.trialEndsAt ? `Trial ends: ${user.trialEndsAt.toDateString()}\n` : ""
    }
They haven't connected Telegram yet.`,
  };
}

export function chatbotCreatedEmail(info: {
  chatbotName: string;
  ownerName: string;
  ownerEmail: string;
  planName: string;
  allowedDomains?: string | null;
}) {
  return {
    subject: `Chatbot live: ${info.chatbotName} (${info.ownerName})`,
    html: layout(
      `<p style="margin:0 0 4px;font-weight:600;color:${INK};">A customer connected Telegram and went live.</p>
${facts([
  ["Chatbot", info.chatbotName],
  ["Owner", info.ownerName],
  ["Email", info.ownerEmail],
  ["Plan", info.planName],
  ["Allowed domains", info.allowedDomains || "any"],
])}
<p style="margin:0;font-size:13px;color:#8a8a8a;">This is the activation step — they're now able to receive real conversations.</p>`,
      `${info.ownerName} put a chatbot live.`
    ),
    text: `A customer connected Telegram and went live.

Chatbot: ${info.chatbotName}
Owner: ${info.ownerName} (${info.ownerEmail})
Plan: ${info.planName}
Allowed domains: ${info.allowedDomains || "any"}`,
  };
}

export function trialsExpiringEmail(
  trials: { name: string; email: string; companyName?: string | null; hasChatbot: boolean; endsAt: Date }[]
) {
  const lines = trials
    .map(
      (t) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid ${LINE};font:13px -apple-system,sans-serif;color:${INK};">${escapeHtml(
          t.name
        )}${t.companyName ? ` <span style="color:#8a8a8a;">· ${escapeHtml(t.companyName)}</span>` : ""}<br>
<span style="color:#8a8a8a;">${escapeHtml(t.email)} · ${t.hasChatbot ? "chatbot live" : "never connected Telegram"}</span></td></tr>`
    )
    .join("");

  return {
    subject: `${trials.length} trial${trials.length === 1 ? "" : "s"} ending tomorrow`,
    html: layout(
      `<p style="margin:0 0 4px;font-weight:600;color:${INK};">${trials.length} trial${
        trials.length === 1 ? "" : "s"
      } end within 24 hours.</p>
<p style="margin:0 0 14px;">Their chatbots stop serving traffic when the trial lapses.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 18px;">${lines}</table>
<p style="margin:0;font-size:13px;color:#8a8a8a;">The ones marked &ldquo;chatbot live&rdquo; got value from the trial and are worth contacting first.</p>`,
      `${trials.length} trial${trials.length === 1 ? "" : "s"} ending within 24 hours.`
    ),
    text: `${trials.length} trial(s) end within 24 hours. Their chatbots stop serving traffic when the trial lapses.

${trials
  .map((t) => `- ${t.name}${t.companyName ? ` (${t.companyName})` : ""} — ${t.email} — ${t.hasChatbot ? "chatbot live" : "never connected Telegram"}`)
  .join("\n")}`,
  };
}
