"use client";

import { useState } from "react";
import Link from "next/link";
import { formatLimit, formatPriceINR } from "@/lib/plans";
import type { PricingPlan } from "@/components/PricingCards";
import { trackEvent } from "@/lib/gtag";

/**
 * Feature-by-feature plan comparison.
 *
 * Only the first few rows show; the rest are clipped behind a fade with an
 * expand control, so the page isn't dominated by a wall of ticks before anyone
 * has decided they care.
 *
 * Numeric rows read from the plan rows in the database rather than being typed
 * out here, so changing a limit in /admin/plans can never leave this table
 * telling visitors something different from what they'd actually get.
 */

type Cell = string | boolean;

interface Row {
  label: string;
  /** Extra explanation, shown under the label. */
  note?: string;
  value: (plan: PricingPlan) => Cell;
}

interface Group {
  title: string;
  rows: Row[];
}

const GROUPS: Group[] = [
  {
    title: "Limits",
    rows: [
      { label: "Chatbots", value: (p) => formatLimit(p.maxChatbots) },
      {
        label: "Conversations a month",
        note: "One visitor can open more than one",
        value: (p) => formatLimit(p.maxMonthlyUsers),
      },
      { label: "Live visitors shown at once", value: (p) => String(p.maxLiveVisitors) },
      { label: "Team members answering", note: "Anyone you add to your Telegram group", value: () => "Unlimited" },
    ],
  },
  {
    title: "Chat widget",
    rows: [
      { label: "One-line install on any site", value: () => true },
      { label: "Conversations relayed to Telegram", note: "Each visitor gets their own topic", value: () => true },
      { label: "20 themes and a font choice", value: () => true },
      { label: "Unread badge and notification sound", value: () => true },
      { label: "Restrict the widget to your domains", value: () => true },
      { label: "Regenerate the widget key at any time", value: () => true },
    ],
  },
  {
    title: "Chatbot",
    rows: [
      { label: "No-code flow builder", value: () => true },
      { label: "Questions, buttons and branching", value: () => true },
      { label: "Hand off to a human in Telegram", value: () => true },
      { label: "Conversations restart after a quiet spell", value: () => true },
    ],
  },
  {
    title: "Live visitors",
    rows: [
      { label: "See who is browsing right now", value: () => true },
      { label: "Current page, referrer and scroll depth", value: () => true },
      { label: "Recent pages a visitor viewed", value: () => true },
      {
        label: "Message a visitor first",
        note: "Reply from the dashboard instead of Telegram",
        value: (p) => p.supportsDashboardChat,
      },
    ],
  },
  {
    title: "Analytics and billing",
    rows: [
      { label: "Visitor funnel and daily activity", value: () => true },
      { label: "Reply rate and first-reply time", value: () => true },
      { label: "Per-chatbot metrics", value: () => true },
      { label: "Yearly billing, 20% off", value: (p) => p.priceYearlyINR > 0 },
    ],
  },
];

/** Rows above the fold before expanding — the limits people compare first. */
const VISIBLE_ROWS = 4;

function Tick() {
  return (
    <span className="inline-flex" aria-label="Included">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
        <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Cross() {
  return (
    <span className="inline-flex text-ink-3" aria-label="Not included">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function CellValue({ value }: { value: Cell }) {
  if (typeof value === "boolean") return value ? <Tick /> : <Cross />;
  return <span className="metric text-[14px] font-medium">{value}</span>;
}

export default function PlanComparison({ plans }: { plans: PricingPlan[] }) {
  const [expanded, setExpanded] = useState(false);

  // Flatten so the cut-off can fall anywhere, including mid-group.
  const flat = GROUPS.flatMap((group) => [
    { kind: "group" as const, title: group.title },
    ...group.rows.map((row) => ({ kind: "row" as const, row })),
  ]);
  const cut = flat.findIndex((item, i) => flat.slice(0, i).filter((x) => x.kind === "row").length >= VISIBLE_ROWS);
  const shown = expanded ? flat : flat.slice(0, cut);
  const totalRows = flat.filter((item) => item.kind === "row").length;
  // Count feature rows only — group headings are not features.
  const hiddenRows = totalRows - VISIBLE_ROWS;

  return (
    <div className="mt-14">
      <h3 className="text-[19px] font-semibold tracking-[-0.02em]">Compare every feature</h3>

      {/* Horizontal scroll is contained here so a narrow screen never moves the
          whole page sideways. */}
      <div className="mt-5 -mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
        <div className="min-w-[640px]">
          {/* Header: plan names, price and a CTA per column. */}
          <div
            className="grid items-end gap-3 border-b border-line-strong pb-4"
            style={{ gridTemplateColumns: `minmax(200px,1.6fr) repeat(${plans.length}, minmax(96px,1fr))` }}
          >
            <span />
            {plans.map((plan) => (
              <div key={plan.id} className="text-center">
                <p className="text-[15px] font-semibold">{plan.name}</p>
                <p className="metric mt-0.5 text-[13px] text-ink-2">
                  {plan.priceINR === 0 ? "Free trial" : `${formatPriceINR(plan.priceINR)}/mo`}
                </p>
                <Link
                  href="/register"
                  onClick={() => trackEvent("cta_click", { location: "comparison_table", plan: plan.slug })}
                  className="mt-2 inline-block text-[13px] font-medium text-ink underline underline-offset-2 hover:text-ink-2"
                >
                  {plan.priceINR === 0 ? "Start free" : "Try free"}
                </Link>
              </div>
            ))}
          </div>

          {/* Rows, clipped while collapsed. */}
          <div className={`relative ${expanded ? "" : "max-h-[340px] overflow-hidden"}`}>
            {shown.map((item, i) =>
              item.kind === "group" ? (
                <p
                  key={`g-${item.title}`}
                  className="label-eyebrow border-b border-line bg-surface-sunken px-3 py-2.5"
                >
                  {item.title}
                </p>
              ) : (
                <div
                  key={`r-${i}`}
                  className="grid items-center gap-3 border-b border-line px-3 py-3"
                  style={{ gridTemplateColumns: `minmax(200px,1.6fr) repeat(${plans.length}, minmax(96px,1fr))` }}
                >
                  <div>
                    <p className="text-[14px] leading-snug">{item.row.label}</p>
                    {item.row.note && <p className="mt-0.5 text-[12.5px] text-ink-3">{item.row.note}</p>}
                  </div>
                  {plans.map((plan) => (
                    <div key={plan.id} className="flex justify-center">
                      <CellValue value={item.row.value(plan)} />
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Fade signalling there is more — the one place the site uses a
                gradient, because a hard cut reads as the end of the table. */}
            {!expanded && (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
                style={{ background: "linear-gradient(to bottom, rgb(255 255 255 / 0), rgb(255 255 255))" }}
              />
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          trackEvent("cta_click", { location: expanded ? "comparison_collapse" : "comparison_expand" });
          setExpanded((v) => !v);
        }}
        aria-expanded={expanded}
        className="btn-secondary btn-sm mt-5 inline-flex items-center gap-1.5"
      >
        {expanded ? "Show less" : `Compare all ${totalRows} features`}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {!expanded && hiddenRows > 0 && (
        <span className="ml-3 text-[13px] text-ink-3">{hiddenRows} more below</span>
      )}
    </div>
  );
}
