import type { Chatbot, Conversation, Lead, LeadStatus, User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { accountBlockReason } from "./plans";
import { emailConfigured, sendEmail } from "./mailer";
import { DEFAULT_FOLLOW_UP_BODY, DEFAULT_FOLLOW_UP_SUBJECT, FOLLOW_UP_DELAY_HOURS } from "./follow-up-defaults";

export { DEFAULT_FOLLOW_UP_BODY, DEFAULT_FOLLOW_UP_SUBJECT, FOLLOW_UP_DELAY_HOURS };

/**
 * Lead capture and automatic follow-up.
 *
 * A lead is a visitor who left an email address or phone number — answered in
 * a flow question, or simply typed into the chat. Capture is best-effort and
 * never blocks a conversation; follow-ups are sent by a scheduled sweep
 * (app/api/cron/lead-follow-ups), only to leads nobody on the team has
 * replied to yet.
 */

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const EMAIL_EXACT_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
// A run of digits with the usual separators; validated by digit count below.
const PHONE_CANDIDATE_RE = /\+?\d[\d\s().-]{5,20}\d/g;

function normalizePhone(raw: string, minDigits: number): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < minDigits || digits.length > 15) return null;
  return (raw.trim().startsWith("+") ? "+" : "") + digits;
}

export function extractEmail(text: string): string | null {
  return text.match(EMAIL_RE)?.[0].toLowerCase() ?? null;
}

/**
 * A phone number typed into free text. Requires 10+ digits there — shorter
 * runs are far more often dates, order numbers or prices than phone numbers.
 */
export function extractPhone(text: string): string | null {
  for (const candidate of text.match(PHONE_CANDIDATE_RE) ?? []) {
    const phone = normalizePhone(candidate, 10);
    if (phone) return phone;
  }
  return null;
}

export interface LeadFields {
  name: string | null;
  email: string | null;
  phone: string | null;
}

const NAME_KEY_RE = /name/i;
const NOT_A_PERSON_RE = /company|business|org|site|product/i;
const PHONE_KEY_RE = /phone|mobile|whatsapp|contact|number|tel/i;

/**
 * Reads contact details out of a flow's collected answers. Variable names are
 * whatever the owner typed in the flow builder, so this matches on both the
 * name ("email", "Your phone") and the shape of the value.
 */
export function leadFieldsFromVariables(variables: Record<string, unknown>): LeadFields {
  const fields: LeadFields = { name: null, email: null, phone: null };
  for (const [key, raw] of Object.entries(variables)) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    const value = raw.trim();
    // A field the owner labelled as a phone accepts shorter numbers than free text does.
    const phone = PHONE_KEY_RE.test(key) ? normalizePhone(value, 7) : extractPhone(value);
    if (!fields.email && EMAIL_EXACT_RE.test(value)) {
      fields.email = value.toLowerCase();
    } else if (!fields.phone && phone) {
      fields.phone = phone;
    } else if (!fields.name && NAME_KEY_RE.test(key) && !NOT_A_PERSON_RE.test(key)) {
      fields.name = value.slice(0, 120);
    }
  }
  return fields;
}

/**
 * Saves (or tops up) the lead for a conversation, if it now has an email or a
 * phone number. Returns null when there's nothing worth saving. Existing
 * details are never blanked by a later message that lacks them.
 */
export async function captureLead(params: {
  chatbotId: string;
  conversation: Pick<Conversation, "id" | "visitorName" | "pageUrl" | "variables">;
  text?: string;
}): Promise<Lead | null> {
  const variables = (params.conversation.variables ?? {}) as Record<string, unknown>;
  const fromFlow = leadFieldsFromVariables(variables);
  const email = fromFlow.email ?? (params.text ? extractEmail(params.text) : null);
  const phone = fromFlow.phone ?? (params.text ? extractPhone(params.text) : null);
  const name = fromFlow.name ?? params.conversation.visitorName?.trim() ?? null;

  if (!email && !phone) {
    // No contact details yet — but if the flow just asked for a name after an
    // email or phone, top up the lead that already exists.
    if (!fromFlow.name) return null;
    const updated = await prisma.lead.updateMany({
      where: { conversationId: params.conversation.id },
      data: { name: fromFlow.name, data: variables as Prisma.InputJsonValue },
    });
    return updated.count ? prisma.lead.findUnique({ where: { conversationId: params.conversation.id } }) : null;
  }

  const known = { ...(name && { name }), ...(email && { email }), ...(phone && { phone }) };
  try {
    return await prisma.lead.upsert({
      where: { conversationId: params.conversation.id },
      create: {
        chatbotId: params.chatbotId,
        conversationId: params.conversation.id,
        pageUrl: params.conversation.pageUrl,
        data: variables as Prisma.InputJsonValue,
        ...known,
      },
      update: { data: variables as Prisma.InputJsonValue, ...known },
    });
  } catch (error) {
    // Two messages from one visitor racing to create the same lead — the
    // other one won. The next message tops it up.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return null;
    throw error;
  }
}

// --- Follow-up -------------------------------------------------------------

const MAX_ATTEMPTS = 3;

export function renderTemplate(template: string, values: { name: string | null; business: string }): string {
  const firstName = values.name?.trim().split(/\s+/)[0];
  return template.replace(/\{name\}/g, firstName || "there").replace(/\{business\}/g, values.business);
}

