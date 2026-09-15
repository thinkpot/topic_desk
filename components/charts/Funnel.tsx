"use client";

import type { FunnelStage } from "@/lib/analytics";

// Ordinal ramp: one hue, light -> dark by stage depth.
const STAGE_COLORS = ["var(--funnel-1)", "var(--funnel-2)", "var(--funnel-3)", "var(--funnel-4)"];

const STAGE_HINTS: Record<string, string> = {
  views: "People who loaded a page with your widget",
  opens: "People who clicked the chat bubble",
  conversations: "People who sent a first message",
  replied: "Chats where someone replied from Telegram",
};

export default function Funnel({ stages }: { stages: FunnelStage[] }) {
  const top = stages[0]?.count ?? 0;

  return (
    <section className="surface p-5">
      <h2 className="text-base font-semibold">Visitor journey</h2>
      <p className="mt-0.5 text-[13px] text-ink-3">Where visitors drop off between seeing the widget and chatting.</p>

      {top === 0 ? (
        <p className="mt-6 text-sm text-ink-3">
          No widget traffic yet. Once the snippet is live on your site, this fills in automatically.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {stages.map((stage, i) => (
            <li key={stage.key}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-medium">{stage.label}</span>
                <span className="metric shrink-0 text-sm">
                  {stage.count.toLocaleString("en-IN")}
                  <span className="ml-2 text-ink-3">{stage.pctOfTop}%</span>
                </span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-[4px] bg-surface-sunken">
                <div
                  className="h-full rounded-[4px]"
                  style={{
                    width: `${Math.max(stage.pctOfTop, stage.count > 0 ? 1.5 : 0)}%`,
                    background: STAGE_COLORS[i % STAGE_COLORS.length],
                  }}
                />
              </div>
              <p className="mt-1 text-[12.5px] text-ink-3">{STAGE_HINTS[stage.key]}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
