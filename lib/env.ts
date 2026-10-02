function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const PLACEHOLDER_SECRETS = ["change-this-to-a-long-random-string"];

/**
 * A weak JWT secret lets anyone forge a login for any account, so production
 * refuses to start with one rather than silently accepting it. Generate one
 * with: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
 */
export function jwtSecretProblem(secret: string | undefined): string | null {
  if (!secret) return "JWT_SECRET is not set.";
  if (PLACEHOLDER_SECRETS.includes(secret) || /^local-dev-secret/i.test(secret)) {
    return "JWT_SECRET is still a placeholder value.";
  }
  if (secret.length < 32) return "JWT_SECRET must be at least 32 characters.";
  return null;
}

const DEFAULT_TOKEN_EXPIRY = "7d";

// jsonwebtoken accepts a number of seconds or a timespan string ("7d", "12h",
// "2 weeks"). Anything else throws inside jwt.sign(), which takes down login
// and signup with an error that points nowhere near the cause.
//
// `??` was not enough here: a variable that exists but is EMPTY is not nullish,
// so "" reached jwt.sign() and broke production. Treat blank or malformed
// values as unset and carry on with the default rather than failing auth over
// a cosmetic setting.
const TIMESPAN = /^\d+(\.\d+)?\s*(ms|s|m|h|d|w|y|secs?|seconds?|mins?|minutes?|hrs?|hours?|days?|weeks?|yrs?|years?)?$/i;

function readTokenExpiry(): string {
  const raw = process.env.JWT_EXPIRES_IN?.trim();
  if (!raw) return DEFAULT_TOKEN_EXPIRY;
  if (!TIMESPAN.test(raw)) {
    console.warn(`> Ignoring invalid JWT_EXPIRES_IN (${JSON.stringify(raw)}); using ${DEFAULT_TOKEN_EXPIRY}.`);
    return DEFAULT_TOKEN_EXPIRY;
  }
  return raw;
}

export const env = {
  get appUrl(): string {
    return required("APP_URL").replace(/\/+$/, "");
  },
  get jwtSecret(): string {
    const secret = required("JWT_SECRET");
    if (process.env.NODE_ENV === "production") {
      const problem = jwtSecretProblem(secret);
      if (problem) throw new Error(`${problem} Refusing to sign or verify tokens in production.`);
    }
    return secret;
  },
  get jwtExpiresIn(): string {
    return readTokenExpiry();
  },
  /** Optional: shows this app's own chat widget on its marketing homepage. */
  get supportChatbotApiKey(): string | undefined {
    return process.env.SUPPORT_CHATBOT_API_KEY || undefined;
  },
};
