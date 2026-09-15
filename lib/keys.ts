import crypto from "crypto";

/**
 * Publishable widget key. It ships inside the customer's page markup, so it
 * identifies a chatbot rather than authenticating a trusted caller — the
 * chatbot's allowedDomains list is what restricts who can use it.
 */
export function generateApiKey(): string {
  return `cw_live_${crypto.randomBytes(16).toString("hex")}`;
}

export function generateWebhookSecret(): string {
  return crypto.randomBytes(24).toString("hex");
}
