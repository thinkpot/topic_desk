import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import PricingCards from "@/components/PricingCards";

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
    body: "Your chatbot comes with its own key baked into the snippet. Drop it on your site and the live chat widget appears.",
  },
  {
    title: "Reply from Telegram — or your dashboard",
    body: "Each visitor becomes a chat inside your Telegram group. Answer from your phone, or turn on dashboard chat to reply without leaving the app.",
  },
];

const ICON_PROPS = {
  width: 32,
  height: 32,
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
    body: "Every message opens a chat in Telegram or lands in your dashboard the instant it's sent — no refreshing, no missed pings.",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="m22 2-7 20-4-9-9-4 20-7z" />
      </svg>
    ),
  },
  {
    title: "Turn browsers into conversations",
    body: "See who's on your website right now and reach out first, instead of waiting for them to find the chat bubble.",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
      </svg>
    ),
  },
  {
    title: "Let the chatbot handle the repetitive part",
    body: "A no-code flow builder answers the first few questions and only hands off to a human once it's actually needed.",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="6" cy="6" r="2.2" />
        <circle cx="6" cy="18" r="2.2" />
        <circle cx="18" cy="12" r="2.2" />
        <path d="M8.2 6h3.8a4 4 0 0 1 4 4v0M8.2 18h3.8a4 4 0 0 0 4-4v0" />
      </svg>
    ),
  },
];

const LIVE_ANALYTICS_CARDS = [
  {
    title: "Real-time presence",
    body: "Pushed over WebSockets the instant a visitor lands or leaves your website — no polling, no refresh button.",
    icon: (
      <svg {...ICON_PROPS} width={26} height={26}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
      </svg>
    ),
  },
  {
    title: "Page & scroll tracking",
    body: "Current page, scroll depth, referrer, and recent browsing path for every live visitor on your site right now.",
    icon: (
      <svg {...ICON_PROPS} width={26} height={26}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 4v5" />
      </svg>
    ),
  },
  {
    title: "Message them first",
    body: "On Premium, reach out to a visitor who's still just browsing — straight from the dashboard, before they've said a word.",
    icon: (
      <svg {...ICON_PROPS} width={26} height={26}>
        <path d="M4 4h16v12H8l-4 4V4z" />
      </svg>
    ),
  },
];

