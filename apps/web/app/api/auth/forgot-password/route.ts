// POST /api/auth/forgot-password
// Body: { email }
// Always returns 200 with the same generic message (don't leak whether
// the email has an account). If it does, generates a reset token, hashes
// it, persists it, and emails the user a link with the raw token.
//
// The link format: {PUBLIC_BASE_URL}/auth/reset-password?token={raw}
// The frontend /auth/reset-password page collects the new password and
// calls POST /api/auth/reset-password.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";
import { generateResetToken } from "@/lib/password";
import { sendPasswordResetEmail } from "@/lib/email-templates";
import { normalizeEmail } from "@/lib/email-token";

export const runtime = "nodejs";

interface ForgotBody {
  email?: unknown;
}

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  let body: ForgotBody;
  try {
    body = (await req.json()) as ForgotBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" } as const,
      { status: 400 }
    );
  }
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!email) {
    return NextResponse.json(
      { ok: false, message: "Email is required" } as const,
      { status: 400 }
    );
  }

  // Always respond the same way to avoid email enumeration.
  const generic = NextResponse.json(
    {
      ok: true,
      message: "If an account exists for that email, a reset link is on its way.",
    } as const,
    { status: 200 }
  );

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return generic;

    const { raw, hash } = generateResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        email,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    });

    const baseUrl =
      process.env.PUBLIC_BASE_URL || "https://agent-boss-web.vercel.app";
    const resetUrl = `${baseUrl}/auth/reset-password?token=${raw}`;
    try {
      await sendPasswordResetEmail({ to: email, resetUrl });
    } catch (e) {
      console.warn("[auth/forgot-password] email send failed:", e);
    }

    return generic;
  } catch (e) {
    console.error("[auth/forgot-password] internal error:", e);
    return NextResponse.json(
      { ok: false, message: "Could not send reset email" } as const,
      { status: 500 }
    );
  }
}