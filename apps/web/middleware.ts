// CORS middleware for /api routes.
// Open access for hackathon demo — anyone can hit the API.
// In production, restrict origin via env var.

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || "*")
  .split(",")
  .map((o) => o.trim());

// --- Rate limiter (in-memory, per IP) ---------------------------------------
// 60 req/min per IP for all /api/* routes.
// 10 req/hour per IP for POST /api/agents (protects Circle wallet creation).
type Bucket = number[]; // unix-ms timestamps of recent requests
const buckets = new Map<string, Bucket>();

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * 60_000;
const PER_MINUTE_LIMIT = 60;
const AGENT_POST_PER_HOUR_LIMIT = 10;

function clientIp(req: NextRequest): string {
  // Vercel sets x-forwarded-for; fall back to x-real-ip. Both can be comma lists.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

function prune(bucket: Bucket, windowMs: number, now: number): void {
  const cutoff = now - windowMs;
  // Drop expired entries from the front.
  while (bucket.length > 0 && bucket[0] <= cutoff) bucket.shift();
}

function check(
  req: NextRequest,
  windowMs: number,
  limit: number
): boolean {
  const ip = clientIp(req);
  const key = `${ip}:${windowMs}:${limit}:${req.nextUrl.pathname}:${req.method}`;
  const now = Date.now();
  const bucket = buckets.get(key) ?? [];
  prune(bucket, windowMs, now);
  if (bucket.length >= limit) return false;
  bucket.push(now);
  buckets.set(key, bucket);
  return true;
}

function tooMany(): NextResponse {
  return NextResponse.json(
    { ok: false, message: "Too many requests" } as const,
    { status: 429 }
  );
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") || "";

  // Only apply CORS to API routes (pages already work fine).
  if (!req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // CORS headers (needed for both preflight and real responses).
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

  // Preflight: short-circuit OPTIONS BEFORE rate limiting.
  // Browsers cache preflights (Access-Control-Max-Age above), but the first
  // preflight before each burst of POSTs would otherwise consume one slot
  // from the rate-limit bucket — risking legitimate requests getting 429.
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  // --- Rate limiting ------------------------------------------------------
  // Per-minute cap applies to every /api request.
  if (!check(req, MINUTE_MS, PER_MINUTE_LIMIT)) return tooMany();
  // Stricter cap on POST /api/agents (Circle wallet creation).
  if (
    req.method === "POST" &&
    req.nextUrl.pathname === "/api/agents" &&
    !check(req, HOUR_MS, AGENT_POST_PER_HOUR_LIMIT)
  ) {
    return tooMany();
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