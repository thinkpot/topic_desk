// The widget (public/widget.js) never imports this catalog directly — it ships
// with zero build step or dependencies. Instead, /api/widget/[apiKey]/config
// resolves a chatbot's theme/font keys to plain colors and a font stack, and
// the widget just applies whatever it's given. This file is the only place
// theme and font definitions live.

export interface WidgetTheme {
  key: string;
  label: string;
  mode: "light" | "dark";
  /** Header background, visitor's own bubbles, send button, chat toggle button. */
  accent: string;
  /** Text/icon color on top of `accent`. */
  accentText: string;
  /** Input row and footer background. */
  surface: string;
  /** Scrollable message list background. */
  messageArea: string;
  agentBubbleBg: string;
  agentBubbleBorder: string;
  agentBubbleText: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  /** Footer caption and status line. */
  mutedText: string;
}

export const WIDGET_THEMES: WidgetTheme[] = [
  // --- Light ---------------------------------------------------------------
  {
    key: "light-daylight",
    label: "Daylight",
    mode: "light",
    accent: "#0a0a0a",
    accentText: "#ffffff",
    surface: "#ffffff",
    messageArea: "#f7f7f5",
    agentBubbleBg: "#ffffff",
    agentBubbleBorder: "#e6e4e0",
    agentBubbleText: "#0a0a0a",
    inputBg: "#ffffff",
    inputBorder: "#d4d2cd",
    inputText: "#0a0a0a",
    mutedText: "#8a8a8a",
  },
  {
    key: "light-ocean",
    label: "Ocean",
    mode: "light",
    accent: "#2a78d6",
    accentText: "#ffffff",
    surface: "#ffffff",
    messageArea: "#f3f7fc",
    agentBubbleBg: "#ffffff",
    agentBubbleBorder: "#dbe6f3",
    agentBubbleText: "#12233c",
    inputBg: "#ffffff",
    inputBorder: "#c8d8ea",
    inputText: "#12233c",
    mutedText: "#6b7f96",
  },
  {
    key: "light-forest",
    label: "Forest",
    mode: "light",
    accent: "#0f7a3d",
    accentText: "#ffffff",
    surface: "#ffffff",
    messageArea: "#f2f8f4",
    agentBubbleBg: "#ffffff",
    agentBubbleBorder: "#dbeee1",
    agentBubbleText: "#123322",
    inputBg: "#ffffff",
    inputBorder: "#c7e2d1",
    inputText: "#123322",
    mutedText: "#6f8a7a",
  },
  {
    key: "light-sunset",
    label: "Sunset",
    mode: "light",
    accent: "#e0602a",
    accentText: "#ffffff",
    surface: "#ffffff",
    messageArea: "#fdf4ef",
    agentBubbleBg: "#ffffff",
    agentBubbleBorder: "#f4ddd0",
    agentBubbleText: "#3a2115",
    inputBg: "#ffffff",
    inputBorder: "#eccdb8",
    inputText: "#3a2115",
    mutedText: "#9c7b68",
  },
  {
    key: "light-rose",
    label: "Rose",
    mode: "light",
    accent: "#c9407e",
    accentText: "#ffffff",
    surface: "#ffffff",
    messageArea: "#fdf2f6",
    agentBubbleBg: "#ffffff",
    agentBubbleBorder: "#f5d9e5",
    agentBubbleText: "#3a1526",
    inputBg: "#ffffff",
    inputBorder: "#eec2d6",
    inputText: "#3a1526",
    mutedText: "#9c7288",
  },
  {
    key: "light-violet",
    label: "Violet",
    mode: "light",
    accent: "#5b3fc9",
    accentText: "#ffffff",
    surface: "#ffffff",
    messageArea: "#f5f3fc",
    agentBubbleBg: "#ffffff",
    agentBubbleBorder: "#e1dbf5",
    agentBubbleText: "#241a3d",
    inputBg: "#ffffff",
    inputBorder: "#cec2ec",
    inputText: "#241a3d",
    mutedText: "#8577a3",
  },
  {
    key: "light-amber",
    label: "Amber",
    mode: "light",
    accent: "#c98500",
    accentText: "#ffffff",
    surface: "#ffffff",
    messageArea: "#fdf8ea",
    agentBubbleBg: "#ffffff",
    agentBubbleBorder: "#f2e4bd",
    agentBubbleText: "#3a2f0d",
    inputBg: "#ffffff",
    inputBorder: "#e8d69e",
    inputText: "#3a2f0d",
    mutedText: "#a1926a",
  },
  {
    key: "light-slate",
    label: "Slate",
    mode: "light",
    accent: "#45566e",
    accentText: "#ffffff",
    surface: "#ffffff",
    messageArea: "#f4f6f8",
    agentBubbleBg: "#ffffff",
    agentBubbleBorder: "#dde3e9",
    agentBubbleText: "#202a35",
    inputBg: "#ffffff",
    inputBorder: "#c9d3dc",
    inputText: "#202a35",
    mutedText: "#7c8b9b",
  },
  {
    key: "light-mint",
    label: "Mint",
    mode: "light",
    accent: "#0f8f7a",
    accentText: "#ffffff",
    surface: "#ffffff",
    messageArea: "#eefaf7",
    agentBubbleBg: "#ffffff",
    agentBubbleBorder: "#cdeee6",
    agentBubbleText: "#0d3a32",
    inputBg: "#ffffff",
    inputBorder: "#b7e2d7",
    inputText: "#0d3a32",
    mutedText: "#6b9b8f",
  },
  {
    key: "light-sand",
    label: "Sand",
    mode: "light",
    accent: "#8a6a4a",
    accentText: "#ffffff",
    surface: "#fffdf9",
    messageArea: "#f7f1e8",
    agentBubbleBg: "#ffffff",
    agentBubbleBorder: "#ece0cf",
    agentBubbleText: "#3a2e1d",
    inputBg: "#ffffff",
    inputBorder: "#ddcbb0",
    inputText: "#3a2e1d",
    mutedText: "#9c8b74",
  },

  // --- Dark ------------------------------------------------------------------
  {
    key: "dark-midnight",
    label: "Midnight",
    mode: "dark",
    accent: "#3987e5",
    accentText: "#ffffff",
    surface: "#1a1a1a",
    messageArea: "#141416",
    agentBubbleBg: "#242428",
    agentBubbleBorder: "#33333a",
    agentBubbleText: "#f2f2f0",
    inputBg: "#1f1f22",
    inputBorder: "#35353c",
    inputText: "#f2f2f0",
    mutedText: "#8f8f97",
  },
  {
    key: "dark-obsidian",
    label: "Obsidian",
    mode: "dark",
    accent: "#f2f2f0",
    accentText: "#0a0a0a",
    surface: "#121212",
    messageArea: "#0d0d0d",
    agentBubbleBg: "#1c1c1c",
    agentBubbleBorder: "#2a2a2a",
    agentBubbleText: "#f2f2f0",
    inputBg: "#161616",
    inputBorder: "#2a2a2a",
    inputText: "#f2f2f0",
    mutedText: "#8a8a8a",
  },
  {
    key: "dark-ocean-deep",
    label: "Ocean Deep",
    mode: "dark",
    accent: "#3987e5",
    accentText: "#ffffff",
    surface: "#10161f",
    messageArea: "#0b1017",
    agentBubbleBg: "#1b2432",
    agentBubbleBorder: "#293445",
    agentBubbleText: "#e8eef7",
    inputBg: "#141b26",
    inputBorder: "#2a374a",
    inputText: "#e8eef7",
    mutedText: "#7e8fa6",
  },
  {
    key: "dark-forest-night",
    label: "Forest Night",
    mode: "dark",
    accent: "#199e70",
    accentText: "#ffffff",
    surface: "#101913",
    messageArea: "#0b120d",
    agentBubbleBg: "#1a2620",
    agentBubbleBorder: "#28382f",
    agentBubbleText: "#e7f2ea",
    inputBg: "#141f18",
    inputBorder: "#2a3b31",
    inputText: "#e7f2ea",
    mutedText: "#7e9c8b",
  },
  {
    key: "dark-ember",
    label: "Ember",
    mode: "dark",
    accent: "#d95926",
    accentText: "#ffffff",
    surface: "#1a1210",
    messageArea: "#140d0b",
    agentBubbleBg: "#261a16",
    agentBubbleBorder: "#3a2a23",
    agentBubbleText: "#f5ebe5",
    inputBg: "#1f1512",
    inputBorder: "#3a2a23",
    inputText: "#f5ebe5",
    mutedText: "#a68b7c",
  },
  {
    key: "dark-berry",
    label: "Berry",
    mode: "dark",
    accent: "#d55181",
    accentText: "#ffffff",
    surface: "#1a1116",
    messageArea: "#130c10",
    agentBubbleBg: "#261a21",
    agentBubbleBorder: "#3a2734",
    agentBubbleText: "#f5e9ef",
    inputBg: "#1f151b",
    inputBorder: "#3a2734",
    inputText: "#f5e9ef",
    mutedText: "#a67f92",
  },
  {
    key: "dark-indigo-night",
    label: "Indigo Night",
    mode: "dark",
    accent: "#9085e9",
    accentText: "#0a0a0a",
    surface: "#15121f",
    messageArea: "#100d19",
    agentBubbleBg: "#211c30",
    agentBubbleBorder: "#332c48",
    agentBubbleText: "#ece9f7",
    inputBg: "#1a1626",
    inputBorder: "#332c48",
    inputText: "#ece9f7",
    mutedText: "#8f87ab",
  },
  {
    key: "dark-graphite",
    label: "Graphite",
    mode: "dark",
    accent: "#5c7a9e",
    accentText: "#ffffff",
    surface: "#17181b",
    messageArea: "#111214",
    agentBubbleBg: "#222327",
    agentBubbleBorder: "#33343a",
    agentBubbleText: "#eceef0",
    inputBg: "#1c1d20",
    inputBorder: "#33343a",
    inputText: "#eceef0",
    mutedText: "#8b8d93",
  },
  {
    key: "dark-jade",
    label: "Jade",
    mode: "dark",
    accent: "#199e8f",
    accentText: "#ffffff",
    surface: "#0f1a18",
    messageArea: "#0a1312",
    agentBubbleBg: "#1a2726",
    agentBubbleBorder: "#283a38",
    agentBubbleText: "#e6f2f0",
    inputBg: "#142120",
    inputBorder: "#283a38",
    inputText: "#e6f2f0",
    mutedText: "#7ea19b",
  },
  {
    key: "dark-espresso",
    label: "Espresso",
    mode: "dark",
    accent: "#c98500",
    accentText: "#0a0a0a",
    surface: "#1a150f",
    messageArea: "#130f0a",
    agentBubbleBg: "#261f16",
    agentBubbleBorder: "#3a2f21",
    agentBubbleText: "#f2e9d8",
    inputBg: "#1f1911",
    inputBorder: "#3a2f21",
    inputText: "#f2e9d8",
    mutedText: "#a6957c",
  },
];

