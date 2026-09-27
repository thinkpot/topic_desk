"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A scripted, looping demo of the product's headline moment: a visitor lands on
 * the customer's site, appears in the Live tab within a second, and the owner
 * opens the conversation before the visitor ever clicks the chat bubble.
 *
 * The whole thing runs off one elapsed-milliseconds clock — every element reads
 * that number and flips a class. Keeping the schedule in `CUE` means the
 * timeline can be retimed in one place, rather than drifting apart across a
 * dozen nested setTimeouts.
 */

const CUE = {
  pageIn: 400,
  visitorRow: 1300,
  detail: 2100,
  scrollStart: 2700,
  scrollEnd: 4300,
  typeStart: 4600,
  typeEnd: 7000,
  send: 7250,
  widgetOpen: 7850,
  agentBubble: 8350,
  visitorTyping: 9600,
  visitorReply: 10900,
  telegram: 11900,
};
const TOTAL_MS = 15200;

// With reduced motion the clock never runs; it parks here, on the finished
// conversation, so the section still shows what the product does.
const STILL_FRAME = 12600;

const AGENT_TEXT = "Hi! Anything I can help with?";
const VISITOR_TEXT = "Yes — do you have annual billing?";

const SCROLL_TO = 38;

const CAPTIONS = [
  { at: 0, title: "They land on your site", body: "The widget says hello to our server the moment the page loads." },
  { at: CUE.visitorRow, title: "You see them live", body: "Page, referrer and scroll depth, before they've typed a word." },
  { at: CUE.typeStart, title: "You message first", body: "Open the conversation from the dashboard instead of waiting." },
  { at: CUE.visitorReply, title: "They reply, in Telegram too", body: "Their answer lands in your group as its own topic." },
];

/** Eased 0→1 progress across a cue window, for values that ramp rather than flip. */
function ramp(elapsed: number, from: number, to: number): number {
  const t = Math.min(Math.max((elapsed - from) / (to - from), 0), 1);
  return t * t * (3 - 2 * t);
}

/**
 * Drives the clock with rAF, but only while the section is on screen and the
 * tab is visible — an off-screen marketing animation shouldn't burn a frame
 * budget on someone's laptop.
 */
function useDemoClock(ref: React.RefObject<HTMLElement>) {
  const [elapsed, setElapsed] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduced) {
      setElapsed(STILL_FRAME);
      return;
    }
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    let startedAt = 0;
    let visible = false;

    function tick(now: number) {
      if (!startedAt) startedAt = now;
      setElapsed((now - startedAt) % TOTAL_MS);
      frame = requestAnimationFrame(tick);
    }
    function play() {
      if (frame || !visible || document.hidden) return;
      startedAt = 0;
      frame = requestAnimationFrame(tick);
    }
    function pause() {
      cancelAnimationFrame(frame);
      frame = 0;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) play();
        else pause();
      },
      { threshold: 0.25 }
    );
    observer.observe(node);

    const onVisibility = () => (document.hidden ? pause() : play());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      pause();
    };
  }, [ref, reduced]);

  return elapsed;
}

