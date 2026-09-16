import { NextRequest, NextResponse } from "next/server";
import { withCors, corsPreflight } from "@/lib/cors";
import { isDomainAllowed } from "@/lib/domain";
import { resolveWidgetChatbot } from "@/lib/widget";
import { getTheme, getFont, googleFontUrl } from "@/lib/widget-appearance";

type RouteContext = { params: Promise<{ apiKey: string }> };

export async function OPTIONS() {
  return corsPreflight();
}

// Public: the embed script calls this to bootstrap the widget UI.
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { apiKey } = await params;
  const resolved = await resolveWidgetChatbot(apiKey);
  if ("error" in resolved) {
    return withCors(NextResponse.json({ error: resolved.error }, { status: resolved.status }));
  }
  const { bot } = resolved;

  if (!isDomainAllowed(bot.allowedDomains, req.headers.get("origin"))) {
    return withCors(
      NextResponse.json({ error: "This website is not authorized to use this chatbot" }, { status: 403 })
    );
  }

  const theme = getTheme(bot.widgetTheme);
  const font = getFont(bot.widgetFont);
  const { key: _themeKey, label: _themeLabel, mode: _mode, ...colors } = theme;

  return withCors(
    NextResponse.json({
      name: bot.name,
      welcomeMessage: bot.welcomeMessage,
      colors,
      fontStack: font.stack,
      fontUrl: googleFontUrl(font),
    })
  );
}