export function businessNameFor(chatbot: Pick<Chatbot, "name">, user: Pick<User, "companyName">): string {
  return user.companyName?.trim() || chatbot.name;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildFollowUpEmail(params: {
  chatbot: Pick<Chatbot, "name" | "followUpSubject" | "followUpBody">;
  user: Pick<User, "companyName">;
  leadName: string | null;
}) {
  const business = businessNameFor(params.chatbot, params.user);
  const values = { name: params.leadName, business };
  const subject = renderTemplate(params.chatbot.followUpSubject?.trim() || DEFAULT_FOLLOW_UP_SUBJECT, values);
  const body = renderTemplate(params.chatbot.followUpBody?.trim() || DEFAULT_FOLLOW_UP_BODY, values);
  const footer = `You're receiving this because you contacted ${business} through the chat on their website.`;
  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.6;color:#0a0a0a">${escapeHtml(
    body
  ).replace(/\n/g, "<br>")}<p style="margin-top:28px;font-size:12px;color:#8a8a8a">${escapeHtml(footer)}</p></div>`;
  return { subject, text: `${body}\n\n--\n${footer}`, html, business };
}

export type FollowUpDecision = { action: "wait" } | { action: "send" } | { action: "skip"; reason: string };

/**
 * What to do with one PENDING lead right now. Pure, so the rules live in one
 * testable place rather than spread through the sweep's database calls.
 */
export function followUpDecision(params: {
  lead: Pick<Lead, "email" | "status" | "createdAt">;
  chatbot: Pick<Chatbot, "followUpEnabled" | "followUpDelayHours">;
  ownerBlocked: boolean;
  teamReplied: boolean;
  now: Date;
}): FollowUpDecision {
  const { lead, chatbot } = params;
  if (!chatbot.followUpEnabled || !lead.email) return { action: "wait" };
  if (params.now.getTime() - lead.createdAt.getTime() < chatbot.followUpDelayHours * 3_600_000) {
    return { action: "wait" };
  }
  if (lead.status !== "NEW") return { action: "skip", reason: `Marked ${statusLabel(lead.status)} before it was due` };
  if (params.teamReplied) return { action: "skip", reason: "Your team already replied in the chat" };
  if (params.ownerBlocked) return { action: "skip", reason: "Account was inactive when it was due" };
  return { action: "send" };
}

function statusLabel(status: LeadStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

/**
 * Sends every follow-up that's due. Safe to run concurrently and as often as
 * you like: each lead is claimed atomically before sending, so a lead is
 * never emailed twice.
 */
export async function runFollowUpSweep(now = new Date()) {
  const result = { checked: 0, sent: 0, skipped: 0, failed: 0 };
  if (!emailConfigured()) return { ...result, note: "Email is not configured" };

  const leads = await prisma.lead.findMany({
    where: {
      followUpState: "PENDING",
      email: { not: null },
      chatbot: { followUpEnabled: true },
      // Nothing can be due sooner than the shortest delay.
      createdAt: { lte: new Date(now.getTime() - FOLLOW_UP_DELAY_HOURS[0] * 3_600_000) },
    },
    include: { chatbot: { include: { user: { include: { plan: true } } } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  for (const lead of leads) {
    result.checked++;
    const teamReplied =
      (await prisma.message.count({
        where: { conversationId: lead.conversationId, sender: "AGENT", createdAt: { gte: lead.createdAt } },
      })) > 0;
    const decision = followUpDecision({
      lead,
      chatbot: lead.chatbot,
      ownerBlocked: !!accountBlockReason(lead.chatbot.user),
      teamReplied,
      now,
    });

    if (decision.action === "wait") continue;
    if (decision.action === "skip") {
      await prisma.lead.updateMany({
        where: { id: lead.id, followUpState: "PENDING" },
        data: { followUpState: "SKIPPED", followUpAt: now, followUpNote: decision.reason },
      });
      result.skipped++;
      continue;
    }

    // Claim: only the sweep that bumps the attempt counter from the value it
    // read gets to send, so overlapping runs can't double-email.
    const claimed = await prisma.lead.updateMany({
      where: { id: lead.id, followUpState: "PENDING", followUpAttempts: lead.followUpAttempts },
      data: { followUpAttempts: { increment: 1 } },
    });
    if (claimed.count !== 1) continue;

    const email = buildFollowUpEmail({ chatbot: lead.chatbot, user: lead.chatbot.user, leadName: lead.name });
    const sent = await sendEmail({
      to: lead.email!,
      subject: email.subject,
      text: email.text,
      html: email.html,
      fromName: email.business,
      replyTo: lead.chatbot.user.email,
    });

    if (sent.sent) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { followUpState: "SENT", followUpAt: now, followUpNote: null },
      });
      result.sent++;
    } else {
      const giveUp = lead.followUpAttempts + 1 >= MAX_ATTEMPTS;
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          followUpState: giveUp ? "FAILED" : "PENDING",
          followUpAt: giveUp ? now : null,
          followUpNote: sent.reason ?? "Send failed",
        },
      });
      if (giveUp) result.failed++;
    }
  }
  return result;
}
