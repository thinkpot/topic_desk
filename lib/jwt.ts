import jwt from "jsonwebtoken";
import { env } from "./env";

export interface AuthTokenPayload {
  userId: string;
  // Must match User.tokenVersion — bumping that column (password change,
  // suspension, "log out everywhere") revokes every token issued before it.
  v: number;
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    algorithm: "HS256",
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] }) as Partial<AuthTokenPayload>;
  if (typeof payload.userId !== "string" || typeof payload.v !== "number") {
    throw new jwt.JsonWebTokenError("Malformed token payload");
  }
  return { userId: payload.userId, v: payload.v };
}
