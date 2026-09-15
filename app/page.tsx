import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatLimit, formatPriceINR } from "@/lib/plans";

// Rendered per request so the build never needs a database connection.
export const dynamic = "force-dynamic";

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
    title: "Reply from Telegram",
    body: "Each visitor becomes a topic in your group. Answer from your phone — the reply lands back in their chat window.",
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
          <nav className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost btn-sm">
              Log in
            </Link>
            <Link href="/register" className="btn-primary btn-sm">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="label-eyebrow">Live chat · Telegram</p>
            <h1 className="mt-4 text-display sm:text-display-lg">
              Your website&apos;s chat,
              <br />
              answered from Telegram.
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-2">
              Every visitor who messages you opens their own topic in your Telegram group. Your team replies where
              they already are — no new inbox, no new app to check.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary px-6 py-3">
                Create an account
              </Link>
              <Link href="#how" className="btn-secondary px-6 py-3">
                See how it works
              </Link>
            </div>
            <p className="mt-4 text-[13px] text-ink-3">Setup takes about five minutes.</p>
          </div>

          <div className="relative">
            <div className="surface overflow-hidden shadow-card">
              <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                <span className="ml-2 text-[12px] text-ink-3">yourstore.com</span>
              </div>
              <div className="relative h-[290px] bg-surface-sunken p-4">
                <div className="absolute bottom-4 right-4 w-[228px] overflow-hidden rounded-lg border border-line bg-surface shadow-pop">
                  <div className="bg-ink px-3 py-2.5 text-[13px] font-medium text-white">Support</div>
                  <div className="space-y-2 p-3">
                    <p className="max-w-[85%] rounded-lg rounded-bl-[4px] border border-line bg-surface px-2.5 py-1.5 text-[12px] leading-snug">
                      Hi! How can we help you today?
                    </p>
                    <p className="ml-auto max-w-[85%] rounded-lg rounded-br-[4px] bg-ink px-2.5 py-1.5 text-[12px] leading-snug text-white">
                      Do you ship to Pune?
                    </p>
                    <p className="max-w-[85%] rounded-lg rounded-bl-[4px] border border-line bg-surface px-2.5 py-1.5 text-[12px] leading-snug">
                      Yes — 2 day delivery.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="surface absolute bottom-8 -left-5 hidden w-[210px] p-3 shadow-pop sm:block">
              <p className="label-eyebrow">Telegram group</p>
              <ul className="mt-2 space-y-1.5 text-[12.5px]">
                <li className="flex items-center justify-between gap-2">
                  <span className="truncate">Visitor · 8f21c4</span>
                  <span className="text-ink-3">now</span>
                </li>
                <li className="flex items-center justify-between gap-2 text-ink-3">
                  <span className="truncate">Visitor · 22ab90</span>
                  <span>3m</span>
                </li>
                <li className="flex items-center justify-between gap-2 text-ink-3">
                  <span className="truncate">Priya · 71dd02</span>
                  <span>1h</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="border-y border-line bg-plane">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-[28px] font-semibold tracking-[-0.025em]">Three steps to live chat</h2>
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
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-[28px] font-semibold tracking-[-0.025em]">Pricing</h2>
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
                <li className="flex justify-between">
                  <span className="text-ink-2">Telegram topics</span>
                  <span className="font-medium">Included</span>
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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-[13px] text-ink-3">
          <span>Topicdesk</span>
          <div className="flex gap-5">
            <Link href="/login" className="hover:text-ink">
              Log in
            </Link>
            <Link href="/register" className="hover:text-ink">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
