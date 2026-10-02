import type { Server as SocketIOServer } from "socket.io";
import { broadcastInBackground, channelFor, realtimeEnabled } from "./realtime";

/**
 * Realtime fan-out, with two transports behind one API.
 *
 * - **Supabase Broadcast**, when configured. Works anywhere, including
 *   serverless hosts that cannot hold a socket open.
 * - **Socket.io**, when server.ts is the one running the app (local dev, or a
 *   traditional Node host).
 *
 * Both are attempted; each is a no-op when unavailable, so a deployment that
 * has only one still delivers, and one that has both delivers twice over
 * separate paths — clients subscribe to whichever they can reach, and messages
 * carry ids so a duplicate is discarded rather than rendered twice.
 *
 * Callers do not know or care which is in play. server.ts keeps the io instance
 * on a global because Next bundles route handlers separately from it.
 */
declare global {
  // eslint-disable-next-line no-var
  var __io: SocketIOServer | undefined;
}

export function setIO(io: SocketIOServer): void {
  globalThis.__io = io;
}

export function getIO(): SocketIOServer | undefined {
  return globalThis.__io;
}

export interface ChatMessagePayload {
  id: string;
  sender: string;
  text: string;
  createdAt: Date | string;
  buttons?: unknown;
}

function emit(kind: "user" | "visitor", id: string, room: string, event: string, payload: unknown): void {
  getIO()?.to(room).emit(event, payload);
  if (realtimeEnabled()) broadcastInBackground(channelFor(kind, id), event, payload);
}

/** Cuts an account's open dashboard sockets — after suspension, deletion or a password reset. */
export function disconnectUserSockets(userId: string): void {
  getIO()?.in(`user:${userId}`).disconnectSockets(true);
}

/** Dashboard listens on its own channel for every live-visitor update across all its chatbots. */
export function emitLiveUpdate(userId: string, visitor: unknown): void {
  emit("user", userId, `user:${userId}`, "live:update", visitor);
}

export function emitLiveLeft(userId: string, liveVisitorId: string): void {
  emit("user", userId, `user:${userId}`, "live:left", { id: liveVisitorId });
}

/** Live tab's detail pane, for a message from either side of a conversation. */
export function emitChatMessageToDashboard(
  userId: string,
  chatbotId: string,
  visitorId: string,
  message: ChatMessagePayload
): void {
  emit("user", userId, `user:${userId}`, "chat:message", { chatbotId, visitorId, message });
}

/** The widget itself, for an agent or bot reply arriving without a page reload. */
export function emitChatMessageToWidget(chatbotId: string, visitorId: string, message: ChatMessagePayload): void {
  emit("visitor", `${chatbotId}:${visitorId}`, `visitor:${chatbotId}:${visitorId}`, "chat:message", message);
}
