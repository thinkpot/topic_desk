# Chatshore — Project Handoff / Knowledge Doc

Read this fully before touching code — it captures decisions and constraints that aren't obvious from the code alone.

## What this is

A live chat widget SaaS. A website owner pastes one `<script>` tag; visitors who message through it get relayed as **Telegram forum topics** in the owner's Telegram group (one topic per visitor), so the owner's team replies from Telegram itself — no new inbox to check. On top of that: a no-code drag-and-drop chatbot flow builder, real-time live-visitor analytics, and an optional "dashboard chat" mode that replaces Telegram entirely for Premium accounts.

Named **Chatshore** (chosen 2026-09-27, replacing the working name Topicdesk, which collided with an
existing `topicdesk.com`). The name lives in `lib/brand.ts` plus the console prefix in
`public/widget.js`. `chatshore.com` / `.io` / `.co` were all unregistered when checked — **they still
need registering**, and no trademark search has been run.

## Architecture

- **Single Next.js 15 App Router project** — marketing site, dashboard, admin panel, and all API routes (Route Handlers) are one deployable unit. Originally designed for single-Vercel-project deploys.
- **This changed mid-project**: real WebSockets (Socket.io) were added for live-visitor tracking and dashboard chat, which serverless functions can't hold open. The user explicitly confirmed switching the deployment target from "Vercel serverless" to **"a traditional always-on Node server."** This is now load-bearing — deploying to Vercel serverless would silently break the socket layer.
- **Custom server**: `server.ts` (run via `tsx`, not `next dev`/`next start`) wraps Next's request handler and a Socket.io server in one HTTP server/process. Route handlers reach the `io` instance via a global in `lib/socket-server.ts` since they share the process.
- **Database**: Postgres via Prisma, using `prisma dev` (a local managed Postgres, not Docker) for local dev. `npm run dev` starts it automatically (`db:start`).
- **Auth**: JWT (Bearer token in `Authorization` header, not cookies — so no CSRF exposure), token stored in `localStorage` client-side. `lib/jwt.ts`, `lib/auth.ts`.
- **Widget delivery**: hybrid — Socket.io for real-time push (presence, chat messages) with an HTTP long-polling fallback (`/api/widget/[apiKey]/messages`, `/presence`) if the socket can't connect (blocked CDN script, strict CSP, no WS upgrade). The REST paths are never removed, only bypassed when the socket works.

## Data model (`prisma/schema.prisma`)

- **Plan** — pricing tiers (see Pricing below). Admin-editable via `/admin/plans`.
- **User** — `role` (USER/ADMIN), `planId`, `planExpiresAt` (used for the free-trial lock — see below), `isSuspended`.
- **Chatbot** — one per Telegram bot connection. Holds `botToken`, `groupChatId`, `webhookSecret` (never exposed to clients), widget theme/font, `allowedDomains`, session-lifecycle settings (`sessionTimeoutMinutes`, `restartKeywords`, `keepVariablesAcrossSessions`), and `dashboardChatEnabled`.
- **Flow** — one drag-and-drop flow per chatbot, stored as a raw React Flow graph (`nodes`/`edges` JSON) rather than normalized tables.
- **Conversation** — one per (chatbot, visitorId). Tracks `flowStatus` (NOT_STARTED/RUNNING/HANDED_OFF/ENDED), `currentNodeId`, `variables` (JSON, what the flow has collected), `topicId` (nullable — null for dashboard-chat bots, which never create a Telegram topic).
- **Message** — sender is VISITOR/AGENT/BOT/SYSTEM.
- **LiveVisitor** — one row per (chatbot, visitorId) currently browsing, updated by a heartbeat every ~10s. "Live" is a filter on `lastSeenAt`, not a status flag — no cleanup job, stale rows just get excluded from queries.
- **WidgetStat** — daily view/open rollup for the marketing funnel.

## Features built, in the order they were built

