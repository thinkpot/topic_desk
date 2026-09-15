# Telegram Chat Widget SaaS

A live chat widget that website owners embed with one script tag. Every visitor conversation is
relayed into a Telegram group as its own **topic**, so replies from the group are pushed back to
the visitor.

**Single Next.js app** — the dashboard (React/App Router) and the API (Route Handlers) are one
deployable unit, so it ships as a single Vercel project or runs as a single Node server anywhere
else (`next start`).

## Structure

```
app/
  page.tsx, login/, register/          Marketing page + auth
  dashboard/                           Dashboard UI (chatbot list, settings, billing)
  api/
    auth/{register,login,me}           Auth endpoints
    chatbots/[.../[id]]                Chatbot CRUD (dashboard-only, JWT-protected)
    widget/[chatbotId]/config          Public: widget bootstrap config
    widget/[chatbotId]/messages        Public: send + poll messages (see "Realtime" below)
    telegram/webhook/[chatbotId]       Telegram calls this on group replies
lib/                                   Prisma client, JWT, plans, Telegram API, CORS, domain check
public/widget.js                       The embeddable widget script itself
prisma/schema.prisma                   Data model
```

## How it works

1. A customer signs up on the dashboard, picks a plan, and creates a chatbot by pasting a
   Telegram **bot token** and their **group chat ID**.
2. The dashboard gives them a snippet: `<script src=".../widget.js" data-chatbot-id="...">`.
3. When a visitor sends their first message, the backend creates a Telegram **forum topic** in
   the group for that visitor (`createForumTopic`) and remembers the mapping
   (`chatbotId + visitorId <-> topicId`), then relays the message into it with `sendMessage`.
4. Telegram calls the webhook route whenever someone replies inside that topic; the reply is
   saved and picked up by the widget on its next poll.

### Realtime: polling, not websockets

The widget polls `GET /api/widget/:chatbotId/messages?visitorId=...&after=...` every ~3 seconds
while open, and posts new visitor messages to the same route. This is deliberate: Vercel (and
serverless generally) runs each request as a short-lived, possibly-different function instance,
so a persistent Socket.io connection wouldn't reliably survive or broadcast across instances.
Polling has no such requirement — it works identically on Vercel and on a single self-hosted
Node server. The tradeoff is a few seconds of latency before a reply appears, which is fine for
this kind of support widget.

## Plans

| Plan  | Price     | Chatbots  | Users/month |
|-------|-----------|-----------|-------------|
| Basic | ₹1000/mo  | 1         | 3,000       |
| Pro   | ₹3000/mo  | Unlimited | Unlimited   |

Limits are enforced server-side in `lib/plans.ts`, checked on chatbot creation and on each new
visitor conversation.

## Prerequisites for each customer's Telegram group

- A **supergroup** (not a basic group) with **Topics** enabled (Group Settings → Topics).
- A bot created via [@BotFather](https://t.me/BotFather), added to the group as **admin** with
  the "Manage Topics" permission.
- The group's chat ID (a negative number like `-1001234567890`).

The dashboard's "New chatbot" form walks the user through these steps.

## Running locally

```bash
cp .env.example .env        # fill in DATABASE_URL, JWT_SECRET, APP_URL
docker compose up -d        # starts local Postgres
npm install
npm run prisma:migrate
npm run dev                 # http://localhost:3000
```

**Important:** Telegram will only deliver webhooks to an **HTTPS** URL. For local development,
tunnel the app (e.g. `ngrok http 3000`) and set `APP_URL` to the tunnel's HTTPS URL *before*
creating a chatbot, otherwise `setWebhook` will fail.

## Deploying to Vercel (single project)

1. Push this repo and import it into Vercel.
2. Set environment variables in the Vercel project: `DATABASE_URL`, `JWT_SECRET`,
   `JWT_EXPIRES_IN` (optional), and `APP_URL` = your production URL
   (e.g. `https://your-app.vercel.app` or a custom domain).
3. Use a serverless-friendly, connection-pooled Postgres (Neon, Supabase, or Vercel Postgres) —
   API routes run as independent serverless invocations, so a database that handles many short
   concurrent connections well matters here. Plain long-lived TCP Postgres (e.g. a single
   `docker run postgres`) will exhaust connections under real traffic.
4. Before the first deploy, apply the schema to your production database:
   `DATABASE_URL=... npx prisma migrate deploy` (run this from your machine or a CI step —
   Vercel's build step only runs `prisma generate`, not `migrate deploy`).
5. Deploy. `npm run build` runs `prisma generate` automatically before `next build`
   (also wired via `postinstall` as a fallback).
6. The widget script is served at `https://your-domain/widget.js` — that's what the dashboard's
   embed snippet points to.

## Deploying as a single traditional server

Works the same way without Vercel:

```bash
npm install
npm run build
npm run start   # next start, serves both the dashboard and the API on one port
```

Put it behind a reverse proxy (Caddy/Nginx) for HTTPS, point `APP_URL` at that public URL, and
the Telegram webhook registration works exactly as it does on Vercel.

## What's stubbed / needs production hardening

- **Payments**: the billing page has plan cards and an "Upgrade" button with no gateway wired up.
  Wire it to Razorpay (common for INR pricing) or Stripe: create an order on click, verify the
  payment webhook server-side, then update `User.plan` / `planExpiresAt`.
- **Auth**: JWT is stored in `localStorage` for simplicity. For production, consider httpOnly
  cookies + refresh tokens to reduce XSS exposure.
- **Rate limiting / abuse protection**: none yet on the public widget endpoints — add per-IP or
  per-visitor rate limits before launch.
- **Email verification / password reset**: not implemented.
- **Multiple agents per topic**: currently any message typed in a visitor's topic (by any group
  member) is relayed back to that visitor.
