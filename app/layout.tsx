import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { BRAND_NAME } from "@/lib/brand";
import { siteUrl } from "@/lib/site";
import Analytics from "@/components/Analytics";

export const metadata: Metadata = {
  // Makes canonical links and the OG image resolve to absolute URLs; without
  // it Next emits relative ones, which crawlers and link unfurlers ignore.
  metadataBase: siteUrl(),
  title: `Telegram Live Chat Widget for Your Website | ${BRAND_NAME}`,
  description:
    "Add Telegram live chat to your website with one script tag. Visitor chats go to your Telegram group. No-code chatbot, live visitor tracking. Free 3-day trial.",
  openGraph: {
    title: `Telegram Live Chat Widget for Your Website | ${BRAND_NAME}`,
    description:
      "A chat widget for your website that sends every visitor conversation to your Telegram group. Free 3-day trial, no card needed.",
    type: "website",
    url: "/",
    siteName: BRAND_NAME,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: `${BRAND_NAME} — Telegram live chat for your website` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Telegram Live Chat Widget for Your Website | ${BRAND_NAME}`,
    description:
      "A chat widget for your website that sends every visitor conversation to your Telegram group. Free 3-day trial, no card needed.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Analytics />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
