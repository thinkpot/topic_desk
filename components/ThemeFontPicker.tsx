"use client";

import { useEffect, useState } from "react";
import { WIDGET_THEMES, WIDGET_FONTS, getTheme, getFont, ALL_GOOGLE_FONTS_URL } from "@/lib/widget-appearance";
import WidgetPreview from "./WidgetPreview";

export default function ThemeFontPicker({
  themeKey,
  fontKey,
  onSave,
}: {
  themeKey: string;
  fontKey: string;
  onSave: (next: { widgetTheme: string; widgetFont: string }) => Promise<void> | void;
}) {
  // Selections are local until "Save" is clicked — themeKey/fontKey (the props)
  // stay the last-saved values so we can tell what's changed and revert to them.
  const [pendingTheme, setPendingTheme] = useState(themeKey);
  const [pendingFont, setPendingFont] = useState(fontKey);
  const [mode, setMode] = useState<"light" | "dark">(getTheme(themeKey).mode);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Only fires when the server-confirmed values actually change (i.e. right
  // after our own save resolves) — safe to resync from, never clobbers an
  // in-progress, unsaved selection.
  useEffect(() => {
    setPendingTheme(themeKey);
    setPendingFont(fontKey);
  }, [themeKey, fontKey]);

  const dirty = pendingTheme !== themeKey || pendingFont !== fontKey;
  const previewTheme = getTheme(pendingTheme);
  const previewFont = getFont(pendingFont);
  const themesInMode = WIDGET_THEMES.filter((t) => t.mode === mode);

  async function handleSave() {
    setSaving(true);
    await onSave({ widgetTheme: pendingTheme, widgetFont: pendingFont });
    setSaving(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1600);
  }

  function handleDiscard() {
    setPendingTheme(themeKey);
    setPendingFont(fontKey);
    setMode(getTheme(themeKey).mode);
  }

  return (
    <div>
      <link rel="stylesheet" href={ALL_GOOGLE_FONTS_URL} />
      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
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
              const selected = theme.key === pendingTheme;
              return (
                <button
                  key={theme.key}
                  type="button"
                  onClick={() => setPendingTheme(theme.key)}
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
              value={pendingFont}
              onChange={(e) => setPendingFont(e.target.value)}
              className="input"
              style={{ fontFamily: previewFont.stack }}
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
          <WidgetPreview theme={previewTheme} font={previewFont} />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 border-t border-line pt-5">
        <button onClick={handleSave} disabled={!dirty || saving} className="btn-primary btn-sm">
          {saving ? "Saving…" : "Save appearance"}
        </button>
        {dirty && !saving && (
          <button onClick={handleDiscard} className="btn-ghost btn-sm">
            Discard changes
          </button>
        )}
        {!dirty && justSaved && <span className="text-[13px] text-ink-3">Saved.</span>}
        {dirty && <span className="text-[13px] text-ink-3">Unsaved changes</span>}
      </div>
    </div>
  );
}
