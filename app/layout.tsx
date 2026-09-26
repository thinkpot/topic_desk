import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Topicdesk — Telegram Live Chat Widget for Your Website",
  description:
    "Add a live chat widget to your website that relays every visitor message to a Telegram group. Includes a no-code chatbot flow builder and real-time live visitor analytics.",
  openGraph: {
    title: "Topicdesk — Telegram Live Chat Widget for Your Website",
    description:
      "A live chat widget powered by Telegram, with a no-code chatbot builder and real-time visitor analytics.",
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
