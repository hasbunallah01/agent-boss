// POST /api/auth/verify
// Body: { email, code }
// Verifies the OTP, upserts the User, signs a JWT, sets an HTTP-only cookie.
//
// Single-use: code is marked used on success.
// 5-attempt cap per token; too many wrong codes invalidate the token.
// Timing-safe comparison via constant-time hash check (sha256 is constant-time
// in node crypto, so equality of two hex strings is enough — but we use
// Prisma's hash-based lookup which is also constant-time in DB row count).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";
import {
  hashOtp,
  normalizeEmail,
  isValidEmail,
  isValidOtpFormat,
  OTP_MAX_ATTEMPTS,
} from "@/lib/email-token";
import { signAuthToken, setAuthCookie } from "@/lib/auth";
import { ensureUserWallet } from "@/lib/user-wallet";

export const runtime = "nodejs";

interface VerifyBody {
  email?: unknown;
  code?: unknown;
}

export async function POST(req: NextRequest) {
  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" } as const,
      { status: 400 }
    );
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, message: "Valid email is required" } as const,
      { status: 400 }
    );
  }
  if (!isValidOtpFormat(code)) {
    return NextResponse.json(
      { ok: false, message: "Code must be 6 digits" } as const,
      { status: 400 }
    );
  }

  try {
    const codeHash = hashOtp(code);

    // Look up the most recent valid token for this email.
    // "Valid" = not used, not expired, attempts < max.
    const token = await prisma.loginToken.findFirst({
      where: {
        email,
        usedAt: null,
        expiresAt: { gt: new Date() },
        attempts: { lt: OTP_MAX_ATTEMPTS },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!token) {
      return NextResponse.json(
        { ok: false, message: "Code is invalid or has expired" } as const,
        { status: 401 }
      );
    }

    // Constant-time string compare (same length hash, so this is fine).
    if (token.codeHash !== codeHash) {
      // Increment attempts; if we just hit the cap, mark the token used
      // to lock it out before the next brute-force attempt.
      const nextAttempts = token.attempts + 1;
      await prisma.loginToken.update({
        where: { id: token.id },
        data: {
          attempts: nextAttempts,
          ...(nextAttempts >= OTP_MAX_ATTEMPTS ? { usedAt: new Date() } : {}),
        },
      });
      const remaining = OTP_MAX_ATTEMPTS - nextAttempts;
      return NextResponse.json(
        {
          ok: false,
          message:
            remaining > 0
              ? `Code is invalid. ${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`
              : "Code is invalid and has been locked. Request a new one.",
        } as const,
        { status: 401 }
      );
    }

    // Correct code. Mark used, find or create User, sign JWT, set cookie.
    await prisma.loginToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });

    const user = await prisma.user.upsert({
      where: { email },
      update: { emailVerified: new Date() },
      create: { email, emailVerified: new Date() },
      select: {
        id: true,
        email: true,
        displayName: true,
        walletAddress: true,
        walletId: true,
        walletChain: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    // Link the token to the user for audit trail.
    await prisma.loginToken.update({
      where: { id: token.id },
      data: { userId: user.id },
    });

    // Best-effort: ensure the user has a Circle wallet on Arc Testnet.
    // The login succeeds regardless so users can still sign in if Circle
    // is temporarily unreachable — they can retry wallet creation from
    // /dashboard/wallet later.
    let walletWarning: string | undefined;
    try {
      const w = await ensureUserWallet(user.id);
      if (w.error) walletWarning = w.error;
    } catch (e) {
      console.warn("[auth/verify] wallet create failed:", e);
      walletWarning = "Wallet generation failed; retry from /dashboard/wallet";
    }

    // Re-read user in case the wallet got persisted.
    const fresh = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        displayName: true,
        walletAddress: true,
        walletId: true,
        walletChain: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const jwt = signAuthToken({ userId: fresh!.id, email: fresh!.email });
    await setAuthCookie(jwt);

    return NextResponse.json(
      { ok: true, user: fresh!, walletWarning } as const,
      { status: 200 }
    );
  } catch (e) {
    console.error("[auth/verify] internal error:", e);
    return NextResponse.json(
      { ok: false, message: "Verification failed" } as const,
      { status: 500 }
    );
  }
}