import { Prisma } from "@prisma/client";
import { verifyToken } from "./jwt";
import { prisma } from "./prisma";

// Kept free of next/* imports: server.ts (outside Next's runtime) uses this
// for the Socket.io handshake, and importing next/server there crashes boot.

export type SessionUser = Prisma.UserGetPayload<{ include: { plan: true } }>;

/**
 * Resolves a raw JWT to its user, rejecting tokens revoked by a tokenVersion
 * bump. Shared by REST routes and the Socket.io dashboard handshake so both
 * enforce exactly the same rules.
 */
export async function userFromToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: payload.userId }, include: { plan: true } });
  if (!user || user.tokenVersion !== payload.v) return null;
  return user;
}
