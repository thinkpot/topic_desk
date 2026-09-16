import type { WidgetTheme, WidgetFont } from "@/lib/widget-appearance";

/** A static mockup matching the real widget's markup/styling, for the dashboard. */
export default function WidgetPreview({ theme, font }: { theme: WidgetTheme; font: WidgetFont }) {
  return (
    <div
      className="w-full max-w-[300px] overflow-hidden rounded-[14px] border shadow-pop"
      style={{ borderColor: theme.agentBubbleBorder, fontFamily: font.stack }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ background: theme.accent }}>
        <div>
          <p className="text-[14px] font-semibold leading-tight" style={{ color: theme.accentText }}>
            Chat with us
          </p>
          <p className="mt-0.5 text-[11px] leading-tight opacity-70" style={{ color: theme.accentText }}>
            Replies land in your chat here
          </p>
        </div>
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[13px]"
          style={{ color: theme.accentText, background: "rgba(255,255,255,.14)" }}
        >
          ✕
        </div>
      </div>

      <div className="flex flex-col gap-2 px-3.5 py-4" style={{ background: theme.messageArea }}>
        <div
          className="max-w-[80%] self-start rounded-[12px] rounded-bl-[4px] border px-3 py-2 text-[13px]"
          style={{ background: theme.agentBubbleBg, borderColor: theme.agentBubbleBorder, color: theme.agentBubbleText }}
        >
          Hi! How can we help you today?
        </div>
        <div
          className="max-w-[80%] self-end rounded-[12px] rounded-br-[4px] px-3 py-2 text-[13px]"
          style={{ background: theme.accent, color: theme.accentText }}
        >
          Do you ship to Pune?
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-3" style={{ background: theme.surface }}>
        <div
          className="flex-1 rounded-md border px-3 py-2 text-[13px]"
          style={{ background: theme.inputBg, borderColor: theme.inputBorder, color: theme.mutedText }}
        >
          Write a message…
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[13px]"
          style={{ background: theme.accent, color: theme.accentText }}
        >
          ➤
        </div>
      </div>
      <p className="px-3 pb-2.5 text-center text-[10.5px]" style={{ background: theme.surface, color: theme.mutedText }}>
        We usually reply within a few minutes
      </p>
    </div>
  );
}
