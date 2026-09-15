import express from "express";
import cors from "cors";
import path from "path";
import { env } from "./lib/env";
import authRoutes from "./routes/auth.routes";
import chatbotRoutes from "./routes/chatbot.routes";
import widgetRoutes from "./routes/widget.routes";
import telegramRoutes from "./routes/telegram.routes";

export const app = express();

app.use(express.json());

// Dashboard-only APIs: restricted to the configured frontend origin(s).
app.use(
  "/api/auth",
  cors({ origin: env.corsOrigins, credentials: true }),
  authRoutes
);
app.use(
  "/api/chatbots",
  cors({ origin: env.corsOrigins, credentials: true }),
  chatbotRoutes
);

// Embedded on arbitrary customer websites, so CORS is intentionally open here;
// per-chatbot domain restriction (allowedDomains) is enforced at the socket layer.
app.use("/api/widget", cors(), widgetRoutes);

// Server-to-server calls from Telegram, no CORS needed.
app.use("/api/telegram", telegramRoutes);

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use((req, res) => res.status(404).json({ error: "Not found" }));
