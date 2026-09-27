import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";

// Local-only helper for DEV_TUNNEL=cloudflared. Free Cloudflare quick tunnels
// hand out a random https URL and die unpredictably; doing the recovery by hand
// meant restart tunnel → edit APP_URL → restart app → re-register every
// webhook. This runs the tunnel as a child of the app server instead: when it
// exits or stops answering, it's restarted and onUrl() fires with the new URL
// (server.ts uses that to update APP_URL and re-sync Telegram webhooks).
//
// A named tunnel on your own domain (or a real deploy) keeps a fixed URL and
// makes all of this unnecessary — set APP_URL to it and leave DEV_TUNNEL unset.

const URL_PATTERN = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
const HEALTH_INTERVAL_MS = 60_000;
const MAX_HEALTH_FAILURES = 3;

/**
 * A fresh quick-tunnel hostname takes a few seconds to appear in public DNS.
 * If Telegram is asked to setWebhook before then, its resolver caches the
 * miss for far longer than the zone's TTL and keeps rejecting the URL with
 * "Failed to resolve host" — so don't announce the URL until public
 * resolvers (queried over DoH, bypassing the local cache) can see it.
 */
async function waitForPublicDns(hostname: string, timeoutMs = 120_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  const resolvers = ["https://dns.google/resolve", "https://cloudflare-dns.com/dns-query"];
  while (Date.now() < deadline) {
    const results = await Promise.all(
      resolvers.map(async (base) => {
        try {
          const res = await fetch(`${base}?name=${hostname}&type=A`, {
            headers: { accept: "application/dns-json" },
            signal: AbortSignal.timeout(5_000),
          });
          const json = (await res.json()) as { Answer?: unknown[] };
          return !!json.Answer?.length;
        } catch {
          return false;
        }
      })
    );
    if (results.every(Boolean)) {
      // A little slack for resolvers we didn't ask.
      await new Promise((r) => setTimeout(r, 10_000));
      return true;
    }
    await new Promise((r) => setTimeout(r, 3_000));
  }
  return false;
}

function persistAppUrl(url: string) {
  // Written back to .env so tools run outside this process (prisma seed,
  // scripts) see the same URL. Only the APP_URL line is touched.
  const envPath = path.join(process.cwd(), ".env");
  try {
    const current = fs.readFileSync(envPath, "utf8");
    const line = `APP_URL="${url}"`;
    const next = /^APP_URL=.*$/m.test(current) ? current.replace(/^APP_URL=.*$/m, line) : `${current}\n${line}\n`;
    if (next !== current) fs.writeFileSync(envPath, next);
  } catch (err) {
    console.warn("> [tunnel] Couldn't update APP_URL in .env:", err);
  }
}

export interface DevTunnel {
  /** Drops the current tunnel and starts a new one (new hostname). */
  recycle(): void;
}

export function startDevTunnel(port: number, onUrl: (url: string) => void): DevTunnel {
  let child: ChildProcess | null = null;
  let currentUrl: string | null = null;
  let restartDelay = 2_000;
  let healthFailures = 0;
  let stopping = false;

  function launch() {
    console.log("> [tunnel] Starting cloudflared quick tunnel…");
    const proc = spawn("cloudflared", ["tunnel", "--no-autoupdate", "--url", `http://localhost:${port}`], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    child = proc;

    const scan = async (chunk: Buffer) => {
      const match = chunk.toString().match(URL_PATTERN);
      if (!match || match[0] === currentUrl) return;
      const url = match[0];
      currentUrl = url;
      restartDelay = 2_000;
      healthFailures = 0;
      console.log(`> [tunnel] Public URL: ${url} (waiting for public DNS…)`);
      const resolved = await waitForPublicDns(new URL(url).hostname);
      if (currentUrl !== url || child !== proc) return; // superseded meanwhile
      if (!resolved) console.warn("> [tunnel] Hostname still not in public DNS; using it anyway");
      process.env.APP_URL = url;
      persistAppUrl(url);
      console.log(`> [tunnel] Ready: ${url}`);
      onUrl(url);
    };
    proc.stdout?.on("data", scan);
    proc.stderr?.on("data", scan);

    proc.on("error", (err) => {
      console.error("> [tunnel] Couldn't run cloudflared (is it installed? `brew install cloudflared`):", err.message);
    });
    proc.on("exit", (code) => {
      if (child === proc) child = null;
      if (stopping) return;
      console.warn(`> [tunnel] cloudflared exited (${code ?? "signal"}); restarting in ${restartDelay / 1000}s`);
      currentUrl = null;
      setTimeout(launch, restartDelay);
      restartDelay = Math.min(restartDelay * 2, 60_000);
    });
  }

  // A quick tunnel can go dead while the cloudflared process stays up, so
  // probe it end-to-end and recycle it after a few consecutive failures.
  setInterval(async () => {
    if (!currentUrl || !child) return;
    try {
      const res = await fetch(`${currentUrl}/api/health`, { signal: AbortSignal.timeout(10_000) });
      healthFailures = res.ok ? 0 : healthFailures + 1;
    } catch {
      healthFailures++;
    }
    if (healthFailures >= MAX_HEALTH_FAILURES) {
      console.warn("> [tunnel] Tunnel stopped responding; recycling it");
      healthFailures = 0;
      child.kill();
    }
  }, HEALTH_INTERVAL_MS).unref();

  const shutdown = () => {
    stopping = true;
    child?.kill();
  };
  process.once("SIGINT", () => {
    shutdown();
    process.exit(0);
  });
  process.once("SIGTERM", () => {
    shutdown();
    process.exit(0);
  });
  process.once("exit", shutdown);

  launch();

  return {
    recycle() {
      console.warn("> [tunnel] Recycling tunnel for a fresh hostname");
      child?.kill();
    },
  };
}
