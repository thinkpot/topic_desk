import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { formatLimit, formatPriceINR } from "@/lib/plans";

// Rendered per request so the build never needs a database connection.
export const dynamic = "force-dynamic";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const STEPS = [
  {
    title: "Connect a Telegram group",
    body: "Point the setup wizard at a bot token and a group with Topics turned on. It checks every permission before you finish.",
  },
  {
    title: "Paste one line of code",
    body: "Your chatbot comes with its own key baked into the snippet. Drop it on your site and the widget appears.",
  },
  {
    title: "Reply from Telegram — or your dashboard",
    body: "Each visitor becomes a topic in your group. Answer from your phone, or turn on dashboard chat to reply without leaving the app.",
  },
];

const PRODUCTIVITY_ICON_PROPS = {
  width: 40,
  height: 40,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const PRODUCTIVITY_BENEFITS = [
  {
    title: "Cut first-response time to seconds",
    body: "Every message opens a topic in Telegram or lands in your dashboard the instant it's sent — no refreshing, no missed pings.",
    icon: (
      <svg {...PRODUCTIVITY_ICON_PROPS}>
        <path d="m22 2-7 20-4-9-9-4 20-7z" />
      </svg>
    ),
  },
  {
    title: "Turn browsers into conversations",
    body: "See who's on your site right now and reach out first, instead of waiting for them to find the chat bubble.",
    icon: (
      <svg {...PRODUCTIVITY_ICON_PROPS}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
      </svg>
    ),
  },
  {
    title: "Let the bot handle the repetitive part",
    body: "A no-code flow builder answers the first few questions and only hands off to a human once it's actually needed.",
    icon: (
      <svg {...PRODUCTIVITY_ICON_PROPS}>
        <circle cx="6" cy="6" r="2.2" />
        <circle cx="6" cy="18" r="2.2" />
        <circle cx="18" cy="12" r="2.2" />
        <path d="M8.2 6h3.8a4 4 0 0 1 4 4v0M8.2 18h3.8a4 4 0 0 0 4-4v0" />
      </svg>
    ),
  },
];

const FEATURES = [
  {
    icon: "🔀",
    title: "Flow builder",
    body: "Start, Message, Question, Buttons, Condition, Handoff, End — drag them onto a canvas and wire them up. No code, no YAML.",
  },
  {
    icon: "📍",
    title: "Live visitor analytics",
    body: "Current page, scroll depth, referrer, and recent path for every visitor browsing right now, capped and gated by plan.",
  },
  {
    icon: "🎨",
    title: "20 themes, your font",
    body: "10 light and 10 dark themes, plus font selection — the widget matches your site instead of looking bolted on.",
  },
  {
    icon: "⚡",
    title: "Real-time delivery",
    body: "Built on WebSockets: replies, presence, and live analytics push instantly — no waiting on the next refresh.",
  },
];

const FAQS = [
  {
    q: "Do I need to set up a Telegram bot from scratch?",
    a: "You need a bot token from @BotFather and a group with Topics turned on — that's it. The setup wizard checks every permission before your chatbot goes live.",
  },
  {
    q: "Does this work on my site builder?",
    a: "Yes. It's one script tag with your API key baked in — WordPress, Shopify, Webflow, Wix, or plain HTML all work the same way, no build step required.",
  },
  {
    q: "Can I automate answers before a human gets involved?",
    a: "Yes — the flow builder lets you greet visitors, ask a couple of qualifying questions, and only hand off to a human (via Telegram or your dashboard) once it's actually needed.",
  },
  {
    q: "What's the difference between Telegram replies and dashboard chat?",
    a: "By default, every conversation opens a topic in your Telegram group and your team replies there. Dashboard chat (Premium) replaces that with a live inbox right in the app, including the ability to message a visitor before they've said anything.",
  },
  {
    q: "How many visitors can I see live at once?",
    a: "Basic shows your 10 most recent live visitors; Premium shows up to 100, plus the real total if you're over that.",
  },
  {
    q: "Is there a limit on chatbots or conversations?",
    a: "Basic includes one chatbot and 3,000 visitor conversations a month. Premium is unlimited on both.",
  },
];

async function getPlans() {
  try {
    return await prisma.plan.findMany({ where: { isPublic: true }, orderBy: { sortOrder: "asc" } });
  } catch {
    return [];
  }
}

export default async function Home() {
  const plans = await getPlans();

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <span className="text-[17px] font-semibold tracking-[-0.02em]">Topicdesk</span>
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-[13.5px] font-medium text-ink-2 hover:text-ink">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost btn-sm">
              Log in
            </Link>
            <Link href="/register" className="btn-primary btn-sm">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-0 overflow-hidden">
        {/* Soft gradient wash + dotted grid, behind everything in this section only. */}
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,#e9e4fb_0%,#f3ecf4_45%,#fbe8e0_100%)]" />
        <div className="absolute inset-0 -z-10 opacity-[0.35] [background-image:radial-gradient(#00000030_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="pointer-events-none absolute -right-16 top-16 -z-10 h-72 w-72 rounded-full bg-gradient-to-br from-[#8f7ff2] to-[#6d4aff] opacity-60 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-[38%] -z-10 h-64 w-64 rounded-full bg-gradient-to-br from-[#ffb199] to-[#ff8a65] opacity-60 blur-3xl" />

        <div className="mx-auto max-w-6xl px-6 pb-16 pt-20 sm:pt-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <h1 className="text-[40px] font-extrabold leading-[1.08] tracking-[-0.02em] sm:text-[52px]">
                Supercharge your website support with{" "}
                <span className="text-[#6d4aff]">Telegram</span>
              </h1>
              <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-ink-2">
                Every visitor who messages you opens their own topic in your Telegram group. Your team replies where
                they already are — no new inbox, no new app to check.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="rounded-lg bg-ink px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#2b2b2b]">
                  Get started
                </Link>
                <a href="#how" className="rounded-lg border border-ink/60 bg-white/50 px-6 py-3 text-[15px] font-medium text-ink backdrop-blur transition-colors hover:bg-white/80">
                  Learn more
                </a>
              </div>
              <p className="mt-4 text-[13px] text-ink-3">Setup takes about five minutes. No credit card required.</p>
            </div>

            <Image
              src="/chatbox.png"
              alt="Live chat conversation preview"
              width={1448}
              height={1086}
              priority
              className="w-full max-w-[480px] justify-self-center"
            />
          </div>

          <p className="mt-20 text-center text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-2">
            Built for growing support teams
          </p>
        </div>
      </section>

      {/* Productivity benefits */}
      <section className="border-y border-line bg-plane">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-[30px] font-bold leading-tight tracking-[-0.025em] sm:text-[34px]">
              Small changes that elevate your <span className="text-[#6d4aff]">customer support productivity</span>
            </h2>
          </div>
          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {PRODUCTIVITY_BENEFITS.map((b) => (
              <div key={b.title} className="text-center">
                <div className="mx-auto flex h-32 w-full max-w-[220px] items-center justify-center rounded-xl bg-surface-sunken text-ink-2">
                  {b.icon}
                </div>
                <h3 className="mt-5 text-[17px] font-semibold">{b.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <p className="label-eyebrow">Setup</p>
        <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.025em]">Three steps to live chat</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title}>
              <span className="metric flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-[17px] font-semibold">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-line bg-plane">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="label-eyebrow">Everything included</p>
          <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.025em]">More than a chat bubble</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="surface p-6">
                <span className="text-[26px]">{f.icon}</span>
                <h3 className="mt-3 text-[15.5px] font-semibold">{f.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Works everywhere */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="label-eyebrow">Compatibility</p>
        <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.025em]">Works on any website</h2>
        <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-ink-2">
          One script tag, no build step. If you can paste HTML before <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-[13px]">&lt;/body&gt;</code>,
          it works.
        </p>
        <div className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-3">
          {["WordPress", "Shopify", "Webflow", "Wix", "Squarespace", "Plain HTML"].map((platform) => (
            <span key={platform} className="rounded-full border border-line bg-surface px-4 py-2 text-[13.5px] font-medium text-ink-2">
              {platform}
            </span>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-y border-line bg-plane">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <p className="label-eyebrow">Questions</p>
          <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.025em]">Frequently asked</h2>
          <div className="mt-8 divide-y divide-line border-t border-line">
            {FAQS.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15.5px] font-medium text-ink">
                  {item.q}
                  <span className="shrink-0 text-ink-3 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <p className="label-eyebrow">Pricing</p>
        <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.025em]">Simple, per account</h2>
        <p className="mt-2 text-[15px] text-ink-2">Billed monthly. Cancel whenever you like.</p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:max-w-3xl">
          {plans.map((plan, i) => (
            <div
              key={plan.id}
              className={`surface p-7 ${i === plans.length - 1 ? "ring-1 ring-ink" : ""}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-semibold">{plan.name}</h3>
                {i === plans.length - 1 && (
                  <span className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-medium text-white">
                    Most complete
                  </span>
                )}
              </div>
              <p className="metric mt-3 text-[34px] font-semibold tracking-[-0.03em]">
                {formatPriceINR(plan.priceINR)}
                {plan.priceINR > 0 && <span className="text-[15px] font-normal text-ink-3">/month</span>}
              </p>
              {plan.description && <p className="mt-2 text-[14px] text-ink-2">{plan.description}</p>}
              <ul className="mt-6 space-y-2.5 text-[14px]">
                <li className="flex justify-between border-b border-line pb-2.5">
                  <span className="text-ink-2">Chatbots</span>
                  <span className="metric font-medium">{formatLimit(plan.maxChatbots)}</span>
                </li>
                <li className="flex justify-between border-b border-line pb-2.5">
                  <span className="text-ink-2">Visitors / month</span>
                  <span className="metric font-medium">{formatLimit(plan.maxMonthlyUsers)}</span>
                </li>
                <li className="flex justify-between border-b border-line pb-2.5">
                  <span className="text-ink-2">Live visitors shown</span>
                  <span className="metric font-medium">{plan.maxLiveVisitors}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-ink-2">Dashboard chat</span>
                  <span className="font-medium">{plan.supportsDashboardChat ? "Included" : "—"}</span>
                </li>
              </ul>
              <Link href="/register" className="btn-primary mt-7 w-full">
                Get started
              </Link>
            </div>
          ))}
          {plans.length === 0 && (
            <p className="text-sm text-ink-3">Pricing is being updated — please check back shortly.</p>
          )}
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div>
              <span className="text-[15px] font-semibold tracking-[-0.02em]">Topicdesk</span>
              <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-ink-3">
                A live chat widget that hands every conversation to your Telegram group, or your dashboard.
              </p>
            </div>
            <div className="flex gap-12">
              <div>
                <p className="label-eyebrow">Product</p>
                <div className="mt-3 flex flex-col gap-2 text-[13.5px] text-ink-2">
                  <a href="#features" className="hover:text-ink">Features</a>
                  <a href="#how" className="hover:text-ink">How it works</a>
                  <a href="#pricing" className="hover:text-ink">Pricing</a>
                </div>
              </div>
              <div>
                <p className="label-eyebrow">Account</p>
                <div className="mt-3 flex flex-col gap-2 text-[13.5px] text-ink-2">
                  <Link href="/login" className="hover:text-ink">Log in</Link>
                  <Link href="/register" className="hover:text-ink">Create account</Link>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-10 text-[12.5px] text-ink-3">© {new Date().getFullYear()} Topicdesk. All rights reserved.</p>
        </div>
      </footer>

      {/* Dogfooding: talk to visitors of our own marketing site through our own product.
          The API key is env-driven (set in the deployment's own dashboard) rather than
          hardcoded, since each deployment has its own database and its own chatbot. */}
      {env.supportChatbotApiKey && (
        <script src="/widget.js" data-api-key={env.supportChatbotApiKey} async />
      )}
    </div>
  );
}
