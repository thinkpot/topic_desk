import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { channelFor, realtimeEnabled } from "@/lib/realtime";
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
  const limited = rateLimit(req, "widgetRead");
  if (limited) return withCors(limited);
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

  // The widget is a static file, so it cannot read build-time env vars — it
  // receives the realtime settings here instead. This response is already
  // gated on a valid API key and the domain allowlist, which is exactly the
  // check Socket.io used to perform before joining a visitor room.
  const visitorId = req.nextUrl.searchParams.get("visitorId");
  const realtime =
    realtimeEnabled() && visitorId
      ? {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
          channel: channelFor("visitor", `${bot.id}:${visitorId}`),
        }
      : null;

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
      realtime,
    })
  );
}
