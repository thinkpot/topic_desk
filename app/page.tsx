import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import PricingCards from "@/components/PricingCards";
import LiveChatDemo from "@/components/LiveChatDemo";
import Logo, { LogoLockup } from "@/components/Logo";
import { BRAND_NAME } from "@/lib/brand";

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
    title: "Connect your Telegram group",
    body: "Paste a bot token from @BotFather and pick a group with Topics turned on. The setup wizard checks every permission before anything goes live.",
  },
  {
    title: "Embed the chat widget on your website",
    body: "Copy one script tag with your key already in it and paste it before </body>. The live chat widget appears on every page.",
  },
  {
    title: "Reply from Telegram, on any device",
    body: "Each visitor gets their own topic in your group. Your team answers from the Telegram app on phone or desktop, and the reply shows up in the visitor's chat window.",
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
    title: "Answer in seconds, not hours",
    body: "Visitor messages arrive as Telegram notifications on the phone your team already carries, so nobody has to sit watching a support inbox.",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="m22 2-7 20-4-9-9-4 20-7z" />
      </svg>
    ),
  },
  {
    title: "Turn visitors into conversations",
    body: "See who's on your website right now and which page they're reading, so you can step in while they're still deciding.",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
      </svg>
    ),
  },
  {
    title: "Let a chatbot take the first questions",
    body: "A no-code chatbot greets visitors, collects their name or order number, and only brings in a person once it's needed.",
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
    title: "Live visitor list",
    body: "Visitors appear the moment they land on your website and drop off when they leave. No refresh button needed.",
    icon: (
      <svg {...ICON_PROPS} width={26} height={26}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
      </svg>
    ),
  },
  {
    title: "Page, source and scroll depth",
    body: "For each live visitor: the page they're on, where they came from, how far they've scrolled, and the pages they viewed before.",
    icon: (
      <svg {...ICON_PROPS} width={26} height={26}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 4v5" />
      </svg>
    ),
  },
  {
    title: "Message visitors first",
    body: "On Pro, start a chat with a visitor who's still browsing, straight from the dashboard, before they've typed anything.",
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
    body: "Drag Message, Question, Buttons, Condition and Hand-off blocks onto a canvas to build a chatbot. No coding needed.",
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
    title: "Live visitor tracking",
    body: "See every visitor browsing your website right now: current page, referrer, scroll depth and recent path.",
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
    title: "A chat widget that matches your site",
    body: "Choose from 10 light and 10 dark themes and pick a font, so the chat box looks like part of your website.",
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
    title: "Instant replies",
    body: "Replies from Telegram appear in the visitor's chat window within seconds, with a sound and an unread badge if they've switched tabs.",
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
    q: "What is a live chat widget?",
    a: `A live chat widget is the chat box in the corner of a website that lets visitors message the business in real time. ${BRAND_NAME} is a live chat widget that delivers those messages to your Telegram group, so your team replies from Telegram instead of logging in to another support inbox.`,
  },
  {
    q: "How do I add Telegram chat to my website?",
    a: "Create a bot with @BotFather, add it as an admin to a Telegram group with Topics turned on, and connect both in the setup wizard. The wizard checks the permissions, then gives you one script tag to paste before </body>. Most people are live in about five minutes.",
  },
  {
    q: "How does live chat work on a website with Telegram?",
    a: "When a visitor sends their first message, the bot opens a new topic for them in your Telegram group and posts the message there. Anyone in the group can reply inside that topic, and the reply shows up in the visitor's chat window within seconds. Every visitor gets their own topic, so conversations never mix.",
  },
  {
    q: "Does the chat widget work on WordPress, Shopify, Wix and Squarespace?",
    a: "Yes. It's one script tag rather than a plugin, so it works on WordPress, Shopify, Wix, Squarespace, Webflow, Framer, Ghost and plain HTML, anywhere you can add code before </body>.",
  },
  {
    q: "Can a chatbot answer before a person steps in?",
    a: "Yes. The no-code chatbot builder lets you greet visitors, ask questions such as their name or order number, offer buttons, branch on the answers, and hand off to your team only when it's needed.",
  },
  {
    q: "How is this different from tawk.to and other live chat tools?",
    a: "Most live chat tools make your team answer from their own inbox app. Here, conversations go to the Telegram group your team already has open on phone and desktop. There's nothing new to install, and Telegram's notifications do the alerting.",
  },
  {
    q: "Is a live chat widget safe to add to my site?",
    a: "The widget runs inside its own isolated container, so it can't break your page styles. Each chatbot's key only works on the domains you allow, and you can generate a new key at any time. Your bot token stays on our servers and is never sent to the browser.",
  },
  {
    q: "Can I reply from a dashboard instead of Telegram?",
    a: "Yes, on the Pro plan. Dashboard chat lets you reply from the Live tab without creating Telegram topics, and you can message a visitor before they've said anything.",
  },
  {
    q: "How many live visitors can I see at once?",
    a: "The free trial shows 2 live visitors at a time, Basic shows 10 and Pro shows 100, plus the real total if more people are on your site.",
  },
  {
    q: "How does the free trial work? Do I need a credit card?",
    a: "No card and no payment details, just your name, email and a password. The 3-day trial includes one chatbot, up to 500 visitor chats, the flow builder and live visitor tracking. When it ends your chatbot pauses and your setup and chat history are kept. Pick a plan from Billing to switch it back on.",
  },
  {
    q: "How much does it cost?",
    a: "Basic is ₹499 a month for 5 chatbots and 3,000 visitor chats a month. Pro is ₹999 a month for 10 chatbots, 10,000 visitor chats and dashboard chat. Paying yearly saves 20%.",
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

  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: BRAND_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "A live chat widget for websites that delivers every visitor conversation to a Telegram group, with a no-code chatbot builder and live visitor tracking.",
    offers: plans
      .filter((p) => p.priceINR > 0)
      .map((p) => ({ "@type": "Offer", name: p.name, price: p.priceINR, priceCurrency: "INR" })),
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />

      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <LogoLockup />
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
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="label-eyebrow">Telegram live chat widget</p>
            <h1 className="mt-4 text-display sm:text-display-lg">
              Add Telegram live chat to your website.
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-2">
              A chat widget for your website that sends every visitor&apos;s message to your Telegram group, each in its
              own topic. Your team replies from Telegram on their phone, and the answer appears on your site.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary px-6 py-3">
                Start your free trial
              </Link>
              <a href="#how" className="btn-secondary px-6 py-3">
                See how it works
              </a>
            </div>
            <p className="mt-4 text-[13px] text-ink-3">Free for 3 days. No credit card, no payment details.</p>
          </div>

          <Image
            src="/chatbox.png"
            alt="A website chat widget conversation, with the visitor's messages delivered to a Telegram group topic"
            width={1448}
            height={1086}
            priority
            className="w-full max-w-[480px] justify-self-center"
          />
        </div>
      </section>


      {/* Flagship feature: catching a visitor the moment they arrive. */}
      <section id="live" className="border-y border-line bg-plane">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="label-eyebrow">Live chat, the moment they arrive</p>
            <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.025em] sm:text-[32px]">
              Chat with website visitors the second they land
            </h2>
            <p className="mt-3.5 text-[15.5px] leading-relaxed text-ink-2">
              You don&apos;t have to wait for someone to find the chat bubble. Every visitor shows up in your dashboard
              as they arrive — so you can say hello while they&apos;re still on the page.
            </p>
          </div>

          <div className="mt-12">
            <LiveChatDemo />
          </div>
        </div>
      </section>

      {/* Live analytics showcase */}
      <section className="border-y border-line bg-plane">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <p className="label-eyebrow">The live dashboard</p>
              <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.025em]">
                Every live visitor, with the context to help them
              </h2>
            </div>
            <p className="text-[15px] leading-relaxed text-ink-2">
              The Live tab as it actually looks: everyone browsing right now, the pages they moved through, and the
              full conversation alongside — so you open with something useful.
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
              width={3500}
              height={2058}
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
          Build a website chatbot without writing code
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-ink-2">
          Greet visitors, ask for their name or order number, offer buttons and branch on the answers. When a person is
          needed, the chat moves to your Telegram group with everything the bot collected.
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
            alt="The no-code flow builder canvas: Start, Message, Question, Buttons with three choices, Question, Hand off to Telegram"
            width={3500}
            height={2058}
            className="w-full"
          />
        </div>

        <div className="mt-8">
          <Link href="/register" className="btn-primary px-6 py-3">
            Start your free trial
          </Link>
          <p className="mt-3 text-[13px] text-ink-3">Free for 3 days. No credit card, no payment details.</p>
        </div>
      </section>

      {/* Productivity benefits */}
      <section className="border-y border-line bg-plane">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="label-eyebrow">Live chat for small business</p>
            <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.025em]">
              Run customer support from Telegram
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
          How to add live chat to your website in three steps
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
            <p className="label-eyebrow">Features</p>
            <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.025em]">More than a chat bubble</h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-ink-2">
              Every plan, including the free trial, comes with the chatbot builder, live visitor tracking and all 20
              widget themes.
            </p>
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
          Live chat for WordPress, Shopify, Wix and more
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-[15px] leading-relaxed text-ink-2">
          One script tag, no plugin to install and no build step. If your site lets you add HTML before{" "}
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
        <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.025em]">Simple pricing, in rupees</h2>
        <p className="mt-2 text-[15px] text-ink-2">
          Start with a 3-day free trial, with no card needed. Pay monthly or yearly, and cancel whenever you like.
        </p>

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
              <span className="inline-flex items-center gap-2">
                <Logo size={22} />
                <span className="text-[15px] font-semibold tracking-[-0.02em]">{BRAND_NAME}</span>
              </span>
              <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-ink-3">
                A Telegram live chat widget for websites, with a no-code chatbot builder and live visitor tracking.
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
              <div>
                <p className="label-eyebrow">Legal</p>
                <div className="mt-3 flex flex-col gap-2 text-[13.5px] text-ink-2">
                  <Link href="/terms" className="hover:text-ink">
                    Terms
                  </Link>
                  <Link href="/privacy" className="hover:text-ink">
                    Privacy
                  </Link>
                  <Link href="/refunds" className="hover:text-ink">
                    Refunds
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-10 text-[12.5px] text-ink-3">© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</p>
        </div>
      </footer>

      {/* Dogfooding: talk to visitors of our own marketing site through our own product.
          The API key is env-driven (set in the deployment's own dashboard) rather than
          hardcoded, since each deployment has its own database and its own chatbot. */}
      {env.supportChatbotApiKey && <script src="/widget.js" data-api-key={env.supportChatbotApiKey} async />}
    </div>
  );
}
