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
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  /** Optional: shows this app's own chat widget on its marketing homepage. */
  get supportChatbotApiKey(): string | undefined {
    return process.env.SUPPORT_CHATBOT_API_KEY || undefined;
  },
};