function Reveal({
  show,
  children,
  className = "",
}: {
  show: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`transition-[opacity,transform] duration-500 ease-out ${
        show ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="demo-dot h-1.5 w-1.5 rounded-full bg-ink-3"
          style={{ animationDelay: `${i * 140}ms` }}
        />
      ))}
    </span>
  );
}

/** The visitor's screen: a site with the chat widget sitting in the corner. */
function VisitorBrowser({ elapsed }: { elapsed: number }) {
  const scrolled = ramp(elapsed, CUE.scrollStart, CUE.scrollEnd) * SCROLL_TO;
  const widgetOpen = elapsed >= CUE.widgetOpen;

  return (
    <div className="surface flex h-[368px] flex-col overflow-hidden shadow-card">
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface-sunken px-3 py-2.5">
        <span className="h-2 w-2 rounded-full bg-line-strong" />
        <span className="h-2 w-2 rounded-full bg-line-strong" />
        <span className="h-2 w-2 rounded-full bg-line-strong" />
        <span className="ml-1.5 truncate rounded bg-surface px-2 py-1 text-[10.5px] text-ink-3">
          acmestore.example/pricing
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden bg-surface px-5 pt-5">
        {/* Skeleton of the customer's own page — deliberately abstract so the
            eye goes to the widget, not to invented page content. */}
        <Reveal show={elapsed >= CUE.pageIn}>
          <div
            className="space-y-3 transition-transform duration-700 ease-out"
            style={{ transform: `translateY(-${scrolled * 0.9}px)` }}
          >
            <div className="h-2.5 w-24 rounded-full bg-ink" />
            <div className="h-2 w-full rounded-full bg-line" />
            <div className="h-2 w-4/5 rounded-full bg-line" />
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2 rounded-md border border-line p-2.5">
                  <div className="h-1.5 w-8 rounded-full bg-line-strong" />
                  <div className="h-3 w-10 rounded-full bg-ink" />
                  <div className="h-1.5 w-full rounded-full bg-line" />
                  <div className="h-1.5 w-2/3 rounded-full bg-line" />
                </div>
              ))}
            </div>
            <div className="h-2 w-full rounded-full bg-line" />
            <div className="h-2 w-3/4 rounded-full bg-line" />
          </div>
        </Reveal>

        {/* Chat widget, in the product's default Daylight theme. */}
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2.5">
          <Reveal show={widgetOpen} className={widgetOpen ? "" : "pointer-events-none"}>
            <div className="w-[208px] overflow-hidden rounded-lg border border-line bg-surface shadow-pop">
              <div className="flex items-center gap-2 bg-ink px-3 py-2.5 text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                <span className="text-[11px] font-medium">Acme Store</span>
              </div>
              <div className="min-h-[104px] space-y-2 bg-plane p-2.5">
                <Reveal show={elapsed >= CUE.agentBubble}>
                  <p className="w-fit max-w-[88%] rounded-lg rounded-bl-[4px] border border-line bg-surface px-2.5 py-1.5 text-[10.5px] leading-snug text-ink shadow-card">
                    {AGENT_TEXT}
                  </p>
                </Reveal>
                <Reveal show={elapsed >= CUE.visitorReply}>
                  <p className="ml-auto w-fit max-w-[88%] rounded-lg rounded-br-[4px] bg-ink px-2.5 py-1.5 text-[10.5px] leading-snug text-white">
                    {VISITOR_TEXT}
                  </p>
                </Reveal>
              </div>
              <div className="border-t border-line px-2.5 py-2">
                <div className="flex h-6 items-center rounded border border-line-strong px-2 text-[10px] text-ink-3">
                  {elapsed >= CUE.visitorTyping && elapsed < CUE.visitorReply ? <TypingDots /> : "Write a message…"}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Launcher, with the unread badge the real widget shows. */}
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white shadow-pop">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 5h16v11H9l-5 4V5z" strokeLinejoin="round" />
              </svg>
            </div>
            <span
              className={`absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface text-[9px] font-semibold text-ink ring-2 ring-ink transition-[opacity,transform] duration-300 ${
                elapsed >= CUE.send && !widgetOpen ? "scale-100 opacity-100" : "scale-75 opacity-0"
              }`}
            >
              1
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The owner's screen: the Live tab, with the visitor arriving in real time. */
function OwnerDashboard({ elapsed }: { elapsed: number }) {
  const arrived = elapsed >= CUE.visitorRow;
  const scrollPct = Math.round(ramp(elapsed, CUE.scrollStart, CUE.scrollEnd) * SCROLL_TO);
  const typed = AGENT_TEXT.slice(
    0,
    Math.round(ramp(elapsed, CUE.typeStart, CUE.typeEnd) * AGENT_TEXT.length)
  );
  const composing = elapsed >= CUE.typeStart && elapsed < CUE.send;

  return (
    <div className="surface flex h-[368px] flex-col overflow-hidden shadow-card">
      <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface-sunken px-4 py-2.5">
        <span className="text-[11px] font-medium text-ink-2">Live visitors</span>
        <span className="metric flex items-center gap-1.5 text-[11px] text-ink-3">
          <span
            className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
              arrived ? "bg-positive" : "bg-line-strong"
            }`}
          />
          {arrived ? "1 online" : "0 online"}
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden px-4 py-3.5">
        {/* Empty state, swapped out the instant the visitor's first heartbeat lands. */}
        <p
          className={`absolute inset-x-4 top-14 text-center text-[12px] text-ink-3 transition-opacity duration-300 ${
            arrived ? "opacity-0" : "opacity-100"
          }`}
        >
          Nobody browsing right now.
        </p>

        <Reveal show={arrived}>
          <div className="rounded-md border border-line bg-surface-sunken px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[12px] font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                Visitor · 8f21c4
              </span>
              <span
                className={`rounded-full border border-line-strong px-2 py-0.5 text-[10px] text-ink-2 transition-opacity duration-500 ${
                  elapsed < CUE.send ? "opacity-100" : "opacity-0"
                }`}
              >
                just arrived
              </span>
            </div>
            <Reveal show={elapsed >= CUE.detail} className="mt-2">
              <dl className="grid grid-cols-3 gap-2 text-[10.5px]">
                {[
                  ["On", "/pricing"],
                  ["From", "google.com"],
                  ["Scrolled", `${scrollPct}%`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-ink-3">{label}</dt>
                    <dd className="metric mt-0.5 truncate font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </Reveal>

        <div className="mt-3 space-y-2">
          <Reveal show={elapsed >= CUE.send}>
            <p className="ml-auto w-fit max-w-[80%] rounded-lg rounded-br-[4px] bg-ink px-2.5 py-1.5 text-[11px] leading-snug text-white">
              {AGENT_TEXT}
            </p>
          </Reveal>
          {elapsed >= CUE.visitorTyping && elapsed < CUE.visitorReply && (
            <span className="inline-flex rounded-lg rounded-bl-[4px] border border-line bg-surface px-3 py-2 shadow-card">
              <TypingDots />
            </span>
          )}
          <Reveal show={elapsed >= CUE.visitorReply}>
            <p className="w-fit max-w-[80%] rounded-lg rounded-bl-[4px] border border-line bg-surface px-2.5 py-1.5 text-[11px] leading-snug text-ink shadow-card">
              {VISITOR_TEXT}
            </p>
          </Reveal>
          <Reveal show={elapsed >= CUE.telegram}>
            <p className="flex items-center gap-1.5 pt-0.5 text-[10.5px] text-ink-3">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Also in your Telegram group, as its own topic
            </p>
          </Reveal>
        </div>
      </div>

      {/* Composer: the proactive message being typed, then sent. */}
      <div className="shrink-0 border-t border-line px-4 py-3">
        <div
          className={`flex items-center gap-2 rounded-md border bg-surface px-2.5 py-2 transition-colors duration-300 ${
            composing ? "border-ink" : "border-line-strong"
          }`}
        >
          <span className="min-h-[14px] flex-1 truncate text-[11px] text-ink">
            {composing ? (
              <>
                {typed}
                <span className="demo-caret ml-px inline-block h-3 w-px translate-y-[2px] bg-ink" />
              </>
            ) : (
              <span className="text-ink-3">Message this visitor…</span>
            )}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-[10.5px] font-medium transition-colors duration-300 ${
              composing ? "bg-ink text-white" : "bg-surface-sunken text-ink-3"
            }`}
          >
            Send
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LiveChatDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const elapsed = useDemoClock(ref);
  const activeCaption = CAPTIONS.reduce((active, caption, i) => (elapsed >= caption.at ? i : active), 0);

  return (
    <div ref={ref}>
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div>
          <p className="label-eyebrow mb-2.5">On your visitor&apos;s screen</p>
          <VisitorBrowser elapsed={elapsed} />
        </div>
        <div>
          <p className="label-eyebrow mb-2.5">In your dashboard</p>
          <OwnerDashboard elapsed={elapsed} />
        </div>
      </div>

      {/* Narrates the animation, and carries the same content for anyone who
          never sees it move (reduced motion, or a crawler reading the markup). */}
      <ol className="mt-10 grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {CAPTIONS.map((caption, i) => {
          const active = i === activeCaption;
          return (
            <li key={caption.title} className="border-t-2 pt-3.5 transition-colors duration-500"
              style={{ borderColor: active ? "var(--ink)" : "var(--line)" }}
            >
              <h3
                className={`text-[14px] font-semibold transition-colors duration-500 ${
                  active ? "text-ink" : "text-ink-3"
                }`}
              >
                {caption.title}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{caption.body}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