1. **Core relay**: chatbot setup wizard (bot token + group verification), embeddable `public/widget.js` (shadow-DOM isolated), Telegram webhook → topic-per-visitor.
2. **Admin panel**: user/plan management, usage metrics.
3. **Widget theming**: 10 light + 10 dark themes, font picker. Appearance section uses an **explicit Save/Discard button** — this was a deliberate exception the user asked for; every other Settings field auto-saves on blur. Don't "fix" this inconsistency, it's intentional.
4. **Flow builder**: React Flow canvas, node palette (Start, Message, Question, Buttons, Condition, Hand off, End), a pure execution engine (`lib/flow-engine.ts`) separate from Prisma/Telegram orchestration (`lib/flow-runtime.ts`).
5. **Session lifecycle**: a HANDED_OFF/ENDED conversation isn't dead forever — it restarts from Start after an idle timeout or a restart keyword (e.g. "hi"), reusing the same conversation/Telegram topic rather than creating a new one. `needsSessionRestart`/`restartSession` in `lib/flow-runtime.ts`.
6. **Live visitor analytics + WebSockets**: `LiveVisitor` model, presence heartbeat from the widget, a `/dashboard/live` tab showing everyone currently browsing (capped per plan), and **dashboard chat** — a Premium feature where the owner replies to (or proactively messages) a visitor directly from the dashboard instead of Telegram. When `dashboardChatEnabled` is on, `handOffToHuman()` never creates a Telegram topic.
7. **Notification badge/sound**: unread count badge on the closed widget bubble, a Web-Audio-generated chime when a new message arrives while the tab is hidden/unfocused. Required pushing Telegram-webhook-originated replies over the socket too (not just dashboard-chat replies) — this was a real bug found and fixed (see "Bugs found" below).
8. **Homepage rebuild + re-theme**: the homepage was rebuilt several times with different visual styles (gradients, dark sections) before being **audited against the actual app's design system and reverted to match it** — the real app (dashboard/admin/login) is strictly monochrome (`ink`/`surface`/`plane`/`line` tokens from `globals.css` + `tailwind.config.ts`), uses only `btn-primary`/`btn-secondary`/`btn-ghost`, and only ever animates via plain `transition-colors`/`transition-shadow` — no gradients, no scale-on-hover, no colored accents, no dark sections anywhere. **Treat any future homepage work as bound by this constraint** unless the user explicitly asks for a departure.
9. **SEO pass**: rewrote homepage copy around real keyword targets (live chat widget, Telegram chat widget, no-code chatbot builder, live visitor tracking), added FAQPage JSON-LD, fixed stale `<title>`/meta description. Note: this was done via web research, **not** Ubersuggest — that MCP connector is still not successfully authenticated as of this writing (see Open Items).
10. **Pricing + free trial**: see below.
11. **No-card trial onboarding** (2026-09-26):
    - Trial-focused signup, with optional company and website fields.
    - An onboarding checklist on the dashboard, worked out from real data (`GET /api/onboarding`).
    - A trial countdown banner that turns amber in the last 24 hours.
    - A trial-specific lock screen.
    - Billing "Choose plan" sends an **UpgradeRequest**, which an admin approves or declines under
      "Plan requests" on `/admin`. Approval sets the plan and the expiry via `planPeriodEnd()`.
      This is the manual stand-in for a payment gateway, which the user explicitly doesn't want.
12. **Security fixes** (2026-09-26): all the 🔴/🟡/🟢 items below are now fixed. See the README's
    "Security notes".
13. **Self-healing dev tunnel** (2026-09-26): with `DEV_TUNNEL=cloudflared`, `server.ts` runs the
    quick tunnel itself (`lib/dev-tunnel.ts`) and re-syncs every webhook when the URL changes.
    **Gotcha:** calling `setWebhook` before the new hostname is in public DNS makes Telegram cache
    the miss for a long time, far longer than the 60s negative TTL. So the tunnel waits for
    DNS-over-HTTPS resolution first, retries with backoff, and moves to a fresh hostname if the
    retries all fail.
14. **Marketing screenshots re-captured** with a fictional demo account ("Acme Store",
    priya@acme-demo.example). The demo data was deleted afterwards.
15. **Brand name centralised** in `lib/brand.ts`, so a rename is a one-line change (plus the
    console prefix in `public/widget.js`).
