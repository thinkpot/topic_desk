import { NextResponse } from "next/server";
import { jwtSecretProblem } from "@/lib/env";

/**
 * Liveness probe, used by the dev tunnel watchdog and by any uptime monitor.
 *
 * It also reports whether the environment is wired up correctly. Serverless has
 * no boot, so a misconfigured variable only shows up as a 500 from whichever
 * route happens to touch it — which is how a blank JWT_EXPIRES_IN and a
 * malformed APP_URL each cost hours of guessing. This turns that into one
 * request.
 *
 * It reports only a status word per variable, never a value, so it is safe to
 * leave public: the URL it validates is already public, and "set or not" tells
 * an attacker nothing they could not learn by using the site.
 */
function appUrlStatus(): "ok" | "missing" | "invalid" {
  const raw = process.env.APP_URL?.trim();
  if (!raw) return "missing";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.hostname === "localhost" ? "ok" : "invalid";
  } catch {
    return "invalid";
  }
}

export async function GET() {
  const secretProblem = jwtSecretProblem(process.env.JWT_SECRET);

  return NextResponse.json({
    ok: true,
    config: {
      appUrl: appUrlStatus(),
      database: process.env.DATABASE_URL ? "set" : "missing",
      jwtSecret: secretProblem ? "invalid" : "ok",
      email: process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "configured" : "not configured",
    },
  });
}
