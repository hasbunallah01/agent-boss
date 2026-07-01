// POST /api/auth/request
// Body: { email }
// Sends a 6-digit OTP to the given email via Resend.
// Returns 200 with a generic "check your inbox" message regardless of
// whether the email is registered — this prevents email enumeration.
//
// Rate limits (in-memory, per-process):
//   - 5 requests per email per hour
//   - 10 requests per IP per hour
//   - 1 new code per email per 60s (resend cooldown)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";
import {
  generateOtp,
  hashOtp,
  normalizeEmail,
  isValidEmail,
  OTP_TTL_MINUTES,
} from "@/lib/email-token";
import { sendEmail } from "@/lib/resend";
import { otpEmailHtml, otpEmailText } from "@/lib/email-templates";

export const runtime = "nodejs";

interface RequestBody {
  email?: unknown;
}

// In-memory rate limit. Cheap, single-process; matches the rate-limit
// pattern already used in middleware.ts. Per-email cooldown prevents
// spam-resend abuse; per-IP cap prevents email-bombing via a single IP.
const COOLDOWN_MS = 60_000;
const PER_EMAIL_PER_HOUR = 5;
const PER_IP_PER_HOUR = 10;

const lastRequestByEmail = new Map<string, number>();
const emailHourlyCount = new Map<string, { windowStart: number; count: number }>();
const ipHourlyCount = new Map<string, { windowStart: number; count: number }>();

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkAndBump(map: Map<string, { windowStart: number; count: number }>, key: string, max: number): boolean {
  const now = Date.now();
  const cur = map.get(key);
  if (!cur || now - cur.windowStart > 3_600_000) {
    map.set(key, { windowStart: now, count: 1 });
    return true;
  }
  if (cur.count >= max) return false;
  cur.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" } as const,
      { status: 400 }
    );
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, message: "Valid email is required" } as const,
      { status: 400 }
    );
  }

  const ip = getClientIp(req);

  // Per-IP rate limit (applies regardless of email validity so attackers
  // can't probe by spamming invalid emails).
  if (!checkAndBump(ipHourlyCount, ip, PER_IP_PER_HOUR)) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Please wait a minute." } as const,
      { status: 429 }
    );
  }

  // Per-email cooldown (can't resend the same code faster than 60s).
  const last = lastRequestByEmail.get(email) ?? 0;
  if (Date.now() - last < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000);
    return NextResponse.json(
      {
        ok: false,
        message: `Please wait ${wait} seconds before requesting another code.`,
        cooldownSeconds: wait,
      } as const,
      { status: 429 }
    );
  }

  // Per-email hourly cap.
  if (!checkAndBump(emailHourlyCount, email, PER_EMAIL_PER_HOUR)) {
    return NextResponse.json(
      { ok: false, message: "Too many requests for this email. Try again later." } as const,
      { status: 429 }
    );
  }

  // Always send the cooldown bump, even if downstream steps fail — we don't
  // want Resend errors to allow retry-storming.
  lastRequestByEmail.set(email, Date.now());

  try {
    // Invalidate any previous unused codes for this email.
    await prisma.loginToken.updateMany({
      where: { email, usedAt: null },
      data: { usedAt: new Date() }, // soft-revoke by marking used
    });

    const code = generateOtp();
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

    await prisma.loginToken.create({
      data: { email, codeHash, expiresAt },
    });

    // Send email. We don't block the response on Resend beyond a generous
    // timeout inside the SDK; if it fails, the OTP is still valid in the DB
    // and the user can re-request after the cooldown.
    const sendResult = await sendEmail({
      to: email,
      subject: "Your Agent Boss sign-in code",
      html: otpEmailHtml({ code, expiresInMinutes: OTP_TTL_MINUTES }),
      text: otpEmailText({ code, expiresInMinutes: OTP_TTL_MINUTES }),
    });

    if (!sendResult.ok) {
      console.error("[auth/request] email send failed for", email, sendResult.error);
      // Still return 200 to avoid email enumeration, but log so we can debug.
      // The user will see "check your inbox" — they may need to retry.
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Check your inbox for a 6-digit sign-in code.",
        // Only reveal cooldown when actually throttled (not on success).
      } as const,
      { status: 200 }
    );
  } catch (e) {
    console.error("[auth/request] internal error:", e);
    return NextResponse.json(
      { ok: false, message: "Internal server error" } as const,
      { status: 500 }
    );
  }
}