16. **Homepage SEO rewrite + animated live-chat demo** (2026-09-26/27): copy, headings, FAQ and
    metadata rebuilt around real Google autocomplete phrases ("live chat widget", "add telegram
    chat to website"), and `components/LiveChatDemo.tsx` added as the section after the hero — a
    looping, scripted demo of a visitor arriving and being messaged first. It is the one place on
    the site with keyframe animation; it honours `prefers-reduced-motion` and pauses off-screen.
17. **Renamed Topicdesk → Chatshore** (2026-09-27), chosen from keyword research: "chat" is the
    dominant word people search, and "shore" matches the "the second they land" positioning.

## Pricing (as of now)

Three public plans, INR, monthly or yearly (yearly stored as the real yearly total in `Plan.priceYearlyINR`, not a monthly rate — `lib/plans.ts` has `yearlyMonthlyEquivalent()`/`yearlyDiscountPercent()` helpers so nothing duplicates the math):

| Plan  | Monthly | Yearly (≈/mo) | Chatbots | Visitors/mo | Live visitors shown | Dashboard chat |
|-------|---------|---------------|----------|-------------|----------------------|----------------|
| Free  | ₹0      | —             | 1        | 500         | 2                    | No             |
| Basic | ₹499    | ₹399 (20% off)| 5        | 3,000       | 10                   | No             |
| Pro   | ₹999    | ₹799 (20% off)| 10       | 10,000      | 100                  | Yes            |

**Free is a 3-day trial, not a permanent tier.** Registration sets `User.planExpiresAt` to +3 days. Once it passes:
- `accountBlockReason()` (`lib/plans.ts`) returns a trial-specific message.
- `requireActiveUser()` (`lib/auth.ts`) — a stricter version of `requireUser()` — returns 403 on every chatbot/live data route once blocked. Deliberately **not** applied to `/auth/me` or `/plans`, since the dashboard needs those to keep working to even show *why* it's blocked.
- The dashboard layout renders a non-dismissable `TrialLockOverlay` (no close button, no backdrop dismiss) over every route except `/dashboard/billing`, and doesn't mount the blocked page's children at all — so blocked pages never even fire their data-fetching effects.
- There is **no real payment gateway** — plan upgrades are admin-assigned manually. The billing page says this outright.

## Security posture (audited, fixed 2026-09-26)

All of the audit findings are fixed and were verified with real HTTP and socket tests:
- The weak `JWT_SECRET` was rotated, and production now refuses to boot with a weak one.
- Rate limiting everywhere.
- Constant-time login.
- `tokenVersion` revocation, bumped on password reset, suspension and re-seed.
- Socket auth now checks suspension, revocation and the trial lock.
- HS256 is pinned.
- Emails are normalized (the migration lowercased existing rows).
- bcrypt cost is 12.

The one remaining production item: change the seeded admin password (`admin12345`).

**Don't import `lib/auth.ts` or `lib/rate-limit.ts` from `server.ts`.** Anything that imports
`next/server` crashes the custom server at boot ("AsyncLocalStorage accessed in runtime where it
is not available"). Use `lib/session.ts` and `lib/rate-limit-core.ts` instead.

## Known bugs found and fixed this project (don't reintroduce)

- **Widget duplicate messages**: optimistic-render race between the visitor's own POST and the next poll tick. Fixed by rendering only from confirmed server responses + id-based dedup.
- **Invisible toggle knob**: ambiguous CSS static-position fallback pushed the knob outside its track. Fixed with explicit `left-0.5` + standard `translate-x-*`.
- **`handOffToHuman` always created a new Telegram topic**, even when a conversation already had one (re-handoff after a session restart would've spawned a duplicate topic). Fixed to reuse `conversation.topicId` if set.
- **Unread badge stopped working entirely** after the WebSocket migration: it compared an incoming message's id against `seenMessageId`, but `renderMessage()` (called just before the check) already mutated that variable to match, so the comparison was always false. Fixed with a dedicated `notifiedIds` set checked before rendering.
- **Telegram-relay replies never reached the widget/dashboard in real time** — only dashboard-chat replies were pushed over the socket; the Telegram webhook route only wrote the DB row. Fixed by emitting from the webhook route too.
- **CSS stacking-context bug** in the hero gradient background: negative-`z-index` layers painted behind the whole page instead of just behind the section, because the section itself wasn't a positioned stacking-context root. Fixed with `relative z-0`.
- **Pricing grid wrap**: 3-column grid only kicked in at the `lg` breakpoint, so windows between 640–1024px showed 2 cards then a lonely 3rd wrapped below. Fixed to go straight to 3 columns from `sm`.
- **`.next` build corruption**: running `npm run dev` (dev mode) and `npm run start` (production, via the custom server) at the same time against the same project corrupts the shared `.next` folder (missing `BUILD_ID`, stray `static/development` dir) — causes "client-side exception" errors across the *whole* app, not just one page. **Never run both at once.**

## Dev environment specifics

- **Local DB**: `prisma dev --name topicdesk --detach` (auto-started by `npm run dev`; the instance
  keeps its pre-rename name on purpose, since renaming it would strand the existing local data). If you see `P5010 Cannot fetch data from service`, the dev DB server has stopped (doesn't survive sleep/reboot) — just restart it.
- **Running the app**: `npm run build && npm run start` (production mode via the custom server) has been the pattern used throughout this session for testing, specifically to avoid the dev/prod `.next` collision above. Always check `ps aux | grep tsx` for a stray process before restarting.
- **Public HTTPS tunnel**: now automated (see item 13). Don't run a separate `cloudflared`
  alongside the server. History: Telegram's webhook needs a public HTTPS URL. Currently using a **free Cloudflare quick tunnel** (`cloudflared tunnel --url http://localhost:3000`) — these expire unpredictably (has happened ~5 times this session) and need: restart the tunnel → update `APP_URL` in `.env` → restart the app → re-register the Telegram webhook via the Bot API (`setWebhook`). ngrok was tried first and abandoned — its free-tier browser interstitial silently broke the widget's `<script>` tag load on mobile. **A named Cloudflare tunnel (needs the user's own domain) or a real deploy would fix this permanently** — offered, not yet done, since the user has no domain yet.
- **Admin login**: `admin@topicdesk.local` / `admin12345` (from `.env` `ADMIN_EMAIL`/`ADMIN_PASSWORD`, seeded via `prisma/seed.mjs`). Change before any real production use.
- **Verification discipline used throughout**: every non-trivial change was verified with real evidence — direct Prisma DB assertions, real HTTP requests against the running server, and real Playwright browser automation (Chromium via a fixed cached binary path at `~/Library/Caches/ms-playwright/chromium-1234/...`, since `npx playwright install` wasn't reliably available — `playwright` itself was installed transiently with `npm install --no-save playwright` and uninstalled after each verification pass). Scratch test scripts live briefly in the project root (`scratch-*.mjs`) and are deleted after use, along with any test DB rows they create.

## Open items / not yet done

- **Ubersuggest MCP**: working (authenticated 2026-09-26). It's on the **free tier**, which allows
  only about 3 reports a day in practice.
- **Register chatshore.com / .io / .co** — unregistered as of 2026-09-27, and this naming space was
  being bought up through 2025–26. Also still unrun: trademark searches (ipindia.gov.in and WIPO,
  classes 9, 38 and 42) and a check of social handles.
- **Seeded admin account** still uses `admin@topicdesk.local` (in `.env`, untracked). Cosmetic, but
  worth changing along with the default password before any real use.
- **Real payment gateway**: the user explicitly doesn't want one. Plan requests plus admin
  approval is the intended flow.

## Conventions this user has explicitly stated (don't relitigate)

- Terse, no unnecessary re-summarizing; act, verify with real evidence, report concisely.
- Explicit Save button *only* on the Appearance section; every other Settings field auto-saves on blur.
- Prefers being asked before large architecture-affecting decisions (e.g. serverless vs. traditional server) but wants forward momentum on everything else — reasonable defaults over asking, except for irreversible/architecture-defining calls.
- Wants real screenshots/browser verification for anything UI-related, not just type-checks.
