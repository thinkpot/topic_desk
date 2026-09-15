# Telegram Chat Widget SaaS

A live chat widget that website owners embed with one script tag. Every visitor conversation is
relayed into a Telegram group as its own **topic**, so replies from the group are pushed back to
the visitor in real time.

## Structure

```
backend/    Node.js + Express + Prisma (Postgres) + Socket.io API, and the embeddable widget.js
frontend/   Next.js dashboard: signup/login, chatbot management, embed code, plan/usage
```

## How it works

1. A customer signs up on the dashboard, picks a plan, and creates a chatbot by pasting a
   Telegram **bot token** and their **group chat ID**.
2. The dashboard gives them a snippet: `<script src=".../widget.js" data-chatbot-id="...">`.
3. When a visitor opens the widget on the customer's site, the backend creates a Telegram
   **forum topic** in the group for that visitor (via `createForumTopic`) and remembers the
   mapping (`chatbotId + visitorId <-> topicId`).
4. Visitor messages are sent to the backend over a websocket, saved, and relayed into that topic
   with `sendMessage` (`message_thread_id` = the topic).
5. Telegram calls the backend's webhook whenever someone replies inside that topic; the backend
   looks up the conversation by `topicId` and pushes the message back to the visitor's browser
   over the same websocket.

## Plans

| Plan  | Price     | Chatbots  | Users/month |
|-------|-----------|-----------|-------------|
| Basic | ₹1000/mo  | 1         | 3,000       |
| Pro   | ₹3000/mo  | Unlimited | Unlimited   |

Limits are enforced server-side in `backend/src/lib/plans.ts`, checked on chatbot creation and on
each new visitor conversation.

## Prerequisites for each customer's Telegram group

- A **supergroup** (not a basic group) with **Topics** enabled (Group Settings → Topics).
- A bot created via [@BotFather](https://t.me/BotFather), added to the group as **admin** with
  the "Manage Topics" permission.
- The group's chat ID (a negative number like `-1001234567890`).

The dashboard's "New chatbot" form walks the user through these steps.

## Running locally

### Backend

```bash
cd backend
cp .env.example .env      # fill in DATABASE_URL, JWT_SECRET, PUBLIC_BASE_URL
docker compose up -d      # starts local Postgres
npm install
npm run prisma:migrate
npm run dev                # http://localhost:4000
```

**Important:** Telegram will only deliver webhooks to an **HTTPS** URL. For local development,
tunnel the backend (e.g. `ngrok http 4000`) and set `PUBLIC_BASE_URL` to the tunnel's HTTPS URL
before creating a chatbot, otherwise `setWebhook` will fail.

### Frontend

```bash
cd frontend
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                         # http://localhost:3000
```

## What's stubbed / needs production hardening

- **Payments**: the billing page has plan cards and an "Upgrade" button with no gateway wired up.
  Wire it to Razorpay (common for INR pricing) or Stripe: create an order on click, verify the
  payment webhook server-side, then update `User.plan` / `planExpiresAt`.
- **Auth**: JWT is stored in `localStorage` for simplicity. For production, consider httpOnly
  cookies + refresh tokens to reduce XSS exposure.
- **Rate limiting / abuse protection**: none yet on the public widget/socket endpoints — add
  per-IP or per-visitor rate limits before launch.
- **Email verification / password reset**: not implemented.
- **Multiple agents per topic**: currently any message typed in a visitor's topic (by any group
  member) is relayed back to that visitor.
