import type { Server as SocketIOServer } from "socket.io";

// server.ts runs the Socket.io server in the same Node process as Next.js's
// request handler (custom server), so a global is the simplest way for API
// route handlers to reach the one io instance without threading it through
// every function signature.
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

/** Dashboard listens on its own room for every live-visitor update across all its chatbots. */
export function emitLiveUpdate(userId: string, visitor: unknown): void {
  getIO()?.to(`user:${userId}`).emit("live:update", visitor);
}

export function emitLiveLeft(userId: string, liveVisitorId: string): void {
  getIO()?.to(`user:${userId}`).emit("live:left", { id: liveVisitorId });
}

/** Live tab's detail pane, for a message from either side of a conversation. */
export function emitChatMessageToDashboard(
  userId: string,
  chatbotId: string,
  visitorId: string,
  message: ChatMessagePayload
): void {
  getIO()?.to(`user:${userId}`).emit("chat:message", { chatbotId, visitorId, message });
}

/** The widget itself, for a dashboard-chat reply arriving without a page reload. */
export function emitChatMessageToWidget(chatbotId: string, visitorId: string, message: ChatMessagePayload): void {
  getIO()?.to(`visitor:${chatbotId}:${visitorId}`).emit("chat:message", message);
}
