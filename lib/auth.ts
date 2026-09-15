import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./jwt";

export function getUserId(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return null;
  try {
    return verifyToken(token).userId;
  } catch {
    return null;
  }
}

export function unauthorized() {
  return NextResponse.json({ error: "Missing or invalid authorization token" }, { status: 401 });
}