export interface WidgetFont {
  key: string;
  label: string;
  /** CSS font-family stack applied by the widget. */
  stack: string;
  /** Google Fonts family name to load, or null for a system-only stack. */
  googleFont: string | null;
}

export const WIDGET_FONTS: WidgetFont[] = [
  { key: "system", label: "System default", stack: 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif', googleFont: null },
  { key: "inter", label: "Inter", stack: '"Inter",system-ui,sans-serif', googleFont: "Inter:wght@400;500;600" },
  { key: "poppins", label: "Poppins", stack: '"Poppins",system-ui,sans-serif', googleFont: "Poppins:wght@400;500;600" },
  { key: "roboto", label: "Roboto", stack: '"Roboto",system-ui,sans-serif', googleFont: "Roboto:wght@400;500;700" },
  { key: "nunito", label: "Nunito", stack: '"Nunito",system-ui,sans-serif', googleFont: "Nunito:wght@400;600;700" },
  { key: "merriweather", label: "Merriweather", stack: '"Merriweather",Georgia,serif', googleFont: "Merriweather:wght@400;700" },
  { key: "space-mono", label: "Space Mono", stack: '"Space Mono",Menlo,monospace', googleFont: "Space+Mono:wght@400;700" },
  { key: "georgia", label: "Georgia", stack: 'Georgia,"Times New Roman",serif', googleFont: null },
  { key: "verdana", label: "Verdana", stack: "Verdana,Geneva,sans-serif", googleFont: null },
  { key: "courier", label: "Courier New", stack: '"Courier New",Courier,monospace', googleFont: null },
];

const DEFAULT_THEME_KEY = "light-daylight";
const DEFAULT_FONT_KEY = "system";

export function getTheme(key: string): WidgetTheme {
  return WIDGET_THEMES.find((t) => t.key === key) ?? WIDGET_THEMES.find((t) => t.key === DEFAULT_THEME_KEY)!;
}

export function getFont(key: string): WidgetFont {
  return WIDGET_FONTS.find((f) => f.key === key) ?? WIDGET_FONTS.find((f) => f.key === DEFAULT_FONT_KEY)!;
}

export function googleFontUrl(font: WidgetFont): string | null {
  if (!font.googleFont) return null;
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.googleFont)}&display=swap`;
}

/** One combined request for every Google-hosted font, so the dashboard's live
 * preview can render any selection without swapping stylesheets. */
export const ALL_GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?" +
  WIDGET_FONTS.filter((f) => f.googleFont)
    .map((f) => `family=${encodeURIComponent(f.googleFont!)}`)
    .join("&") +
  "&display=swap";

export const WIDGET_THEME_KEYS = WIDGET_THEMES.map((t) => t.key) as [string, ...string[]];
export const WIDGET_FONT_KEYS = WIDGET_FONTS.map((f) => f.key) as [string, ...string[]];
