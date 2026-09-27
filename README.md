# Chatshore — Telegram-powered chat widget SaaS

A live chat widget that website owners embed with one script tag. Every visitor conversation is
relayed into a Telegram group as its own **topic**, so replies from the group land back in the
visitor's chat window.

**Single Next.js app** — the marketing page, customer dashboard, admin panel and API (Route
Handlers) are one deployable unit, run by a single always-on Node server (`server.ts`, which also
hosts Socket.io).

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
prisma.config.ts                       Prisma CLI config (schema path, seed command)
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

### Realtime: Socket.io, with HTTP polling as a fallback

`server.ts` is a custom Node server that runs Next.js and a Socket.io server in one process. The
widget uses the socket for presence heartbeats and instant replies, and falls back to polling
`GET /api/widget/:apiKey/messages` every ~3 seconds if the socket can't connect (blocked CDN,
strict CSP). **This needs an always-on Node server — serverless platforms such as Vercel can't hold
the socket connections open.**

### Metrics

`WidgetStat` keeps a daily per-chatbot rollup of impressions, so "how many people saw the widget"
is answerable without storing a row per page view. From that plus conversations and messages, the
dashboard derives the visitor funnel (seen → opened → chatted → replied), a daily activity series,
reply rate, and average first-reply time. Day bucketing uses UTC.

## Plans

Plans live in the **database**, not in code — admins change pricing and limits from
`/admin/plans` and they take effect immediately for every account on that plan.

| Plan  | Monthly | Yearly (≈/mo) | Chatbots | Visitors/month | Live visitors | Dashboard chat |
|-------|---------|---------------|----------|----------------|---------------|----------------|
| Free  | ₹0 — a 3-day trial, no card | — | 1 | 500 | 2 | No |
| Basic | ₹499    | ₹399          | 5        | 3,000          | 10            | No             |
| Pro   | ₹999    | ₹799          | 10       | 10,000         | 100           | Yes            |

### Free trial and upgrades (no payment gateway)

Every signup gets a 3-day trial on the Free plan, with no payment details collected
(`TRIAL_DAYS` in `lib/plans.ts`). The dashboard shows an onboarding checklist, which is worked out
from real data (bot connected → widget seen → first chat → first reply), and a trial countdown.
When the trial ends, the account is locked everywhere except Billing. There the customer
**requests** a plan. The request shows up under **Plan requests** in `/admin`, and approving it
moves the account onto that plan for one billing period. Invoicing happens outside the app.

"Unlimited" is stored as `2147483647` (Postgres `int4` max) so limit checks stay plain numeric
comparisons — see `lib/plans.ts`.

## Admin panel

At `/admin`, for users with `role = ADMIN`:

- **Overview** — accounts, live chatbots, chats this month, and monthly recurring revenue.
- **Users** — create accounts with a password and plan, change plan/expiry/role, suspend or
  restore access, delete. An admin can't demote, suspend or delete themselves.
- **Plans** — create and edit plans (price, limits, paid/unpaid tier, public visibility). A plan
  with accounts on it can't be deleted.

- **Plan requests** (on the overview) — approve or decline customers' plan requests. Since online
  payments aren't wired up, approving a request is how customers get onto paid plans.

## Prerequisites for each customer's Telegram group

- A **supergroup** with **Topics** enabled (Group Settings → Topics).
- A bot from [@BotFather](https://t.me/BotFather), added to the group as **admin** with the
  **Manage Topics** permission.
- The group's chat ID (a negative number like `-1001234567890`).

The setup wizard walks through all of this and verifies each item before saving.

## Database

**Prisma Postgres in both environments** — the same engine locally and in production, so nothing
is exercised in dev that differs in prod.

- **Local:** `npx prisma dev` runs a local Prisma Postgres server (no Docker needed).
- **Production:** a Prisma Postgres database from [console.prisma.io](https://console.prisma.io).

Both hand you a `prisma+postgres://…` connection string for `DATABASE_URL`.

Note the schema relies on Postgres features — three enums, `@db.Date`, `date_trunc` /
`EXTRACT(EPOCH …)` in the analytics queries, and case-insensitive search — so SQLite is not a
drop-in alternative (Prisma rejects enums on SQLite outright).

## Running locally

```bash
npm install

npx prisma dev --name topicdesk --detach   # start local Prisma Postgres
npx prisma dev ls                          # prints DATABASE_URL

cp .env.example .env                       # paste that DATABASE_URL, set JWT_SECRET
npm run prisma:migrate                     # creates the schema
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=your-password npm run prisma:seed
npm run dev                                # http://localhost:3000
```

The seed creates the Free/Basic/Pro plans, and creates an admin account when `ADMIN_EMAIL` and
`ADMIN_PASSWORD` are set (re-running it updates that account's password). It's safe to re-run.

The local database server does **not** survive a reboot or sleep. `npm run dev` starts it for you
(it's a no-op if already running), but if you run the app another way (`npm start`) and see
`P5010 Cannot fetch data from service: fetch failed`, the server is down — run `npm run db:start`.
Its data and URL persist across restarts.

Managing the local database server: `npm run db:start` / `npm run db:stop`, `npx prisma dev ls`
(status and URL), `npx prisma dev rm --name topicdesk` (delete it and its data).

The local instance is still called `topicdesk` (the name predates the rename to Chatshore). It's
just a local handle — renaming it would point `npm run dev` at a new, empty database and strand
the existing local data, so it's left alone deliberately.

Prisma config lives in [`prisma.config.ts`](prisma.config.ts). Because that file exists, the
Prisma CLI no longer auto-loads `.env`, so the config imports `dotenv/config` itself — Next.js
still loads `.env` on its own at runtime.

**Important:** Telegram only delivers webhooks to an **HTTPS** URL. For local development, set
`DEV_TUNNEL="cloudflared"` (requires `brew install cloudflared`). The server then:

- runs a Cloudflare quick tunnel itself,
- waits for the new hostname to appear in public DNS,
- sets `APP_URL` to the tunnel URL,
- re-registers every chatbot's webhook.

If the tunnel dies or stops responding, it is restarted and the webhooks are re-synced
automatically. On startup the server also re-syncs webhooks against a fixed `APP_URL`.

## Deploying as a single traditional server

```bash
npm install && npm run build
npm run start   # serves dashboard, admin, API and widget on one port
```

Put it behind a reverse proxy for HTTPS and point `APP_URL` at that public URL.

## Security notes

- **JWT_SECRET**: production refuses to start with a placeholder or anything under 32 characters.
- **Tokens**: HS256 only. Each token carries `User.tokenVersion`, so a password reset, suspension or
  deletion revokes every earlier token, and also disconnects the user's open dashboard sockets.
  The Socket.io handshake runs the same checks as REST, including suspension and trial lock.
- **Rate limiting**: in-memory fixed windows (`lib/rate-limit-core.ts`) cover:
  - login, per IP and per account
  - register
  - the Telegram verify step
  - plan requests
  - every public widget endpoint
  - socket heartbeats

  `server.ts` resolves the client IP itself and trusts proxy headers only from a loopback proxy.
  If you run more than one instance, move the counters to Redis.
- **Login**: unknown emails still run a bcrypt compare (cost 12), so response timing doesn't
  reveal which accounts exist. Emails are trimmed and lowercased everywhere.

## Still to do

- **Payments**: approving plan requests is manual. Wiring a gateway later means creating the
  order, verifying the payment webhook, and then running the same update the approve route does.
- **Password reset / email verification**: not implemented; admins set passwords directly.
- **Auth storage**: JWT in `localStorage`. Consider httpOnly cookies before a wider launch.
