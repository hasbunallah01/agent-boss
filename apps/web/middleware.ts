// CORS middleware for /api routes.
// Open access for hackathon demo — anyone can hit the API.
// In production, restrict origin via env var.

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || "*")
  .split(",")
  .map((o) => o.trim());

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") || "";

  // Only apply CORS to API routes (pages already work fine).
  if (!req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Build permissive CORS headers for hackathon demo.
  const isAllowed =
    ALLOWED_ORIGINS.includes("*") ||
    ALLOWED_ORIGINS.includes(origin) ||
    origin === ""; // server-to-server

  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": isAllowed ? (origin || "*") : "null",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, Accept",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Credentials": "true",
  };

  // Preflight: short-circuit OPTIONS.
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  // Real request: forward and add headers to response.
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(corsHeaders)) {
    res.headers.set(k, v);
  }
  return res;
}

export const config = {
  matcher: "/api/:path*",
};