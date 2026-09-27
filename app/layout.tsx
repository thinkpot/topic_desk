import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Telegram Live Chat Widget for Your Website | ${BRAND_NAME}`,
  description:
    "Add Telegram live chat to your website with one script tag. Visitor chats go to your Telegram group. No-code chatbot, live visitor tracking. Free 3-day trial.",
  openGraph: {
    title: `Telegram Live Chat Widget for Your Website | ${BRAND_NAME}`,
    description:
      "A chat widget for your website that sends every visitor conversation to your Telegram group. Free 3-day trial, no card needed.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
