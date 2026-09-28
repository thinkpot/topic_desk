import { promises as dns } from "dns";

/**
 * Email checks for public signup.
 *
 * Zod's .email() already rejects malformed addresses (no TLD, spaces, double
 * dots, bad hostnames), so this covers the two things it cannot know: whether
 * the domain can actually receive mail, and whether it is a throwaway provider.
 * Both matter here because the trial asks for no card, which makes a disposable
 * address the cheapest way to take a new trial every three days.
 */

/**
 * Deliberately NOT a list of free providers. Plenty of real small businesses
 * run on Gmail, and blocking them to enforce "work email" would cost genuine
 * signups. This is only addresses designed to be thrown away.
 *
 * It cannot be exhaustive — new throwaway domains appear constantly — so treat
 * it as a speed bump, not a wall.
 */
const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com",
  "20minutemail.com",
  "33mail.com",
  "dispostable.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "inboxbear.com",
  "mail7.io",
  "mailcatch.com",
  "maildrop.cc",
  "mailinator.com",
  "mailnesia.com",
  "mintemail.com",
  "moakt.com",
  "mohmal.com",
  "mytemp.email",
  "sharklasers.com",
  "spam4.me",
  "temp-mail.io",
  "temp-mail.org",
  "tempmail.com",
  "tempmail.net",
  "tempmailo.com",
  "tempr.email",
  "throwawaymail.com",
  "trashmail.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
]);

export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

export function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain);
}

type Reachability = "ok" | "no-mail-route" | "unknown";

function isNotFound(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException)?.code;
  return code === "ENOTFOUND" || code === "NXDOMAIN";
}

function isNoRecords(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === "ENODATA";
}

/**
 * Whether the domain can plausibly receive mail: an MX record, or — per
 * RFC 5321 — an A/AAAA record acting as an implicit MX.
 *
 * Returns "unknown" for timeouts and resolver errors, which callers treat as
 * acceptable. Blocking a real customer because our DNS hiccuped is a far worse
 * outcome than letting a bad address through, so this fails open on anything
 * that is not a definitive "this domain does not exist".
 */
async function domainReachability(domain: string, timeoutMs = 3_000): Promise<Reachability> {
  const lookup = async (): Promise<Reachability> => {
    try {
      const mx = await dns.resolveMx(domain);
      if (mx.some((record) => record.exchange)) return "ok";
      return "no-mail-route";
    } catch (error) {
      if (isNotFound(error)) return "no-mail-route";
      if (!isNoRecords(error)) return "unknown";
    }
    // No MX, so fall back to the address records.
    try {
      const a = await dns.resolve4(domain);
      return a.length ? "ok" : "no-mail-route";
    } catch (error) {
      if (isNotFound(error) || isNoRecords(error)) {
        try {
          const aaaa = await dns.resolve6(domain);
          return aaaa.length ? "ok" : "no-mail-route";
        } catch (innerError) {
          return isNotFound(innerError) || isNoRecords(innerError) ? "no-mail-route" : "unknown";
        }
      }
      return "unknown";
    }
  };

  const timeout = new Promise<Reachability>((resolve) => {
    setTimeout(() => resolve("unknown"), timeoutMs).unref?.();
  });
  return Promise.race([lookup(), timeout]);
}

/**
 * Returns a message to show the person, or null if the address is acceptable.
 * Expects an already trimmed, lowercased, format-valid address.
 */
export async function emailSignupProblem(email: string): Promise<string | null> {
  const domain = emailDomain(email);

  if (isDisposableDomain(domain)) {
    return "Please use a permanent email address — disposable addresses aren't accepted.";
  }

  const reachability = await domainReachability(domain);
  if (reachability === "no-mail-route") {
    return `We couldn't find a mail server for "${domain}". Please check the address for a typo.`;
  }

  return null;
}
