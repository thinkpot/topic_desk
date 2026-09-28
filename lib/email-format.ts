/**
 * Format-only email validation, shared by the browser and the server.
 *
 * Deliberately free of node imports so client components can use it —
 * lib/email.ts does the DNS and disposable-domain checks and is server-only.
 *
 * Stricter than the browser's built-in type="email", which accepts addresses
 * like "a@b" with no dot and no TLD.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;

/** Returns a message to show, or null when the address looks well formed. */
export function emailFormatProblem(raw: string): string | null {
  const email = raw.trim();
  if (!email) return "Enter your email address.";
  if (email.length > 254) return "That email address is too long.";

  const at = email.lastIndexOf("@");
  if (at === -1) return "Enter a valid email address, including the @.";
  if (email.slice(0, at).length > 64) return "The part before the @ is too long.";
  if (email.includes("..")) return "That email address has two dots in a row.";
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address, like you@company.com.";

  return null;
}
