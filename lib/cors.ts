import { NextResponse } from "next/server";

// Widget endpoints are called from arbitrary customer domains we can't know in
// advance, so CORS is intentionally open here. Per-chatbot domain restriction
// (allowedDomains) is enforced in the route handlers themselves.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function withCors(res: NextResponse): NextResponse {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => res.headers.set(key, value));
  return res;
}

export function corsPreflight(): NextResponse {
  return withCors(new NextResponse(null, { status: 204 }));
}
