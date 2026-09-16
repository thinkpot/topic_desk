"use client";

import { useState } from "react";
import { WIDGET_THEMES, WIDGET_FONTS, getTheme, getFont, ALL_GOOGLE_FONTS_URL } from "@/lib/widget-appearance";
import WidgetPreview from "./WidgetPreview";

export default function ThemeFontPicker({
  themeKey,
  fontKey,
  onChange,
}: {
  themeKey: string;
  fontKey: string;
  onChange: (next: { widgetTheme?: string; widgetFont?: string }) => void;
}) {
  const activeTheme = getTheme(themeKey);
  const [mode, setMode] = useState<"light" | "dark">(activeTheme.mode);
  const activeFont = getFont(fontKey);

  const themesInMode = WIDGET_THEMES.filter((t) => t.mode === mode);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <link rel="stylesheet" href={ALL_GOOGLE_FONTS_URL} />
      <div>
        <div className="flex items-center gap-1 rounded-md border border-line bg-surface p-1" style={{ width: "fit-content" }}>
          {(["light", "dark"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded px-3 py-1.5 text-[13px] font-medium capitalize transition-colors ${
                mode === m ? "bg-ink text-white" : "text-ink-2 hover:bg-surface-sunken"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {themesInMode.map((theme) => {
            const selected = theme.key === themeKey;
            return (
              <button
                key={theme.key}
                type="button"
                onClick={() => onChange({ widgetTheme: theme.key })}
                className={`rounded-lg border p-2.5 text-left transition-colors ${
                  selected ? "border-ink ring-1 ring-ink" : "border-line hover:border-line-strong"
                }`}
              >
                <div className="flex h-9 gap-1 overflow-hidden rounded-[6px]" style={{ background: theme.messageArea }}>
                  <div className="w-1/3" style={{ background: theme.accent }} />
                  <div className="flex-1 p-1.5">
                    <div className="h-2 w-3/4 rounded-full" style={{ background: theme.agentBubbleBg, border: `1px solid ${theme.agentBubbleBorder}` }} />
                  </div>
                </div>
                <p className="mt-2 text-[12.5px] font-medium">{theme.label}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <label className="field-label">Font</label>
          <select
            value={fontKey}
            onChange={(e) => onChange({ widgetFont: e.target.value })}
            className="input"
            style={{ fontFamily: activeFont.stack }}
          >
            {WIDGET_FONTS.map((font) => (
              <option key={font.key} value={font.key} style={{ fontFamily: font.stack }}>
                {font.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="field-label">Preview</p>
        <WidgetPreview theme={activeTheme} font={activeFont} />
      </div>
    </div>
  );
}
