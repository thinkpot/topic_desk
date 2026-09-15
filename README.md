# Topicdesk — Telegram-powered chat widget SaaS

A live chat widget that website owners embed with one script tag. Every visitor conversation is
relayed into a Telegram group as its own **topic**, so replies from the group land back in the
visitor's chat window.

**Single Next.js app** — the marketing page, customer dashboard, admin panel and API (Route
Handlers) are one deployable unit, so it ships as a single Vercel project or runs as a single Node
server anywhere else (`next start`).

## Structure

```
app/
  page.tsx, login/, register/          Marketing page + auth
  dashboard/                           Customer dashboard
    page.tsx                             Metrics overview (funnel, activity, usage)
    chatbots/                            List, setup wizard, per-bot install/metrics/settings
    billing/                             Plan, usage meters, available plans
  admin/                               Admin panel (users, plans, platform overview)
  api/
    auth/{register,login,me}             Auth
    chatbots/                            CRUD, /verify (Telegram preflight),
                                         [id]/rotate-key, [id]/analytics
    analytics/                           Account-wide metrics
    plans/                               Public plan list
    admin/{users,plans,overview}         Admin-only endpoints
    widget/[apiKey]/{config,messages,track}   Public widget endpoints
    telegram/webhook/[chatbotId]         Telegram calls this on group replies
lib/                                   Prisma, JWT/session, plans, Telegram API, analytics, CORS
public/widget.js                       The embeddable widget (shadow DOM, no dependencies)
prisma/schema.prisma, seed.mjs         Data model + default plans / first admin
```

## How it works

1. An admin creates the customer's account and assigns a paid plan (or the customer signs up and
   is placed on the Free tier until an admin upgrades them).
2. The customer runs the setup wizard: it verifies the bot token, group access, Topics being
   enabled, and the bot's "Manage Topics" permission *before* saving anything.
3. The chatbot is created with a **publishable API key**, already baked into the embed snippet.
4. When a visitor sends their first message, a Telegram **forum topic** is created for them and
   the mapping (`chatbotId + visitorId ↔ topicId`) is stored; the message is relayed into it.
5. Telegram calls the webhook route when someone replies inside that topic; the widget picks the
   reply up on its next poll.

### API keys

Each chatbot has a key like `cw_live_a1b2…` that ships inside the customer's page markup. It
**identifies** a chatbot rather than authenticating a trusted caller — the same model as Stripe
publishable keys or an Intercom app ID. The actual access controls are:

- **Allowed domains** — a per-chatbot hostname allowlist checked against the request `Origin`.
- **Account state** — keys stop working the moment the owner is suspended, their plan expires, or
  they're moved to an unpaid tier.
- **Rotation** — "Regenerate" issues a new key and invalidates the old one immediately.

Only accounts on a paid, unexpired plan can create chatbots or hold working keys.

### Realtime: polling, not websockets

The widget polls `GET /api/widget/:apiKey/messages?visitorId=…&after=…` every ~3 seconds while
open. This is deliberate: Vercel runs each request as a short-lived, possibly-different function
instance, so a persistent Socket.io connection wouldn't reliably survive or broadcast across
instances. Polling behaves identically on Vercel and on a self-hosted Node server. The tradeoff is
a few seconds of latency before a reply appears.

### Metrics

`WidgetStat` keeps a daily per-chatbot rollup of impressions, so "how many people saw the widget"
is answerable without storing a row per page view. From that plus conversations and messages, the
dashboard derives the visitor funnel (seen → opened → chatted → replied), a daily activity series,
reply rate, and average first-reply time. Day bucketing uses UTC.

## Plans

Plans live in the **database**, not in code — admins change pricing and limits from
`/admin/plans` and they take effect immediately for every account on that plan.

| Plan  | Price     | Chatbots  | Visitors/month | Notes                          |
|-------|-----------|-----------|----------------|--------------------------------|
| Free  | ₹0        | 0         | 0              | Default for self-signup        |
| Basic | ₹1000/mo  | 1         | 3,000          |                                |
| Pro   | ₹3000/mo  | Unlimited | Unlimited      |                                |

"Unlimited" is stored as `2147483647` (Postgres `int4` max) so limit checks stay plain numeric
comparisons — see `lib/plans.ts`.

## Admin panel

At `/admin`, for users with `role = ADMIN`:

- **Overview** — accounts, live chatbots, chats this month, and monthly recurring revenue.
- **Users** — create accounts with a password and plan, change plan/expiry/role, suspend or
  restore access, delete. An admin can't demote, suspend or delete themselves.
- **Plans** — create and edit plans (price, limits, paid/unpaid tier, public visibility). A plan
  with accounts on it can't be deleted.

Since online payments aren't wired up, the admin panel is how customers get onto paid plans.

## Prerequisites for each customer's Telegram group

- A **supergroup** with **Topics** enabled (Group Settings → Topics).
- A bot from [@BotFather](https://t.me/BotFather), added to the group as **admin** with the
  **Manage Topics** permission.
- The group's chat ID (a negative number like `-1001234567890`).

The setup wizard walks through all of this and verifies each item before saving.

## Running locally

```bash
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, APP_URL
docker compose up -d        # starts local Postgres
npm install
npm run prisma:migrate      # creates the schema
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=your-password npm run prisma:seed
npm run dev                 # http://localhost:3000
```

The seed creates the Free/Basic/Pro plans, and creates an admin account when `ADMIN_EMAIL` and
`ADMIN_PASSWORD` are set (re-running it updates that account's password). It's safe to re-run.

**Important:** Telegram only delivers webhooks to an **HTTPS** URL. For local development, tunnel
the app (e.g. `ngrok http 3000`) and set `APP_URL` to the tunnel's HTTPS URL *before* creating a
chatbot, otherwise `setWebhook` will fail.

## Deploying to Vercel (single project)

1. Push this repo and import it into Vercel.
2. Set environment variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN` (optional), and
   `APP_URL` = your production URL (e.g. `https://your-app.vercel.app`).
3. Use a serverless-friendly, connection-pooled Postgres (Neon, Supabase, or Vercel Postgres) —
   API routes run as independent serverless invocations, so a database that handles many short
   concurrent connections well matters here.
4. Before the first deploy, apply the schema and seed:
   `DATABASE_URL=… npx prisma migrate deploy` then
   `DATABASE_URL=… ADMIN_EMAIL=… ADMIN_PASSWORD=… npx prisma db seed`
   (Vercel's build step only runs `prisma generate`.)
5. Deploy. The widget is served at `https://your-domain/widget.js`, which is what the dashboard's
   embed snippet points to.

## Deploying as a single traditional server

```bash
npm install && npm run build
npm run start   # serves dashboard, admin, API and widget on one port
```

Put it behind a reverse proxy for HTTPS and point `APP_URL` at that public URL.

## What's stubbed / needs production hardening

- **Payments**: the billing page lists plans but has no gateway. Wire up Razorpay or Stripe:
  create an order, verify the payment webhook server-side, then update `User.planId` /
  `planExpiresAt`. Until then, admins move accounts between plans.
- **Auth**: JWT in `localStorage`. For production, consider httpOnly cookies + refresh tokens.
- **Rate limiting**: none on the public widget endpoints (`messages`, `track`) — add per-IP or
  per-visitor limits before launch, since `track` increments counters on unauthenticated calls.
- **Password reset / email verification**: not implemented; admins set passwords directly.
- **Multiple agents per topic**: any group member who replies in a visitor's topic is relayed
  back to that visitor.
