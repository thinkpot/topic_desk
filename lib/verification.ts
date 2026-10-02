import crypto from "crypto";
import { prisma } from "./prisma";
import { env } from "./env";
import { sendEmail } from "./mailer";
import { verificationEmail } from "./email-templates";

export const VERIFICATION_EXPIRY_HOURS = 24;
/** How long before a resend is allowed, so the endpoint can't be used to mail-bomb someone. */
const RESEND_COOLDOWN_MS = 60_000;

/**
 * The emailed token is random and single-use. Only its SHA-256 is stored, the
 * same reasoning as password hashing: whoever reads the database still can't
 * verify somebody else's address with what they find there.
 */
function hash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface IssueResult {
  ok: boolean;
  /** Set when refused — e.g. already verified, or asked again too soon. */
  reason?: string;
}

/** Creates a fresh token, stores its hash, and emails the link. */
export async function issueVerification(user: {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: Date | null;
  verificationSentAt: Date | null;
}): Promise<IssueResult> {
  if (user.emailVerifiedAt) return { ok: false, reason: "That address is already confirmed." };

  if (user.verificationSentAt && Date.now() - user.verificationSentAt.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, reason: "We've just sent one — check your inbox, then try again in a minute." };
  }

  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationTokenHash: hash(token),
      verificationExpiresAt: new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 3_600_000),
      verificationSentAt: new Date(),
    },
  });

  // appUrl throws when APP_URL is unset; a missing link is worse than no email.
  const url = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const body = verificationEmail(user.name, url, VERIFICATION_EXPIRY_HOURS);
  const result = await sendEmail({ to: user.email, ...body });

  if (!result.sent) {
    // Keep the token: email may be unconfigured locally, and the link is still
    // printed in the server log by the mailer, which is enough to test with.
    return { ok: false, reason: result.reason ?? "We couldn't send the email just now." };
  }
  return { ok: true };
}

export type VerifyOutcome = "verified" | "already-verified" | "invalid" | "expired";

/** Consumes a token. Single use: the stored hash is cleared on success. */
export async function consumeVerificationToken(token: string): Promise<VerifyOutcome> {
  if (!token) return "invalid";

  const user = await prisma.user.findFirst({ where: { verificationTokenHash: hash(token) } });
  if (!user) return "invalid";
  if (user.emailVerifiedAt) return "already-verified";

  if (!user.verificationExpiresAt || user.verificationExpiresAt < new Date()) return "expired";

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      verificationTokenHash: null,
      verificationExpiresAt: null,
    },
  });
  return "verified";
}