const FEATURES = [
  {
    title: "No-code flow builder",
    body: "Start, Message, Question, Buttons, Condition, Handoff, End — drag them onto a canvas and wire up a chatbot. No code, no YAML.",
    visual: (
      <div className="flex flex-col items-center gap-1.5">
        <div className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-[12px] font-medium shadow-card">
          Start
        </div>
        <div className="h-4 w-px bg-line-strong" />
        <div className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-[12px] font-medium shadow-card">
          Message
        </div>
        <div className="h-4 w-px bg-line-strong" />
        <div className="rounded-lg border border-line-strong bg-ink px-4 py-2 text-[12px] font-medium text-white shadow-card">
          Hand off
        </div>
      </div>
    ),
  },
  {
    title: "Live visitor analytics",
    body: "Current page, scroll depth, referrer, and recent path for every visitor browsing your website right now, gated by plan.",
    visual: (
      <div className="w-full max-w-[200px] space-y-2">
        <div className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2 text-[11.5px] shadow-card">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" />
            Visitor · 8f21c4
          </span>
          <span className="text-ink-3">now</span>
        </div>
        <div className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2 text-[11.5px] text-ink-3">
          <span>Visitor · 22ab90</span>
          <span>3m</span>
        </div>
        <div className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2 text-[11.5px] text-ink-3">
          <span>Priya · 71dd02</span>
          <span>1h</span>
        </div>
      </div>
    ),
  },
  {
    title: "20 themes, your font",
    body: "10 light and 10 dark themes, plus font selection — the chat widget matches your site instead of looking bolted on.",
    visual: (
      <div className="space-y-3">
        <div className="flex gap-2">
          {["#ffffff", "#f7f3ec", "#eef2fb", "#fbe9e2", "#eafaf0"].map((c) => (
            <span key={c} className="h-8 w-8 rounded-full border border-line-strong" style={{ background: c }} />
          ))}
        </div>
        <div className="flex gap-2">
          {["#0a0a0a", "#171923", "#1c1440", "#1a1a1a", "#111827"].map((c) => (
            <span key={c} className="h-8 w-8 rounded-full border border-line-strong" style={{ background: c }} />
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Real-time delivery",
    body: "Built on WebSockets: replies, presence, and live analytics push instantly — no waiting on the next refresh.",
    visual: (
      <div className="w-full max-w-[200px] space-y-2">
        <p className="ml-auto max-w-[80%] rounded-lg rounded-br-[4px] bg-ink px-3 py-2 text-[11.5px] text-white shadow-card">
          Do you ship to Pune?
        </p>
        <p className="flex max-w-[85%] items-center gap-1.5 rounded-lg rounded-bl-[4px] border border-line bg-surface px-3 py-2 text-[11.5px] shadow-card">
          <span aria-hidden>⚡</span> Yes — 2 day delivery.
        </p>
      </div>
    ),
  },
];

const FAQS = [
  {
    q: "What is a Telegram chat widget?",
    a: "It's a live chat widget you add to your website that sends every visitor message straight into a Telegram group instead of a separate inbox. Topicdesk is one of these: each visitor gets their own chat inside your group, so your team replies from Telegram itself.",
  },
  {
    q: "Do I need to set up a Telegram bot from scratch?",
    a: "You need a bot token from @BotFather and a group with Topics turned on — that's it. The setup wizard checks every permission before your chatbot goes live.",
  },
  {
    q: "Does this live chat widget work on my site builder?",
    a: "Yes. It's one script tag with your API key baked in — WordPress, Shopify, Webflow, Wix, or plain HTML all work the same way, no build step required.",
  },
  {
    q: "Can the chatbot answer questions before a human gets involved?",
    a: "Yes — the no-code flow builder lets you greet visitors, ask a couple of qualifying questions, and only hand off to a human (via Telegram or your dashboard) once it's actually needed.",
  },
  {
    q: "What's the difference between Telegram replies and dashboard chat?",
    a: "By default, every conversation opens a chat in your Telegram group and your team replies there. Dashboard chat (Premium) replaces that with a live inbox right in the app, including the ability to message a visitor before they've said anything.",
  },
  {
    q: "How many live visitors can I see at once?",
    a: "Basic shows your 10 most recent live visitors; Premium shows up to 100, plus the real total if you're over that.",
  },
  {
    q: "Is there a limit on chatbots or conversations?",
    a: "Free includes one chatbot and 500 visitor conversations a month. Basic includes five chatbots and 3,000 visitor conversations a month. Premium includes 10 chatbots and 10,000 visitor conversations a month.",
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

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

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
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="label-eyebrow">Live chat widget · Telegram integration</p>
            <h1 className="mt-4 text-display sm:text-display-lg">
              A live chat widget for your website,
              <br />
              powered by Telegram.
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-2">
              Every visitor who messages you opens their own chat inside your Telegram group. Your support team
              replies from an app they already use — no new inbox, no new app to check.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary px-6 py-3">
                Create an account
              </Link>
              <a href="#how" className="btn-secondary px-6 py-3">
                See how it works
              </a>
            </div>
            <p className="mt-4 text-[13px] text-ink-3">Setup takes about five minutes. No credit card required.</p>
          </div>

          <Image
            src="/chatbox.png"
            alt="Live chat widget conversation preview, relayed to a Telegram group"
            width={1448}
            height={1086}
            priority
            className="w-full max-w-[480px] justify-self-center"
          />
        </div>
      </section>


      {/* Live analytics showcase */}
      <section className="border-y border-line bg-plane">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="label-eyebrow">Live visitor tracking</p>
              <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.025em]">
                See who&apos;s on your website in real time
              </h2>
            </div>
            <p className="text-[15px] leading-relaxed text-ink-2">
              Everyone currently browsing a site with your widget installed, updated in real time over WebSockets —
              current page, scroll depth, and recent path, whether or not they&apos;ve said a word.
            </p>
          </div>

          <div className="surface mx-auto mt-10 max-w-5xl overflow-hidden shadow-card">
            <div className="flex items-center gap-2 border-b border-line bg-surface-sunken px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
              <span className="ml-2 text-[12px] text-ink-3">Live visitors</span>
            </div>
            <Image
              src="/live_analytics.png"
              alt="The Live tab: a visitor's current page, scroll depth, recent path, and conversation transcript"
              width={3468}
              height={2056}
              className="w-full"
            />
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-3">
            {LIVE_ANALYTICS_CARDS.map((c) => (
              <div key={c.title} className="surface p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-surface-sunken text-ink-2">
                  {c.icon}
                </span>
                <h3 className="mt-4 text-[15.5px] font-semibold">{c.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flow builder showcase */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="label-eyebrow">No-code chatbot builder</p>
        <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.025em]">
          Build a no-code chatbot flow for your website
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-ink-2">
          Greet a visitor, ask a qualifying question, branch on the answer, hand off to a human — wire it all up on a
          canvas, no developer required.
        </p>

        <div className="surface mx-auto mt-10 max-w-5xl overflow-hidden shadow-card">
          <div className="flex items-center gap-2 border-b border-line bg-surface-sunken px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="ml-2 text-[12px] text-ink-3">Flow builder</span>
          </div>
          <Image
            src="/flowbuilder.png"
            alt="The no-code flow builder canvas: Start, Message, Question, Question, Hand off to Telegram"
            width={3500}
            height={2058}
            className="w-full"
          />
        </div>

        <div className="mt-8">
          <Link href="/register" className="btn-primary px-6 py-3">
            Create an account
          </Link>
          <p className="mt-3 text-[13px] text-ink-3">Setup takes about five minutes. No credit card required.</p>
        </div>
      </section>

      {/* Productivity benefits */}
      <section className="border-y border-line bg-plane">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="label-eyebrow">Why teams switch</p>
            <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.025em]">
              Everything you need to run support from Telegram
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
        <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.025em]">
          Three steps to add live chat to your website
        </h2>
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
          <div className="text-center">
            <p className="label-eyebrow">Everything included</p>
            <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.025em]">More than a chat bubble</h2>
          </div>
          <div className="mx-auto mt-14 grid max-w-3xl gap-x-10 gap-y-14 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="text-center">
                <h3 className="text-[16px] font-semibold">{f.title}</h3>
                <p className="mx-auto mt-1.5 max-w-[280px] text-[13.5px] leading-relaxed text-ink-2">{f.body}</p>
                <div className="mx-auto mt-5 flex aspect-square w-full max-w-[240px] items-center justify-center rounded-2xl border border-line bg-surface p-6">
                  {f.visual}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Works everywhere */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="label-eyebrow">Compatibility</p>
        <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.025em]">
          Works with the platforms you already use
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-ink-2">
          One script tag, no plugin, no build step. If your site can run HTML before{" "}
          <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-[13px]">&lt;/body&gt;</code>, it works.
        </p>

        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-3">
          {[
            "WordPress",
            "Shopify",
            "Webflow",
            "Wix",
            "Squarespace",
            "BigCommerce",
            "Ghost",
            "Framer",
            "Joomla",
            "Drupal",
            "Carrd",
            "Plain HTML",
          ].map((platform) => (
            <span
              key={platform}
              className="rounded-xl border border-line bg-surface px-5 py-3 text-[14px] font-medium text-ink shadow-card"
            >
              {platform}
            </span>
          ))}
        </div>

        <Link href="/register" className="btn-primary mt-10 px-6 py-3">
          Add it to your site
        </Link>
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
        <p className="mt-2 text-[15px] text-ink-2">Cancel whenever you like.</p>

        {plans.length > 0 ? (
          <PricingCards plans={plans} />
        ) : (
          <p className="mt-10 text-sm text-ink-3">Pricing is being updated — please check back shortly.</p>
        )}
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div>
              <span className="text-[15px] font-semibold tracking-[-0.02em]">Topicdesk</span>
              <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-ink-3">
                A Telegram-powered live chat widget for websites, with a no-code chatbot builder and real-time
                visitor analytics.
              </p>
            </div>
            <div className="flex gap-12">
              <div>
                <p className="label-eyebrow">Product</p>
                <div className="mt-3 flex flex-col gap-2 text-[13.5px] text-ink-2">
                  <a href="#features" className="hover:text-ink">
                    Features
                  </a>
                  <a href="#how" className="hover:text-ink">
                    How it works
                  </a>
                  <a href="#pricing" className="hover:text-ink">
                    Pricing
                  </a>
                </div>
              </div>
              <div>
                <p className="label-eyebrow">Account</p>
                <div className="mt-3 flex flex-col gap-2 text-[13.5px] text-ink-2">
                  <Link href="/login" className="hover:text-ink">
                    Log in
                  </Link>
                  <Link href="/register" className="hover:text-ink">
                    Create account
                  </Link>
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
      {env.supportChatbotApiKey && <script src="/widget.js" data-api-key={env.supportChatbotApiKey} async />}
    </div>
  );
}
